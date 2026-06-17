
CREATE TABLE public.formulario_temporada_2026_2027 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  telefono TEXT NOT NULL,
  posicion_principal TEXT NOT NULL,
  posicion_alternativa TEXT,
  continuar_equipo TEXT NOT NULL,
  motivo_no_continuar TEXT,
  disponible_12_agosto TEXT NOT NULL,
  fecha_incorporacion DATE,
  compromisos_agosto TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.formulario_temporada_2026_2027 TO authenticated;
GRANT INSERT ON public.formulario_temporada_2026_2027 TO anon;
GRANT ALL ON public.formulario_temporada_2026_2027 TO service_role;

ALTER TABLE public.formulario_temporada_2026_2027 ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous via shareable link) can submit
CREATE POLICY "Anyone can submit form" ON public.formulario_temporada_2026_2027
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view/edit/delete responses
CREATE POLICY "Admins can view responses" ON public.formulario_temporada_2026_2027
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('pinilla.22@gmail.com', 'placido.futbol2@gmail.com')
    )
  );

CREATE POLICY "Admins can update responses" ON public.formulario_temporada_2026_2027
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('pinilla.22@gmail.com', 'placido.futbol2@gmail.com')
    )
  );

CREATE POLICY "Admins can delete responses" ON public.formulario_temporada_2026_2027
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('pinilla.22@gmail.com', 'placido.futbol2@gmail.com')
    )
  );

CREATE TRIGGER update_formulario_updated_at
  BEFORE UPDATE ON public.formulario_temporada_2026_2027
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
