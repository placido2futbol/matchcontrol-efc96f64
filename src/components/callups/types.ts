export interface CallupPlayer {
  player_name: string;
  dorsal: string;
  photo_url: string;
  status: 'starter' | 'substitute' | 'not_called';
  position_order: number;
}

export interface Callup {
  id: string;
  team_id: string | null;
  match_date: string | null;
  match_time: string | null;
  callup_time: string | null;
  callup_location: string;
  opponent: string;
  notes: string;
  created_at: string;
  players: CallupPlayer[];
}

export const FORMATIONS: Record<string, { label: string; positions: { x: number; y: number }[] }> = {
  '4-3-3': {
    label: '4-3-3',
    positions: [
      { x: 50, y: 88 },
      { x: 15, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 85, y: 72 },
      { x: 25, y: 50 }, { x: 50, y: 46 }, { x: 75, y: 50 },
      { x: 20, y: 26 }, { x: 50, y: 20 }, { x: 80, y: 26 },
    ],
  },
  '4-4-2': {
    label: '4-4-2',
    positions: [
      { x: 50, y: 88 },
      { x: 15, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 85, y: 72 },
      { x: 15, y: 48 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 85, y: 48 },
      { x: 35, y: 24 }, { x: 65, y: 24 },
    ],
  },
  '3-5-2': {
    label: '3-5-2',
    positions: [
      { x: 50, y: 88 },
      { x: 25, y: 72 }, { x: 50, y: 74 }, { x: 75, y: 72 },
      { x: 10, y: 50 }, { x: 30, y: 48 }, { x: 50, y: 45 }, { x: 70, y: 48 }, { x: 90, y: 50 },
      { x: 35, y: 24 }, { x: 65, y: 24 },
    ],
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    positions: [
      { x: 50, y: 88 },
      { x: 15, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 85, y: 72 },
      { x: 35, y: 54 }, { x: 65, y: 54 },
      { x: 20, y: 36 }, { x: 50, y: 32 }, { x: 80, y: 36 },
      { x: 50, y: 16 },
    ],
  },
  '3-4-3': {
    label: '3-4-3',
    positions: [
      { x: 50, y: 88 },
      { x: 25, y: 72 }, { x: 50, y: 74 }, { x: 75, y: 72 },
      { x: 15, y: 50 }, { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 85, y: 50 },
      { x: 20, y: 24 }, { x: 50, y: 20 }, { x: 80, y: 24 },
    ],
  },
};

export type EditorTab = 'match' | 'players' | 'list' | 'export';
