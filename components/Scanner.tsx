import React, { useEffect, useRef, useState, useCallback } from 'react';
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

export const Scanner = ({ onScanSuccess, onScanError, isOpen }: ScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const isProcessingRef = useRef(false);

  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (_) {}
      controlsRef.current = null;
    }
    // Libérer le flux caméra manuellement pour iOS
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setScannerReady(false);
  }, []);

  useEffect(() => {
    if (!isOpen || showManual) {
      stopScanner();
      return;
    }

    isProcessingRef.current = false;

    // Hints ZXing : formats + mode "essayer plus fort"
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 80, // ~12fps, bon équilibre perf/batterie
    });
    readerRef.current = reader;

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        // focusMode 'continuous' est la clé pour iOS
        // @ts-ignore — non standard mais supporté sur iOS 17+
        focusMode: 'continuous',
        // Évite le flicker sur iPhone en forçant l'exposition auto
        // @ts-ignore
        exposureMode: 'continuous',
      },
    };

    let cancelled = false;

    reader
      .decodeFromConstraints(constraints, videoRef.current!, (result, error, controls) => {
        if (cancelled) return;

        // Enregistrer les controls dès le premier appel (succès ou erreur)
        if (controls && !controlsRef.current) {
          controlsRef.current = controls;
          setScannerReady(true);
        }

        if (result && !isProcessingRef.current) {
          isProcessingRef.current = true;
          stopScanner();
          onScanSuccess(result.getText());
          return;
        }

        if (error && !(error instanceof NotFoundException)) {
          // NotFoundException = "pas encore de code dans le champ" — c'est normal, on ignore
          if (onScanError) onScanError(error.message);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('ZXing start error:', err);
          if (onScanError) onScanError(err.message ?? 'Impossible de démarrer la caméra');
        }
      });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, showManual, onScanSuccess, onScanError, stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Viewfinder */}
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
            {/* Élément vidéo — ZXing a besoin d'un <video> réel, pas d'un div */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              // Attributs critiques pour iOS Safari :
              autoPlay
              muted
              playsInline   // ← OBLIGATOIRE sur iOS, sinon plein écran forcé
            />

            {/* Overlay viseur */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Coins du cadre */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-40 relative">
                  {/* Coin haut-gauche */}
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
                  {/* Coin haut-droite */}
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
                  {/* Coin bas-gauche */}
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
                  {/* Coin bas-droite */}
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br" />

                  {/* Ligne de scan animée */}
                  {scannerReady && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                      style={{ animation: 'scanLine 2s ease-in-out infinite' }}
                    />
                  )}
                </div>
              </div>

              {/* Masque sombre autour du cadre */}
              <div className="absolute inset-0 bg-black/40" style={{
                maskImage: 'radial-gradient(ellipse 280px 180px at 50% 50%, transparent 100%, black 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 280px 180px at 50% 50%, transparent 100%, black 100%)',
              }} />
            </div>

            {/* Indicateur "chargement caméra" */}
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

      {/* Animation CSS pour la ligne de scan */}
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
};