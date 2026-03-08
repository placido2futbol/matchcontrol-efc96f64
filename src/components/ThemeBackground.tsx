import { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeBackground({ children }: { children: ReactNode }) {
  const { bgColor, bgCrest, bgCustomImage, crestOpacity } = useTheme();

  const crestAlpha = crestOpacity / 100;
  const activeBgImage = bgCrest || bgCustomImage;
  const bgStyle: React.CSSProperties = bgColor
    ? { background: bgColor }
    : activeBgImage
    ? { backgroundColor: '#1a1a2e' }
    : {};

  return (
    <div className="min-h-screen relative overflow-hidden" style={bgStyle}>
      {activeBgImage && (
        <img
          src={activeBgImage}
          alt=""
          className="absolute inset-0 m-auto pointer-events-none select-none"
          style={{
            width: bgCustomImage ? '100%' : '40%',
            height: bgCustomImage ? '100%' : 'auto',
            objectFit: bgCustomImage ? 'cover' : 'contain',
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
