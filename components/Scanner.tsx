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
import { Keyboard, ScanLine } from "lucide-react";

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
  const [showManual, setShowManual] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  const stopScanner = useCallback(() => {
    // Arrêt de l'intervalle autofocus Android
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

  // Force l'autofocus continu sur Android
  const startAndroidAutofocus = useCallback((stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const capabilities = videoTrack.getCapabilities?.() as any;
    if (!capabilities) return;

    // Applique focusMode continu si disponible
    if (capabilities.focusMode?.includes('continuous')) {
      videoTrack.applyConstraints?.({
        advanced: [{ focusMode: 'continuous' } as any]
      }).catch(() => {});
    }

    // Fallback : déclenche manuellement un autofocus toutes les 2s
    // (utile sur les appareils qui ne maintiennent pas le focus)
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
    if (!isOpen || showManual) return;

    let cancelled = false;

    const startCamera = async () => {
      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100,
        });

        // Contraintes optimisées pour Android — autofocus + haute résolution
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            // @ts-ignore — focusMode est supporté sur Android Chrome
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

        // Démarre l'autofocus Android
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
          console.error('Scanner start error:', err);
          if (onScanError) onScanError(err.message ?? 'Impossible de démarrer la caméra');
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, showManual, onScanSuccess, onScanError, stopScanner, startAndroidAutofocus]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black aspect-[4/3] relative border-4 border-slate-100 shadow-inner">
        {showManual ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
            <Keyboard className="w-12 h-12 mb-4 text-indigo-400" />
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nom ou Code-barres</label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: Pomme ou 301762..."
                  className="bg-white text-black"
                  type="text"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600">
                Valider
              </Button>
            </form>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-40 relative">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br" />
                  {scannerReady && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                      style={{ animation: 'scanLine 2s ease-in-out infinite' }}
                    />
                  )}
                </div>
              </div>
              <div className="absolute inset-0 bg-black/40" style={{
                maskImage: 'radial-gradient(ellipse 280px 180px at 50% 50%, transparent 100%, black 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 280px 180px at 50% 50%, transparent 100%, black 100%)',
              }} />
            </div>
            {!scannerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <ScanLine className="w-10 h-10 text-indigo-400 animate-pulse" />
              </div>
            )}
          </>
        )}
      </div>

      <Button
        variant="outline"
        onClick={() => setShowManual(!showManual)}
        className="w-full border-slate-200 text-slate-600"
      >
        {showManual ? "Retour au scanner" : "Saisir manuellement le code"}
      </Button>

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
