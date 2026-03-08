import { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeBackground({ children }: { children: ReactNode }) {
  const { bgColor, bgCrest, crestOpacity } = useTheme();

  const crestAlpha = crestOpacity / 100;
  const bgStyle: React.CSSProperties = bgColor
    ? { background: bgColor }
    : bgCrest
    ? { backgroundColor: '#1a1a2e' }
    : {};

  return (
    <div className="min-h-screen relative overflow-hidden" style={bgStyle}>
      {bgCrest && (
        <img
          src={bgCrest}
          alt=""
          className="absolute inset-0 m-auto pointer-events-none select-none"
          style={{
            width: '40%',
            height: 'auto',
            objectFit: 'contain',
            opacity: crestAlpha,
            mixBlendMode: bgColor ? 'multiply' : 'screen',
            filter: bgColor ? 'none' : 'brightness(1.2)',
          }}
        />
      )}
      <div className="relative min-h-screen">
        {children}
      </div>
    </div>
  );
}
