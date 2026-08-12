export interface ParsedExerciseImage {
  /** Original file name inside the DOCX (e.g. media/image3.png) */
  source: string;
  ext: string;
  /** Raw bytes, used to upload to storage */
  data: Uint8Array;
  /** Object URL for preview (created lazily in the browser) */
  previewUrl?: string;
}

export interface ParsedExercise {
  titulo: string;
  explicacion: string;
  consignas: string;
  tiempo_total: string;
  tiempo_parcial: string;
  repeticiones: string;
  descanso: string;
  material: string;
  imagen: ParsedExerciseImage | null;
  tematica: string;
  subtematicas: string[];
  orden: number;
  /** Diagnostics, kept for debugging – not shown raw to the user */
  log: ExerciseLog;
}

export interface ExerciseLog {
  titulo_detectado: string;
  explicacion_detectada: boolean;
  consignas_detectadas: boolean;
  imagen_detectada: boolean;
  origen: string;
  warnings: string[];
}

export interface ParseResult {
  exercises: ParsedExercise[];
  discarded: number;
  totalBlocks: number;
}
