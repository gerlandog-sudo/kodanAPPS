import React, { useState, useEffect, useRef, useTransition } from 'react';
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
}

export function MessageDrawer({
  isOpen,
  onClose,
  entityType,
  entityId,
  currentUserId,
  sseMessages = [],
  title,
}: MessageDrawerProps) {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLDivElement>(null);

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
        api.post(`/api/conversations/${conversationId}/read`, { last_message_id: lastMsgId }).catch(() => {});
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

        {/* Input de Envío */}
        <div className="chat-footer">
          <form className="chat-input-form" onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              placeholder="Escribe un mensaje... Usa @ para mencionar"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isPending}
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
