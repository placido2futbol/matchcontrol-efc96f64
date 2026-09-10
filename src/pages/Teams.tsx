import { useState, useRef } from 'react';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getFcfTeamsForClub, FCFTeam } from '@/data/fcf-teams';
import { useClub } from '@/hooks/useClub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Upload, X, ImagePlus, Loader2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import KitDisplay from '@/components/match/KitDisplay';

export default function Teams() {
  const { teams, loading, saveTeam, deleteTeam } = useTeams();
  const { user } = useAuth();
  const { club } = useClub();
  const fcfTeams = getFcfTeamsForClub(club?.name_key);
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [crestUrl, setCrestUrl] = useState('');
  const [kitUrl, setKitUrl] = useState('');
  const [kitHtml, setKitHtml] = useState('');
  const [fcfUrl, setFcfUrl] = useState('');
  const [players, setPlayers] = useState<{ name: string; dorsal: string; photo_url: string }[]>([{ name: '', dorsal: '', photo_url: '' }]);
  const kitFileRef = useRef<HTMLInputElement>(null);
  const [scrapingDorsals, setScrapingDorsals] = useState(false);

  const openNew = () => {
    setEditId(undefined);
    setName('');
    setCrestUrl('');
    setKitUrl('');
    setKitHtml('');
    setFcfUrl('');
    setPlayers([{ name: '', dorsal: '', photo_url: '' }]);
    setModalOpen(true);
  };

  const openEdit = (teamId: string) => {
    const t = teams.find(x => x.id === teamId);
    if (!t) return;
    setEditId(t.id);
    setName(t.name);
    setCrestUrl(t.crest_url);
    setKitUrl(t.kit_url);
    setKitHtml(t.kit_html);
    setFcfUrl(t.fcf_url);
    setPlayers(t.players.length > 0 ? t.players.map(p => ({ name: p.name, dorsal: p.dorsal, photo_url: p.photo_url || '' })) : [{ name: '', dorsal: '', photo_url: '' }]);
    setModalOpen(true);
  };

  const loadFromFCF = (fcf: FCFTeam) => {
    setName(fcf.name);
    setCrestUrl(fcf.crest);
    setKitUrl(fcf.kit);
    setFcfUrl(fcf.fcf);
    setPlayers(fcf.players.map(p => ({ name: p, dorsal: '', photo_url: '' })));
  };

  const handleKitImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setKitUrl(reader.result as string);
      toast.success('Imagen de equipación cargada');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nombre requerido'); return; }
    const validPlayers = players.filter(p => p.name.trim());
    await saveTeam(name, crestUrl, kitUrl, fcfUrl, validPlayers, editId, kitHtml);
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este equipo?')) return;
    await deleteTeam(id);
  };

  const handleScrapeDorsals = async () => {
    if (!fcfUrl) {
      toast.error('Se necesita la URL de la FCF del equipo');
      return;
    }
    setScrapingDorsals(true);
    try {
      const { data, error } = await supabase.functions.invoke('fcf-scrape-dorsals', {
        body: { teamPageUrl: fcfUrl },
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Error al obtener dorsales');
        return;
      }

      // Find matching team in results
      const teamResults = data.teams as { teamName: string; players: { name: string; dorsal: string }[] }[];
      
      // Try to match by team name
      let matchedTeam = teamResults.find(t => 
        t.teamName.toUpperCase() === name.toUpperCase()
      );
      
      // If no exact match, try partial
      if (!matchedTeam) {
        matchedTeam = teamResults.find(t =>
          name.toUpperCase().includes(t.teamName.toUpperCase().split(',')[0]) ||
          t.teamName.toUpperCase().includes(name.toUpperCase().split(',')[0])
        );
      }

      if (!matchedTeam || matchedTeam.players.length === 0) {
        toast.error('No se encontraron dorsales para este equipo');
        return;
      }

      // Update dorsals in current player list
      const dorsalMap = new Map(matchedTeam.players.map(p => [p.name.toUpperCase().trim(), p.dorsal]));
      
      const updatedPlayers = players.map(p => {
        const dorsal = dorsalMap.get(p.name.toUpperCase().trim());
        if (dorsal && !p.dorsal) {
          return { ...p, dorsal };
        }
        return p;
      });

      setPlayers(updatedPlayers);
      const filled = updatedPlayers.filter((p, i) => p.dorsal && !players[i].dorsal).length;
      toast.success(`Dorsales actualizados: ${filled} jugadores (de ${data.actasScraped} actas)`);
    } catch (e) {
      console.error(e);
      toast.error('Error al conectar con el servicio');
    } finally {
      setScrapingDorsals(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="font-display text-xl text-foreground">Gestión de Equipos</h1>
        <Button className="ml-auto" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo Equipo
        </Button>
      </div>

      {/* FCF import */}
      {fcfTeams.length > 0 && (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Importar desde FCF (Quarta Catalana · Grup 28)</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex gap-2 flex-wrap">
            {fcfTeams.map(fcf => (
              <Button
                key={fcf.fcf}
                variant="outline"
                size="sm"
                onClick={() => {
                  loadFromFCF(fcf);
                  // Check if team already exists to update instead of creating new
                  const existing = teams.find(t => t.name === fcf.name || t.fcf_url === fcf.fcf);
                  setEditId(existing?.id);
                  setModalOpen(true);
                }}
                className="text-xs"
              >
                {fcf.crest && <img src={fcf.crest} alt="" className="w-4 h-4 mr-1" />}
                {fcf.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      )}


      {/* Teams list */}
      {loading ? (
        <p className="text-muted-foreground">Cargando equipos...</p>
      ) : teams.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No tienes equipos. Importa desde la FCF o crea uno nuevo.</p>
      ) : (
        <div className="grid gap-3">
          {teams.map(t => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(t.id)}>
              <CardContent className="py-3 flex items-center gap-3">
                {t.crest_url && <img src={t.crest_url} alt="" className="w-10 h-10 object-contain" />}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-foreground truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.players.length} jugadores</div>
                </div>
                <Button variant="destructive" size="icon" onClick={e => { e.stopPropagation(); handleDelete(t.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editId ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre del equipo" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="URL del escudo" value={crestUrl} onChange={e => setCrestUrl(e.target.value)} />
            
            {/* Kit image section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Equipación</label>
              <div className="flex gap-2">
                <Input placeholder="URL de la equipación (imagen)" value={kitUrl} onChange={e => setKitUrl(e.target.value)} className="flex-1" />
                <input
                  ref={kitFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleKitImageUpload}
                />
                <Button variant="outline" size="icon" onClick={() => kitFileRef.current?.click()} title="Subir imagen de equipación">
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </div>
              <Input placeholder="HTML de la equipación (SVG inline)" value={kitHtml} onChange={e => setKitHtml(e.target.value)} />
              {/* Kit preview */}
              {(kitHtml || kitUrl) && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="text-xs text-muted-foreground">Vista previa:</span>
                  <KitDisplay kitHtml={kitHtml} kitUrl={kitUrl} className="w-[60px] h-[60px]" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">Jugadores</label>
                {fcfUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScrapeDorsals}
                    disabled={scrapingDorsals}
                    className="text-xs h-7"
                  >
                    {scrapingDorsals ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Buscando...</>
                    ) : (
                      <><Download className="h-3 w-3 mr-1" /> Importar dorsales (FCF)</>
                    )}
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {players.map((p, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    {/* Player photo preview or upload */}
                    <label className="shrink-0 cursor-pointer" title="Subir foto del jugador">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user) return;
                          if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
                          const ext = file.name.split('.').pop() || 'jpg';
                          const path = `${user.id}/player-${Date.now()}-${i}.${ext}`;
                          const { error } = await supabase.storage.from('player-photos').upload(path, file, { upsert: true });
                          if (error) { toast.error('Error subiendo foto'); return; }
                          const { data: urlData } = supabase.storage.from('player-photos').getPublicUrl(path);
                          const next = [...players];
                          next[i] = { ...next[i], photo_url: urlData.publicUrl };
                          setPlayers(next);
                          toast.success('Foto subida');
                        }}
                      />
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border">
                          <ImagePlus className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </label>
                    <Input
                      placeholder="Nombre"
                      value={p.name}
                      onChange={e => {
                        const next = [...players];
                        next[i] = { ...next[i], name: e.target.value };
                        setPlayers(next);
                      }}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Dorsal"
                      value={p.dorsal}
                      onChange={e => {
                        const next = [...players];
                        next[i] = { ...next[i], dorsal: e.target.value };
                        setPlayers(next);
                      }}
                      className="w-20"
                    />
                    <Button variant="destructive" size="icon" onClick={() => setPlayers(players.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => setPlayers([...players, { name: '', dorsal: '', photo_url: '' }])}>
                <Plus className="h-3 w-3 mr-1" /> Añadir Jugador
              </Button>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
