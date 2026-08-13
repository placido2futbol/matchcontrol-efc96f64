import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseWordExercises } from "@/lib/trainingImport/docxParser";

describe("real docx", () => {
  it("parses", async () => {
    const buf = readFileSync("/tmp/jocs.docx");
    const res = await parseWordExercises(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    console.log(JSON.stringify(res, (k,v)=> k==="data"||k==="blob"||k==="bytes"?"[bin]":v, 1).slice(0, 12000));
  }, 60000);
});
