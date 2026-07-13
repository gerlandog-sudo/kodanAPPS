import { useEffect, useState } from 'react';
import { api } from '../api/client';

import { API_BASE } from '../config';

export interface SSEMessage {
  id: number;
  conversation_id: number;
  sender_id: number | null;
  sender_name: string | null;
  sender_email: string | null;
  content: string;
  is_system: number;
  created_at: string;
}

export function useSSE(appId: string) {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial unread count on mount
  useEffect(() => {
    if (!appId) return;
    let active = true;
    async function fetchInitialUnread() {
      try {
        const data = await api.get<{ unread_count: number }>('/api/messages/unread-count');
        if (active && data) {
          setUnreadCount(data.unread_count);
        }
      } catch (err) {
        console.error('Error fetching initial unread count:', err);
      }
    }
    fetchInitialUnread();
    return () => {
      active = false;
    };
  }, [appId]);

  useEffect(() => {
    if (!appId) return;

    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;

    function connect() {
      let lastEventId = localStorage.getItem(`last_event_id_${appId}`) || '0';
      const url = new URL(`${API_BASE}/api/messages/stream`, window.location.origin);
      url.searchParams.append('app_id', appId);
      url.searchParams.append('last_event_id', lastEventId);

      const eventSource = new EventSource(url.toString(), { withCredentials: true });

      eventSource.onmessage = (event) => {
        // Reset reconnect attempts on successful message
        reconnectAttempts = 0;
        try {
          const msg: SSEMessage = JSON.parse(event.data);
          setMessages((prev) => {
            if (prev.some(p => p.id === msg.id)) {
              return prev;
            }
            return [...prev, msg];
          });

          if (event.lastEventId) {
            localStorage.setItem(`last_event_id_${appId}`, event.lastEventId);
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      // Escuchar actualizaciones dinámicas de la campanita
      eventSource.addEventListener('unread_update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data.unread_count === 'number') {
            setUnreadCount(data.unread_count);
          }
        } catch (err) {
          console.error('Error parsing unread_update:', err);
        }
      });

      eventSource.onerror = () => {
        eventSource.close();

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          // Exponential backoff: 1s, 2s, 4s, 8s ... up to ~8.5min
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 60000);
          setError('Conexión de tiempo real interrumpida. Reintentando...');
          reconnectTimeout = setTimeout(connect, delay);
        } else {
          setError(null);
        }
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [appId]);

  const refetchUnreadCount = async () => {
    try {
      const data = await api.get<{ unread_count: number }>('/api/messages/unread-count');
      if (data) {
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error('Error refetching unread count:', err);
    }
  };

  return { messages, unreadCount, setUnreadCount, refetchUnreadCount, error };
}
