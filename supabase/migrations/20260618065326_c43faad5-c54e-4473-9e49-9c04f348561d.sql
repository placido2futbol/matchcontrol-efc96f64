DROP POLICY IF EXISTS "Admins can view responses" ON public.formulario_temporada_2026_2027;
DROP POLICY IF EXISTS "Admins can update responses" ON public.formulario_temporada_2026_2027;
DROP POLICY IF EXISTS "Admins can delete responses" ON public.formulario_temporada_2026_2027;

CREATE POLICY "Admins can view responses"
ON public.formulario_temporada_2026_2027 FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') IN ('pinilla.22@gmail.com','placido.futbol2@gmail.com'));

CREATE POLICY "Admins can update responses"
ON public.formulario_temporada_2026_2027 FOR UPDATE TO authenticated
USING ((auth.jwt() ->> 'email') IN ('pinilla.22@gmail.com','placido.futbol2@gmail.com'))
WITH CHECK ((auth.jwt() ->> 'email') IN ('pinilla.22@gmail.com','placido.futbol2@gmail.com'));

CREATE POLICY "Admins can delete responses"
ON public.formulario_temporada_2026_2027 FOR DELETE TO authenticated
USING ((auth.jwt() ->> 'email') IN ('pinilla.22@gmail.com','placido.futbol2@gmail.com'));