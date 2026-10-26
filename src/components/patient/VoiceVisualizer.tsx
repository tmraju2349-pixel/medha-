import React, { useRef, useEffect, useState, useCallback } from 'react';

interface VoiceVisualizerProps {
  stream: MediaStream | null;
  isActive?: boolean;
  onVolumeChange?: (volume: number) => void;
  className?: string;
  height?: number;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  stream,
  isActive = true,
  onVolumeChange,
  className = '',
  height = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction & rotation state
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0.005, y: 0.008 });
  const rotationRef = useRef({ x: 0.4, y: 0.6 });
  const [currentVolume, setCurrentVolume] = useState(0);
  const [peakFrequency, setPeakFrequency] = useState('0 Hz');

  // Handle drag to rotate 3D wireframe orb
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;

    rotationRef.current.y += deltaX * 0.012;
    rotationRef.current.x -= deltaY * 0.012;

    rotationVelocityRef.current = {
      x: -deltaY * 0.003,
      y: deltaX * 0.003,
    };

    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationId: number;

    const FFT_SIZE = 256;
    const dataArray = new Uint8Array(FFT_SIZE / 2);
    const timeDomainArray = new Uint8Array(FFT_SIZE / 2);

    // Set up Web Audio API if stream is available
    if (stream && stream.active) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.78;

        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch (err) {
        console.warn('VoiceVisualizer: Could not initialize Web Audio API', err);
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas dimensions helper
    let width = (canvas.width = canvas.parentElement?.clientWidth || 360);
    let height = (canvas.height = 280);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = Math.min(canvas.parentElement.clientWidth, 600);
      height = canvas.height = 280;
    };

    window.addEventListener('resize', handleResize);

    // 3D Sphere Wireframe Geometry definition
    const LAT_SEGMENTS = 14; // Horizontal latitude rings
    const LON_SEGMENTS = 20; // Vertical longitude meridian rings
    const BASE_RADIUS = 75;

    // Glowing orbital particle nodes
    const particleCount = 18;
    const particles = Array.from({ length: particleCount }).map((_, i) => ({
      theta: (i / particleCount) * Math.PI * 2,
      phi: (Math.sin(i * 1.7) * Math.PI) / 3,
      speed: 0.015 + (i % 5) * 0.005,
      size: 2 + (i % 3),
      bandIdx: Math.floor((i / particleCount) * (FFT_SIZE / 4)),
    }));

    let autoSpinTime = 0;
    let smoothedVolume = 0;
    let lastMetricUpdate = 0;

    const render = (timestamp: number) => {
      animationId = requestAnimationFrame(render);

      // 1. Gather real-time frequency & audio wave data
      let rawVolume = 0;
      let maxFreqVal = 0;
      let maxFreqIndex = 0;

      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        analyser.getByteTimeDomainData(timeDomainArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          sum += val;
          if (val > maxFreqVal) {
            maxFreqVal = val;
            maxFreqIndex = i;
          }
        }
        rawVolume = sum / (dataArray.length * 255);
      } else if (isActive) {
        // Idle breathing oscillation if no active microphone stream
        rawVolume = 0.06 + Math.sin(timestamp * 0.002) * 0.04;
      }

      // Smooth volume interpolation
      smoothedVolume += (rawVolume - smoothedVolume) * 0.2;

      // Periodically update UI stats
      if (timestamp - lastMetricUpdate > 120) {
        lastMetricUpdate = timestamp;
        const normalizedVol = Math.round(smoothedVolume * 100);
        setCurrentVolume(normalizedVol);
        if (onVolumeChange) onVolumeChange(normalizedVol);

        if (audioCtx && analyser && maxFreqVal > 20) {
          const nyquist = audioCtx.sampleRate / 2;
          const freqHz = Math.round((maxFreqIndex / analyser.frequencyBinCount) * nyquist);
          setPeakFrequency(`${freqHz} Hz`);
        } else {
          setPeakFrequency(isActive ? 'Voice Ready' : 'Standby');
        }
      }

      // Update 3D rotation
      if (!isDraggingRef.current) {
        // Apply inertia and slow auto-spin
        rotationVelocityRef.current.x *= 0.95;
        rotationVelocityRef.current.y *= 0.95;

        // Base auto rotation accelerates with voice volume
        const spinBoost = 1 + smoothedVolume * 3;
        rotationRef.current.y += (0.006 + rotationVelocityRef.current.y) * spinBoost;
        rotationRef.current.x += (0.003 + rotationVelocityRef.current.x) * spinBoost;
      }

      autoSpinTime += 0.02 + smoothedVolume * 0.05;

      // Clear canvas with soft fade/clear
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 2. Audio-reactive 3D wireframe orb parameters
      // Volume pulse expands the base radius
      const currentRadius = BASE_RADIUS + smoothedVolume * 55;
      const cameraDistance = 380;

      // 3D rotation angles
      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // 3D projection transformation helper
      const project3D = (
        x: number,
        y: number,
        z: number,
        displacement = 0
      ): { x: number; y: number; z: number; scale: number; alpha: number } => {
        const r = currentRadius + displacement;
        const mag = Math.hypot(x, y, z) || 1;
        const normX = (x / mag) * r;
        const normY = (y / mag) * r;
        const normZ = (z / mag) * r;

        // Rotate Y (Yaw)
        const x1 = normX * cosY - normZ * sinY;
        const z1 = normX * sinY + normZ * cosY;

        // Rotate X (Pitch)
        const y2 = normY * cosX - z1 * sinX;
        const z2 = normY * sinX + z1 * cosX;

        // Perspective scale
        const scale = cameraDistance / (cameraDistance + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;

        // Depth alpha: Front vertices are vivid & clear; rear are softly translucent
        const normDepth = (z2 + currentRadius) / (currentRadius * 2); // 0 (back) to 1 (front)
        const alpha = Math.max(0.12, Math.min(1.0, 0.18 + normDepth * 0.82));

        return { x: projX, y: projY, z: z2, scale, alpha };
      };

      // 3. Render glowing ambient inner core and halo
      const corePulse = 20 + smoothedVolume * 45;
      const haloGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, currentRadius * 1.5);
      const coreR = Math.min(255, 235 + Math.round(smoothedVolume * 20));
      const coreG = Math.max(70, 120 - Math.round(smoothedVolume * 50));
      const coreB = Math.max(30, 80 - Math.round(smoothedVolume * 40));

      haloGrad.addColorStop(0, `rgba(${coreR}, ${coreG}, ${coreB}, ${0.25 + smoothedVolume * 0.35})`);
      haloGrad.addColorStop(0.5, `rgba(235, 122, 83, ${0.1 + smoothedVolume * 0.2})`);
      haloGrad.addColorStop(1, 'rgba(235, 122, 83, 0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing inner nucleus
      ctx.beginPath();
      ctx.arc(centerX, centerY, corePulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(249, 115, 22, ${0.2 + smoothedVolume * 0.4})`;
      ctx.fill();

      // 4. Render 3D Latitude Wireframe Rings
      for (let lat = 1; lat < LAT_SEGMENTS; lat++) {
        const phi = (lat / LAT_SEGMENTS) * Math.PI - Math.PI / 2;
        const ringY = Math.sin(phi);
        const ringCos = Math.cos(phi);

        ctx.beginPath();
        let isFirst = true;
        let avgZ = 0;
        const ringSteps = 36;

        for (let s = 0; s <= ringSteps; s++) {
          const theta = (s / ringSteps) * Math.PI * 2;
          const x = ringCos * Math.cos(theta);
          const y = ringY;
          const z = ringCos * Math.sin(theta);

          // Displace vertex radially based on audio frequency band
          const freqIndex = Math.floor(
            ((lat * ringSteps + s) % (dataArray.length / 2))
          );
          const freqIntensity = (dataArray[freqIndex] || 0) / 255;
          const displacement = freqIntensity * 28 * (0.4 + smoothedVolume);

          const pt = project3D(x, y, z, displacement);
          avgZ += pt.z;

          if (isFirst) {
            ctx.moveTo(pt.x, pt.y);
            isFirst = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }

        avgZ /= ringSteps + 1;
        const ringAlpha = Math.max(0.12, Math.min(0.9, 0.25 + (avgZ / currentRadius) * 0.45));
        ctx.strokeStyle = `rgba(${coreR}, 122, 83, ${ringAlpha})`;
        ctx.lineWidth = Math.max(1, 1.2 + (avgZ > 0 ? 0.8 : 0) + smoothedVolume * 1.5);
        ctx.stroke();
      }

      // 5. Render 3D Longitude Meridian Rings
      for (let lon = 0; lon < LON_SEGMENTS; lon++) {
        const theta = (lon / LON_SEGMENTS) * Math.PI * 2;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        ctx.beginPath();
        let isFirst = true;
        let avgZ = 0;
        const meridianSteps = 28;

        for (let m = 0; m <= meridianSteps; m++) {
          const phi = (m / meridianSteps) * Math.PI - Math.PI / 2;
          const x = Math.cos(phi) * cosTheta;
          const y = Math.sin(phi);
          const z = Math.cos(phi) * sinTheta;

          // Frequency displacement mapped to longitude
          const freqIndex = Math.floor((lon * 4 + m) % (dataArray.length / 3));
          const freqIntensity = (dataArray[freqIndex] || 0) / 255;
          const displacement = freqIntensity * 22 * (0.3 + smoothedVolume);

          const pt = project3D(x, y, z, displacement);
          avgZ += pt.z;

          if (isFirst) {
            ctx.moveTo(pt.x, pt.y);
            isFirst = false;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }

        avgZ /= meridianSteps + 1;
        const meridianAlpha = Math.max(0.14, Math.min(0.95, 0.25 + (avgZ / currentRadius) * 0.45));
        
        // Highlight active meridians dynamically
        if (lon % 3 === 0 && smoothedVolume > 0.15) {
          ctx.strokeStyle = `rgba(251, 146, 60, ${meridianAlpha * 1.2})`;
          ctx.lineWidth = 2.0;
        } else {
          ctx.strokeStyle = `rgba(${coreR}, 122, 83, ${meridianAlpha})`;
          ctx.lineWidth = Math.max(0.8, 1.1 + (avgZ > 0 ? 0.6 : 0));
        }
        ctx.stroke();
      }

      // 6. Audio-Reactive Sparkle Nodes / Orbiting Nodes
      particles.forEach((p) => {
        p.theta += p.speed * (1 + smoothedVolume * 2);
        const px = Math.cos(p.phi) * Math.cos(p.theta);
        const py = Math.sin(p.phi);
        const pz = Math.cos(p.phi) * Math.sin(p.theta);

        const freqVal = (dataArray[p.bandIdx] || 0) / 255;
        const pt = project3D(px, py, pz, freqVal * 32);

        if (pt.z > -currentRadius * 0.6) {
          ctx.beginPath();
          const nodeRadius = (p.size + freqVal * 4) * pt.scale;
          ctx.arc(pt.x, pt.y, Math.max(1, nodeRadius), 0, Math.PI * 2);

          // Glowing particle color
          ctx.fillStyle = `rgba(254, 215, 170, ${pt.alpha * 0.9})`;
          ctx.fill();

          // Particle corona when voice excites the frequency band
          if (freqVal > 0.3) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, nodeRadius * 2.2, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(234, 88, 12, ${pt.alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      // 7. Render horizontal equational audio frequency ring
      ctx.beginPath();
      const eqSteps = 48;
      for (let i = 0; i <= eqSteps; i++) {
        const angle = (i / eqSteps) * Math.PI * 2;
        const x = Math.cos(angle);
        const y = 0;
        const z = Math.sin(angle);

        const waveVal = (timeDomainArray[i % timeDomainArray.length] - 128) / 128;
        const displacement = waveVal * 24 * (0.5 + smoothedVolume);
        const pt = project3D(x, y, z, displacement);

        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.4 + smoothedVolume * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (source) {
        try {
          source.disconnect();
        } catch {
          // ignore
        }
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [stream, isActive, onVolumeChange]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col items-center select-none overflow-hidden ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full cursor-grab active:cursor-grabbing block transition-opacity duration-300"
        title="Interactive 3D Voice Orb: Drag with mouse or finger to rotate"
        aria-label="Interactive 3D Voice Orb: Pulsates with frequency and amplitude of your voice"
      />

      {/* Floating Audio Reactive Telemetry Badge */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-2 pointer-events-none px-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-amber-200/80 shadow-xs text-[11px] text-amber-900 font-medium">
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                currentVolume > 10 ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'
              }`}
            ></span>
            <span className="font-semibold">{peakFrequency}</span>
          </span>
          <span className="text-amber-400 font-bold">•</span>
          <span className="font-mono text-[10px] text-gray-600">
            Signal: {currentVolume}%
          </span>
          <span className="text-amber-400 font-bold">•</span>
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            🖱️ Drag orb to rotate
          </span>
        </div>
      </div>
    </div>
  );
};
