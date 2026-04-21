'use client';

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface MotionProviderProps {
  children: React.ReactNode;
}

export default function MotionProvider({ children }: MotionProviderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [prefersReducedMotionMedia, setPrefersReducedMotionMedia] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncMotionPreference = () => {
      setPrefersReducedMotionMedia(mediaQuery.matches);
      document.documentElement.dataset.reduceMotion = mediaQuery.matches ? 'true' : 'false';
    };

    syncMotionPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMotionPreference);
      return () => mediaQuery.removeEventListener('change', syncMotionPreference);
    }

    mediaQuery.addListener(syncMotionPreference);
    return () => mediaQuery.removeListener(syncMotionPreference);
  }, []);

  const shouldReduceMotion = prefersReducedMotion || prefersReducedMotionMedia;

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? 'always' : 'never'}>
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </MotionConfig>
  );
}