'use client';

import { Toaster } from 'sileo';
import { useEffect, useState } from 'react';

export default function ClientToaster() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <Toaster
        position={isMobile ? 'top-center' : 'bottom-center'}
        offset={{
          top: isMobile ? 'max(10px, env(safe-area-inset-top, 10px))' : 'auto',
          bottom: isMobile ? 'auto' : 'max(18px, env(safe-area-inset-bottom, 18px))',
          left: 'max(10px, env(safe-area-inset-left, 10px))',
          right: 'max(10px, env(safe-area-inset-right, 10px))',
        }}
        theme="dark"
        options={{
          fill: "#0d1018",
          roundness: 14,
          duration: 4200,
          autopilot: { expand: 180, collapse: 3000 },
          styles: {
            title: "text-white font-semibold tracking-normal whitespace-normal break-words",
            description: "text-white/80 font-medium leading-relaxed whitespace-normal break-words",
            badge: "bg-white/12",
            button: "bg-white/10 text-white hover:bg-white/15",
          },
        }}
      />
    </>
  );
}
