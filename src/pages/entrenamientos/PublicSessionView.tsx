import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PublicSessionView() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.rpc('get_shared_training_session', { _token: token });
      if (error) return setError(error.message);
      if (!data) return setError('Enlace no válido o caducado');
      setData(data);
    })();
  }, [token]);

  if (error) return <div className="p-6 text-center">{error}</div>;
  if (!data) return <div className="p-6 text-center">Cargando...</div>;
  const { session, tasks } = data;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="text-center">
        <h1 className="font-display text-2xl">Sesión {session.session_number || ''}</h1>
        <p className="text-sm text-muted-foreground">
          {session.session_date} · {session.category || '—'} · {session.coach || ''}
        </p>
        {session.objective && <p className="mt-2 text-sm">🎯 {session.objective}</p>}
      </div>

      <div className="space-y-3">
        {(tasks || []).map((it: any, idx: number) => {
          const t = it.task;
          return (
            <Card key={idx}>
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {t?.image_url && <img src={t.image_url} alt="" className="h-24 w-32 object-cover rounded" />}
                  <div className="flex-1">
                    <p className="font-semibold">{idx + 1}. {t?.name || '—'}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t?.task_type && <Badge variant="secondary" className="text-[10px]">{t.task_type}</Badge>}
                      {t?.work_time && <Badge variant="outline" className="text-[10px]">Trab: {t.work_time}</Badge>}
                      {t?.rest_time && <Badge variant="outline" className="text-[10px]">Desc: {t.rest_time}</Badge>}
                      {t?.players_count && <Badge variant="outline" className="text-[10px]">Jug: {t.players_count}</Badge>}
                    </div>
                    {t?.description && <p className="text-xs mt-2">{t.description}</p>}
                    {t?.material && <p className="text-xs mt-1"><b>Material:</b> {t.material}</p>}
                    {it.custom_notes && <p className="text-xs mt-1 italic">📝 {it.custom_notes}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
