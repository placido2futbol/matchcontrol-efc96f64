import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const BG_COLORS = [
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

export const ACCENT_OPTIONS = [
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

export const OPACITY_OPTIONS = [
  { label: 'Muy sutil', value: 8 },
  { label: 'Sutil', value: 15 },
  { label: 'Media', value: 25 },
  { label: 'Visible', value: 40 },
  { label: 'Fuerte', value: 60 },
];

interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  accentColor: string;
  setAccentColor: (v: string) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  compactCards: boolean;
  setCompactCards: (v: boolean) => void;
  crestOpacity: number;
  setCrestOpacity: (v: number) => void;
  bgColor: string;
  selectBgColor: (v: string) => void;
  bgCrest: string;
  selectCrest: (v: string) => void;
  bgCustomImage: string;
  setBgCustomImage: (v: string) => void;
  // Derived
  textClass: string;
  mutedTextClass: string;
  btnClass: string;
  resetAll: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mc_dark') === 'true');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('mc_accent') || 'green');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('mc_fontsize') || 'normal');
  const [compactCards, setCompactCards] = useState(() => localStorage.getItem('mc_compact') === 'true');
  const [crestOpacity, setCrestOpacity] = useState(() => Number(localStorage.getItem('mc_crest_opacity') || '15'));
  const [bgColor, setBgColor] = useState(() => localStorage.getItem('mc_bg_color') || '');
  const [bgCrest, setBgCrest] = useState(() => localStorage.getItem('mc_bg_crest') || '');
  const [bgCustomImage, _setBgCustomImage] = useState(() => localStorage.getItem('mc_bg_custom_image') || '');

  const setBgCustomImage = (value: string) => {
    _setBgCustomImage(value);
    localStorage.setItem('mc_bg_custom_image', value);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('mc_dark', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const accents: Record<string, string> = {
      green: '145 63%', blue: '217 91%', red: '0 72%', orange: '25 95%',
      purple: '270 60%', yellow: '45 93%', pink: '330 80%', teal: '175 70%',
      indigo: '240 60%', lime: '85 75%',
    };
    const val = accents[accentColor] || accents.green;
    document.documentElement.style.setProperty('--primary', `${val} ${darkMode ? '42%' : '32%'}`);
    document.documentElement.style.setProperty('--ring', `${val} ${darkMode ? '42%' : '32%'}`);
    localStorage.setItem('mc_accent', accentColor);
  }, [accentColor, darkMode]);

  useEffect(() => {
    const sizes: Record<string, string> = { small: '14px', normal: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[fontSize] || '16px';
    localStorage.setItem('mc_fontsize', fontSize);
  }, [fontSize]);

  useEffect(() => { localStorage.setItem('mc_compact', String(compactCards)); }, [compactCards]);
  useEffect(() => { localStorage.setItem('mc_crest_opacity', String(crestOpacity)); }, [crestOpacity]);

  const selectBgColor = (value: string) => {
    setBgColor(value);
    localStorage.setItem('mc_bg_color', value);
  };

  const selectCrest = (value: string) => {
    const newVal = bgCrest === value ? '' : value;
    setBgCrest(newVal);
    localStorage.setItem('mc_bg_crest', newVal);
  };

  const selectedBgColor = BG_COLORS.find(c => c.value === bgColor);
  const isLightBg = bgColor && selectedBgColor?.light;
  const activeBgImage = bgCrest || bgCustomImage;
  const hasDarkBg = (bgColor && !isLightBg) || (!bgColor && activeBgImage);
  const textClass = hasDarkBg ? 'text-white' : 'text-foreground';
  const mutedTextClass = hasDarkBg ? 'text-white/60' : 'text-muted-foreground';
  const btnClass = hasDarkBg ? 'text-white/70 hover:text-white hover:bg-white/10' : '';

  const resetAll = () => {
    selectBgColor('');
    setBgCrest('');
    localStorage.setItem('mc_bg_crest', '');
    setBgCustomImage('');
    setDarkMode(false);
    setAccentColor('green');
    setFontSize('normal');
    setCompactCards(false);
    setCrestOpacity(15);
  };

  return (
    <ThemeContext.Provider value={{
      darkMode, setDarkMode, accentColor, setAccentColor, fontSize, setFontSize,
      compactCards, setCompactCards, crestOpacity, setCrestOpacity,
      bgColor, selectBgColor, bgCrest, selectCrest,
      textClass, mutedTextClass, btnClass, resetAll,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
