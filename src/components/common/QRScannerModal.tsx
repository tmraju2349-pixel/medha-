import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, X, Sparkles, CheckCircle2, AlertCircle, KeyRound, UserPlus } from 'lucide-react';
import { PatientProfileRecord } from '../../types/medha';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (codeOrPayload: string, relationship?: string) => void;
  existingPatients?: PatientProfileRecord[];
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingPatients = [],
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [manualCode, setManualCode] = useState('');
  const [relationship, setRelationship] = useState('Daughter & Primary Guardian');
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessData, setScanSuccessData] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stop camera stream safely
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setScanSuccessData(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Camera access not supported on this browser/environment.');
        setActiveTab('manual');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setIsScanning(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.warn('Camera request error:', err);
      setCameraError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Camera not available or busy.');
      setHasCamera(false);
      setActiveTab('manual');
    }
  };

  const tickScan = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            // Found a valid QR!
            setScanSuccessData(code.data);
            stopCamera();
            setTimeout(() => {
              onSuccess(code.data, relationship);
              onClose();
            }, 600);
            return;
          }
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tickScan);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onSuccess(manualCode.trim().toUpperCase(), relationship);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0E7C66] flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-serif">
              Link Patient to Caregiver
            </h3>
            <p className="text-xs text-gray-500">
              Scan the patient's QR code or enter their 6-digit code.
            </p>
          </div>
        </div>

        {/* Relationship Selector */}
        <div className="mt-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
          <label className="text-[11px] font-bold text-gray-600 block mb-1">
            Your Relationship to Patient:
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-emerald-600"
          >
            <option value="Daughter & Primary Guardian">Daughter & Primary Guardian</option>
            <option value="Son & Primary Guardian">Son & Primary Guardian</option>
            <option value="Spouse">Spouse</option>
            <option value="Assigned Nurse">Assigned Nurse</option>
            <option value="Care Coordinator">Care Coordinator</option>
            <option value="Family Relative">Family Relative</option>
          </select>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 mt-4 p-1 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'scan' ? 'bg-white text-[#0E7C66] shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'manual' ? 'bg-white text-[#0E7C66] shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Enter Pairing Code</span>
          </button>
        </div>

        {/* TAB 1: Camera Scanner */}
        {activeTab === 'scan' && (
          <div className="mt-4 flex flex-col items-center">
            <div className="relative w-full aspect-square max-h-[250px] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-emerald-500">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Target Aim Reticle */}
              <div className="absolute inset-8 border-2 border-dashed border-emerald-400 rounded-2xl pointer-events-none flex items-center justify-center animate-pulse">
                <div className="w-full h-0.5 bg-emerald-400/70 shadow-[0_0_8px_#34d399] absolute top-1/2 -translate-y-1/2" />
              </div>

              {scanSuccessData && (
                <div className="absolute inset-0 bg-emerald-600/90 text-white flex flex-col items-center justify-center animate-in fade-in">
                  <CheckCircle2 className="w-12 h-12 mb-2 animate-bounce" />
                  <span className="font-bold text-sm">QR Code Verified!</span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{cameraError}</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Switching to manual code input is recommended.
                  </p>
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-400 mt-2 text-center">
              Point your camera at the QR code on the patient's screen.
            </p>
          </div>
        )}

        {/* TAB 2: Manual Passcode Input */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="mt-4 flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Patient Pairing Code:
              </label>
              <input
                type="text"
                placeholder="e.g. MED-782"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoFocus
                className="w-full text-center tracking-widest font-mono text-xl uppercase font-bold py-3 px-4 rounded-xl border-2 border-emerald-300 focus:border-[#0E7C66] focus:outline-none bg-emerald-50/30"
              />
              <span className="text-[11px] text-gray-400 mt-1 block text-center">
                Found on the patient's "Connect Caregiver" screen.
              </span>
            </div>

            {/* Quick-pick demo patient codes for instant testing */}
            {existingPatients.length > 0 && (
              <div className="mt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1.5">
                  Available Demo Patients (Tap to fill):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {existingPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setManualCode(p.code)}
                      className="p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition flex flex-col items-center text-center"
                    >
                      <span className="text-lg">{p.avatar}</span>
                      <span className="text-[11px] font-bold text-gray-800 truncate w-full">
                        {p.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">
                        {p.code}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="mt-2 w-full py-3 rounded-xl bg-[#0E7C66] text-white text-sm font-bold hover:bg-[#0B6754] transition disabled:opacity-50"
            >
              Verify & Connect
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
