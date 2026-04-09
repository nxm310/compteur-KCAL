import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isOpen: boolean;
}

export const Scanner = ({ onScanSuccess, onScanError, isOpen }: ScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const regionId = "reader";

  useEffect(() => {
    if (isOpen) {
      isProcessingRef.current = false;
      const html5QrCode = new Html5Qrcode(regionId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 20, // Plus d'images pour capter le mouvement sur iOS
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Zone de scan large pour forcer l'utilisateur à reculer le tel (meilleur focus)
          const width = Math.floor(viewfinderWidth * 0.8);
          const height = Math.floor(viewfinderHeight * 0.4);
          return { width, height };
        },
        // Suppression de l'aspectRatio fixe qui cause des bugs sur Safari
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1280 }, // Haute résolution pour les barres fines
          height: { ideal: 720 }
        },
        // Force l'utilisation du détecteur natif iOS 17+
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        // Focus exclusif sur les formats alimentaires
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ]
      };

      const timer = setTimeout(() => {
        html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (!isProcessingRef.current) {
              isProcessingRef.current = true;
              // Vibration haptique pour confirmer le scan (optionnel)
              if (navigator.vibrate) navigator.vibrate(100);
              
              html5QrCode.stop().then(() => {
                onScanSuccess(decodedText);
              }).catch(() => {
                onScanSuccess(decodedText);
              });
            }
          },
          (errorMessage) => {
            // On ne loggue pas les échecs de frame pour éviter de saturer la console
            if (onScanError && !errorMessage.includes("No barcode")) {
              onScanError(errorMessage);
            }
          }
        ).catch((err) => {
          console.error("Impossible de démarrer le scanner:", err);
        });
      }, 400); // Délai légèrement augmenté pour le montage du DOM

      return () => {
        clearTimeout(timer);
        const currentScanner = scannerRef.current;
        if (currentScanner && currentScanner.isScanning) {
          currentScanner.stop()
            .then(() => currentScanner.clear())
            .catch(err => {
              if (!err.includes("not scanning")) console.error(err);
            });
        }
      };
    }
  }, [isOpen, onScanSuccess, onScanError]);

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black aspect-square relative shadow-2xl border border-white/10">
      <div id={regionId} className="w-full h-full" />
      
      {/* Overlay de visée */}
      {isOpen && (
        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/20 m-12 rounded-lg" />
      )}

      {!isOpen && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 font-mono text-xs uppercase tracking-widest">
          Scanner en pause
        </div>
      )}

      {/* Injection CSS pour corriger le rendu vidéo Safari */}
      <style>{`
        #${regionId} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #${regionId} b { display: none !important; } /* Masque les textes inutiles de la librairie */
      `}</style>
    </div>
  );
};
