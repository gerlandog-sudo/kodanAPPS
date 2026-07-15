import { useEffect, useRef } from 'react';

interface LogoHub3DProps {
  size?: number;
  theme: 'light' | 'dark';
}

export function LogoHub3D({ size = 48, theme }: LogoHub3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Placeholder 3D logo - se implementará con Three.js posteriormente
    // Por ahora renderiza un SVG simple con el estilo HUB
  }, [theme]);

  const primaryColor = theme === 'dark' ? '#81ffed' : '#006a60';

  return (
    <div ref={containerRef} style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 48 48" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="hub-glow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
            <feFlood floodColor={primaryColor} floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="24" cy="24" r="20" fill="none" stroke={primaryColor} strokeWidth="2.5" filter="url(#hub-glow)" />
        <circle cx="24" cy="24" r="8" fill={primaryColor} opacity="0.3" />
        <circle cx="24" cy="24" r="3" fill={primaryColor} />
        <line x1="24" y1="4" x2="24" y2="16" stroke={primaryColor} strokeWidth="2" filter="url(#hub-glow)" />
        <line x1="24" y1="32" x2="24" y2="44" stroke={primaryColor} strokeWidth="2" filter="url(#hub-glow)" />
        <line x1="4" y1="24" x2="16" y2="24" stroke={primaryColor} strokeWidth="2" filter="url(#hub-glow)" />
        <line x1="32" y1="24" x2="44" y2="24" stroke={primaryColor} strokeWidth="2" filter="url(#hub-glow)" />
      </svg>
    </div>
  );
}