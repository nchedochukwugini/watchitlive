'use client';

import dynamic from 'next/dynamic';

const DotField = dynamic(() => import('./DotField'), { ssr: false });

export default function SiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {/* Dot field */}
      <div className="absolute inset-0">
        <DotField
          dotRadius={1.4}
          dotSpacing={18}
          bulgeStrength={70}
          glowRadius={200}
          sparkle
          gradientFrom="rgba(0, 255, 136, 0.40)"
          gradientTo="rgba(0, 229, 255, 0.25)"
          glowColor="rgba(0, 255, 136, 0.18)"
        />
      </div>
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 95%)',
        }}
      />
    </div>
  );
}
