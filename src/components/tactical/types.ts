export interface TacticalPlayer {
  id: string;
  name: string;
  number: number;
  position: string;
  team: 'home' | 'away' | 'neutral';
  color: string; // custom hex color
  x: number;
  y: number;
  onField: boolean;
}

export interface DrawingPath {
  id: string;
  type: 'arrow' | 'curved-arrow' | 'line' | 'dashed' | 'free';
  points: { x: number; y: number }[];
  color: string;
}

export interface TextLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  bgColor: string;
  fontSize: 'sm' | 'md' | 'lg';
}

export interface BallPosition {
  x: number;
  y: number;
  visible: boolean;
}

export interface TacticalScene {
  id: string;
  name: string;
  players: TacticalPlayer[];
  drawings: DrawingPath[];
  labels: TextLabel[];
  ball: BallPosition;
}

export type DrawingTool = 'select' | 'arrow' | 'curved-arrow' | 'line' | 'dashed' | 'free' | 'eraser' | 'label' | 'ball';

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

// Predefined player colors
export const PLAYER_COLORS = [
  '#3B82F6', // blue (default home)
  '#EF4444', // red (opponent)
  '#F472B6', // pink (goalkeeper)
  '#FBBF24', // yellow
  '#10B981', // green
  '#8B5CF6', // purple
  '#F97316', // orange
  '#06B6D4', // cyan
  '#FFFFFF', // white
  '#1F2937', // dark
];

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
      color: i === 0 ? '#F472B6' : '#3B82F6', // pink for GK, blue for rest
      x: pos.x,
      y: pos.y,
      onField: true,
    });
  }
  for (let i = 12; i <= 25; i++) {
    players.push({
      id: generateId(),
      name: `Player ${i}`,
      number: i,
      position: 'SUB',
      team: 'home',
      color: '#3B82F6',
      x: 0,
      y: 0,
      onField: false,
    });
  }
  return players;
}

// Set piece templates
export const SET_PIECE_TEMPLATES: Record<string, { name: string; players: Partial<TacticalPlayer>[]; labels: TextLabel[]; ball: BallPosition }> = {
  'corner-favor': {
    name: 'Córner a favor',
    ball: { x: 96, y: 5, visible: true },
    labels: [
      { id: 'l1', text: 'CÓRNER A FAVOR', x: 80, y: 8, color: '#ff0000', bgColor: '#ffff00', fontSize: 'lg' },
    ],
    players: [
      { number: 1, name: 'Portero', position: 'GK', color: '#F472B6', x: 8, y: 50, onField: true },
      { number: 2, name: 'Rematador 1', color: '#3B82F6', x: 78, y: 30, onField: true },
      { number: 3, name: 'Rematador 2', color: '#3B82F6', x: 78, y: 40, onField: true },
      { number: 4, name: 'Rematador 3', color: '#3B82F6', x: 78, y: 50, onField: true },
      { number: 5, name: 'Lanzador', color: '#3B82F6', x: 94, y: 8, onField: true },
      { number: 6, name: 'Corto', color: '#3B82F6', x: 88, y: 12, onField: true },
      { number: 7, name: 'Rechace 1', color: '#3B82F6', x: 68, y: 35, onField: true },
      { number: 8, name: 'Rechace 2', color: '#3B82F6', x: 68, y: 55, onField: true },
      { number: 9, name: 'Defensa 1', color: '#3B82F6', x: 40, y: 35, onField: true },
      { number: 10, name: 'Defensa 2', color: '#3B82F6', x: 40, y: 65, onField: true },
      { number: 11, name: 'Defensa 3', color: '#3B82F6', x: 22, y: 50, onField: true },
    ],
  },
  'corner-contra': {
    name: 'Córner en contra',
    ball: { x: 4, y: 5, visible: true },
    labels: [
      { id: 'l1', text: 'CÓRNER EN CONTRA', x: 15, y: 8, color: '#ff0000', bgColor: '#ffff00', fontSize: 'lg' },
      { id: 'l2', text: 'M.ZONA', x: 22, y: 22, color: '#000', bgColor: 'transparent', fontSize: 'sm' },
      { id: 'l3', text: 'M.INDIVIDUAL', x: 22, y: 35, color: '#000', bgColor: 'transparent', fontSize: 'sm' },
    ],
    players: [
      { number: 1, name: 'Portero', position: 'GK', color: '#F472B6', x: 8, y: 12, onField: true },
      { number: 2, name: 'Zona 1', color: '#3B82F6', x: 16, y: 26, onField: true },
      { number: 3, name: 'Zona 2', color: '#3B82F6', x: 20, y: 26, onField: true },
      { number: 4, name: 'Zona 3', color: '#3B82F6', x: 24, y: 26, onField: true },
      { number: 5, name: 'Individual 1', color: '#3B82F6', x: 16, y: 38, onField: true },
      { number: 6, name: 'Individual 2', color: '#3B82F6', x: 20, y: 38, onField: true },
      { number: 7, name: 'Individual 3', color: '#3B82F6', x: 24, y: 38, onField: true },
      { number: 8, name: 'Caída', color: '#3B82F6', x: 20, y: 50, onField: true },
      { number: 9, name: 'Lateral 1', color: '#3B82F6', x: 6, y: 85, onField: true },
      { number: 10, name: 'Lateral 2', color: '#3B82F6', x: 35, y: 85, onField: true },
    ],
  },
  'falta-lateral-contra': {
    name: 'Falta lateral en contra',
    ball: { x: 15, y: 15, visible: true },
    labels: [
      { id: 'l1', text: 'FALTA LATERAL EN CONTRA', x: 70, y: 8, color: '#000', bgColor: '#ffff00', fontSize: 'lg' },
      { id: 'l2', text: 'BARRERA', x: 38, y: 38, color: '#000', bgColor: 'transparent', fontSize: 'sm' },
    ],
    players: [
      { number: 1, name: 'Portero', position: 'GK', color: '#F472B6', x: 8, y: 12, onField: true },
      { number: 2, name: 'Barrera 1', color: '#3B82F6', x: 20, y: 32, onField: true },
      { number: 3, name: 'Barrera 2', color: '#3B82F6', x: 23, y: 32, onField: true },
      { number: 4, name: 'Barrera 3', color: '#3B82F6', x: 26, y: 32, onField: true },
      { number: 5, name: 'Barrera 4', color: '#3B82F6', x: 29, y: 32, onField: true },
      { number: 6, name: 'Marca 1', color: '#3B82F6', x: 12, y: 25, onField: true },
      { number: 7, name: 'Marca 2', color: '#EF4444', x: 10, y: 45, onField: true },
      { number: 8, name: 'Lateral 1', color: '#3B82F6', x: 20, y: 75, onField: true },
      { number: 9, name: 'Lateral 2', color: '#3B82F6', x: 35, y: 75, onField: true },
    ],
  },
  'falta-frontal-favor': {
    name: 'Falta frontal a favor',
    ball: { x: 60, y: 50, visible: true },
    labels: [
      { id: 'l1', text: 'FALTA FRONTAL A FAVOR', x: 70, y: 8, color: '#000', bgColor: '#ffff00', fontSize: 'lg' },
    ],
    players: [
      { number: 1, name: 'Portero', position: 'GK', color: '#F472B6', x: 8, y: 50, onField: true },
      { number: 2, name: 'Lanzador 1', color: '#3B82F6', x: 58, y: 45, onField: true },
      { number: 3, name: 'Lanzador 2', color: '#3B82F6', x: 58, y: 55, onField: true },
      { number: 4, name: 'Rematador 1', color: '#3B82F6', x: 72, y: 35, onField: true },
      { number: 5, name: 'Rematador 2', color: '#3B82F6', x: 72, y: 50, onField: true },
      { number: 6, name: 'Rematador 3', color: '#3B82F6', x: 72, y: 65, onField: true },
      { number: 7, name: 'Cobertura 1', color: '#3B82F6', x: 40, y: 35, onField: true },
      { number: 8, name: 'Cobertura 2', color: '#3B82F6', x: 40, y: 65, onField: true },
      { number: 9, name: 'Defensa 1', color: '#3B82F6', x: 22, y: 35, onField: true },
      { number: 10, name: 'Defensa 2', color: '#3B82F6', x: 22, y: 65, onField: true },
    ],
  },
};
