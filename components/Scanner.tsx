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
        fps: 15, // Un peu moins pour laisser du CPU au décodage
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Zone de scan plus robuste
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minEdge * 0.7);
          return { width: size, height: Math.floor(size * 0.6) };
        },
        aspectRatio: 1.777778,
        videoConstraints: {
          facingMode: "environment",
        },
        // On laisse la bibliothèque choisir les meilleurs formats par défaut
        // mais on garde EAN_13 en priorité si possible
      };

      // Petit délai pour laisser le DOM se stabiliser
      const timer = setTimeout(() => {
        html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (!isProcessingRef.current) {
              isProcessingRef.current = true;
              html5QrCode.stop().then(() => {
                onScanSuccess(decodedText);
              }).catch(() => {
                onScanSuccess(decodedText);
              });
            }
          },
          (errorMessage) => {
            if (onScanError) onScanError(errorMessage);
          }
        ).catch((err) => {
          console.error("Error starting scanner", err);
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        const currentScanner = scannerRef.current;
        if (currentScanner && currentScanner.isScanning) {
          currentScanner.stop()
            .then(() => {
              currentScanner.clear();
            })
            .catch(err => {
              const errorMessage = err instanceof Error ? err.message : String(err);
              if (!errorMessage.includes("removeChild") && !errorMessage.includes("not scanning")) {
                console.error("Error stopping scanner", err);
              }
            });
        }
      };
    }
  }, [isOpen, onScanSuccess, onScanError]);

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black aspect-video relative">
      <div id={regionId} className="w-full h-full" />
      {!isOpen && <div className="absolute inset-0 flex items-center justify-center text-white">Scanner désactivé</div>}
    </div>
  );
};
