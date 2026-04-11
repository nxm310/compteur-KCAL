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
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const isProcessingRef = useRef(false);

  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  const stopScanner = useCallback(() => {
    // 1. Arrêter les contrôles ZXing
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (e) {
        console.warn("Error stopping zxing controls:", e);
      }
      controlsRef.current = null;
    }

    // 2. Arrêter le flux média manuellement (Crucial pour iOS)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    // 3. Nettoyer l'élément vidéo
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    }

    // 4. Reset le reader
    if (readerRef.current) {
      try {
        // @ts-ignore - reset exists on BrowserCodeReader
        readerRef.current.reset();
      } catch (e) {}
      readerRef.current = null;
    }
    
    setScannerReady(false);
  }, []);

  useEffect(() => {
    if (!isOpen || showManual) {
      stopScanner();
      return;
    }

    isProcessingRef.current = false;

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
        readerRef.current = reader;

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 },
          },
        };

        // On demande le flux nous-mêmes pour avoir un contrôle total
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // On attend que la vidéo soit prête
          await videoRef.current.play();
          
          setScannerReady(true);

          // On lance le décodage sur l'élément vidéo
          const controls = await reader.decodeFromVideoElement(videoRef.current, (result, error) => {
            if (result && !isProcessingRef.current) {
              isProcessingRef.current = true;
              // On arrête TOUT avant de notifier le succès
              stopScanner();
              onScanSuccess(result.getText());
            }
            if (error && !(error instanceof NotFoundException)) {
              if (onScanError) onScanError(error.message);
            }
          });
          controlsRef.current = controls;
        }
      } catch (err: any) {
        console.error('Scanner start error:', err);
        if (onScanError) onScanError(err.message ?? 'Impossible de démarrer la caméra');
      }
    };

    startCamera();

    return () => {
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