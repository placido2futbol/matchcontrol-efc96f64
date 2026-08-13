import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseWordExercises, detectLabel, isValidTitle } from "@/lib/trainingImport/docxParser";

const p = (t: string) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`;
const imgP = (rid: string) =>
  `<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="${rid}"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;

const row = (cells: string[]) =>
  `<w:tr>${cells.map((c) => `<w:tc>${c}</w:tc>`).join("")}</w:tr>`;

function ficha(title: string, rid?: string) {
  return `<w:tbl>${row([
    p(title) +
      p("EXPLICACIÓ") +
      p(`Descripció del joc ${title}`) +
      p("CONSIGNES") +
      p("Consigna A") +
      p("TEMPS TOTAL") +
      p("10'") +
      p("REPETICIONS") +
      p("3") +
      p("DESCANS") +
      p("1'"),
    rid ? imgP(rid) : p(""),
  ])}</w:tbl>`;
}

/** exercise whose fields continue in a second table (page break) */
function fichaSplit(title: string) {
  return (
    `<w:tbl>${row([p(title) + p("EXPLICACIÓ") + p("Primera part de la explicació")])}</w:tbl>` +
    `<w:p><w:r><w:br w:type="page"/></w:r></w:p>` +
    `<w:tbl>${row([p("Segona part de la explicació") + p("CONSIGNES") + p("Consigna B")])}</w:tbl>`
  );
}

async function buildDocx(bodyInner: string, media: string[] = []) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${bodyInner}</w:body></w:document>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${media
      .map(
        (m, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m}"/>`,
      )
      .join("")}</Relationships>`,
  );
  media.forEach((m) => zip.file(`word/media/${m}`, new Uint8Array([1, 2, 3])));
  return (await zip.generateAsync({ type: "arraybuffer" })) as ArrayBuffer;
}

describe("docx exercise importer", () => {
  it("detects labels in catalan and spanish", () => {
    expect(detectLabel("EXPLICACIÓ")?.key).toBe("explicacion");
    expect(detectLabel("Explicacion:")?.key).toBe("explicacion");
    expect(detectLabel("CONSIGNES")?.key).toBe("consignas");
    expect(detectLabel("Temps Total: 10'")).toEqual({ key: "tiempo_total", rest: "10'" });
    expect(detectLabel("Stop")).toBeNull();
  });

  it("rejects labels as titles", () => {
    expect(isValidTitle("CONSIGNES")).toBe(false);
    expect(isValidTitle("Pilla-pilla")).toBe(true);
  });

  it("creates one record per exercise and keeps images", async () => {
    const titles = ["Stop", "3 en ratlla", "Pilla-pilla", "Cadena"];
    const buf = await buildDocx(
      titles.map((t, i) => ficha(t, `rId${i + 1}`)).join(""),
      titles.map((_, i) => `image${i + 1}.png`),
    );
    const res = await parseWordExercises(buf, "Jocs adaptats");
    expect(res.exercises.map((e) => e.titulo)).toEqual(titles);
    expect(res.exercises.every((e) => e.imagen)).toBe(true);
    const first = res.exercises[0];
    expect(first.explicacion).toContain("Descripció del joc Stop");
    expect(first.consignas).toBe("Consigna A");
    expect(first.tiempo_total).toBe("10'");
    expect(first.repeticiones).toBe("3");
    expect(first.descanso).toBe("1'");
    expect(first.tematica).toBe("Jocs adaptats");
  });

  it("keeps an exercise split across pages as a single record", async () => {
    const buf = await buildDocx(ficha("Stop") + fichaSplit("Futbol Tennis") + ficha("Colors"));
    const res = await parseWordExercises(buf);
    expect(res.exercises.map((e) => e.titulo)).toEqual(["Stop", "Futbol Tennis", "Colors"]);
    const ft = res.exercises[1];
    expect(ft.explicacion).toContain("Primera part");
    expect(ft.explicacion).toContain("Segona part");
    expect(ft.consignas).toBe("Consigna B");
  });

  it("discards blocks without title or content and removes duplicates", async () => {
    const buf = await buildDocx(ficha("Stop") + ficha("Stop") + `<w:tbl>${row([p("EXPLICACIÓ")])}</w:tbl>`);
    const res = await parseWordExercises(buf);
    expect(res.exercises).toHaveLength(1);
    expect(res.discarded).toBeGreaterThan(0);
  });
});
