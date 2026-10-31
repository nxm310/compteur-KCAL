import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  BrowserMultiFormatReader,
} from '@zxing/browser';
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from '@zxing/library';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Keyboard, ScanLine, Search, Camera, CameraOff } from "lucide-react";

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isOpen: boolean;
}

export interface ScannerHandle {
  stopCamera: () => void;
}

export const Scanner = forwardRef<ScannerHandle, ScannerProps>(
  ({ onScanSuccess, onScanError, isOpen }, ref) => {

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const isProcessingRef = useRef(false);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [manualCode, setManualCode] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    if (focusIntervalRef.current) {
      clearInterval(focusIntervalRef.current);
      focusIntervalRef.current = null;
    }

    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch (_) {}
      controlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject) {
        const s = video.srcObject as MediaStream;
        s.getTracks().forEach(t => t.stop());
        video.srcObject = null;
      }
      video.pause();
      video.removeAttribute("src");
      try { video.load(); } catch (_) {}
    }

    if (readerRef.current) {
      try { (readerRef.current as any).reset(); } catch (_) {}
      readerRef.current = null;
    }

    setScannerReady(false);
    isProcessingRef.current = false;
  }, []);

  useImperativeHandle(ref, () => ({ stopCamera: stopScanner }), [stopScanner]);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
    }
  }, [isOpen, stopScanner]);

  const startAndroidAutofocus = useCallback((stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const capabilities = videoTrack.getCapabilities?.() as any;
    if (!capabilities) return;

    if (capabilities.focusMode?.includes('continuous')) {
      videoTrack.applyConstraints?.({
        advanced: [{ focusMode: 'continuous' } as any]
      }).catch(() => {});
    }

    focusIntervalRef.current = setInterval(() => {
      if (!videoTrack || videoTrack.readyState !== 'live') return;
      const caps = videoTrack.getCapabilities?.() as any;
      if (caps?.focusMode?.includes('single-shot')) {
        videoTrack.applyConstraints?.({
          advanced: [{ focusMode: 'single-shot' } as any]
        })
        .then(() => {
          setTimeout(() => {
            videoTrack.applyConstraints?.({
              advanced: [{ focusMode: 'continuous' } as any]
            }).catch(() => {});
          }, 500);
        })
        .catch(() => {});
      }
    }, 2000);
  }, []);

  useEffect(() => {
    if (!isOpen || !cameraEnabled) {
      stopScanner();
      return;
    }

    let cancelled = false;
    setCameraError(null);

    const startCamera = async () => {
      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 80,
        });

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            // @ts-ignore
            focusMode: { ideal: 'continuous' },
            // @ts-ignore
            zoom: { ideal: 1 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        readerRef.current = reader;

        startAndroidAutofocus(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          if (cancelled) { stopScanner(); return; }

          setScannerReady(true);

          const controls = await reader.decodeFromVideoElement(
            videoRef.current,
            (result, error) => {
              if (result && !isProcessingRef.current) {
                isProcessingRef.current = true;
                stopScanner();
                onScanSuccess(result.getText());
              }
              if (error && !(error instanceof NotFoundException)) {
                if (onScanError) onScanError(error.message);
              }
            }
          );

          if (cancelled) { stopScanner(); return; }
          controlsRef.current = controls;
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn('Scanner camera warning:', err);
          setCameraError(err.message ?? 'Caméra indisponible');
          if (onScanError) onScanError(err.message ?? 'Impossible de démarrer la caméra');
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, cameraEnabled, onScanSuccess, onScanError, stopScanner, startAndroidAutofocus]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      stopScanner();
      onScanSuccess(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Barre de recherche directe toujours visible */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Nom d'aliment (ex: Banane, Poulet) ou code-barres..."
            className="pl-10 rounded-2xl h-12 bg-slate-50 border-slate-200 font-semibold text-sm focus-visible:ring-orange-500"
            type="text"
          />
        </div>
        <Button
          type="submit"
          disabled={!manualCode.trim()}
          className="h-12 px-5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20"
        >
          Chercher
        </Button>
      </form>

      {/* Zone caméra code-barres */}
      {cameraEnabled && !cameraError ? (
        <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black aspect-[16/10] relative border-2 border-slate-200/60 shadow-inner">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-32 relative">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-400 rounded-tl" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-400 rounded-tr" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-400 rounded-bl" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-400 rounded-br" />
                {scannerReady && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                    style={{ animation: 'scanLine 2s ease-in-out infinite' }}
                  />
                )}
              </div>
            </div>
            <div className="absolute inset-0 bg-black/35" style={{
              maskImage: 'radial-gradient(ellipse 240px 140px at 50% 50%, transparent 100%, black 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 240px 140px at 50% 50%, transparent 100%, black 100%)',
            }} />
          </div>
          {!scannerReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
              <ScanLine className="w-8 h-8 text-orange-400 animate-pulse" />
              <span className="text-[11px] font-medium text-slate-300">Activation caméra...</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCameraEnabled(false)}
            className="absolute bottom-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 backdrop-blur-xs border border-white/15 transition-colors"
          >
            <CameraOff className="w-3.5 h-3.5" />
            Masquer caméra
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-100/80 border border-slate-200/60 text-xs text-slate-500">
          <span className="flex items-center gap-2 font-medium">
            <Keyboard className="w-4 h-4 text-orange-500" />
            {cameraError ? "Mode recherche texte actif (caméra non détectée)" : "Caméra désactivée"}
          </span>
          <button
            type="button"
            onClick={() => { setCameraError(null); setCameraEnabled(true); }}
            className="font-bold text-orange-600 hover:underline flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5" />
            Activer le scan
          </button>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%   { top: 4px;  opacity: 1; }
          45%  { top: calc(100% - 4px); opacity: 1; }
          50%  { opacity: 0; }
          55%  { top: 4px;  opacity: 0; }
          60%  { opacity: 1; }
          100% { top: 4px; }
        }
      `}</style>
    </div>
  );
});

Scanner.displayName = "Scanner";
