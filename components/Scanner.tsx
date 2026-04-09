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
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.777778, // 16:9
        videoConstraints: {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        }
      };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (!isProcessingRef.current) {
            isProcessingRef.current = true;
            // Stop scanning immediately to prevent multiple triggers
            html5QrCode.stop().then(() => {
              onScanSuccess(decodedText);
            }).catch(err => {
              console.error("Error stopping after success", err);
              // Still call success even if stop fails
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

      return () => {
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
