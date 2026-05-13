import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, BG_COLORS, ACCENT_OPTIONS, OPACITY_OPTIONS } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, History, LogOut, BarChart3, Trash2, Pencil, Calendar, ChevronRight, Trophy, PenTool, Settings, Palette, Image as ImageIcon, X, Moon, Sun, Type, Maximize2, Minimize2, Upload, ClipboardList } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FCF_EQUIPOS_DB } from '@/data/fcf-teams';
import { toast } from 'sonner';

interface MatchSummary {
  id: string;
  match_date: string | null;
  match_time: string | null;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const ADMIN_EMAILS = ['pinilla.22@gmail.com', 'placido.futbol2@gmail.com'];
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '');
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    darkMode, setDarkMode, accentColor, setAccentColor, fontSize, setFontSize,
    compactCards, setCompactCards, crestOpacity, setCrestOpacity,
    bgColor, selectBgColor, bgCrest, selectCrest, bgCustomImage, setBgCustomImage,
    textClass, mutedTextClass, btnClass, resetAll,
  } = useTheme();

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('backgrounds').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('backgrounds').getPublicUrl(path);
      // Clear crest when setting custom image
      selectCrest('');
      setBgCustomImage(urlData.publicUrl);
    } catch (err: any) {
      toast.error('Error subiendo imagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };




  const fetchMatches = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('matches')
      .select('id, match_date, match_time, home_team_name, away_team_name, home_score, away_score, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMatches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('match_events').delete().eq('match_id', deleteId);
    await supabase.from('match_players').delete().eq('match_id', deleteId);
    const { error } = await supabase.from('matches').delete().eq('id', deleteId);
    if (error) {
      toast.error('Error eliminando partido');
    } else {
      toast.success('Partido eliminado');
      setMatches(prev => prev.filter(m => m.id !== deleteId));
    }
    setDeleteId(null);
  };

  const matchToDelete = matches.find(m => m.id === deleteId);
  const pendingMatches = matches.filter(m => m.status === 'scheduled');

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`font-display text-xl sm:text-2xl ${textClass}`}>⚽ MatchControl</h1>
        <div className="flex items-center gap-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${btnClass}`}>
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[300px] sm:w-[340px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-base">Opciones de tema</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-4">
                {/* Dark mode */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    Modo oscuro
                  </span>
                  <Button variant={darkMode ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setDarkMode(!darkMode)}>
                    {darkMode ? 'Activado' : 'Desactivado'}
                  </Button>
                </div>

                {/* Accent color */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Palette className="h-3.5 w-3.5" /> Color principal
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_OPTIONS.map(a => (
                      <button
                        key={a.value}
                        onClick={() => setAccentColor(a.value)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${accentColor === a.value ? 'border-foreground scale-110 ring-2 ring-foreground/20' : 'border-transparent'}`}
                        style={{ background: a.color }}
                        title={a.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Font size */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Type className="h-3.5 w-3.5" /> Tamaño de texto
                  </span>
                  <div className="flex gap-1">
                    {[{ l: 'Pequeño', v: 'small' }, { l: 'Normal', v: 'normal' }, { l: 'Grande', v: 'large' }].map(s => (
                      <Button
                        key={s.v}
                        variant={fontSize === s.v ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => setFontSize(s.v)}
                      >
                        {s.l}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Compact cards */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {compactCards ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    Tarjetas compactas
                  </span>
                  <Button variant={compactCards ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setCompactCards(!compactCards)}>
                    {compactCards ? 'Sí' : 'No'}
                  </Button>
                </div>

                <hr className="border-border" />

                {/* Background color */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Palette className="h-3.5 w-3.5" /> Color de fondo
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {BG_COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => selectBgColor(bgColor === c.value ? '' : c.value)}
                        className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${bgColor === c.value ? 'border-foreground scale-110 ring-2 ring-foreground/20' : 'border-border'}`}
                        style={{ background: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Background crest */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <ImageIcon className="h-3.5 w-3.5" /> Escudo de fondo
                  </span>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {FCF_EQUIPOS_DB.map(team => (
                      <button
                        key={team.name}
                        onClick={() => { selectCrest(team.crest); setBgCustomImage(''); }}
                        className={`p-1.5 rounded-lg border-2 transition-all hover:scale-105 ${bgCrest === team.crest ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}
                        title={team.name}
                      >
                        <img src={team.crest} alt={team.name} className="w-full h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom image upload */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Upload className="h-3.5 w-3.5" /> Imagen personalizada
                  </span>
                  {bgCustomImage ? (
                    <div className="flex items-center gap-2">
                      <img src={bgCustomImage} alt="Fondo" className="h-12 w-20 object-cover rounded border border-border" />
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setBgCustomImage('')}>
                        <X className="h-3 w-3 mr-1" /> Quitar
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{uploading ? 'Subiendo...' : 'Subir imagen'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  )}
                </div>

                {/* Crest/image opacity */}
                {(bgCrest || bgCustomImage) && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Sun className="h-3.5 w-3.5" /> Transparencia imagen
                    </span>
                    <div className="flex gap-1">
                      {OPACITY_OPTIONS.map(o => (
                        <Button
                          key={o.value}
                          variant={crestOpacity === o.value ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-[10px] flex-1 px-1"
                          onClick={() => setCrestOpacity(o.value)}
                        >
                          {o.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <hr className="border-border" />

                {/* Reset */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={resetAll}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Restablecer todo
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="sm" onClick={signOut} className={btnClass}>
            <LogOut className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/match')}
          className="group relative overflow-hidden rounded-xl bg-primary p-4 sm:p-5 text-primary-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-full bg-white/20 p-3 transition-transform duration-300 group-hover:rotate-90">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-display text-sm sm:text-base tracking-wide">Nuevo Partido</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/teams')}
          className="group relative overflow-hidden rounded-xl bg-accent p-4 sm:p-5 text-accent-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-full bg-white/20 p-3 transition-transform duration-300 group-hover:scale-110">
              <Users className="h-6 w-6" />
            </div>
            <span className="font-display text-sm sm:text-base tracking-wide">Gestión Equipos</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/sant-pau-stats')}
          className="group relative overflow-hidden rounded-xl bg-secondary p-4 sm:p-5 text-secondary-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-full bg-primary/15 p-3 text-primary transition-transform duration-300 group-hover:scale-110">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="font-display text-sm sm:text-base tracking-wide">Estadísticas</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/callups')}
          className="group relative overflow-hidden rounded-xl bg-card border-2 border-accent/20 p-4 sm:p-5 text-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-accent/50 active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-full bg-accent/10 p-3 text-accent-foreground transition-transform duration-300 group-hover:scale-110">
              <ClipboardList className="h-6 w-6" />
            </div>
            <span className="font-display text-sm sm:text-base tracking-wide">Convocatorias</span>
          </div>
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate('/tactical')}
            className="group relative overflow-hidden rounded-xl bg-card border-2 border-primary/20 p-4 sm:p-5 text-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-primary/50 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex flex-col items-center gap-2">
              <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110">
                <PenTool className="h-6 w-6" />
              </div>
              <span className="font-display text-sm sm:text-base tracking-wide">Pizarra Táctica</span>
            </div>
          </button>
        )}

        <button
          onClick={() => navigate('/history')}
          className="group relative overflow-hidden rounded-xl bg-card border-2 border-primary/20 p-4 sm:p-5 text-foreground shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-primary/50 active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="rounded-full bg-primary/10 p-3 text-primary transition-transform duration-300 group-hover:scale-110">
              <History className="h-6 w-6" />
            </div>
            <span className="font-display text-sm sm:text-base tracking-wide">Historial</span>
            {!loading && matches.length > 0 && (
              <span className="text-xs text-muted-foreground">{matches.length} partido{matches.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
