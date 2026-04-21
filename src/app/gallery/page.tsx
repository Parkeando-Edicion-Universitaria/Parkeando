'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

const galleryImages = [
  { id: 1, src: '/gallery/1.PNG', alt: 'Captura 1' },
  { id: 2, src: '/gallery/2.PNG', alt: 'Captura 2' },
  { id: 3, src: '/gallery/3.PNG', alt: 'Captura 3' },
  { id: 4, src: '/gallery/4.PNG', alt: 'Captura 4' },
  { id: 5, src: '/gallery/5.PNG', alt: 'Captura 5' },
  { id: 6, src: '/gallery/6.PNG', alt: 'Captura 6' },
  { id: 7, src: '/gallery/7.PNG', alt: 'Captura 7' },
  { id: 8, src: '/gallery/8.PNG', alt: 'Captura 8' },
  { id: 9, src: '/gallery/9.PNG', alt: 'Captura 9' },
];

export default function GalleryPage() {
  useEffect(() => {
    document.title = 'Parkeando - Galería';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-panama-blue via-gray-900 to-panama-red p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-12">
          <m.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3"
          >
            Galería de <Logo size="xl" />
          </m.h1>
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-300"
          >
            Capturas del juego en acción
          </m.p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-panama-yellow text-gray-900 font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>

        {/* Gallery Grid */}
        <div className="gallery-grid">
          {galleryImages.map((image, index) => (
            <m.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="gallery-item"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg shadow-2xl group cursor-pointer">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  onClick={() => window.open(image.src, '_blank')}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver imagen completa
                  </span>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </div>
  );
}
