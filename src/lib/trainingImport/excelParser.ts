import * as XLSX from "xlsx";
import type { ParsedExercise, ParseResult } from "./types";

const pick = (r: any, keys: string[]) => {
  for (const k of Object.keys(r)) {
    const n = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (keys.includes(n)) return String(r[k] ?? "").trim();
  }
  return "";
};

export function parseExcelExercises(buf: ArrayBuffer, tematica = ""): ParseResult {
  const wb = XLSX.read(buf, { type: "array" });
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const exercises: ParsedExercise[] = [];
  rows.forEach((r) => {
    const titulo = pick(r, ["nombre", "titulo", "title", "name", "exercici", "ejercicio"]);
    const explicacion = pick(r, ["descripcion", "explicacion", "explicacio", "description"]);
    const consignas = pick(r, ["consignas", "consignes"]);
    if (!titulo && !explicacion) return;
    exercises.push({
      titulo: titulo || "Sin nombre",
      explicacion,
      consignas,
      tiempo_total: pick(r, ["temps total", "tiempo total", "trabajo", "work"]),
      tiempo_parcial: pick(r, ["temps parcial", "tiempo parcial"]),
      repeticiones: pick(r, ["repeticions", "repeticiones", "reps"]),
      descanso: pick(r, ["descans", "descanso", "rest"]),
      material: pick(r, ["material"]),
      imagen: null,
      tematica,
      subtematicas: [],
      orden: exercises.length,
      log: {
        titulo_detectado: titulo,
        explicacion_detectada: !!explicacion,
        consignas_detectadas: !!consignas,
        imagen_detectada: false,
        origen: "excel",
        warnings: [],
      },
    });
  });
  return { exercises, discarded: rows.length - exercises.length, totalBlocks: rows.length };
}
