'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuthStore } from '@/store/authStore';
import { TestIcon } from '@/components/test/TestIcons';

type ApiResult = {
  received_qr: string;
  parsed_hash: string;
  is_valid: boolean;
  cell_number: number;
  has_question: boolean;
};

const READER_REGION_ID = 'test-qr-upload-region';

export default function QrUploadTestPage() {
  const { authenticatedFetch } = useAuthStore();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const scannerStoppingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [decodedText, setDecodedText] = useState('');
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    scannerRef.current = new Html5Qrcode(READER_REGION_ID);

    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        if (scanner.isScanning && !scannerStoppingRef.current) {
          scannerStoppingRef.current = true;
          void scanner.stop().catch(() => {}).finally(() => {
            scannerStoppingRef.current = false;
          });
        }
        try {
          scanner.clear();
        } catch {
          // noop
        }
      }
    };
  }, []);

  const setProcessingState = (value: boolean) => {
    processingRef.current = value;
    setIsProcessing(value);
  };

  const validateDecodedQr = async (
    decoded: string,
    options?: { alreadyProcessing?: boolean }
  ) => {
    if (!options?.alreadyProcessing) {
      setProcessingState(true);
    }
    setError('');
    setApiResult(null);
    setDecodedText(decoded);

    try {
      const response = await authenticatedFetch('/api/test_qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr: decoded }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404 && payload?.error === 'Not found') {
          throw new Error(
            'QR decodificado correctamente, pero la validación del servidor no está disponible en este entorno.'
          );
        }
        throw new Error(payload.error || 'No se pudo validar el QR en el servidor.');
      }

      setApiResult(payload as ApiResult);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Error inesperado al validar el QR.';
      setError(message);
    } finally {
      if (!options?.alreadyProcessing) {
        setProcessingState(false);
      }
    }
  };

  const stopCameraScan = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !scanner.isScanning || scannerStoppingRef.current) {
      setIsCameraScanning(false);
      return;
    }

    scannerStoppingRef.current = true;
    try {
      await scanner.stop();
    } finally {
      scannerStoppingRef.current = false;
      setIsCameraScanning(false);
    }
  };

  const startCameraScan = async () => {
    if (isProcessing || isCameraScanning) return;

    const scanner = scannerRef.current;
    if (!scanner) {
      setError('Escáner no inicializado. Recarga la página.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no soporta acceso a cámara.');
      return;
    }

    setError('');
    setApiResult(null);
    setDecodedText('');
    setIsCameraScanning(true);

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250, disableFlip: false, aspectRatio: 1 },
        (decoded) => {
          if (processingRef.current) return;
          const decodedValue = String(decoded || '').trim();
          if (!decodedValue) return;

          void (async () => {
            setProcessingState(true);
            try {
              await stopCameraScan();
              await validateDecodedQr(decodedValue, { alreadyProcessing: true });
            } finally {
              setProcessingState(false);
            }
          })();
        },
        () => {}
      );
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo iniciar la cámara.';
      setError(message);
      setIsCameraScanning(false);
    }
  };

  const decodeFromFile = async (file: File): Promise<string> => {
    const scanner = scannerRef.current;
    if (!scanner) {
      throw new Error('Escáner no inicializado. Recarga la página.');
    }

    try {
      const resultV2 = await scanner.scanFileV2(file, false);
      return resultV2.decodedText;
    } catch (v2Error) {
      const maybeLegacy = scanner as any;
      if (typeof maybeLegacy.scanFile === 'function') {
        const legacyDecoded = await maybeLegacy.scanFile(file, false);
        return String(legacyDecoded || '');
      }
      throw v2Error;
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setProcessingState(true);
    setError('');
    setApiResult(null);
    setDecodedText('');

    try {
      await stopCameraScan();
      const decoded = await decodeFromFile(file);
      if (!decoded) {
        throw new Error('No se detectó un código QR válido en la imagen.');
      }
      await validateDecodedQr(decoded, { alreadyProcessing: true });
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Error inesperado al leer el archivo QR.';
      setError(message);
    } finally {
      setProcessingState(false);
    }
  };

  const handleCameraToggle = () => {
    if (isCameraScanning) {
      void stopCameraScan();
      return;
    }
    void startCameraScan();
  };

  return (
    <main className="p-4 text-foreground sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-emerald-300/25 bg-slate-900/75 p-6 shadow-[0_24px_80px_rgba(16,185,129,0.18)] backdrop-blur-md md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-cyan-500/16 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(transparent_0,rgba(255,255,255,0.03)_100%)]" />
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200">
              <TestIcon name="eyeScan" className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">Test QR por archivo</h1>
              <p className="text-sm text-white/70">Ruta de pruebas privada para super administrador.</p>
            </div>
          </div>

          <div className="relative z-10 mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 font-bold text-emerald-950 transition hover:bg-emerald-300">
                <TestIcon name="uploadSquare" className="h-5 w-5" />
                Subir imagen con QR
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileSelected}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>

              <button
                type="button"
                onClick={handleCameraToggle}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/20 px-4 py-2.5 font-bold text-cyan-100 transition hover:bg-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isProcessing}
              >
                <TestIcon name="eyeScan" className="h-5 w-5" />
                {isCameraScanning ? 'Detener cámara' : 'Validar con cámara'}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Formatos recomendados: PNG/JPG con buen contraste y sin recortes del código.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              También puedes escanear directo con la cámara del dispositivo.
            </p>
            <div
              id={READER_REGION_ID}
              className={`mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40 [&_video]:h-full [&_video]:w-full [&_video]:object-cover ${
                isCameraScanning ? 'mx-auto aspect-square w-full max-w-sm' : 'hidden'
              }`}
            />
          </div>
        </section>

        {isProcessing ? (
          <section className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
              Leyendo y validando QR...
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
            <div className="flex items-start gap-3">
              <TestIcon name="closeCircle" className="mt-0.5 h-5 w-5 text-rose-300" />
              <div>
                <p className="text-sm font-bold text-rose-200">No se pudo validar el QR</p>
                <p className="mt-1 text-sm text-rose-100/90">{error}</p>
              </div>
            </div>
          </section>
        ) : null}

        {decodedText ? (
          <section className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 backdrop-blur-sm">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <TestIcon name="eyeScan" className="h-4 w-4 text-cyan-300" />
              QR decodificado
            </p>
            <p className="mt-2 break-all text-sm text-foreground/90">{decodedText}</p>
          </section>
        ) : null}

        {apiResult ? (
          <section className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {apiResult.is_valid ? (
                <TestIcon name="checkCircle" className="h-5 w-5 text-emerald-400" />
              ) : (
                <TestIcon name="closeCircle" className="h-5 w-5 text-rose-300" />
              )}
              <p className="font-bold">
                {apiResult.is_valid ? 'QR válido' : 'QR inválido'}
              </p>
            </div>

            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Casilla</dt>
                <dd className="mt-1 font-bold">{apiResult.cell_number}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Tiene pregunta</dt>
                <dd className="mt-1 font-bold">{apiResult.has_question ? 'Sí' : 'No'}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 md:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Hash parseado</dt>
                <dd className="mt-1 break-all font-mono text-xs text-foreground/90">{apiResult.parsed_hash}</dd>
              </div>
            </dl>
          </section>
        ) : null}

      </div>
    </main>
  );
}
