export interface TacticalPlayer {
  id: string;
  name: string;
  number: number;
  position: string;
  team: 'home' | 'away' | 'neutral';
  color: string;
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

export interface LegendEntry {
  number: number;
  name: string;
  borderColor?: string; // defaults to yellow
}

export interface SceneLegend {
  title?: string;
  entries: LegendEntry[];
}

export interface TacticalScene {
  id: string;
  name: string;
  players: TacticalPlayer[];
  drawings: DrawingPath[];
  labels: TextLabel[];
  ball: BallPosition;
  legend?: SceneLegend;
  halfPitch?: boolean;
  titlePos?: { x: number; y: number };
  showCrest?: boolean;
}

export type DrawingTool = 'select' | 'arrow' | 'curved-arrow' | 'line' | 'dashed' | 'free' | 'eraser' | 'label' | 'ball';

// Predefined player colors
export const PLAYER_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
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
