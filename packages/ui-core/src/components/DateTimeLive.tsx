import { useState, useEffect } from 'react';

function useDateTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return now;
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function DateTimeLive() {
  const now = useDateTime();

  const datePart = dateFormatter.format(now);
  const timePart = timeFormatter.format(now);

  return (
    <time className="text-sm text-text-muted font-medium" dateTime={now.toISOString()} title={datePart}>
      {datePart} &bull; {timePart}
    </time>
  );
}
