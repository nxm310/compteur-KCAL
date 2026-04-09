import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isOpen: boolean;
}

export const Scanner = ({ onScanSuccess, onScanError, isOpen }: ScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const regionId = "reader";
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (isOpen && !showManual) {
      isProcessingRef.current = false;
      const html5QrCode = new Html5Qrcode(regionId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10, // Plus lent pour laisser le temps à l'autofocus iOS
        qrbox: { width: 280, height: 180 }, // Taille fixe pour éviter les calculs erronés sur iOS
        aspectRatio: 1.0, // Carré pour le conteneur interne
        videoConstraints: {
          facingMode: "environment",
          // On ne met pas de résolution idéale ici pour laisser iOS choisir la plus stable
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128
        ]
      };

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
      }, 500);

      return () => {
        clearTimeout(timer);
        const currentScanner = scannerRef.current;
        if (currentScanner && currentScanner.isScanning) {
          currentScanner.stop()
            .then(() => {
              currentScanner.clear();
            })
            .catch(() => {});
        }
      };
    }
  }, [isOpen, onScanSuccess, onScanError, showManual]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black aspect-square relative border-4 border-slate-100 shadow-inner">
        {showManual ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
            <Keyboard className="w-12 h-12 mb-4 text-indigo-400" />
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Code-barres (13 chiffres)</label>
                <Input 
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: 3017620422003"
                  className="bg-white text-black"
                  type="number"
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
            <div id={regionId} className="w-full h-full" />
            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
              <div className="w-full h-full border-2 border-indigo-400/50 rounded-lg relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
            </div>
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
    </div>
  );
};
