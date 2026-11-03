import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  BrowserMultiFormatReader,
  BrowserCodeReader,
} from '@zxing/browser';
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from '@zxing/library';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Keyboard, ScanLine, Search, Camera, CameraOff, RefreshCw, AlertCircle } from "lucide-react";

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isOpen: boolean;
}

export interface ScannerHandle {
  stopCamera: () => void;
}

interface CameraErrorInfo {
  title: string;
  hint: string;
}

export const Scanner = forwardRef<ScannerHandle, ScannerProps>(
  ({ onScanSuccess, onScanError, isOpen }, ref) => {

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const isProcessingRef = useRef(false);
  const isScanningRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const onScanErrorRef = useRef(onScanError);
  useEffect(() => {
    onScanErrorRef.current = onScanError;
  }, [onScanError]);

  const [manualCode, setManualCode] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  // ─── Arrêt propre et libération complète du matériel caméra ───────────────
  const stopScanner = useCallback(() => {
    isScanningRef.current = false;

    // 1. Annulation de la boucle de détection BarcodeDetector
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // 2. Annulation des timers d'autofocus pour éviter l'appel sur une piste arrêtée
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    if (focusIntervalRef.current) {
      clearInterval(focusIntervalRef.current);
      focusIntervalRef.current = null;
    }

    // 3. Arrêt des contrôles ZXing
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch (_) {}
      controlsRef.current = null;
    }

    // 4. Arrêt explicite de toutes les pistes du flux MediaStream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (_) {}
      });
      streamRef.current = null;
    }

    // 5. Libération des flux persistants ZXing
    try {
      BrowserCodeReader.releaseAllStreams();
    } catch (_) {}

    // 6. Réinitialisation et détachement de la balise vidéo
    if (videoRef.current) {
      const video = videoRef.current;
      try {
        if (video.srcObject) {
          const s = video.srcObject as MediaStream;
          s.getTracks().forEach((t) => {
            try { t.stop(); t.enabled = false; } catch (_) {}
          });
          video.srcObject = null;
        }
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch (_) {}
    }

    if (readerRef.current) {
      try { (readerRef.current as any).reset(); } catch (_) {}
      readerRef.current = null;
    }

    setScannerReady(false);
  }, []);

  useImperativeHandle(ref, () => ({ stopCamera: stopScanner }), [stopScanner]);

  // ─── Formatage d'erreur précis pour Android ───────────────────────────────
  const formatCameraError = (err: any): CameraErrorInfo => {
    const name = err?.name || "";
    const msg = String(err?.message || "");

    if (name === "NotAllowedError" || name === "PermissionDeniedError" || msg.includes("Permission")) {
      return {
        title: "Autorisation caméra refusée",
        hint: "Sur Android Chrome : appuyez sur l'icône 🔒 ou réglages à gauche de l'adresse pour autoriser la caméra, puis cliquez sur 'Réessayer'.",
      };
    }

    if (name === "NotReadableError" || name === "TrackStartError" || msg.includes("Could not start")) {
      return {
        title: "Caméra temporairement occupée",
        hint: "Le matériel caméra était verrouillé par une session précédente. Cliquez sur 'Réessayer' ci-dessous pour le réinitialiser.",
      };
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      return {
        title: "Connexion sécurisée requise sur Android",
        hint: "Chrome Android bloque l'accès caméra en HTTP. Utilisez la version sécurisée GitHub (https://nxm310.github.io/compteur-KCAL/) ou saisissez le code/nom ci-dessus.",
      };
    }

    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        title: "Aucune caméra détectée",
        hint: "Vérifiez que votre smartphone dispose d'une caméra arrière fonctionnelle.",
      };
    }

    return {
      title: "Caméra indisponible",
      hint: msg || "Impossible d'accéder au flux vidéo de la caméra.",
    };
  };

  // ─── Acquisition progressive du flux vidéo avec repli Android ─────────────
  const acquireStream = async (retries = 1): Promise<MediaStream> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error("SECURE_CONTEXT_REQUIRED");
      }
      throw new Error("NAVIGATOR_MEDIA_DEVICES_NOT_SUPPORTED");
    }

    // Palier 1 : idéal mobile (caméra arrière, 720p)
    const tier1: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    // Palier 2 : simple facingMode
    const tier2: MediaStreamConstraints = {
      video: { facingMode: "environment" },
      audio: false,
    };

    // Palier 3 : vidéo basique sans contrainte
    const tier3: MediaStreamConstraints = {
      video: true,
      audio: false,
    };

    try {
      return await navigator.mediaDevices.getUserMedia(tier1);
    } catch (err1: any) {
      // Sur Android, si la caméra précédente n'a pas fini de libérer le matériel (NotReadableError)
      if ((err1?.name === "NotReadableError" || err1?.name === "TrackStartError") && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return acquireStream(retries - 1);
      }

      // Repli palier 2
      try {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return await navigator.mediaDevices.getUserMedia(tier2);
      } catch (err2) {
        // Repli palier 3
        try {
          await new Promise((resolve) => setTimeout(resolve, 80));
          return await navigator.mediaDevices.getUserMedia(tier3);
        } catch {
          throw err1;
        }
      }
    }
  };

  // ─── Autofocus sécurisé sans fuite de mémoire ─────────────────────────────
  const setupAutofocus = useCallback((stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = (videoTrack.getCapabilities?.() as any) || {};
      if (capabilities.focusMode?.includes("continuous")) {
        videoTrack.applyConstraints?.({
          advanced: [{ focusMode: "continuous" } as any],
        }).catch(() => {});
      }
    } catch (_) {}
  }, []);

  // ─── Cycle de vie principal de la caméra ──────────────────────────────────
  useEffect(() => {
    if (!isOpen || !cameraEnabled) {
      stopScanner();
      return;
    }

    let cancelled = false;
    setCameraError(null);
    isProcessingRef.current = false;

    const startCamera = async () => {
      try {
        // Délai de 80ms pour laisser Android fermer la session précédente lors d'une 2e ouverture
        await new Promise((r) => setTimeout(r, 80));
        if (cancelled) return;

        const stream = await acquireStream(1);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setupAutofocus(stream);

        const video = videoRef.current;
        if (!video) return;

        // Attributs cruciaux pour Android Chrome & iOS Safari
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = true;
        video.srcObject = stream;

        try {
          await video.play();
        } catch (_) {
          // Sur certains navigateurs, un 2e play() immédiat est requis
        }

        if (cancelled) {
          stopScanner();
          return;
        }

        setScannerReady(true);
        isScanningRef.current = true;

        // Détection matérielle native (Chrome Android) ou fallback ZXing
        const hasNativeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

        if (hasNativeDetector) {
          try {
            const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"];
            const detector = new (window as any).BarcodeDetector({ formats });

            const detectFrame = async () => {
              if (!isScanningRef.current || !videoRef.current || cancelled) return;

              if (videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0 && isScanningRef.current && !isProcessingRef.current) {
                    const rawValue = barcodes[0].rawValue;
                    if (rawValue) {
                      isProcessingRef.current = true;
                      stopScanner();
                      onScanSuccessRef.current(rawValue);
                      return;
                    }
                  }
                } catch (_) {}
              }

              if (isScanningRef.current && !cancelled) {
                animFrameRef.current = requestAnimationFrame(detectFrame);
              }
            };

            animFrameRef.current = requestAnimationFrame(detectFrame);
            return;
          } catch (nativeErr) {
            console.warn("Repli vers ZXing suite à:", nativeErr);
          }
        }

        // Fallback ZXing (iOS Safari et navigateurs sans BarcodeDetector natif)
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
        readerRef.current = reader;

        const controls = await reader.decodeFromVideoElement(video, (result, error) => {
          if (result && !isProcessingRef.current && isScanningRef.current) {
            isProcessingRef.current = true;
            stopScanner();
            onScanSuccessRef.current(result.getText());
          }
          if (error && !(error instanceof NotFoundException)) {
            if (onScanErrorRef.current) onScanErrorRef.current(error.message);
          }
        });

        if (cancelled) {
          stopScanner();
          return;
        }
        controlsRef.current = controls;

      } catch (err: any) {
        if (!cancelled) {
          console.warn("Scanner camera warning:", err);
          const formatted = formatCameraError(err);
          setCameraError(formatted);
          if (onScanErrorRef.current) onScanErrorRef.current(formatted.hint);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, cameraEnabled, retryCounter, stopScanner, setupAutofocus]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      stopScanner();
      onScanSuccessRef.current(manualCode.trim());
      setManualCode("");
    }
  };

  const handleRetryCamera = () => {
    stopScanner();
    setCameraError(null);
    setCameraEnabled(true);
    setRetryCounter((c) => c + 1);
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
            className="pl-10 rounded-2xl h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold text-sm focus-visible:ring-orange-500"
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
        <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black aspect-[16/10] relative border-2 border-slate-200/60 dark:border-slate-800 shadow-inner">
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
      ) : cameraError ? (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2.5 text-left">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{cameraError.title}</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {cameraError.hint}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={handleRetryCamera}
              className="h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer la caméra
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setCameraError(null); setCameraEnabled(false); }}
              className="h-9 px-3 rounded-xl text-xs font-semibold"
            >
              <Keyboard className="w-3.5 h-3.5 mr-1" />
              Saisie manuelle
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500">
          <span className="flex items-center gap-2 font-medium">
            <Keyboard className="w-4 h-4 text-orange-500" />
            Caméra désactivée
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
