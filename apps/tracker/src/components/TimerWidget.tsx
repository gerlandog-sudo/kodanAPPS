import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@kodan-apps/ui-core';
import { Play, Square, Clock } from 'lucide-react';

interface TimerWidgetProps {
  onSave: (durationMinutes: number) => void;
  className?: string;
}

export function TimerWidget({ onSave, className = '' }: TimerWidgetProps) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const handleSave = useCallback(() => {
    const mins = Math.max(1, Math.round(seconds / 60));
    onSave(mins);
    setSeconds(0);
    setRunning(false);
  }, [seconds, onSave]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${className}`}
      style={{ borderColor: 'var(--sys-border-soft)', background: 'var(--sys-surface)' }}
    >
      <Clock size={18} style={{ color: 'var(--sys-text-muted)' }} />
      <span className="font-mono text-lg tabular-nums tracking-wider" style={{ color: 'var(--sys-text)' }}>
        {formatTime(seconds)}
      </span>
      {!running ? (
        <Button variant="primary" onClick={() => setRunning(true)}>
          <Play size={14} />
        </Button>
      ) : (
        <>
          <Button variant="danger" onClick={() => { setRunning(false); setSeconds(0); }}>
            <Square size={14} />
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Guardar ({Math.max(1, Math.round(seconds / 60))} min)
          </Button>
        </>
      )}
    </div>
  );
}
