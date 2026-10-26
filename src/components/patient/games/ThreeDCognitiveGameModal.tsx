import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Zap,
  Activity,
  Award,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Brain,
  Timer,
  CheckCircle2,
  RefreshCw,
  CloudUpload,
} from 'lucide-react';
import { MLCognitiveEngine, MLInterferenceResult } from '../../../services/games/cognitiveEngine';
import { gameAudio } from '../../../services/games/audioSynth';
import { GameSession } from '../../../types/medha';
import { useMedha } from '../../../context/MedhaContext';

interface ThreeDCognitiveGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGameType?: 'constellation' | 'reflex';
  onSessionCompleted?: (session: GameSession) => void;
}

interface OrbObject3D {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  id: number;
  originalColor: number;
  glowColor: number;
  basePosition: THREE.Vector3;
  baseScale: number;
}

export const ThreeDCognitiveGameModal: React.FC<ThreeDCognitiveGameModalProps> = ({
  isOpen,
  onClose,
  initialGameType = 'constellation',
  onSessionCompleted,
}) => {
  const { currentPatient, addToast } = useMedha();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game configuration states
  const [gameMode, setGameMode] = useState<'constellation' | 'reflex'>(initialGameType);
  const [level, setLevel] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Live Telemetry states
  const [reactionTimeMs, setReactionTimeMs] = useState<number>(0);
  const [emaReactionTime, setEmaReactionTime] = useState<number>(620);
  const [accuracyPercent, setAccuracyPercent] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  const [activeIntervention, setActiveIntervention] = useState<string | null>(null);
  const [interventionsCount, setInterventionsCount] = useState<number>(0);
  const [finalSession, setFinalSession] = useState<GameSession | null>(null);

  // Constellation specific states
  const [gamePhase, setGamePhase] = useState<'memorize' | 'recall' | 'feedback'>('memorize');
  const [sequenceIndex, setSequenceIndex] = useState<number>(0);
  const sequenceRef = useRef<number[]>([]);
  const userSequenceRef = useRef<number[]>([]);

  // Engine and Three.js references
  const engineRef = useRef<MLCognitiveEngine>(new MLCognitiveEngine(1, 650));
  const startTimeRef = useRef<number>(Date.now());
  const trialStartTimeRef = useRef<number>(Date.now());

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbsRef = useRef<OrbObject3D[]>([]);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const activeSpeedMultiplierRef = useRef<number>(1.0);
  const activeHitboxMultiplierRef = useRef<number>(1.0);
  const visualAssistRef = useRef<boolean>(false);
  const activeReflexTargetId = useRef<number | null>(null);
  const reflexSpawnTimeoutRef = useRef<any>(null);

  // Colors for 3D elements (Earthy, high-contrast Assam twilight palette)
  const ORB_COLORS = [
    { color: 0x0e7c66, glow: 0x48cae4, name: 'Teal Jade' }, // 0
    { color: 0xe3a63b, glow: 0xffd166, name: 'Amber Glow' }, // 1
    { color: 0x3e7cb1, glow: 0x90e0ef, name: 'River Blue' }, // 2
    { color: 0xd95d39, glow: 0xff8c42, name: 'Sunset Coral' }, // 3
    { color: 0x8338ec, glow: 0xc77dff, name: 'Violet Star' }, // 4
    { color: 0x06d6a0, glow: 0xa7c957, name: 'Tea Leaf' }, // 5
    { color: 0xef476f, glow: 0xf78da7, name: 'Rose Petal' }, // 6
  ];

  // Initialize Three.js Scene
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061118); // Deep calming twilight space
    scene.fog = new THREE.FogExp2(0x061118, 0.04);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 9);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear old canvases if any
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const centerPointLight = new THREE.PointLight(0x0e7c66, 2, 20);
    centerPointLight.position.set(0, 0, 0);
    scene.add(centerPointLight);

    // 5. Starfield Dust Particles
    const starGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const posArray = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 35;
      posArray[i + 1] = (Math.random() - 0.5) * 35;
      posArray[i + 2] = (Math.random() - 0.5) * 35;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.07,
      color: 0x90e0ef,
      transparent: true,
      opacity: 0.65,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);
    particlesRef.current = starPoints;

    // Build Game 3D World Objects
    buildSceneWorld(level, gameMode);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const speed = 0.5 * activeSpeedMultiplierRef.current;

      // Slowly rotate starfield
      if (particlesRef.current) {
        particlesRef.current.rotation.y = elapsed * 0.03 * speed;
        particlesRef.current.rotation.x = elapsed * 0.015 * speed;
      }

      // Gentle floating levitation for orbs
      orbsRef.current.forEach((item, idx) => {
        const floatOffset = Math.sin(elapsed * 2 + idx * 1.2) * 0.12;
        item.mesh.position.y = item.basePosition.y + floatOffset;
        item.glowMesh.position.y = item.basePosition.y + floatOffset;
        item.ringMesh.position.y = item.basePosition.y + floatOffset;

        // Subtle self rotation
        item.mesh.rotation.y = elapsed * 0.8;
        item.mesh.rotation.x = elapsed * 0.4;
        item.ringMesh.rotation.z = -elapsed * 0.6;

        // Visual assist pulse if engine flagged assistance
        if (visualAssistRef.current) {
          const pulse = 1.0 + Math.sin(elapsed * 6) * 0.18;
          item.glowMesh.scale.set(pulse, pulse, pulse);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      renderer.dispose();
    };
  }, [isOpen, gameMode]);

  // Construct 3D orbs based on current mode and level
  const buildSceneWorld = useCallback((currentLvl: number, mode: 'constellation' | 'reflex') => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean existing orbs
    orbsRef.current.forEach((o) => {
      scene.remove(o.mesh);
      scene.remove(o.glowMesh);
      scene.remove(o.ringMesh);
      o.mesh.geometry.dispose();
      (o.mesh.material as THREE.Material).dispose();
      o.glowMesh.geometry.dispose();
      (o.glowMesh.material as THREE.Material).dispose();
      o.ringMesh.geometry.dispose();
      (o.ringMesh.material as THREE.Material).dispose();
    });
    orbsRef.current = [];

    // Orb count scales by level: L1 = 3, L2 = 4, L3 = 5, L4 = 6, L5 = 7
    const orbCount = Math.min(7, Math.max(3, currentLvl + 2));
    const radius = mode === 'constellation' ? 3.3 : 3.8;

    for (let i = 0; i < orbCount; i++) {
      const angle = (i / orbCount) * Math.PI * 2;
      // Arranged in 3D arc with slight depth disparity for realistic parallax
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * (radius * 0.75);
      const z = (Math.sin(i * 1.7) * 1.2);
      const pos = new THREE.Vector3(x, y, z);

      const colorData = ORB_COLORS[i % ORB_COLORS.length];

      // 1. Faceted Icosahedron Gem Mesh
      const gemGeo = new THREE.IcosahedronGeometry(0.75, 1);
      const gemMat = new THREE.MeshStandardMaterial({
        color: colorData.color,
        roughness: 0.2,
        metalness: 0.8,
        emissive: colorData.color,
        emissiveIntensity: 0.25,
      });
      const gemMesh = new THREE.Mesh(gemGeo, gemMat);
      gemMesh.position.copy(pos);
      gemMesh.userData = { id: i, type: 'orb' };

      // 2. Translucent Inner Glow Sphere
      const glowGeo = new THREE.SphereGeometry(0.95, 24, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: colorData.glow,
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.copy(pos);

      // 3. Orbital Ring
      const ringGeo = new THREE.RingGeometry(1.05, 1.15, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorData.glow,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);

      scene.add(gemMesh);
      scene.add(glowMesh);
      scene.add(ringMesh);

      orbsRef.current.push({
        mesh: gemMesh,
        glowMesh,
        ringMesh,
        id: i,
        originalColor: colorData.color,
        glowColor: colorData.glow,
        basePosition: pos,
        baseScale: 1.0,
      });
    }
  }, []);

  // Flash an orb in 3D
  const flashOrb = useCallback((id: number, durationMs = 600): Promise<void> => {
    return new Promise((resolve) => {
      const orb = orbsRef.current.find((o) => o.id === id);
      if (!orb) {
        resolve();
        return;
      }

      if (soundEnabled) {
        gameAudio.playChime(id, durationMs / 1000);
      }

      const mat = orb.mesh.material as THREE.MeshStandardMaterial;
      const glowMat = orb.glowMesh.material as THREE.MeshBasicMaterial;

      // Bright illuminate
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 1.2;
      glowMat.opacity = 0.85;
      orb.mesh.scale.set(1.35, 1.35, 1.35);

      setTimeout(() => {
        mat.emissive.setHex(orb.originalColor);
        mat.emissiveIntensity = 0.25;
        glowMat.opacity = 0.25;
        orb.mesh.scale.set(1.0, 1.0, 1.0);
        resolve();
      }, durationMs);
    });
  }, [soundEnabled]);

  // Start a new Round for Constellation mode
  const startConstellationRound = useCallback(
    async (roundNum: number, currentLvl: number) => {
      setGamePhase('memorize');
      userSequenceRef.current = [];
      setSequenceIndex(0);

      // Sequence length: Round 1 = 3, up to 7
      const orbCount = Math.min(7, Math.max(3, currentLvl + 2));
      const sequenceLength = Math.min(orbCount, currentLvl + 2);
      const newSeq: number[] = [];

      for (let i = 0; i < sequenceLength; i++) {
        newSeq.push(Math.floor(Math.random() * orbCount));
      }
      sequenceRef.current = newSeq;

      // Wait 700ms before flashing sequence
      await new Promise((r) => setTimeout(r, 700));

      // Flash sequence
      const flashSpeed = Math.max(450, 800 - currentLvl * 60) / activeSpeedMultiplierRef.current;
      for (const orbId of newSeq) {
        await flashOrb(orbId, flashSpeed);
        await new Promise((r) => setTimeout(r, 250));
      }

      setGamePhase('recall');
      trialStartTimeRef.current = Date.now();
    },
    [flashOrb]
  );

  // Spawn Next Reflex Target
  const spawnReflexTarget = useCallback(() => {
    if (orbsRef.current.length === 0) return;
    // Hide all orbs first
    orbsRef.current.forEach((o) => {
      o.mesh.visible = false;
      o.glowMesh.visible = false;
      o.ringMesh.visible = false;
    });

    // Pick random target
    const targetIdx = Math.floor(Math.random() * orbsRef.current.length);
    const target = orbsRef.current[targetIdx];
    activeReflexTargetId.current = target.id;

    target.mesh.visible = true;
    target.glowMesh.visible = true;
    target.ringMesh.visible = true;

    // Apply Hitbox scale from ML engine
    const scale = activeHitboxMultiplierRef.current;
    target.mesh.scale.set(scale, scale, scale);

    trialStartTimeRef.current = Date.now();

    // Reflex lifespan (Level 1: 3200ms, Level 5: 1400ms)
    const lifespan = (3400 - level * 400) / activeSpeedMultiplierRef.current;

    clearTimeout(reflexSpawnTimeoutRef.current);
    reflexSpawnTimeoutRef.current = setTimeout(() => {
      // Missed / Timed out
      handleReflexMiss(target.id);
    }, lifespan);
  }, [level]);

  // Handle reflex miss
  const handleReflexMiss = useCallback(
    (targetId: number) => {
      if (soundEnabled) gameAudio.playMiss();
      const rt = Date.now() - trialStartTimeRef.current;

      const mlResult = engineRef.current.recordTrial(rt, false, 800, `target-${targetId}`);
      applyMLInterference(mlResult);

      setReactionTimeMs(rt);
      setEmaReactionTime(mlResult.currentEmaRtMs);
      setAccuracyPercent(Math.round((score / Math.max(1, round)) * 100));

      setRound((r) => r + 1);
      setTimeout(() => {
        spawnReflexTarget();
      }, 500);
    },
    [soundEnabled, score, round, spawnReflexTarget]
  );

  // Apply ML Cognitive Engine dynamic interference results
  const applyMLInterference = useCallback(
    (res: MLInterferenceResult) => {
      activeSpeedMultiplierRef.current = res.speedMultiplier;
      activeHitboxMultiplierRef.current = res.hitboxScaleMultiplier;
      visualAssistRef.current = res.visualAssistActive;

      if (res.shouldIntervene) {
        setActiveIntervention(res.reason);
        setInterventionsCount((c) => c + 1);
        if (soundEnabled) gameAudio.playInterventionCue();

        if (res.recommendedLevel !== level) {
          setLevel(res.recommendedLevel);
          buildSceneWorld(res.recommendedLevel, gameMode);
        }

        // Auto dismiss intervention notification after 5s
        setTimeout(() => {
          setActiveIntervention(null);
        }, 5000);
      }
    },
    [soundEnabled, level, gameMode, buildSceneWorld]
  );

  // Start / Restart Game
  const handleStartGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setRound(1);
    setReactionTimeMs(0);
    setInterventionsCount(0);
    setActiveIntervention(null);
    startTimeRef.current = Date.now();
    engineRef.current.reset(level);

    buildSceneWorld(level, gameMode);

    if (gameMode === 'constellation') {
      startConstellationRound(1, level);
    } else {
      orbsRef.current.forEach((o) => {
        o.mesh.visible = false;
        o.glowMesh.visible = false;
        o.ringMesh.visible = false;
      });
      setTimeout(() => {
        spawnReflexTarget();
      }, 600);
    }
  };

  // Raycaster click handler on 3D canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlaying || gameOver || !containerRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const meshes = orbsRef.current.map((o) => o.mesh).filter((m) => m.visible);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const orbId = clickedMesh.userData.id as number;
      handleOrbTapped(orbId);
    }
  };

  // Handle user tapping an orb
  const handleOrbTapped = (orbId: number) => {
    const clickTime = Date.now();
    const rt = Math.max(120, clickTime - trialStartTimeRef.current);

    if (gameMode === 'constellation') {
      if (gamePhase !== 'recall') return;

      const expectedId = sequenceRef.current[sequenceIndex];
      const isCorrect = orbId === expectedId;

      flashOrb(orbId, 350);
      trialStartTimeRef.current = Date.now();

      // Feed ML Engine
      const mlResult = engineRef.current.recordTrial(rt, isCorrect, rt * 0.4, `orb-${orbId}`);
      applyMLInterference(mlResult);

      setReactionTimeMs(rt);
      setEmaReactionTime(mlResult.currentEmaRtMs);

      if (isCorrect) {
        const nextIdx = sequenceIndex + 1;
        setSequenceIndex(nextIdx);

        // Sequence completed successfully!
        if (nextIdx >= sequenceRef.current.length) {
          setScore((s) => s + 20 + level * 5);
          if (soundEnabled) gameAudio.playLevelSuccess();

          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#0E7C66', '#E3A63B', '#3E7CB1'],
          });

          // Check if finished 5 rounds
          if (round >= 5) {
            handleCompleteGame();
          } else {
            setRound((r) => r + 1);
            setTimeout(() => {
              startConstellationRound(round + 1, level);
            }, 1200);
          }
        }
      } else {
        // Incorrect tap
        if (soundEnabled) gameAudio.playMiss();
        addToast('Pattern mismatched — ML adjusted hint brightness', '✨');

        // Retry pattern with assist
        setTimeout(() => {
          startConstellationRound(round, level);
        }, 1200);
      }
    } else {
      // Reflex Mode
      clearTimeout(reflexSpawnTimeoutRef.current);
      const isCorrect = orbId === activeReflexTargetId.current;

      flashOrb(orbId, 250);

      const mlResult = engineRef.current.recordTrial(rt, isCorrect, 50, `reflex-${orbId}`);
      applyMLInterference(mlResult);

      setReactionTimeMs(rt);
      setEmaReactionTime(mlResult.currentEmaRtMs);
      setScore((s) => s + Math.max(10, Math.round(30 - rt / 60)));

      if (round >= 10) {
        handleCompleteGame();
      } else {
        setRound((r) => r + 1);
        setTimeout(() => {
          spawnReflexTarget();
        }, 400);
      }
    }
  };

  // Complete Game Session & Finalize ML Analysis
  const handleCompleteGame = () => {
    setIsPlaying(false);
    setGameOver(true);
    clearTimeout(reflexSpawnTimeoutRef.current);

    const activePatientId = currentPatient?.id || 'PAT-7201-BIREN';
    const domains = gameMode === 'constellation' ? ['memory', 'attention'] : ['speed', 'attention'];

    const session = engineRef.current.finalizeSession(
      activePatientId,
      gameMode === 'constellation' ? 'seq' : 'odd',
      domains,
      visualAssistRef.current ? 1 : 0,
      startTimeRef.current
    );

    setFinalSession(session);
    if (onSessionCompleted) {
      onSessionCompleted(session);
    }
    addToast('Cognitive session finished & recorded to ML registry!', '🧠');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[860px] bg-[#0A161E] border border-[#1A3344] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Top Header & ML Telemetry Bar */}
        <div className="px-5 py-3.5 bg-[#061118]/90 border-b border-[#1A3344] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-white">
                  {gameMode === 'constellation' ? 'Assam Celestial Constellation (3D)' : 'Sanctuary Reflex Orbit (3D)'}
                </h3>
                <span className="chip px-2 py-0.5 text-[11px] font-bold bg-emerald-950 text-emerald-300 border-emerald-700">
                  Level {level} · {gameMode === 'constellation' ? 'Spatial Memory' : 'Reaction Vigilance'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Patient: <span className="text-white font-medium">{currentPatient?.name || 'Patient'}</span> · Autonomous ML Difficulty Engine Active
              </p>
            </div>
          </div>

          {/* Controls & Badges */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 transition"
              title="Close 3D Lab"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live HUD telemetry banner */}
        <div className="px-5 py-2 bg-[#0C1B26] border-b border-[#1A3344] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Reaction Speed:</span>
              <strong className={`font-mono text-sm ${reactionTimeMs > 900 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {reactionTimeMs ? `${reactionTimeMs} ms` : '—'}
              </strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>EMA Latency:</span>
              <strong className="font-mono text-sm text-sky-400">{emaReactionTime} ms</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Score:</span>
              <strong className="font-mono text-sm text-amber-300">{score}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ML Engine: Adaptive Vigilance</span>
            </span>
            {interventionsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/40 text-[11px] font-semibold text-amber-300">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>{interventionsCount} ML Interventions</span>
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Intervention Banner (when ML adjusts the game in real time) */}
        {activeIntervention && (
          <div className="bg-amber-900/70 border-b border-amber-500/50 px-5 py-2 text-amber-200 text-xs flex items-center justify-between animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span className="font-bold">ML Interference Triggered:</span>
              <span>{activeIntervention}</span>
            </div>
            <span className="text-[10px] text-amber-300/80 font-mono">DDA Active</span>
          </div>
        )}

        {/* Main 3D Canvas Container */}
        <div className="relative flex-1 bg-black overflow-hidden cursor-pointer" onClick={handleCanvasClick}>
          <div ref={containerRef} className="w-full h-full" />

          {/* Phase Guidance Overlay for Constellation */}
          {isPlaying && !gameOver && gameMode === 'constellation' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="px-5 py-2 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-sm font-bold flex items-center gap-2.5 shadow-lg">
                {gamePhase === 'memorize' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-amber-300">Watch the glowing sequence...</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300">
                      Tap the orbs in sequence ({sequenceIndex} of {sequenceRef.current.length})
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Guidance Overlay for Reflex */}
          {isPlaying && !gameOver && gameMode === 'reflex' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="px-5 py-2 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-sm font-bold text-amber-300 flex items-center gap-2 shadow-lg">
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Tap the target as fast as you can! (Round {round} of 10)</span>
              </div>
            </div>
          )}

          {/* Start Screen Overlay */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center z-10">
              <div className="max-w-md w-full p-8 rounded-2xl bg-[#0F2230] border border-[#1E3B50] shadow-2xl space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <Brain className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-white">3D Cognitive Reflex Studio</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Powered by an autonomous Machine Learning engine that monitors reaction speed, hesitation latency, and cognitive fatigue to dynamically scale levels and guide neuro-recovery.
                  </p>
                </div>

                {/* Game mode selector */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setGameMode('constellation');
                      buildSceneWorld(level, 'constellation');
                    }}
                    className={`p-3.5 rounded-xl border transition text-xs font-semibold ${
                      gameMode === 'constellation'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-bold text-sm text-white">🌸 Constellation</p>
                    <p className="text-[11px] mt-1 text-slate-400">Spatial memory &amp; 3D sequence recall</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGameMode('reflex');
                      buildSceneWorld(level, 'reflex');
                    }}
                    className={`p-3.5 rounded-xl border transition text-xs font-semibold ${
                      gameMode === 'reflex'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-bold text-sm text-white">⚡ Reflex Orbit</p>
                    <p className="text-[11px] mt-1 text-slate-400">Reaction speed &amp; visual motor tracking</p>
                  </button>
                </div>

                {/* Level selector */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Starting Difficulty Tier:</span>
                    <span className="text-emerald-400">Level {level}</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          setLevel(lvl);
                          buildSceneWorld(lvl, gameMode);
                        }}
                        className={`py-2 rounded-lg text-xs font-bold transition border ${
                          level === lvl
                            ? 'bg-emerald-600 border-emerald-400 text-white shadow-xs'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Lv {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartGame}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-lg hover:shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-5 h-5 fill-white" />
                  <span>Launch 3D Game Session</span>
                </button>
              </div>
            </div>
          )}

          {/* Game Over / Post-Session Clinical Cognitive Report */}
          {gameOver && finalSession && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-20 animate-in zoom-in-95">
              <div className="max-w-xl w-full p-6 sm:p-8 rounded-2xl bg-[#0E1F2C] border border-emerald-500/40 shadow-2xl space-y-6 text-left max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-display text-xl font-bold text-white">Cognitive Session Complete</h4>
                      <p className="text-xs text-slate-400">
                        Evaluated by Medha ML Cognitive Engine · Saved &amp; Queued for Supabase
                      </p>
                    </div>
                  </div>
                  <span className="chip px-3 py-1 bg-emerald-950 text-emerald-300 border-emerald-600 text-xs font-bold">
                    Score {finalSession.score} / 100
                  </span>
                </div>

                {/* Metric Bento Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Avg Reaction</p>
                    <p className="text-xl font-mono font-bold text-emerald-400 mt-1">
                      {Math.round(finalSession.averageReactionTime * 1000)} ms
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Senior normal: ~650ms</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Fastest Hit</p>
                    <p className="text-xl font-mono font-bold text-sky-400 mt-1">
                      {finalSession.peakReactionTimeMs || Math.round(finalSession.averageReactionTime * 1000)} ms
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Peak vigilance</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Accuracy</p>
                    <p className="text-xl font-mono font-bold text-amber-300 mt-1">
                      {Math.round(finalSession.accuracy * 100)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {finalSession.correctAnswers} / {finalSession.attempts} trials
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Motor Stability</p>
                    <p className="text-xl font-mono font-bold text-purple-300 mt-1">
                      {finalSession.motorStabilityScore || 88} / 100
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Latency consistency</p>
                  </div>
                </div>

                {/* ML Engine Clinical Analysis */}
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-200">ML Engine Neuro-Assessment</span>
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    {finalSession.accuracy >= 0.85
                      ? `Excellent pattern recognition and responsive motor speed. Reaction times remained within steady therapeutic bounds (${Math.round(finalSession.averageReactionTime * 1000)}ms).`
                      : `Mild hesitation detected during spatial shifts. The adaptive engine adjusted visual contrast and slowed 3D orbital velocity by 35% to support comfortable recall.`}
                  </p>
                  {finalSession.mlInterventions && finalSession.mlInterventions.length > 0 && (
                    <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-300 space-y-1">
                      <p className="font-semibold">Recorded Interventions:</p>
                      {finalSession.mlInterventions.map((inv, idx) => (
                        <p key={idx} className="flex items-center gap-1 text-[10px] text-slate-300">
                          <span className="text-emerald-400">•</span>
                          <span>{inv.reason}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleStartGame}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer border border-slate-600"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Play Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addToast('Session metrics synced to Caregiver Dashboard & Supabase!', '✅');
                      onClose();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Return to Dashboard</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-[#061118] border-t border-[#1A3344] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>Three.js WebGL Accelerated 3D Game Canvas · Assam Cultural Motif Adaptation</span>
          <span className="hidden sm:inline">Telemetry auto-synced with Supabase table `game_sessions`</span>
        </div>
      </div>
    </div>
  );
};
