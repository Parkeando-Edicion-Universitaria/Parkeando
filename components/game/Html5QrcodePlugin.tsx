// file: src/components/game/Html5QrcodePlugin.tsx
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { useEffect, useRef, useCallback } from 'react';

const qrcodeRegionId = "html5qr-code-full-region";

interface Html5QrcodePluginProps {
    fps?: number;
    qrbox?: number | any;
    aspectRatio?: number;
    disableFlip?: boolean;
    qrCodeSuccessCallback: (decodedText: string, result: any) => void;
    qrCodeErrorCallback?: (errorMessage: string) => void;
}

const Html5QrcodePlugin = (props: Html5QrcodePluginProps) => {
    const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
    const isMountedRef = useRef(false);

    const startScanner = useCallback(async (retries = 2) => {
        const scanner = html5QrcodeRef.current;
        if (!scanner || !isMountedRef.current) return;
        if (scanner.isScanning) return;

        try {
            const config: Html5QrcodeCameraScanConfig = {
                fps: props.fps || 10,
                qrbox: props.qrbox || 250,
                disableFlip: props.disableFlip || false,
                aspectRatio: props.aspectRatio,
            };

            await scanner.start(
                { facingMode: "environment" },
                config,
                props.qrCodeSuccessCallback,
                (errorMessage) => {
                    if (isMountedRef.current && props.qrCodeErrorCallback) {
                        props.qrCodeErrorCallback(errorMessage);
                    }
                }
            );
        } catch (err) {
            if (!isMountedRef.current) return;

            if (retries > 0) {
                console.warn(`Scanner start failed, retrying in 1s... (${retries} left)`, err);
                setTimeout(() => {
                    void startScanner(retries - 1);
                }, 1000);
            } else {
                console.error("Unable to start scanning after retries.", err);
                if (props.qrCodeErrorCallback) {
                    props.qrCodeErrorCallback((err as any)?.message || String(err) || "Error desconocido");
                }
            }
        }
    }, [props.aspectRatio, props.disableFlip, props.fps, props.qrCodeErrorCallback, props.qrCodeSuccessCallback, props.qrbox]);

    useEffect(() => {
        isMountedRef.current = true;
        const html5Qrcode = new Html5Qrcode(qrcodeRegionId);
        html5QrcodeRef.current = html5Qrcode;

        void startScanner();

        return () => {
            isMountedRef.current = false;
            // Usamos una referencia local para asegurar que limpiamos la instancia correcta
            const scanner = html5QrcodeRef.current;
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(err => {
                    // Ignoramos errores de "no está corriendo" durante el desmontaje
                    if (typeof err === 'string' && !err.toLowerCase().includes("not running")) {
                        console.error("Failed to stop html5Qrcode.", err);
                    }
                });
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-slate-900 shadow-inner group">
            {/* Contenedor del scanner */}
            <div
                id={qrcodeRegionId}
                className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
            />

            {/* capa de guía de escaneo */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-4/5 h-4/5 border-2 border-dashed border-white/50 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-panama-blue rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-panama-blue rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-panama-blue rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-panama-blue rounded-br-lg" />

                    {/* Línea de escaneo animada */}
                    <div className="absolute inset-x-4 top-1/2 h-0.5 bg-panama-blue shadow-[0_0_15px_rgba(0,123,255,0.8)] animate-pulse" />
                </div>
            </div>
        </div>
    );
};

export default Html5QrcodePlugin;
