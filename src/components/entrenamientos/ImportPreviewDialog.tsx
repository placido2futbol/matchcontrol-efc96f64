import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ImageOff } from "lucide-react";
import type { ParsedExercise, ParseResult } from "@/lib/trainingImport/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: ParseResult | null;
  fileName: string;
  importing: boolean;
  onConfirm: (exercises: ParsedExercise[], tematica: string) => void;
}

export default function ImportPreviewDialog({ open, onOpenChange, result, fileName, importing, onConfirm }: Props) {
  const [items, setItems] = useState<ParsedExercise[]>([]);
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [tematica, setTematica] = useState("");
  const [key, setKey] = useState("");

  // reset when a new parse result arrives
  const signature = `${fileName}:${result?.exercises.length ?? 0}:${result?.totalBlocks ?? 0}`;
  if (signature !== key && result) {
    setKey(signature);
    setItems(result.exercises.map((e) => ({ ...e })));
    setSkipped({});
    setTematica(result.exercises[0]?.tematica || fileName.replace(/\.[^.]+$/, ""));
  }

  const previews = useMemo(() => {
    const urls: (string | null)[] = items.map((e) =>
      e.imagen ? URL.createObjectURL(new Blob([new Uint8Array(e.imagen.data)])) : null,
    );
    return urls;
  }, [items]);

  const selected = items.filter((_, i) => !skipped[i]);
  const withImage = selected.filter((e) => e.imagen).length;

  const update = (i: number, patch: Partial<ParsedExercise>) =>
    setItems((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Previsualización de importación</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3 text-sm">
          <div className="flex-1 min-w-[220px]">
            <Label>Temática (se aplica a todos)</Label>
            <Input value={tematica} onChange={(e) => setTematica(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{items.length} detectados</Badge>
            <Badge variant="secondary">{selected.length} a importar</Badge>
            <Badge variant="outline">{withImage} con imagen</Badge>
            {result && result.discarded > 0 && <Badge variant="outline">{result.discarded} descartados</Badge>}
          </div>
        </div>

        <div className="space-y-3">
          {items.map((e, i) => (
            <div key={i} className={`rounded-lg border p-3 ${skipped[i] ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={!skipped[i]}
                  onCheckedChange={(v) => setSkipped((p) => ({ ...p, [i]: !v }))}
                  className="mt-2"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={e.titulo}
                      onChange={(ev) => update(i, { titulo: ev.target.value })}
                      className="h-8 font-semibold flex-1 min-w-[180px]"
                    />
                    {e.log.warnings.map((w, k) => (
                      <Badge key={k} variant="outline" className="text-[10px] gap-1">
                        <AlertTriangle className="h-3 w-3" /> {w}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Explicación</Label>
                      <Textarea
                        rows={3}
                        value={e.explicacion}
                        onChange={(ev) => update(i, { explicacion: ev.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Consignas</Label>
                      <Textarea
                        rows={3}
                        value={e.consignas}
                        onChange={(ev) => update(i, { consignas: ev.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {e.tiempo_total && <Badge variant="outline" className="text-[10px]">Total: {e.tiempo_total}</Badge>}
                    {e.tiempo_parcial && <Badge variant="outline" className="text-[10px]">Parcial: {e.tiempo_parcial}</Badge>}
                    {e.repeticiones && <Badge variant="outline" className="text-[10px]">Rep: {e.repeticiones}</Badge>}
                    {e.descanso && <Badge variant="outline" className="text-[10px]">Descanso: {e.descanso}</Badge>}
                    {e.material && <Badge variant="outline" className="text-[10px]">Material: {e.material}</Badge>}
                  </div>
                </div>
                <div className="w-24 shrink-0">
                  {previews[i] ? (
                    <img src={previews[i]!} alt={e.titulo} className="w-24 h-20 object-cover rounded border" />
                  ) : (
                    <div className="w-24 h-20 rounded border grid place-items-center text-muted-foreground">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">No se ha detectado ningún ejercicio en el documento.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(selected, tematica)} disabled={importing || selected.length === 0}>
            {importing ? "Importando..." : `Importar ${selected.length} ejercicios`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
