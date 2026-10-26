import React, { useState, useEffect, useRef } from 'react';
import { useMedha } from '../../context/MedhaContext';
import { Mic, Sparkles, Volume2, Move } from 'lucide-react';

export const FloatingMicButton: React.FC = () => {
  const { isVoiceAssistantOpen, setIsVoiceAssistantOpen } = useMedha();

  // Position state with localStorage caching
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('medha_mic_pos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        }
      }
    } catch {
      // fallback
    }
    // Default: right side, above bottom nav
    const defaultX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 88) : 300;
    const defaultY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 150) : 500;
    return { x: defaultX, y: defaultY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; buttonX: number; buttonY: number }>({
    startX: 0,
    startY: 0,
    buttonX: 0,
    buttonY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);

  // Clamp within viewport
  const clampPosition = (x: number, y: number) => {
    const maxX = Math.max(16, window.innerWidth - 72);
    const maxY = Math.max(16, window.innerHeight - 72);
    return {
      x: Math.min(Math.max(16, x), maxX),
      y: Math.min(Math.max(16, y), maxY),
    };
  };

  // Adjust on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only primary button
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      buttonX: position.x,
      buttonY: position.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    const nextX = dragStartRef.current.buttonX + dx;
    const nextY = dragStartRef.current.buttonY + dy;
    const clamped = clampPosition(nextX, nextY);
    setPosition(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);

    // Save clamped position
    try {
      localStorage.setItem('medha_mic_pos', JSON.stringify(position));
    } catch {
      // ignore
    }

    // If pointer barely moved, count as click
    if (!hasMovedRef.current) {
      setIsVoiceAssistantOpen(!isVoiceAssistantOpen);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        touchAction: 'none',
      }}
      className="select-none"
    >
      <button
        id="medhaFloatingMic"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label="MEDHA Voice Assistant (Drag to move)"
        title="MEDHA Voice Assistant (Drag to move, Tap to speak)"
        className={`group relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-transform active:scale-95 cursor-grab active:cursor-grabbing focus:outline-none ${
          isVoiceAssistantOpen
            ? 'bg-[#074236] ring-4 ring-[#E3A63B] shadow-emerald-900/50'
            : 'bg-gradient-to-tr from-[#074236] via-[#0E7C66] to-[#12907A] ring-2 ring-white/60 shadow-teal-900/40 hover:scale-105'
        }`}
      >
        {/* Pulsing ring animation */}
        <span className="absolute -inset-1 rounded-full bg-[#0E7C66] opacity-35 animate-ping pointer-events-none" />

        {/* Inner glow & Icon */}
        <div className="relative flex flex-col items-center justify-center text-white">
          <Mic className="w-7 h-7 text-white drop-shadow" />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#E3A63B] leading-none mt-0.5">
            MEDHA
          </span>
        </div>

        {/* Drag Hint Indicator Badge */}
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E3A63B] text-[#2B2320] flex items-center justify-center text-[10px] font-bold shadow pointer-events-none">
          <Move className="w-3 h-3 text-[#2B2320]" />
        </div>
      </button>
    </div>
  );
};
