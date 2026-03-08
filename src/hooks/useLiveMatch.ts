import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchPlayer } from '@/components/match/PlayerRow';
import { MatchEvent } from '@/components/match/EventLog';

export interface LiveMatchState {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  timerSeconds: number;
  timerRunning: boolean;
  timerLastUpdate: number; // timestamp when timer state was last sent
  events: MatchEvent[];
  homePlayers: MatchPlayer[];
  awayPlayers: MatchPlayer[];
  halftimeResult: string;
  matchDate: string;
  matchTime: string;
  homeTeamCrest?: string;
  awayTeamCrest?: string;
  homeTeamKitHtml?: string;
  awayTeamKitHtml?: string;
  homeTeamKitUrl?: string;
  awayTeamKitUrl?: string;
}

export function useLiveBroadcast(sessionId: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`live-match-${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId]);

  const broadcast = useCallback((state: LiveMatchState) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'match-state',
      payload: state,
    });
  }, []);

  return { broadcast };
}

export function useLiveSubscription(
  sessionId: string | undefined,
  onState: (state: LiveMatchState) => void
) {
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`live-match-${sessionId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'match-state' }, ({ payload }) => {
        onState(payload as LiveMatchState);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, onState]);
}
