"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
// POS Beep sound generator using Web Audio API (zero external assets needed)
function playBeepSound() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass)
            return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        // 1760 Hz (A6) high-pitch retail scanner beep
        osc.frequency.setValueAtTime(1760, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    }
    catch {
        // AudioContext blocked by browser autoplay policy until user gesture
    }
}
export function BarcodeScannerModal({ isOpen, onClose, onScan, title = "Barcode Scanner", subtitle = "Align product barcode within the camera viewfinder or scan with a barcode gun", placeholder = "Or type/paste barcode manually…", }) {
    const [manualCode, setManualCode] = useState("");
    const [cameraError, setCameraError] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState(null);
    const [facingMode, setFacingMode] = useState("environment");
    const scannerRef = useRef(null);
    const lastScanTimestamp = useRef(0);
    const readerElementId = "interactive-barcode-reader";
    const handleDetectedBarcode = useCallback((decodedText) => {
        const cleanCode = decodedText.trim();
        if (!cleanCode)
            return;
        const now = Date.now();
        // 1.2 second debounce to prevent duplicate spamming of the exact same code
        if (cleanCode === lastScannedCode && now - lastScanTimestamp.current < 1200) {
            return;
        }
        lastScanTimestamp.current = now;
        setLastScannedCode(cleanCode);
        playBeepSound();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
                navigator.vibrate(100);
            }
            catch {
                // ignore
            }
        }
        onScan(cleanCode);
    }, [lastScannedCode, onScan]);
    // Initialize and clean up Html5Qrcode camera
    useEffect(() => {
        if (!isOpen) {
            if (scannerRef.current) {
                scannerRef.current
                    .stop()
                    .then(() => scannerRef.current?.clear())
                    .catch(() => { })
                    .finally(() => {
                    scannerRef.current = null;
                    setIsScanning(false);
                });
            }
            return;
        }
        let isMounted = true;
        setCameraError(null);
        setLastScannedCode(null);
        const startCamera = async () => {
            try {
                // Small delay to ensure modal DOM element has mounted
                await new Promise((resolve) => setTimeout(resolve, 200));
                if (!isMounted)
                    return;
                const container = document.getElementById(readerElementId);
                if (!container)
                    return;
                // Cleanup any previous instance
                if (scannerRef.current) {
                    try {
                        await scannerRef.current.stop();
                        scannerRef.current.clear();
                    }
                    catch {
                        // ignore
                    }
                    scannerRef.current = null;
                }
                const html5QrCode = new Html5Qrcode(readerElementId);
                scannerRef.current = html5QrCode;
                await html5QrCode.start({ facingMode }, {
                    fps: 15,
                    qrbox: { width: 260, height: 160 },
                    aspectRatio: 1.333333,
                }, (decodedText) => {
                    handleDetectedBarcode(decodedText);
                }, () => {
                    // frame decode failures are normal in video streams
                });
                if (isMounted)
                    setIsScanning(true);
            }
            catch (err) {
                if (!isMounted)
                    return;
                console.warn("Camera start warning:", err);
                setCameraError("Camera permission denied or camera not available. You can still scan using a USB/Bluetooth barcode gun or enter the barcode manually below.");
                setIsScanning(false);
            }
        };
        void startCamera();
        return () => {
            isMounted = false;
            if (scannerRef.current) {
                scannerRef.current
                    .stop()
                    .then(() => scannerRef.current?.clear())
                    .catch(() => { })
                    .finally(() => {
                    scannerRef.current = null;
                    setIsScanning(false);
                });
            }
        };
    }, [isOpen, facingMode, handleDetectedBarcode]);
    // Support Hardware Barcode Scanner Gun wedge input
    useEffect(() => {
        if (!isOpen)
            return;
        let buffer = "";
        let lastKeyTime = Date.now();
        const handleKeyDown = (e) => {
            // Ignore if user is currently typing in an input element
            const target = e.target;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
                return;
            }
            const currentTime = Date.now();
            const diff = currentTime - lastKeyTime;
            lastKeyTime = currentTime;
            if (e.key === "Enter") {
                if (buffer.length >= 3) {
                    e.preventDefault();
                    handleDetectedBarcode(buffer);
                    buffer = "";
                }
            }
            else if (e.key.length === 1) {
                // Barcode guns type very rapidly (typically < 35ms between characters)
                if (diff > 80) {
                    buffer = e.key;
                }
                else {
                    buffer += e.key;
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, handleDetectedBarcode]);
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30 text-base">
                📷
              </span>
              <h3 className="text-lg font-bold text-white">{title}</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-zinc-800/80 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition" title="Close scanner">
            ✕
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[220px] sm:min-h-[260px] max-h-[320px] overflow-hidden">
          <div id={readerElementId} className="w-full h-full"/>

          {/* Aiming Reticle Overlay when camera is active */}
          {isScanning && (<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-36 sm:h-44 w-60 sm:w-72 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-md"/>
                <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-md"/>
                <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-md"/>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400 rounded-br-md"/>

                {/* Animated Laser Scanning Line */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 via-green-300 to-emerald-500 shadow-[0_0_8px_#34d399] animate-bounce"/>
              </div>
            </div>)}

          {/* Camera Error / No Camera Fallback */}
          {cameraError && (<div className="p-6 text-center text-zinc-400">
              <span className="text-4xl">📷⚠️</span>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300 max-w-sm mx-auto">{cameraError}</p>
            </div>)}

          {/* Last Scanned Banner */}
          {lastScannedCode && (<div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between rounded-xl bg-emerald-500/90 backdrop-blur-xs px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-lg animate-in slide-in-from-bottom-2">
              <span className="flex items-center gap-1.5">
                <span>⚡ Scanned:</span>
                <span className="font-mono">{lastScannedCode}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-black/20 rounded px-1.5 py-0.5">
                ✓ Synced
              </span>
            </div>)}
        </div>

        {/* Controls & Manual Entry */}
        <div className="p-4 sm:p-5 space-y-3 bg-zinc-900/90 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"/>
              Hardware Barcode Gun Ready
            </span>

            {/* Camera Switcher (Front/Back) */}
            <button type="button" onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))} className="text-blue-400 hover:text-blue-300 font-medium transition">
              🔄 Flip Camera
            </button>
          </div>

          {/* Manual Barcode Input */}
          <form onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) {
                handleDetectedBarcode(manualCode.trim());
                setManualCode("");
            }
        }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-zinc-700 bg-zinc-800/90 px-3.5 py-2 text-base sm:text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none min-h-[42px]"/>
            <button type="submit" disabled={!manualCode.trim()} className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 disabled:opacity-40 transition min-h-[42px]">
              Submit Code
            </button>
          </form>
        </div>
      </div>
    </div>);
}
