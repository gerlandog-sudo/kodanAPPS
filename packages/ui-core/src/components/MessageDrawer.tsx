import React, { useState, useEffect, useRef, useTransition, useMemo } from 'react';
import { X, Send } from 'lucide-react';
import { api } from '../api/client';
import type { SSEMessage } from '../hooks/useSSE';

interface MessageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: number;
  currentUserId: number;
  sseMessages?: SSEMessage[];
  title?: string;
  onMessagesRead?: () => void;
}

export function MessageDrawer({
  isOpen,
  onClose,
  entityType,
  entityId,
  currentUserId,
  sseMessages = [],
  title,
  onMessagesRead,
}: MessageDrawerProps) {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<{ id: number; email: string; display_name: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de usuarios del tenant para menciones
  useEffect(() => {
    if (!isOpen) return;
    async function fetchUsers() {
      try {
        const data = await api.get<{ id: number; email: string; display_name: string }[]>('/api/messages/users');
        if (data) setUsers(data);
      } catch (err) {
        console.error('Error fetching users for mentions:', err);
      }
    }
    fetchUsers();
  }, [isOpen]);

  const filteredSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.display_name?.toLowerCase() || '').includes(q) ||
        (u.email?.toLowerCase() || '').includes(q)
    );
  }, [mentionQuery, users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    const cursor = e.target.selectionStart ?? 0;
    const textBeforeCursor = value.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionStartIndex(cursor - match[0].length);
      setSelectedSuggestionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectSuggestion = (user: { id: number; display_name: string }) => {
    if (mentionStartIndex === null) return;
    const before = input.slice(0, mentionStartIndex);
    const cursor = inputRef.current?.selectionStart ?? 0;
    const after = input.slice(cursor);
    const mentionText = `@[${user.display_name}](user:${user.id}) `;
    setInput(before + mentionText + after);
    setMentionQuery(null);

    // Restaurar foco y posición del cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = mentionStartIndex + mentionText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[selectedSuggestionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
      }
    }
  };

  // Escuchar tecla Esc para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cargar histórico de mensajes al abrir o cambiar la entidad
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    async function loadHistory() {
      setLoading(true);
      try {
        const history = await api.get<SSEMessage[]>(`/api/chats/${entityType}/${entityId}`);
        if (active && history) {
          setMessages(history);
          // Marcar como leído
          if (history.length > 0) {
            const lastMsgId = history[history.length - 1].id;
            const conversationId = history[history.length - 1].conversation_id;
            await api.post(`/api/conversations/${conversationId}/read`, { last_message_id: lastMsgId });
            onMessagesRead?.();
          }
        }
      } catch (err) {
        console.error('Error cargando historial de chat:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, [isOpen, entityType, entityId]);

  // Integrar nuevos mensajes desde SSE en tiempo real
  useEffect(() => {
    if (!isOpen || sseMessages.length === 0 || messages.length === 0) return;

    const conversationId = messages[0]?.conversation_id;
    if (!conversationId) return;

    // Filtrar los mensajes de SSE que pertenecen a esta conversación y no están en el estado local
    const newMsgs = sseMessages.filter(
      (m) => m.conversation_id === conversationId && !messages.some((existing) => existing.id === m.id)
    );

    if (newMsgs.length > 0) {
      setMessages((prev) => {
        const merged = [...prev, ...newMsgs].sort((a, b) => a.id - b.id);
        // Marcar la conversación como leída con el último mensaje recibido
        const lastMsgId = merged[merged.length - 1].id;
        api.post(`/api/conversations/${conversationId}/read`, { last_message_id: lastMsgId })
          .then(() => {
            onMessagesRead?.();
          })
          .catch(() => {});
        return merged;
      });
    }
  }, [sseMessages, isOpen, messages]);

  // Auto-scroll al fondo al recibir mensajes
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    setInput('');
    startTransition(async () => {
      try {
        await api.post(`/api/chats/${entityType}/${entityId}`, { content });
        // Recargar para sincronizar de inmediato
        const history = await api.get<SSEMessage[]>(`/api/chats/${entityType}/${entityId}`);
        if (history) {
          setMessages(history);
        }
      } catch (err) {
        console.error('Error al enviar el mensaje:', err);
      }
    });
  };

  function renderMessageContent(content: string) {
    const regex = /@\[([^\]]+)\]\(user:\d+\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(textBefore);
      }
      const displayName = match[1];
      parts.push(
        <span key={match.index} className="mention-highlight">
          @{displayName}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    const textAfter = content.substring(lastIndex);
    if (textAfter) {
      parts.push(textAfter);
    }

    return parts.length > 0 ? parts : content;
  }

  function formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  return (
    <>
      <div
        className={`chat-drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <div
        className={`chat-drawer ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Panel de mensajería"
      >
        {/* Cabecera */}
        <div className="chat-header">
          <h3 className="chat-title">{title || 'Mensajería del Sistema'}</h3>
          <button className="chat-close-btn" onClick={onClose} aria-label="Cerrar panel">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Chat */}
        <div className="chat-body" ref={bodyRef}>
          {loading && messages.length === 0 ? (
            <div className="chat-system-message">Cargando conversación...</div>
          ) : messages.length === 0 ? (
            <div className="chat-system-message">No hay mensajes. Comienza la conversación.</div>
          ) : (
            messages.map((msg) => {
              if (msg.is_system) {
                return (
                  <div key={msg.id} className="chat-system-message">
                    {msg.content}
                  </div>
                );
              }

              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`chat-bubble-container ${isMe ? 'me' : 'others'}`}
                >
                  {!isMe && <span className="chat-bubble-sender">{msg.sender_name ?? msg.sender_email}</span>}
                  <div className="chat-bubble">
                    {renderMessageContent(msg.content)}
                    <span className="chat-bubble-time">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sugerencias de Mención */}
        {mentionQuery !== null && filteredSuggestions.length > 0 && (
          <div className="chat-mentions-dropdown">
            {filteredSuggestions.map((u, idx) => (
              <div
                key={u.id}
                className={`chat-mention-item ${idx === selectedSuggestionIndex ? 'active' : ''}`}
                onClick={() => handleSelectSuggestion(u)}
              >
                <span className="mention-name">{u.display_name}</span>
                <span className="mention-email">{u.email}</span>
              </div>
            ))}
          </div>
        )}

        {/* Input de Envío */}
        <div className="chat-footer">
          <form className="chat-input-form" onSubmit={handleSend}>
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Escribe un mensaje... Usa @ para mencionar"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              disabled={isPending}
              autoComplete="off"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={isPending || !input.trim()}
            >
              <Send size={16} />
              <span>{isPending ? '...' : 'Enviar'}</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
