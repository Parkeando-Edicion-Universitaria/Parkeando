'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { sileo } from 'sileo';
import { useAuthStore } from '@/store/authStore';

type PrivacyDataExport = {
  generatedAt: string;
  lawReference: string;
  rightsModel: string;
  user: Record<string, unknown>;
};

const downloadJsonFile = (fileName: string, content: unknown) => {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function DataRightsPanel() {
  const { isAuthenticated, safeAuthenticatedFetch } = useAuthStore();
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);

    const result = await safeAuthenticatedFetch<PrivacyDataExport>('/api/privacy/my-data');

    if (!result.ok) {
      sileo.error({ title: result.error.message || 'No se pudo exportar tu información.' });
      setExporting(false);
      return;
    }

    const generatedAt = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadJsonFile(`parkeando-mis-datos-${generatedAt}.json`, result.value);

    sileo.success({ title: 'Exportación completada', description: 'Tu archivo JSON fue descargado.' });
    setExporting(false);
  };

  return (
    <div className="glass rounded-2xl border border-white/10 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white mb-1">Acceso y Portabilidad</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Puedes obtener una copia estructurada de tus datos personales y de juego en formato JSON.
        </p>
      </div>

      {isAuthenticated ? (
        <button
          type="button"
          onClick={handleExportData}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl border border-panama-cyan/35 bg-panama-cyan/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-panama-cyan/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Generando archivo...' : 'Descargar mis datos'}
        </button>
      ) : (
        <p className="text-xs text-white/80">
          Para descargar tus datos, inicia sesión en{' '}
          <Link href="/auth/login" className="text-panama-cyan underline underline-offset-2 hover:text-cyan-300">
            tu cuenta
          </Link>
          .
        </p>
      )}
    </div>
  );
}