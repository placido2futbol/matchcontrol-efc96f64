import { useState, useEffect, useRef } from 'react';
import { MatchEvent } from './EventLog';

interface Notification {
  id: number;
  event: MatchEvent;
  visible: boolean;
}

const DISPLAY_MS = 4000;
const RELEVANT_TYPES = ['goal', 'yellow', 'second_yellow', 'red', 'substitution'];

export default function LiveEventNotification({ events }: { events: MatchEvent[] }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevCountRef = useRef(events.length);
  const idRef = useRef(0);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    if (events.length > prevCount) {
      const newEvents = events.slice(prevCount);
      const relevant = newEvents.filter(e => RELEVANT_TYPES.includes(e.type));

      if (relevant.length > 0) {
        const newNotifs = relevant.map(event => ({
          id: ++idRef.current,
          event,
          visible: true,
        }));
        setNotifications(prev => [...prev, ...newNotifs]);

        // Auto-dismiss
        const ids = newNotifs.map(n => n.id);
        setTimeout(() => {
          setNotifications(prev =>
            prev.map(n => ids.includes(n.id) ? { ...n, visible: false } : n)
          );
        }, DISPLAY_MS);
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
        }, DISPLAY_MS + 500);
      }
    }
    prevCountRef.current = events.length;
  }, [events]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col items-center justify-center gap-3">
      {notifications.map(n => (
        <NotificationCard key={n.id} event={n.event} visible={n.visible} />
      ))}
    </div>
  );
}

function NotificationCard({ event, visible }: { event: MatchEvent; visible: boolean }) {
  const isGoal = event.type === 'goal';
  const isYellow = event.type === 'yellow';
  const isSecondYellow = event.type === 'second_yellow';
  const isRed = event.type === 'red' || isSecondYellow;
  const isSub = event.type === 'substitution';

  const bgClass = isGoal
    ? 'bg-primary/95 border-primary'
    : isRed
      ? 'bg-destructive/95 border-destructive'
      : isSub
        ? 'bg-accent/95 border-accent'
        : 'bg-warning/95 border-warning';

  const icon = isGoal ? '⚽' : isSub ? '🔄' : isYellow ? '🟨' : '🟥';
  const label = isGoal
    ? '¡GOOOL!'
    : isSecondYellow
      ? 'DOBLE AMARILLA · ROJA'
      : isYellow
        ? 'TARJETA AMARILLA'
        : isRed
          ? 'TARJETA ROJA'
          : 'CAMBIO';

  return (
    <div
      className={`
        pointer-events-auto rounded-2xl border-2 shadow-2xl px-8 py-6
        flex flex-col items-center gap-2 min-w-[260px] max-w-[360px]
        transition-all duration-500
        ${bgClass}
        ${visible ? 'animate-scale-in opacity-100' : 'animate-fade-out opacity-0'}
      `}
    >
      <span className="text-5xl">{icon}</span>
      <span className="text-lg font-display font-bold text-primary-foreground tracking-wider uppercase">
        {label}
      </span>
      {/* Player initial circle as avatar placeholder */}
      <div className="w-16 h-16 rounded-full bg-background/20 border-2 border-background/40 flex items-center justify-center">
        <span className="text-2xl font-bold text-primary-foreground">
          {event.playerName?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
      <span className="text-base font-semibold text-primary-foreground text-center">
        {event.playerName}
      </span>
      <span className="text-xs text-primary-foreground/70">
        {event.teamSide === 'home' ? 'Local' : 'Visitante'} · Min {Math.floor(event.minute / 60)}′
      </span>
    </div>
  );
}
