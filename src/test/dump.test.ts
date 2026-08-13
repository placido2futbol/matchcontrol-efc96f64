import { describe, it } from "vitest";
import { readFileSync } from "fs";
import JSZip from "jszip";
import { extractDocumentElements } from "@/lib/trainingImport/docxParser";

describe("dump", () => {
  it("lines", async () => {
    const buf = readFileSync("/tmp/jocs.docx");
    const zip = await JSZip.loadAsync(new Uint8Array(buf).buffer as ArrayBuffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
    const els: any = extractDocumentElements(xml, rels as any);
    const arr = Array.isArray(els) ? els : els.lines;
    console.log("COUNT", arr.length);
    console.log(arr.map((l: any, i: number) => `${i}|${l.container ?? l.origin ?? ""}|${l.image ? "IMG:"+l.image : ""}|${(l.text||"").slice(0,90)}`).join("\n"));
  }, 60000);
});
