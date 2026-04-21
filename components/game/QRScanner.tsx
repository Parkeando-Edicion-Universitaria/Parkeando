'use client';

import { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { sileo } from 'sileo';
import { useAudio } from '@/lib/audio';
import Html5QrcodePlugin from './Html5QrcodePlugin';

interface QRScannerProps {
  expectedPosition: number;
  onScan: (rawValue: string) => Promise<boolean>;
  onClose: () => void;
  onCameraPermissionDenied?: () => Promise<void> | void;
  timeLeft?: number;
}

export default function QRScannerComponent({ expectedPosition, onScan, onClose, onCameraPermissionDenied, timeLeft }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const isVerifyingRef = useRef(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [permissionDeniedAttempts, setPermissionDeniedAttempts] = useState(0);
  const permissionDeniedAttemptsRef = useRef(0);
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);
  const removalTriggeredRef = useRef(false);
  const [scannerKey, setScannerKey] = useState(0);
  const audio = useAudio();

  const handlePermissionDenied = async (rawMessage: string) => {
    setHasPermission(false);
    permissionDeniedAttemptsRef.current += 1;
    const nextAttempts = permissionDeniedAttemptsRef.current;
    setPermissionDeniedAttempts(nextAttempts);

    if (nextAttempts >= 2 && onCameraPermissionDenied && !removalTriggeredRef.current) {
      removalTriggeredRef.current = true;
      setIsRemovingPlayer(true);
      setErrorDetails(rawMessage);
      try {
        await onCameraPermissionDenied();
      } finally {
        setIsRemovingPlayer(false);
      }
    }
  };

  const handleForceExit = async () => {
    if (!onCameraPermissionDenied || removalTriggeredRef.current) {
      onClose();
      return;
    }

    removalTriggeredRef.current = true;
    setIsRemovingPlayer(true);
    try {
      await onCameraPermissionDenied();
    } finally {
      setIsRemovingPlayer(false);
    }
  };

  const requestCameraPermission = async () => {
    setErrorDetails(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta el acceso a la cámara');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      permissionDeniedAttemptsRef.current = 0;
      setPermissionDeniedAttempts(0);
      removalTriggeredRef.current = false;
    } catch (error: any) {
      console.error('Error requesting camera permission:', error);
      const msg = error.message || String(error);
      setErrorDetails(msg);
      
      if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('permission') || error.name === 'NotAllowedError') {
        sileo.error({ title: 'Permiso de cámara denegado' });
        void handlePermissionDenied(msg);
      } else {
        setHasPermission(false);
        sileo.error({ title: `Error de cámara: ${msg}` });
      }
    }
  };

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const handleResult = async (decodedText: any) => {
    if (isVerifyingRef.current) return;
    const text = typeof decodedText === 'string' ? decodedText : decodedText.toString();
    if (!text) return;

    if (text.length > 200) {
      sileo.error({ title: 'Código QR inválido' });
      return;
    }

    isVerifyingRef.current = true;
    setIsVerifying(true);

    try {
      const wasAccepted = await onScan(text);
      if (!wasAccepted) {
        // En caso de fallo (ej. es el QR equivocado), simplemente desbloqueamos 
        // No remonta el componente para evitar crashear la cámara.
        // Html5Qrcode ignorará el mismo string por defecto si se queda la cámara ahí.
        setTimeout(() => {
          setIsVerifying(false);
          isVerifyingRef.current = false;
        }, 1500);
      }
    } catch (e) {
      console.error("Error calling onScan:", e);
      setTimeout(() => {
        setIsVerifying(false);
        isVerifyingRef.current = false;
      }, 1500);
    }
  };

  const handleError = (error: any) => {
    const errorMessage = typeof error === 'string' ? error : (error?.message || String(error));
    if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('notallowederror')) {
      setHasPermission(false);
    } else if (errorMessage.toLowerCase().includes('no se detectó') || errorMessage.toLowerCase().includes('not found')) {
      // Es un error logueado por el escaner interno (normal), no lo metemos al toaster si es SPAM
    }
  };

  if (hasPermission === null) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center gap-4 max-w-sm w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-panama-blue" />
          <h2 className="text-xl font-bold text-slate-800">Solicitando Cámara</h2>
          <p className="text-slate-500 text-sm">Por favor, acepta el permiso en tu navegador para continuar.</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">📷</div>
          <h3 className="text-xl font-bold mb-2 text-slate-800">Cámara Requerida</h3>
          <p className="text-slate-600 mb-2 text-sm leading-relaxed">
            Es necesario el acceso a la cámara para validar tu jugada.<br />
          </p>
          
          {errorDetails && (
            <div className="mb-4 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-600 font-mono wrap-break-word">
              {errorDetails.includes('NotReadableError') ? 'La cámara está siendo usada por otra aplicación.' : 
               errorDetails.includes('NotFoundError') ? 'No se encontró ninguna cámara.' : errorDetails}
            </div>
          )}

          <p className="text-slate-500 mb-6 text-[10px] uppercase font-bold tracking-tight">
            Configuración → Privacidad → Cámara
          </p>

          {permissionDeniedAttempts > 0 && (
            <p className="text-xs text-amber-600 font-semibold mb-4">
              {permissionDeniedAttempts >= 2
                ? 'Permiso rechazado nuevamente. Saliendo de la partida...'
                : 'Debes conceder el permiso en este último intento para continuar jugando.'}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              disabled={isRemovingPlayer || permissionDeniedAttempts >= 2}
              onClick={requestCameraPermission}
              className="w-full py-3 bg-panama-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {permissionDeniedAttempts === 0 ? 'Reintentar Permiso' : 'Reintentar Permiso (Último intento)'}
            </button>
            <button
              disabled={isRemovingPlayer}
              onClick={handleForceExit}
              className="w-full py-2 text-slate-400 text-xs hover:text-slate-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRemovingPlayer ? 'Saliendo de la partida...' : 'Salir de la partida'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <m.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl p-4 max-w-sm w-full relative overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {isVerifying && (
            <div className="absolute inset-0 z-50 bg-panama-blue/95 flex flex-col items-center justify-center text-white text-center p-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6" />
              <h3 className="text-2xl font-black mb-2 tracking-tight">¡QR LEÍDO!</h3>
              <p className="text-blue-100 font-medium animate-pulse">Validando tu posición...</p>
            </div>
          )}

          <div className="flex justify-between items-center mb-4 p-3 bg-panama-blue rounded-xl text-white shadow-lg shadow-blue-900/20">
            <h2 className="text-lg font-bold flex items-center gap-3">
              <span className="bg-white/20 p-2 text-xl rounded-xl">🚌</span>
              <span className="leading-tight">Casilla <br/><span className="text-2xl font-black text-panama-yellow">{expectedPosition}</span></span>
            </h2>
            
            {timeLeft !== undefined && (
              <div className={`flex flex-col items-end leading-none`}>
                 <span className="text-[10px] uppercase font-bold text-blue-200 tracking-widest mb-1">Tiempo de turno</span>
                 <div className={`flex items-center justify-center gap-1.5 font-black shadow-inner shadow-black/20 bg-black/20 px-3 py-1.5 rounded-lg text-xl ${timeLeft <= 20 ? 'text-red-300 animate-pulse' : 'text-white'}`}>
                   <span className="leading-none">⏱</span>
                   <span className="tabular-nums leading-none text-right">{Math.max(0, timeLeft)}</span>
                   <span className="text-sm leading-none">s</span>
                  </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden mb-4 bg-slate-900 ring-2 ring-slate-100 shadow-inner relative group isolate">
            <Html5QrcodePlugin
              key={scannerKey}
              fps={10}
              qrbox={250}
              disableFlip={false}
              qrCodeSuccessCallback={handleResult}
              qrCodeErrorCallback={handleError}
            />
            {!isVerifying && (
              <div className="absolute inset-0 border-2 border-white/20 rounded-2xl pointer-events-none mix-blend-overlay z-10" />
            )}
          </div>

          <p className="text-center text-xs font-bold text-slate-500 bg-slate-50 py-3 rounded-xl border border-slate-200 uppercase tracking-widest">
            Enfoca el código municipal
          </p>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
