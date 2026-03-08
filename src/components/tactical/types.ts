export interface TacticalPlayer {
  id: string;
  name: string;
  number: number;
  position: string;
  team: 'home' | 'away' | 'neutral';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  onField: boolean;
}

export interface DrawingPath {
  id: string;
  type: 'arrow' | 'curved-arrow' | 'line' | 'dashed' | 'free';
  points: { x: number; y: number }[];
  color: string;
}

export interface TacticalScene {
  id: string;
  name: string;
  players: TacticalPlayer[];
  drawings: DrawingPath[];
}

export type DrawingTool = 'select' | 'arrow' | 'curved-arrow' | 'line' | 'dashed' | 'free' | 'eraser';

export interface Formation {
  name: string;
  positions: { x: number; y: number }[];
}

export const FORMATIONS: Record<string, Formation> = {
  '4-3-3': {
    name: '4-3-3',
    positions: [
      { x: 8, y: 50 },
      { x: 22, y: 15 }, { x: 22, y: 38 }, { x: 22, y: 62 }, { x: 22, y: 85 },
      { x: 42, y: 25 }, { x: 42, y: 50 }, { x: 42, y: 75 },
      { x: 60, y: 20 }, { x: 60, y: 50 }, { x: 60, y: 80 },
    ],
  },
  '4-4-2': {
    name: '4-4-2',
    positions: [
      { x: 8, y: 50 },
      { x: 22, y: 15 }, { x: 22, y: 38 }, { x: 22, y: 62 }, { x: 22, y: 85 },
      { x: 42, y: 15 }, { x: 42, y: 38 }, { x: 42, y: 62 }, { x: 42, y: 85 },
      { x: 60, y: 35 }, { x: 60, y: 65 },
    ],
  },
  '3-5-2': {
    name: '3-5-2',
    positions: [
      { x: 8, y: 50 },
      { x: 22, y: 25 }, { x: 22, y: 50 }, { x: 22, y: 75 },
      { x: 38, y: 10 }, { x: 38, y: 30 }, { x: 38, y: 50 }, { x: 38, y: 70 }, { x: 38, y: 90 },
      { x: 58, y: 35 }, { x: 58, y: 65 },
    ],
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    positions: [
      { x: 8, y: 50 },
      { x: 22, y: 15 }, { x: 22, y: 38 }, { x: 22, y: 62 }, { x: 22, y: 85 },
      { x: 38, y: 35 }, { x: 38, y: 65 },
      { x: 52, y: 20 }, { x: 52, y: 50 }, { x: 52, y: 80 },
      { x: 64, y: 50 },
    ],
  },
  'Futsal': {
    name: 'Futsal',
    positions: [
      { x: 10, y: 50 },
      { x: 30, y: 25 }, { x: 30, y: 75 },
      { x: 50, y: 50 },
      { x: 65, y: 50 },
    ],
  },
};

export const TEAM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  home: { bg: 'hsl(145, 63%, 32%)', text: '#fff', border: 'hsl(145, 63%, 22%)' },
  away: { bg: 'hsl(0, 72%, 51%)', text: '#fff', border: 'hsl(0, 72%, 41%)' },
  neutral: { bg: 'hsl(38, 92%, 50%)', text: '#fff', border: 'hsl(38, 92%, 40%)' },
};

let idCounter = 0;
export function generateId(): string {
  return `tb-${Date.now()}-${++idCounter}`;
}

export function createDefaultPlayers(): TacticalPlayer[] {
  const players: TacticalPlayer[] = [];
  const formation = FORMATIONS['4-3-3'];
  for (let i = 0; i < 11; i++) {
    const pos = formation.positions[i];
    players.push({
      id: generateId(),
      name: `Player ${i + 1}`,
      number: i + 1,
      position: i === 0 ? 'GK' : i <= 4 ? 'DEF' : i <= 7 ? 'MID' : 'FWD',
      team: 'home',
      x: pos.x,
      y: pos.y,
      onField: true,
    });
  }
  // Bench players
  for (let i = 12; i <= 25; i++) {
    players.push({
      id: generateId(),
      name: `Player ${i}`,
      number: i,
      position: 'SUB',
      team: 'home',
      x: 0,
      y: 0,
      onField: false,
    });
  }
  return players;
}
