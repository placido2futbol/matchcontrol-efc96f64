import { TacticalScene, TacticalPlayer, TextLabel, SceneLegend, generateId } from './types';

function p(name: string, number: number, color: string, x: number, y: number, team: 'home' | 'away' = 'home'): TacticalPlayer {
  return { id: generateId(), name, number, position: '', team, color, x, y, onField: true };
}

function label(text: string, x: number, y: number, fontSize: 'sm' | 'md' | 'lg' = 'md', bgColor = '#ffff00', color = '#000000'): TextLabel {
  return { id: generateId(), text, x, y, color, bgColor, fontSize };
}

const BLUE = '#3B82F6';
const PINK = '#F472B6';
const RED = '#EF4444';

export function createPPTScenes(): TacticalScene[] {
  return [
    // ===== ESCENA 1: 11 INICIAL =====
    {
      id: generateId(),
      name: '11 Inicial',
      players: [
        p('JAVI', 1, PINK, 5, 50),
        p('PINO', 2, BLUE, 24, 18),
        p('FELIU', 3, BLUE, 24, 42),
        p('GARCI', 4, BLUE, 28, 65),
        p('BEÑAT', 5, BLUE, 28, 86),
        p('ARNAU', 6, BLUE, 40, 50),
        p('ISAAC', 7, BLUE, 50, 35),
        p('JUAN', 8, BLUE, 52, 65),
        p('MANU', 9, BLUE, 68, 50),
        p('PEÑA', 10, BLUE, 70, 14),
        p('BIEL', 11, BLUE, 64, 82),
      ],
      drawings: [],
      labels: [
        label('11 INICIAL', 40, 5, 'lg', '#ffff00', '#ff0000'),
      ],
      ball: { x: 50, y: 50, visible: false },
    },

    // ===== ESCENA 2: CÓRNERS EN CONTRA =====
    {
      id: generateId(),
      name: 'CÒRNERS EN CONTRA',
      players: [
        p('ABDE', 1, BLUE, 8, 5),
        p('PORTERO', 1, PINK, 10, 12),
        p('GARCI', 2, BLUE, 16, 22),
        p('FELIU', 3, BLUE, 20, 22),
        p('JUAN', 4, BLUE, 24, 22),
        p('ARNAU', 5, BLUE, 16, 32),
        p('BEÑAT', 6, BLUE, 20, 32),
        p('PINO', 7, BLUE, 24, 32),
        p('ISAAC', 8, BLUE, 22, 48),
        p('MANU', 9, BLUE, 8, 88),
        p('BIEL', 10, BLUE, 38, 88),
      ],
      drawings: [],
      labels: [
        label('M.ZONA', 10, 18, 'sm', 'transparent', '#ffffff'),
        label('M.INDIVIDUAL', 10, 28, 'sm', 'transparent', '#ffffff'),
        label('CAIDA', 16, 45, 'sm', 'transparent', '#ffffff'),
      ],
      ball: { x: 3, y: 3, visible: true },
      legend: {
        entries: [
          { number: 2, name: 'GARCI', borderColor: '#ffff00' },
          { number: 3, name: 'FELIU', borderColor: '#ffff00' },
          { number: 4, name: 'JUAN', borderColor: '#ffff00' },
          { number: 5, name: 'ARNAU', borderColor: '#cc0000' },
          { number: 6, name: 'BEÑAT', borderColor: '#cc0000' },
          { number: 7, name: 'PINO', borderColor: '#cc0000' },
        ],
      },
    },

    // ===== ESCENA 3: FALTA LATERAL EN CONTRA =====
    {
      id: generateId(),
      name: 'FALTA LATERAL EN CONTRA',
      players: [
        p('PORTERO', 1, PINK, 10, 8),
        p('ISAAC', 2, BLUE, 12, 25),
        p('JUAN', 2, BLUE, 22, 32),
        p('GARCI', 3, BLUE, 26, 32),
        p('FELIU', 4, BLUE, 30, 32),
        p('ARNAU', 5, BLUE, 34, 32),
        p('RIVAL', 0, RED, 14, 45),
        p('MANU', 6, BLUE, 25, 78),
        p('BIEL', 7, BLUE, 48, 78),
      ],
      drawings: [],
      labels: [
        label('BARRERA', 38, 38, 'sm', 'transparent', '#ffffff'),
      ],
      ball: { x: 18, y: 42, visible: true },
      legend: {
        title: 'BARRERA',
        entries: [
          { number: 2, name: 'JUAN' },
          { number: 3, name: 'GARCI' },
          { number: 4, name: 'FELIU' },
          { number: 5, name: 'ARNAU' },
        ],
      },
    },

    // ===== ESCENA 4: FALTA FRONTAL EN CONTRA =====
    {
      id: generateId(),
      name: 'FALTA FRONTAL EN CONTRA',
      players: [
        p('PORTERO', 1, PINK, 52, 6),
        p('JUAN', 2, BLUE, 25, 30),
        p('GARCI', 3, BLUE, 29, 30),
        p('FELIU', 4, BLUE, 33, 30),
        p('ARNAU', 5, BLUE, 37, 30),
        p('', 0, BLUE, 44, 30),
        p('', 0, BLUE, 48, 30),
        p('', 0, BLUE, 52, 30),
        p('', 0, BLUE, 10, 30),
        p('RIVAL', 0, RED, 28, 48),
        p('JUGADOR', 11, BLUE, 42, 92),
      ],
      drawings: [],
      labels: [],
      ball: { x: 22, y: 45, visible: true },
      legend: {
        title: 'BARRERA',
        entries: [
          { number: 2, name: 'JUAN' },
          { number: 3, name: 'GARCI' },
          { number: 4, name: 'FELIU' },
          { number: 5, name: 'ARNAU' },
        ],
      },
    },

    // ===== ESCENA 5: FALTA FRONTAL A FAVOR =====
    {
      id: generateId(),
      name: 'FALTA FRONTAL A FAVOR',
      players: [
        p('PORTERO', 1, PINK, 52, 6),
        p('', 0, RED, 25, 22),
        p('', 0, RED, 29, 22),
        p('', 0, RED, 33, 22),
        p('', 0, RED, 37, 22),
        p('', 0, RED, 62, 22),
        p('', 0, RED, 66, 22),
        p('', 0, RED, 70, 22),
        p('', 0, RED, 74, 22),
        p('', 0, RED, 8, 38),
        p('', 0, RED, 50, 92),
        p('LANZADOR 1', 0, BLUE, 32, 42),
        p('LANZADOR 2', 0, BLUE, 42, 42),
        p('COBERTURA', 0, BLUE, 38, 58),
      ],
      drawings: [],
      labels: [],
      ball: { x: 36, y: 40, visible: true },
    },

    // ===== ESCENA 6: CÓRNER A FAVOR 2 CONTRA 1 =====
    {
      id: generateId(),
      name: 'CORNER A FAVOR 2 CONTRA 1',
      players: [
        p('PORTERO', 1, PINK, 50, 6),
        p('ISAAC', 2, BLUE, 6, 8),
        p('JUAN', 3, BLUE, 14, 8),
        p('MANU', 4, BLUE, 30, 12),
        p('FELIU', 2, BLUE, 42, 30),
        p('BIEL', 3, BLUE, 46, 30),
        p('PINO', 4, BLUE, 50, 30),
        p('ARNAU', 5, BLUE, 32, 48),
        p('PEÑA', 6, BLUE, 50, 48),
        p('GARCI', 7, BLUE, 36, 82),
        p('BEÑAT', 8, BLUE, 52, 82),
      ],
      drawings: [],
      labels: [],
      ball: { x: 4, y: 4, visible: true },
      legend: {
        entries: [
          { number: 2, name: 'FELIU' },
          { number: 3, name: 'BIEL' },
          { number: 4, name: 'PINO' },
        ],
      },
    },

    // ===== ESCENA 7: CÓRNER CON PANTALLA =====
    {
      id: generateId(),
      name: 'Córner con pantalla',
      players: [
        p('PORTERO', 1, PINK, 50, 6),
        p('JUAN', 2, BLUE, 20, 10),
        p('MANU', 3, BLUE, 48, 10),
        p('ISAAC', 4, BLUE, 78, 6),         // lanzador
        // Pantalla (2,3,4)
        p('BEÑAT', 2, BLUE, 40, 32),
        p('FELIU', 3, BLUE, 44, 32),
        p('BIEL', 4, BLUE, 48, 32),
        // Centro
        p('JUGADOR', 5, BLUE, 28, 45),
        p('JUGADOR', 6, BLUE, 46, 45),
        // Coberturas
        p('BIEL', 7, BLUE, 30, 58),
        p('ARNAU', 8, BLUE, 50, 58),
        // Atrás
        p('GARCI', 9, BLUE, 36, 90),
        p('BEÑAT', 10, BLUE, 56, 90),
      ],
      drawings: [],
      labels: [
        label('CÓRNER CON PANTALLA', 18, 8, 'lg'),
      ],
      ball: { x: 82, y: 4, visible: true },
    },
  ];
}
