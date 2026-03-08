import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, History, LogOut, BarChart3, Trash2, Pencil, Calendar, ChevronRight, Trophy, PenTool, Settings, Palette, Image, X, Moon, Sun, Type, Maximize2, Minimize2 } from 'lucide-react';
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

  // Theme settings from localStorage
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mc_dark') === 'true');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('mc_accent') || 'green');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('mc_fontsize') || 'normal');
  const [compactCards, setCompactCards] = useState(() => localStorage.getItem('mc_compact') === 'true');
  const [crestOpacity, setCrestOpacity] = useState(() => Number(localStorage.getItem('mc_crest_opacity') || '15'));
  const [bgColor, setBgColor] = useState(() => localStorage.getItem('mc_bg_color') || '');
  const [bgCrest, setBgCrest] = useState(() => localStorage.getItem('mc_bg_crest') || '');

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('mc_dark', String(darkMode));
  }, [darkMode]);

  // Apply accent color
  useEffect(() => {
    const accents: Record<string, string> = {
      green: '145 63%',
      blue: '217 91%',
      red: '0 72%',
      orange: '25 95%',
      purple: '270 60%',
      yellow: '45 93%',
      pink: '330 80%',
      teal: '175 70%',
      indigo: '240 60%',
      lime: '85 75%',
    };
    const val = accents[accentColor] || accents.green;
    document.documentElement.style.setProperty('--primary', `${val} ${darkMode ? '42%' : '32%'}`);
    document.documentElement.style.setProperty('--ring', `${val} ${darkMode ? '42%' : '32%'}`);
    localStorage.setItem('mc_accent', accentColor);
  }, [accentColor, darkMode]);

  // Apply font size
  useEffect(() => {
    const sizes: Record<string, string> = { small: '14px', normal: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[fontSize] || '16px';
    localStorage.setItem('mc_fontsize', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('mc_compact', String(compactCards));
  }, [compactCards]);

  useEffect(() => {
    localStorage.setItem('mc_crest_opacity', String(crestOpacity));
  }, [crestOpacity]);

  const selectBgColor = (value: string) => {
    setBgColor(value);
    localStorage.setItem('mc_bg_color', value);
  };
  const selectCrest = (value: string) => {
    const newVal = bgCrest === value ? '' : value;
    setBgCrest(newVal);
    localStorage.setItem('mc_bg_crest', newVal);
  };

  const BG_COLORS = [
    // Claros
    { label: 'Blanco hueso', value: 'hsl(40, 30%, 95%)', light: true },
    { label: 'Gris perla', value: 'hsl(220, 15%, 90%)', light: true },
    { label: 'Beige', value: 'hsl(35, 40%, 88%)', light: true },
    { label: 'Azul cielo', value: 'hsl(205, 60%, 85%)', light: true },
    { label: 'Verde menta', value: 'hsl(150, 40%, 85%)', light: true },
    { label: 'Rosa palo', value: 'hsl(350, 40%, 88%)', light: true },
    { label: 'Lavanda', value: 'hsl(260, 35%, 88%)', light: true },
    { label: 'Arena', value: 'hsl(45, 30%, 82%)', light: true },
    // Medios
    { label: 'Azul acero', value: 'hsl(215, 25%, 45%)', light: false },
    { label: 'Verde bosque', value: 'hsl(145, 40%, 35%)', light: false },
    { label: 'Terracota', value: 'hsl(15, 50%, 45%)', light: false },
    { label: 'Índigo', value: 'hsl(235, 35%, 40%)', light: false },
    { label: 'Oliva', value: 'hsl(80, 30%, 38%)', light: false },
    { label: 'Burdeos', value: 'hsl(345, 50%, 32%)', light: false },
    // Oscuros
    { label: 'Verde campo', value: 'hsl(145, 55%, 20%)', light: false },
    { label: 'Azul marino', value: 'hsl(210, 60%, 12%)', light: false },
    { label: 'Gris carbón', value: 'hsl(0, 0%, 12%)', light: false },
    { label: 'Morado noche', value: 'hsl(270, 40%, 15%)', light: false },
    { label: 'Negro', value: 'hsl(0, 0%, 5%)', light: false },
  ];

  const ACCENT_OPTIONS = [
    { label: 'Verde', value: 'green', color: 'hsl(145, 63%, 32%)' },
    { label: 'Azul', value: 'blue', color: 'hsl(217, 91%, 50%)' },
    { label: 'Rojo', value: 'red', color: 'hsl(0, 72%, 51%)' },
    { label: 'Naranja', value: 'orange', color: 'hsl(25, 95%, 53%)' },
    { label: 'Morado', value: 'purple', color: 'hsl(270, 60%, 50%)' },
    { label: 'Amarillo', value: 'yellow', color: 'hsl(45, 93%, 47%)' },
    { label: 'Rosa', value: 'pink', color: 'hsl(330, 80%, 55%)' },
    { label: 'Turquesa', value: 'teal', color: 'hsl(175, 70%, 40%)' },
    { label: 'Índigo', value: 'indigo', color: 'hsl(240, 60%, 55%)' },
    { label: 'Lima', value: 'lime', color: 'hsl(85, 75%, 42%)' },
  ];

  const OPACITY_OPTIONS = [
    { label: 'Muy sutil', value: 8 },
    { label: 'Sutil', value: 15 },
    { label: 'Media', value: 25 },
    { label: 'Visible', value: 40 },
    { label: 'Fuerte', value: 60 },
  ];

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

  // Determine if bg is light or dark for text contrast
  const selectedBgColor = BG_COLORS.find(c => c.value === bgValue);
  const isLightBg = bgType === 'color' && selectedBgColor?.light;
  const hasDarkBg = (bgType === 'color' && !isLightBg) || bgType === 'crest';
  const textClass = hasDarkBg ? 'text-white' : 'text-foreground';
  const mutedTextClass = hasDarkBg ? 'text-white/60' : 'text-muted-foreground';
  const btnClass = hasDarkBg ? 'text-white/70 hover:text-white hover:bg-white/10' : '';

  const crestAlpha = crestOpacity / 100;
  const bgStyle: React.CSSProperties = bgType === 'color'
    ? { background: bgValue }
    : bgType === 'crest'
    ? { backgroundColor: '#1a1a2e' }
    : {};

  return (
    <div className="min-h-screen relative overflow-hidden" style={bgStyle}>
      {bgType === 'crest' && bgValue && (
        <img
          src={bgValue}
          alt=""
          className="absolute inset-0 m-auto pointer-events-none select-none"
          style={{
            width: '40%',
            height: 'auto',
            objectFit: 'contain',
            opacity: crestAlpha,
            mixBlendMode: 'screen',
            filter: 'brightness(1.2)',
          }}
        />
      )}
      <div className="relative max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
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
                        onClick={() => applyBg('color', c.value)}
                        className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${bgType === 'color' && bgValue === c.value ? 'border-foreground scale-110 ring-2 ring-foreground/20' : 'border-border'}`}
                        style={{ background: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Background crest */}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Image className="h-3.5 w-3.5" /> Escudo de fondo
                  </span>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {FCF_EQUIPOS_DB.map(team => (
                      <button
                        key={team.name}
                        onClick={() => applyBg('crest', team.crest)}
                        className={`p-1.5 rounded-lg border-2 transition-all hover:scale-105 ${bgType === 'crest' && bgValue === team.crest ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}
                        title={team.name}
                      >
                        <img src={team.crest} alt={team.name} className="w-full h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Crest opacity */}
                {bgType === 'crest' && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Sun className="h-3.5 w-3.5" /> Transparencia escudo
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
                  onClick={() => {
                    applyBg('default', '');
                    setDarkMode(false);
                    setAccentColor('green');
                    setFontSize('normal');
                    setCompactCards(false);
                    setCrestOpacity(15);
                  }}
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
      </div>

      {/* Match history */}
      <div>
        <h2 className={`font-display text-lg mb-4 flex items-center gap-2 ${textClass}`}>
          <History className="h-5 w-5 text-primary" /> Historial de Partidos
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : matches.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No hay partidos guardados</p>
              <p className="text-sm text-muted-foreground/70 mt-1">¡Crea tu primer partido!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map(m => {
              const isLive = m.status === 'in_progress';
              const homeWin = m.home_score > m.away_score;
              const awayWin = m.away_score > m.home_score;
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`)}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-card ${compactCards ? 'p-2.5' : 'p-4'} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${isLive ? 'border-accent/50 ring-1 ring-accent/20' : 'hover:border-primary/30'}`}
                >
                  {isLive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-warning to-accent animate-pulse" />
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      <div className="flex flex-col items-end flex-1 min-w-0">
                        <span className={`font-display text-sm sm:text-base truncate max-w-full ${homeWin ? 'text-primary' : 'text-foreground'}`}>
                          {m.home_team_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`font-display text-2xl sm:text-3xl w-8 text-center ${homeWin ? 'text-primary' : 'text-foreground'}`}>
                          {m.home_score}
                        </span>
                        <span className="text-muted-foreground/40 font-display text-lg">:</span>
                        <span className={`font-display text-2xl sm:text-3xl w-8 text-center ${awayWin ? 'text-primary' : 'text-foreground'}`}>
                          {m.away_score}
                        </span>
                      </div>

                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className={`font-display text-sm sm:text-base truncate max-w-full ${awayWin ? 'text-primary' : 'text-foreground'}`}>
                          {m.away_team_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        {m.match_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {m.match_date}
                          </span>
                        )}
                        {isLive ? (
                          <span className="text-xs font-semibold text-accent flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> En curso
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">Finalizado</span>
                        )}
                      </div>

                      {isLive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); navigate(`/match/edit/${m.id}`); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Mobile date */}
                  <div className="sm:hidden mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {m.match_date && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {m.match_date}</span>
                    )}
                    {isLive ? (
                      <span className="font-semibold text-accent flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> En curso
                      </span>
                    ) : (
                      <span>Finalizado</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este partido?</AlertDialogTitle>
            <AlertDialogDescription>
              {matchToDelete && (
                <>
                  <span className="font-bold">{matchToDelete.home_team_name} {matchToDelete.home_score} - {matchToDelete.away_score} {matchToDelete.away_team_name}</span>
                  <br />
                </>
              )}
              Esta acción no se puede deshacer. Se eliminarán todos los datos del partido, jugadores e incidencias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
