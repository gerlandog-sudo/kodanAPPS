import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@kodan-apps/ui-core';
import { Play, Square, X } from 'lucide-react';

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

  const handleDiscard = useCallback(() => {
    setSeconds(0);
    setRunning(false);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!running ? (
        <Button 
          variant="secondary" 
          onClick={() => setRunning(true)}
          className="flex items-center gap-2 h-11 px-4 font-semibold shadow-sm"
        >
          <Play size={15} className="fill-current text-primary" />
          <span>Timer: {formatTime(seconds)}</span>
        </Button>
      ) : (
        <div className="flex items-center gap-1.5">
          <Button 
            variant="primary" 
            onClick={handleSave}
            className="flex items-center gap-2 h-11 px-4 font-semibold shadow-sm animate-pulse"
            style={{ backgroundColor: 'var(--sys-success, #10b981)', color: '#fff' }}
          >
            <Square size={14} className="fill-current" />
            <span>Timer: {formatTime(seconds)} (Guardar)</span>
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDiscard}
            title="Descartar tiempo"
            className="flex items-center justify-center w-11 h-11 p-0 shrink-0"
          >
            <X size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
