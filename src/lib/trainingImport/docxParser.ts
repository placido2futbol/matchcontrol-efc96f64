import JSZip from "jszip";
import type { ParsedExercise, ParsedExerciseImage, ParseResult, ExerciseLog } from "./types";

/* ------------------------------------------------------------------ */
/* Low level: read the DOCX package                                    */
/* ------------------------------------------------------------------ */

interface DocLine {
  text: string;
  /** structural container id (table row / body paragraph) */
  cid: string;
  /** global order */
  idx: number;
}

interface DocImage {
  cid: string;
  idx: number;
  rel: string;
  file: string;
}

interface DocElements {
  lines: DocLine[];
  images: DocImage[];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

type FieldKey =
  | "explicacion"
  | "consignas"
  | "tiempo_total"
  | "tiempo_parcial"
  | "repeticiones"
  | "descanso"
  | "material";

const LABELS: { key: FieldKey; re: RegExp }[] = [
  { key: "explicacion", re: /^expl?icaci(o|on|ó|ón)$/ },
  { key: "consignas", re: /^consign(es|as)$/ },
  { key: "tiempo_total", re: /^(temps|tiempo) total$/ },
  { key: "tiempo_parcial", re: /^(temps|tiempo) parcial$/ },
  { key: "repeticiones", re: /^repeticion(s|es)?$/ },
  { key: "descanso", re: /^descans(o)?$/ },
  { key: "material", re: /^material$/ },
];

/** Single-line fields: only the first line after the label belongs to them. */
const SINGLE_LINE: FieldKey[] = ["tiempo_total", "tiempo_parcial", "repeticiones", "descanso"];

export function detectLabel(raw: string): { key: FieldKey; rest: string } | null {
  const text = raw.trim();
  if (!text) return null;
  const colon = text.indexOf(":");
  const head = colon >= 0 ? text.slice(0, colon) : text;
  const rest = colon >= 0 ? text.slice(colon + 1).trim() : "";
  const n = norm(head);
  if (!n || n.length > 20) return null;
  for (const l of LABELS) {
    if (l.re.test(n)) return { key: l.key, rest };
  }
  return null;
}

export function isStructuralLabel(raw: string): boolean {
  return detectLabel(raw) !== null;
}

/* ------------------------------------------------------------------ */
/* Step 1 – linearise the document preserving order + structure        */
/* ------------------------------------------------------------------ */

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function local(node: Element) {
  return node.localName || node.nodeName.replace(/^.*:/, "");
}

export function extractDocumentElements(
  documentXml: string,
  relMap: Record<string, string>,
): DocElements {
  const doc = parseXml(documentXml);
  const body = Array.from(doc.documentElement.childNodes).find(
    (n) => n.nodeType === 1 && local(n as Element) === "body",
  ) as Element | undefined;

  const lines: DocLine[] = [];
  const images: DocImage[] = [];
  let idx = 0;
  let tblCount = 0;
  let pCount = 0;

  const paragraphText = (p: Element): string => {
    let out = "";
    const walk = (n: Element) => {
      for (const c of Array.from(n.childNodes)) {
        if (c.nodeType !== 1) continue;
        const el = c as Element;
        const name = local(el);
        if (name === "t") out += el.textContent ?? "";
        else if (name === "tab") out += " ";
        else if (name === "br") out += "\n";
        else walk(el);
      }
    };
    walk(p);
    return out;
  };

  const paragraphImages = (p: Element, cid: string) => {
    const blips = p.getElementsByTagName("*");
    for (const el of Array.from(blips)) {
      const name = local(el as Element);
      if (name !== "blip" && name !== "imagedata") continue;
      const e = el as Element;
      const rel =
        e.getAttribute("r:embed") ||
        e.getAttribute("r:link") ||
        e.getAttribute("r:id") ||
        e.getAttributeNS?.("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed") ||
        "";
      const file = relMap[rel];
      if (!file) continue;
      images.push({ cid, idx: idx++, rel, file });
    }
  };

  const walkContainer = (node: Element, cid: string) => {
    for (const c of Array.from(node.childNodes)) {
      if (c.nodeType !== 1) continue;
      const el = c as Element;
      const name = local(el);
      if (name === "p") {
        const ownCid = cid || `p${pCount++}`;
        paragraphImages(el, ownCid);
        const txt = paragraphText(el);
        for (const part of txt.split("\n")) {
          const t = part.replace(/\u00a0/g, " ").trim();
          if (t) lines.push({ text: t, cid: ownCid, idx: idx++ });
        }
      } else if (name === "tbl") {
        const tId = `${cid ? cid + "/" : ""}t${tblCount++}`;
        let rowIdx = 0;
        for (const trn of Array.from(el.childNodes)) {
          if (trn.nodeType !== 1) continue;
          const tr = trn as Element;
          if (local(tr) !== "tr") continue;
          walkContainer(tr, `${tId}r${rowIdx++}`);
        }
      } else if (name === "tc" || name === "sdt" || name === "sdtContent" || name === "txbxContent") {
        walkContainer(el, cid);
      } else if (el.childNodes.length) {
        walkContainer(el, cid);
      }
    }
  };

  if (body) walkContainer(body, "");
  return { lines, images };
}

/* ------------------------------------------------------------------ */
/* Step 2 – detect exercise blocks                                     */
/* ------------------------------------------------------------------ */

interface Block {
  titulo: string;
  fields: Record<FieldKey, string[]>;
  cids: string[];
  origen: string;
}

const emptyFields = (): Record<FieldKey, string[]> => ({
  explicacion: [],
  consignas: [],
  tiempo_total: [],
  tiempo_parcial: [],
  repeticiones: [],
  descanso: [],
  material: [],
});

export function isValidTitle(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (isStructuralLabel(t)) return false;
  if (t.length > 80) return false;
  if (/^[\d\W_]+$/.test(t) && !/[a-zA-Z]/.test(t)) return false;
  if (/^(fitxa|ficha|sessi[oó]|p[aà]gina|page)\b/i.test(t) && t.length < 12) return false;
  return true;
}

export function detectExerciseBlocks(lines: DocLine[]): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  let field: FieldKey | null = null;
  let candidates: string[] = [];

  // Pre-pass: a non-label line directly before an "EXPLICACIÓ" label is the title
  // of the exercise that starts there, never the value of the previous field.
  const titleLines = new Set<number>();
  for (let i = 1; i < lines.length; i++) {
    const lab = detectLabel(lines[i].text);
    if (!lab || lab.key !== "explicacion") continue;
    const prev = lines[i - 1];
    if (!detectLabel(prev.text) && isValidTitle(prev.text)) titleLines.add(i - 1);
  }

  const push = (titulo: string, cid: string) => {
    // the title line may have been appended to the previous exercise's last field
    if (current && titulo) {
      for (const key of Object.keys(current.fields) as FieldKey[]) {
        const arr = current.fields[key];
        if (arr.length && arr[arr.length - 1] === titulo) arr.pop();
      }
    }
    current = { titulo, fields: emptyFields(), cids: [cid], origen: cid };
    blocks.push(current);
    field = null;
  };


  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (titleLines.has(li)) {
      candidates = [line.text];
      continue;
    }

    const lab = detectLabel(line.text);
    if (lab) {
      const starts =
        lab.key === "explicacion" &&
        (!current || current.fields.explicacion.length > 0 || current.titulo === "");
      if (starts) {
        // the title is the last plausible line seen before EXPLICACIÓ
        const titulo = [...candidates].reverse().find(isValidTitle) ?? "";
        push(titulo, line.cid);
      }
      if (!current) push("", line.cid);
      field = lab.key;
      if (lab.rest) current!.fields[lab.key].push(lab.rest);
      if (!current!.cids.includes(line.cid)) current!.cids.push(line.cid);
      candidates = [];
      continue;
    }

    if (current && field) {
      const full = current.fields[field].length > 0 && SINGLE_LINE.includes(field);
      if (!full) {
        current.fields[field].push(line.text);
        if (!current.cids.includes(line.cid)) current.cids.push(line.cid);
        // long-form fields keep consuming; also keep as title candidate only if short
        if (SINGLE_LINE.includes(field)) candidates = [];
        else candidates = [line.text];
        continue;
      }
    }
    candidates.push(line.text);
    if (candidates.length > 6) candidates.shift();
    if (current && !current.cids.includes(line.cid)) current.cids.push(line.cid);
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/* Step 3 – images                                                      */
/* ------------------------------------------------------------------ */

function tableOf(cid: string) {
  const m = cid.match(/^(.*t\d+)r\d+$/);
  return m ? m[1] : null;
}

function assignImages(blocks: Block[], images: DocImage[]) {
  const used = new Set<number>();
  return blocks.map((b) => {
    const warnings: string[] = [];
    // 1) same structural container (table row / paragraph block)
    let found = images.find((im, i) => !used.has(i) && b.cids.includes(im.cid));
    // 2) same table
    if (!found) {
      const tables = new Set(b.cids.map(tableOf).filter(Boolean) as string[]);
      found = images.find((im, i) => !used.has(i) && tables.has(tableOf(im.cid) ?? ""));
      if (found) warnings.push("Imagen asociada por tabla, no por fila");
    }
    if (found) used.add(images.indexOf(found));
    return { block: b, image: found ?? null, warnings };
  });
}

/* ------------------------------------------------------------------ */
/* Step 4 – normalise + validate                                       */
/* ------------------------------------------------------------------ */

const joinField = (v: string[]) => v.join("\n").replace(/[ \t]+\n/g, "\n").trim();

export function validateExercise(e: ParsedExercise): boolean {
  if (!e.titulo || isStructuralLabel(e.titulo)) return false;
  const hasContent = !!(e.explicacion || e.consignas || e.imagen);
  return hasContent;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                   */
/* ------------------------------------------------------------------ */

export async function parseWordExercises(file: ArrayBuffer, tematica = ""): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(file);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("El archivo no es un .docx válido");
  const relsXml = (await zip.file("word/_rels/document.xml.rels")?.async("string")) ?? "";

  const relMap: Record<string, string> = {};
  if (relsXml) {
    const relDoc = parseXml(relsXml);
    for (const r of Array.from(relDoc.getElementsByTagName("*"))) {
      const el = r as Element;
      if (local(el) !== "Relationship") continue;
      const type = el.getAttribute("Type") ?? "";
      if (!type.endsWith("/image")) continue;
      const target = (el.getAttribute("Target") ?? "").replace(/^\/?word\//, "").replace(/^\.\.\//, "");
      relMap[el.getAttribute("Id") ?? ""] = `word/${target}`;
    }
  }

  const { lines, images } = extractDocumentElements(documentXml, relMap);
  const blocks = detectExerciseBlocks(lines);
  const withImages = assignImages(blocks, images);

  const exercises: ParsedExercise[] = [];
  let orden = 0;
  for (const { block, image, warnings } of withImages) {
    let imagen: ParsedExerciseImage | null = null;
    if (image) {
      const bin = await zip.file(image.file)?.async("uint8array");
      if (bin) {
        imagen = {
          source: image.file,
          ext: (image.file.split(".").pop() || "png").toLowerCase(),
          data: bin,
        };
      }
    }
    const log: ExerciseLog = {
      titulo_detectado: block.titulo,
      explicacion_detectada: block.fields.explicacion.length > 0,
      consignas_detectadas: block.fields.consignas.length > 0,
      imagen_detectada: !!imagen,
      origen: block.origen,
      warnings: [...warnings],
    };
    if (!block.titulo) log.warnings.push("No se ha detectado un título válido");

    const ex: ParsedExercise = {
      titulo: block.titulo,
      explicacion: joinField(block.fields.explicacion),
      consignas: joinField(block.fields.consignas),
      tiempo_total: joinField(block.fields.tiempo_total),
      tiempo_parcial: joinField(block.fields.tiempo_parcial),
      repeticiones: joinField(block.fields.repeticiones),
      descanso: joinField(block.fields.descanso),
      material: joinField(block.fields.material),
      imagen,
      tematica,
      subtematicas: [],
      orden: 0,
      log,
    };
    if (!validateExercise(ex)) continue;
    // duplicate guard (same title + same explanation)
    const dup = exercises.find(
      (p) => norm(p.titulo) === norm(ex.titulo) && norm(p.explicacion) === norm(ex.explicacion),
    );
    if (dup) continue;
    ex.orden = orden++;
    exercises.push(ex);
  }

  return { exercises, discarded: blocks.length - exercises.length, totalBlocks: blocks.length };
}
