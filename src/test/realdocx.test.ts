import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseWordExercises } from "@/lib/trainingImport/docxParser";

describe("real docx", () => {
  it("parses", async () => {
    const buf = readFileSync("/tmp/jocs.docx");
    const res = await parseWordExercises(new Uint8Array(buf).buffer as ArrayBuffer);
    console.log("N", res.exercises.length, "disc", res.discarded, "blocks", res.totalBlocks);
    console.log(res.exercises.map((e:any,i:number)=>`${i+1}. ${e.titulo} | img:${e.imagen?.source} | expl:${(e.explicacion||"").length}`).join("\n"));
  }, 60000);
});
