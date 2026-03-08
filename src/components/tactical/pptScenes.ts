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
    // ===== ESCENA 1: 11 INICIAL (campo completo) =====
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
      halfPitch: false,
    },

    // ===== ESCENA 2: CÓRNERS EN CONTRA (medio campo, portería arriba) =====
    {
      id: generateId(),
      name: 'CÒRNERS EN CONTRA',
      halfPitch: true,
      players: [
        p('ABDE', 1, BLUE, 8, 3),           // poste corto, esquina sup-izq
        p('PORTERO', 1, PINK, 50, 5),        // portero en portería
        // M.ZONA (2,3,4) - línea horizontal cerca del área
        p('GARCI', 2, BLUE, 38, 18),
        p('FELIU', 3, BLUE, 50, 18),
        p('JUAN', 4, BLUE, 62, 18),
        // M.INDIVIDUAL (5,6,7) - línea horizontal debajo
        p('ARNAU', 5, BLUE, 38, 28),
        p('BEÑAT', 6, BLUE, 50, 28),
        p('PINO', 7, BLUE, 62, 28),
        // Caída - centro
        p('ISAAC', 8, BLUE, 50, 44),
        // Laterales abajo
        p('MANU', 9, BLUE, 15, 88),
        p('BIEL', 10, BLUE, 85, 88),
      ],
      drawings: [],
      labels: [
        label('M.ZONA', 22, 18, 'sm', 'transparent', '#ffffff'),
        label('M.INDIVIDUAL', 22, 28, 'sm', 'transparent', '#ffffff'),
        label('CAIDA', 38, 44, 'sm', 'transparent', '#ffffff'),
      ],
      ball: { x: 4, y: 2, visible: true },
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

    // ===== ESCENA 3: FALTA LATERAL EN CONTRA (medio campo) =====
    {
      id: generateId(),
      name: 'FALTA LATERAL EN CONTRA',
      halfPitch: true,
      players: [
        p('PORTERO', 1, PINK, 50, 5),        // portero arriba centro
        p('ISAAC', 2, BLUE, 15, 18),          // izquierda arriba
        // Barrera horizontal
        p('JUAN', 2, BLUE, 32, 35),
        p('GARCI', 3, BLUE, 40, 35),
        p('FELIU', 4, BLUE, 48, 35),
        p('ARNAU', 5, BLUE, 56, 35),
        // Extra blue en barrera
        p('', 0, BLUE, 64, 35),
        p('', 0, BLUE, 72, 35),
        p('', 0, BLUE, 78, 35),
        // Rival con balón
        p('RIVAL', 0, RED, 18, 48),
        // Laterales abajo
        p('MANU', 6, BLUE, 30, 85),
        p('BIEL', 7, BLUE, 70, 85),
      ],
      drawings: [],
      labels: [
        label('BARRERA', 82, 35, 'md', 'transparent', '#ffffff'),
      ],
      ball: { x: 20, y: 45, visible: true },
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

    // ===== ESCENA 4: FALTA FRONTAL EN CONTRA (medio campo) =====
    {
      id: generateId(),
      name: 'FALTA FRONTAL EN CONTRA',
      halfPitch: true,
      players: [
        p('PORTERO', 1, PINK, 50, 5),        // portero arriba centro
        // Barrera horizontal centrada
        p('', 0, BLUE, 18, 35),
        p('JUAN', 2, BLUE, 32, 35),
        p('GARCI', 3, BLUE, 40, 35),
        p('FELIU', 4, BLUE, 48, 35),
        p('ARNAU', 5, BLUE, 56, 35),
        p('', 0, BLUE, 64, 35),
        p('', 0, BLUE, 72, 35),
        p('', 0, BLUE, 78, 35),
        p('', 0, BLUE, 84, 35),
        // Rival con balón
        p('RIVAL', 0, RED, 42, 55),
        // Jugador atrás
        p('JUGADOR', 11, BLUE, 50, 92),
      ],
      drawings: [],
      labels: [],
      ball: { x: 38, y: 50, visible: true },
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

    // ===== ESCENA 5: FALTA FRONTAL A FAVOR (medio campo) =====
    {
      id: generateId(),
      name: 'FALTA FRONTAL A FAVOR',
      halfPitch: true,
      players: [
        p('PORTERO', 1, PINK, 50, 5),
        // Barrera rival
        p('', 0, RED, 32, 25),
        p('', 0, RED, 40, 25),
        p('', 0, RED, 48, 25),
        p('', 0, RED, 56, 25),
        p('', 0, RED, 64, 25),
        p('', 0, RED, 72, 25),
        p('', 0, RED, 78, 25),
        p('', 0, RED, 84, 25),
        p('', 0, RED, 12, 40),
        p('', 0, RED, 50, 92),
        // Nuestros lanzadores
        p('LANZADOR 1', 0, BLUE, 42, 42),
        p('LANZADOR 2', 0, BLUE, 54, 42),
        p('COBERTURA', 0, BLUE, 48, 58),
      ],
      drawings: [],
      labels: [],
      ball: { x: 46, y: 40, visible: true },
    },

    // ===== ESCENA 6: CÓRNER A FAVOR (medio campo) =====
    {
      id: generateId(),
      name: 'CORNER A FAVOR 2 CONTRA 1',
      halfPitch: true,
      players: [
        p('PORTERO', 1, PINK, 55, 5),        // portero rival
        p('ISAAC', 2, BLUE, 4, 5),            // lanzador esquina
        p('JUAN', 3, BLUE, 16, 5),            // corto
        p('MANU', 4, BLUE, 40, 10),           // cerca portería
        // Rematadores
        p('FELIU', 2, BLUE, 48, 28),
        p('BIEL', 3, BLUE, 56, 28),
        p('PINO', 4, BLUE, 64, 28),
        // Coberturas
        p('ARNAU', 5, BLUE, 38, 48),
        p('PEÑA', 6, BLUE, 62, 48),
        // Atrás
        p('GARCI', 7, BLUE, 38, 82),
        p('BEÑAT', 8, BLUE, 62, 82),
      ],
      drawings: [],
      labels: [],
      ball: { x: 3, y: 2, visible: true },
      legend: {
        entries: [
          { number: 2, name: 'FELIU' },
          { number: 3, name: 'BIEL' },
          { number: 4, name: 'PINO' },
        ],
      },
    },

    // ===== ESCENA 7: CÓRNER CON PANTALLA (medio campo) =====
    {
      id: generateId(),
      name: 'CORNER CON PANTALLA DE 3',
      halfPitch: true,
      players: [
        p('PORTERO', 1, PINK, 55, 5),        // portero rival
        p('JUAN', 2, BLUE, 30, 10),
        p('MANU', 3, BLUE, 55, 10),
        p('ISAAC', 4, BLUE, 92, 5),           // lanzador esquina derecha
        // Pantalla (2,3,4)
        p('BEÑAT', 2, BLUE, 50, 28),
        p('FELIU', 3, BLUE, 58, 28),
        p('BIEL', 4, BLUE, 66, 28),
        // Coberturas
        p('JUGADOR', 5, BLUE, 35, 42),
        p('JUGADOR', 6, BLUE, 60, 42),
        p('BIEL', 7, BLUE, 35, 55),
        p('ARNAU', 8, BLUE, 60, 55),
        // Atrás
        p('GARCI', 9, BLUE, 38, 88),
        p('BEÑAT', 10, BLUE, 68, 88),
      ],
      drawings: [],
      labels: [],
      ball: { x: 96, y: 2, visible: true },
      legend: {
        entries: [
          { number: 2, name: 'BEÑAT' },
          { number: 3, name: 'FELIU' },
          { number: 4, name: 'BIEL' },
        ],
      },
    },
  ];
}
