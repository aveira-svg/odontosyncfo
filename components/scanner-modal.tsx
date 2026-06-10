/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export function ScannerModal({ isOpen, onClose, onScan, title = "Escanear Código" }: ScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let html5QrCodeInstance: any = null;

    async function startScanner() {
      if (typeof window === "undefined" || !isOpen) return;

      setError(null);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        
        if (!isMounted) return;

        // Esperar un frame para asegurarnos de que el elemento #reader existe en el DOM
        setTimeout(async () => {
          if (!isMounted) return;
          try {
            html5QrCodeInstance = new Html5Qrcode("reader");
            await html5QrCodeInstance.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: (width: number, height: number) => {
                  const size = Math.min(width, height) * 0.7;
                  return { width: size, height: size };
                }
              },
              (decodedText: string) => {
                onScan(decodedText);
              },
              () => {
                // Errores de escaneo repetitivos, se ignoran silenciosamente
              }
            );
          } catch (err: any) {
            console.error("Error al iniciar html5QrCode:", err);
            setError(
              "No se pudo acceder a la cámara. Comprueba que diste los permisos de cámara o ingresa el código de barras manualmente."
            );
          }
        }, 100);

      } catch (err: any) {
        console.error("Error importando html5-qrcode:", err);
        setError("Error al cargar el módulo de cámara.");
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeInstance) {
        if (html5QrCodeInstance.isScanning) {
          html5QrCodeInstance.stop().then(() => {
            console.log("Cámara detenida con éxito.");
          }).catch((err: any) => {
            console.error("Error al detener la cámara en cleanup:", err);
          });
        }
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300 z-10">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600 animate-pulse" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                {title}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Apunta la cámara al código de barras
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lector de cámara */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            id="reader"
            className="w-full max-w-[280px] aspect-square overflow-hidden rounded-xl bg-slate-900 border-2 border-dashed border-slate-300 flex items-center justify-center font-bold text-slate-400 shadow-inner"
          >
            <div className="text-center p-4">
              <p className="text-xs">Iniciando cámara...</p>
              <p className="text-[10px] text-slate-500 mt-1">Por favor permite el acceso si te lo solicita.</p>
            </div>
          </div>
          
          {error && (
            <p className="text-[10px] font-semibold text-rose-600 text-center leading-relaxed max-w-[280px] bg-rose-50 border border-rose-100 rounded-lg p-2 mt-2">
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* Entrada Manual Fallback */}
        <form onSubmit={handleManualSubmit} className="border-t border-slate-100 pt-4 flex flex-col gap-2">
          <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Ingreso Manual de Código
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Ej: INS-001 o Código EAN"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase"
            >
              Cargar
            </button>
          </div>
        </form>

        {/* Botón de Cancelar */}
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary py-2 px-4 text-xs font-extrabold uppercase"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
