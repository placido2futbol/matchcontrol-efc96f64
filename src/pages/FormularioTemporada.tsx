import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, Trophy, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const POSICIONES = [
  'Portero', 'Lateral derecho', 'Central', 'Lateral izquierdo',
  'Mediocentro defensivo', 'Mediocentro', 'Interior',
  'Extremo derecho', 'Extremo izquierdo', 'Media punta', 'Delantero',
];

interface FormState {
  nombre_completo: string;
  fecha_nacimiento: string;
  telefono: string;
  posicion_principal: string;
  posicion_alternativa: string;
  continuar_equipo: string;
  motivo_no_continuar: string;
  disponible_12_agosto: string;
  fecha_incorporacion: string;
  compromisos_agosto: string;
  observaciones: string;
}

const initialState: FormState = {
  nombre_completo: '',
  fecha_nacimiento: '',
  telefono: '',
  posicion_principal: '',
  posicion_alternativa: 'Ninguna',
  continuar_equipo: '',
  motivo_no_continuar: '',
  disponible_12_agosto: '',
  fecha_incorporacion: '',
  compromisos_agosto: '',
  observaciones: '',
};

export default function FormularioTemporada() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const progress = useMemo(() => {
    const required = [
      form.nombre_completo, form.fecha_nacimiento, form.telefono,
      form.posicion_principal, form.continuar_equipo, form.disponible_12_agosto,
    ];
    const completed = required.filter(v => v && v.trim() !== '').length;
    return Math.round((completed / required.length) * 100);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_completo.trim() || !form.fecha_nacimiento || !form.telefono.trim() ||
        !form.posicion_principal || !form.continuar_equipo || !form.disponible_12_agosto) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nombre_completo: form.nombre_completo.trim(),
        fecha_nacimiento: form.fecha_nacimiento,
        telefono: form.telefono.trim(),
        posicion_principal: form.posicion_principal,
        posicion_alternativa: form.posicion_alternativa === 'Ninguna' ? null : form.posicion_alternativa,
        continuar_equipo: form.continuar_equipo,
        motivo_no_continuar: form.continuar_equipo === 'No' ? form.motivo_no_continuar.trim() || null : null,
        disponible_12_agosto: form.disponible_12_agosto,
        fecha_incorporacion: form.disponible_12_agosto === 'No' && form.fecha_incorporacion ? form.fecha_incorporacion : null,
        compromisos_agosto: form.compromisos_agosto.trim() || null,
        observaciones: form.observaciones.trim() || null,
      };
      const { error } = await supabase.from('formulario_temporada_2026_2027').insert(payload);
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error('Error al enviar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto rounded-full bg-success/15 p-4 w-fit">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h2 className="font-display text-2xl">¡Gracias!</h2>
            <p className="text-muted-foreground">
              Gracias por completar el formulario. Tu respuesta ha sido registrada correctamente.
            </p>
            <Button
              variant="outline"
              onClick={() => { setForm(initialState); setSubmitted(false); }}
              className="mt-4"
            >
              Enviar otra respuesta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div className="text-center space-y-2 py-4">
        <div className="mx-auto rounded-full bg-primary/15 p-3 w-fit">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl">Formulario Temporada 2026/2027</h1>
        <p className="text-sm text-muted-foreground">Rellena el cuestionario en menos de 3 minutos</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span>Progreso</span>
            <span className="text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 pb-6 space-y-6">

            {/* 1. Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">1. Nombre y apellidos <span className="text-destructive">*</span></Label>
              <Input
                id="nombre" required maxLength={150}
                value={form.nombre_completo}
                onChange={e => set('nombre_completo', e.target.value)}
                placeholder="Ej. Juan García López"
              />
            </div>

            {/* 2. Fecha nacimiento */}
            <div className="space-y-2">
              <Label htmlFor="fnac">2. Fecha de nacimiento <span className="text-destructive">*</span></Label>
              <Input
                id="fnac" type="date" required
                value={form.fecha_nacimiento}
                onChange={e => set('fecha_nacimiento', e.target.value)}
              />
            </div>

            {/* 3. Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="tel">3. Teléfono de contacto <span className="text-destructive">*</span></Label>
              <Input
                id="tel" type="tel" required maxLength={30} inputMode="tel"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                placeholder="Ej. 612 345 678"
              />
            </div>

            {/* 4. Posición principal */}
            <div className="space-y-2">
              <Label>4. Posición principal <span className="text-destructive">*</span></Label>
              <Select value={form.posicion_principal} onValueChange={v => set('posicion_principal', v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona una posición" /></SelectTrigger>
                <SelectContent>
                  {POSICIONES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Posición alternativa */}
            <div className="space-y-2">
              <Label>5. Posición alternativa</Label>
              <Select value={form.posicion_alternativa} onValueChange={v => set('posicion_alternativa', v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona una opción" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ninguna">Ninguna</SelectItem>
                  {POSICIONES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* 6. Continuar */}
            <div className="space-y-3">
              <Label>6. ¿Tienes intención de continuar en el equipo la próxima temporada? <span className="text-destructive">*</span></Label>
              <RadioGroup value={form.continuar_equipo} onValueChange={v => set('continuar_equipo', v)}>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <RadioGroupItem value="Sí" id="cont-si" />
                  <Label htmlFor="cont-si" className="flex-1 cursor-pointer font-normal">Sí</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <RadioGroupItem value="No" id="cont-no" />
                  <Label htmlFor="cont-no" className="flex-1 cursor-pointer font-normal">No</Label>
                </div>
              </RadioGroup>
            </div>

            {/* 6.1 motivo no */}
            {form.continuar_equipo === 'No' && (
              <div className="space-y-2 pl-3 border-l-2 border-primary/40">
                <Label htmlFor="motivo">Indícanos el motivo o comentario</Label>
                <Textarea
                  id="motivo" rows={3} maxLength={1000}
                  value={form.motivo_no_continuar}
                  onChange={e => set('motivo_no_continuar', e.target.value)}
                  placeholder="Explica brevemente los motivos o cualquier información relevante."
                />
              </div>
            )}

            {/* 7. Disponible 12 agosto */}
            <div className="space-y-3">
              <Label>7. La pretemporada comenzará el 12 de agosto. ¿Podrás asistir desde esa fecha? <span className="text-destructive">*</span></Label>
              <RadioGroup value={form.disponible_12_agosto} onValueChange={v => set('disponible_12_agosto', v)}>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <RadioGroupItem value="Sí" id="disp-si" />
                  <Label htmlFor="disp-si" className="flex-1 cursor-pointer font-normal">Sí, estaré disponible desde el 12 de agosto.</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <RadioGroupItem value="No" id="disp-no" />
                  <Label htmlFor="disp-no" className="flex-1 cursor-pointer font-normal">No, me incorporaré más tarde.</Label>
                </div>
              </RadioGroup>
            </div>

            {/* 8. fecha incorporación */}
            {form.disponible_12_agosto === 'No' && (
              <div className="space-y-2 pl-3 border-l-2 border-primary/40">
                <Label htmlFor="fincorp">Fecha aproximada de incorporación</Label>
                <Input
                  id="fincorp" type="date"
                  value={form.fecha_incorporacion}
                  onChange={e => set('fecha_incorporacion', e.target.value)}
                />
              </div>
            )}

            {/* 9. Compromisos */}
            <div className="space-y-2">
              <Label htmlFor="comp">9. ¿Tienes previsto algún viaje, actividad o compromiso durante agosto?</Label>
              <Textarea
                id="comp" rows={3} maxLength={1000}
                value={form.compromisos_agosto}
                onChange={e => set('compromisos_agosto', e.target.value)}
                placeholder="Indica fechas aproximadas y cualquier información relevante."
              />
            </div>

            {/* 10. Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="obs">10. Observaciones o comentarios</Label>
              <Textarea
                id="obs" rows={3} maxLength={1000}
                value={form.observaciones}
                onChange={e => set('observaciones', e.target.value)}
                placeholder="Cualquier comentario adicional..."
              />
            </div>

            <Button
              type="submit" size="lg" disabled={submitting}
              className="w-full h-12 text-base font-semibold"
            >
              {submitting ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-5 w-5 mr-2" /> Enviar formulario</>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
