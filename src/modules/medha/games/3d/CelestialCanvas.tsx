/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 3D Celestial Horizon Scene (Three.js WebGL)
 * Low-poly Floating Celestial Sanctuary with animated 3D Sun, Moon, Storm Clouds, and particle aura.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type StimulusType = 'SUN' | 'MOON' | 'CLOUD' | 'NONE';

interface CelestialCanvasProps {
  stimulus: StimulusType;
  isEclipse?: boolean;
  userAction?: 'SUN' | 'MOON' | 'HOLD' | null;
  isCorrect?: boolean | null;
  holdProgress?: number; // 0 to 1
  className?: string;
}

export const CelestialCanvas: React.FC<CelestialCanvasProps> = ({
  stimulus,
  isEclipse = false,
  userAction = null,
  isCorrect = null,
  holdProgress = 0,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // References for dynamic 3D objects to update inside render loop
  const stateRef = useRef({
    stimulus,
    isEclipse,
    userAction,
    isCorrect,
    holdProgress,
  });

  useEffect(() => {
    stateRef.current = { stimulus, isEclipse, userAction, isCorrect, holdProgress };
  }, [stimulus, isEclipse, userAction, isCorrect, holdProgress]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.05);

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 8.5);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0x334155, 1.2);
    scene.add(ambientLight);

    const celestialLight = new THREE.DirectionalLight(0xfef08a, 2.2);
    celestialLight.position.set(0, 6, 2);
    scene.add(celestialLight);

    const altarGlowLight = new THREE.PointLight(0x38bdf8, 1.5, 6);
    altarGlowLight.position.set(0, 0.8, 0);
    scene.add(altarGlowLight);

    // 1. FLOATING ISLAND
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    // Main island base
    const islandGeo = new THREE.CylinderGeometry(3.2, 2.2, 1.2, 10);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });
    const islandMesh = new THREE.Mesh(islandGeo, islandMat);
    islandMesh.position.y = -0.6;
    islandGroup.add(islandMesh);

    // Island grass / moss top cap
    const topCapGeo = new THREE.CylinderGeometry(3.1, 3.1, 0.15, 10);
    const topCapMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      roughness: 0.9,
      flatShading: true,
    });
    const topCapMesh = new THREE.Mesh(topCapGeo, topCapMat);
    topCapMesh.position.y = 0.05;
    islandGroup.add(topCapMesh);

    // Decorative floating crystals / runes
    const crystalGeo = new THREE.OctahedronGeometry(0.35);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });
    const leftCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    leftCrystal.position.set(-2.2, 0.6, 0.5);
    islandGroup.add(leftCrystal);

    const rightCrystal = new THREE.Mesh(crystalGeo, crystalMat.clone());
    rightCrystal.position.set(2.2, 0.6, 0.5);
    islandGroup.add(rightCrystal);

    // Left Altar (Sun Shrine)
    const altarGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
    const sunAltarMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.6,
    });
    const sunAltar = new THREE.Mesh(altarGeo, sunAltarMat);
    sunAltar.position.set(-1.6, 0.35, 0.8);
    islandGroup.add(sunAltar);

    const sunOrbGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const sunOrbMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });
    const sunOrb = new THREE.Mesh(sunOrbGeo, sunOrbMat);
    sunOrb.position.set(-1.6, 0.85, 0.8);
    islandGroup.add(sunOrb);

    // Right Altar (Moon Shrine)
    const moonAltarMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.6,
    });
    const moonAltar = new THREE.Mesh(altarGeo, moonAltarMat);
    moonAltar.position.set(1.6, 0.35, 0.8);
    islandGroup.add(moonAltar);

    const moonOrbGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const moonOrbMat = new THREE.MeshStandardMaterial({
      color: 0xc7d2fe,
      emissive: 0x818cf8,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });
    const moonOrb = new THREE.Mesh(moonOrbGeo, moonOrbMat);
    moonOrb.position.set(1.6, 0.85, 0.8);
    islandGroup.add(moonOrb);

    // Protective Shield Dome (for holding on cloud)
    const domeGeo = new THREE.SphereGeometry(2.8, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0,
      roughness: 0.1,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const shieldDome = new THREE.Mesh(domeGeo, domeMat);
    shieldDome.position.y = 0.05;
    islandGroup.add(shieldDome);

    // Interactive Action Beams
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.18, 5, 12);
    const sunBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0,
    });
    const sunBeam = new THREE.Mesh(beamGeo, sunBeamMat);
    sunBeam.position.set(-1.6, 3.2, 0.8);
    scene.add(sunBeam);

    const moonBeamMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0,
    });
    const moonBeam = new THREE.Mesh(beamGeo, moonBeamMat);
    moonBeam.position.set(1.6, 3.2, 0.8);
    scene.add(moonBeam);

    // 2. CELESTIAL BODIES (SUN, MOON, CLOUD)

    // A. 3D SUN GROUP
    const sunGroup = new THREE.Group();
    sunGroup.position.set(0, -5, 0); // start submerged
    scene.add(sunGroup);

    const sunCoreGeo = new THREE.SphereGeometry(1.1, 24, 24);
    const sunCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
    const sunCore = new THREE.Mesh(sunCoreGeo, sunCoreMat);
    sunGroup.add(sunCore);

    // Corona Ring
    const coronaGeo = new THREE.TorusGeometry(1.6, 0.08, 8, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.7,
    });
    const corona1 = new THREE.Mesh(coronaGeo, coronaMat);
    sunGroup.add(corona1);
    const corona2 = new THREE.Mesh(coronaGeo, coronaMat.clone());
    corona2.rotation.x = Math.PI * 0.4;
    sunGroup.add(corona2);

    // B. 3D MOON GROUP
    const moonGroup = new THREE.Group();
    moonGroup.position.set(0, -5, 0);
    scene.add(moonGroup);

    const moonCoreGeo = new THREE.SphereGeometry(1.05, 24, 24);
    const moonCoreMat = new THREE.MeshStandardMaterial({
      color: 0xe0e7ff,
      emissive: 0x818cf8,
      emissiveIntensity: 0.9,
      roughness: 0.4,
      metalness: 0.2,
    });
    const moonCore = new THREE.Mesh(moonCoreGeo, moonCoreMat);
    moonGroup.add(moonCore);

    // Lunar Crescent Accent
    const haloGeo = new THREE.RingGeometry(1.25, 1.45, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xa5b4fc,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const lunarHalo = new THREE.Mesh(haloGeo, haloMat);
    moonGroup.add(lunarHalo);

    // C. 3D STORM CLOUD GROUP
    const cloudGroup = new THREE.Group();
    cloudGroup.position.set(0, -5, 0);
    scene.add(cloudGroup);

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      emissive: 0x334155,
      emissiveIntensity: 0.3,
      roughness: 0.9,
      flatShading: true,
    });

    const puffGeos = [
      { r: 0.9, x: 0, y: 0, z: 0 },
      { r: 0.75, x: -0.9, y: -0.2, z: 0.1 },
      { r: 0.75, x: 0.9, y: -0.15, z: 0.1 },
      { r: 0.6, x: -0.5, y: 0.5, z: -0.1 },
      { r: 0.65, x: 0.5, y: 0.45, z: 0.1 },
    ];
    puffGeos.forEach((p) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 12, 12), cloudMat);
      puff.position.set(p.x, p.y, p.z);
      cloudGroup.add(puff);
    });

    // 3. PARTICLE AMBIENCE
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 12;
      particlePos[i + 1] = Math.random() * 6 - 1;
      particlePos[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xfef08a,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ANIMATION & LERPING LOOP
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      const { stimulus: currentStim, isEclipse: eclipse, userAction: action, holdProgress: hold } = stateRef.current;

      // Island breathing float
      islandGroup.position.y = Math.sin(elapsed * 1.5) * 0.08;
      islandGroup.rotation.y = Math.sin(elapsed * 0.3) * 0.04;

      // Crystals hover
      leftCrystal.position.y = 0.6 + Math.sin(elapsed * 2.5) * 0.08;
      leftCrystal.rotation.y += 0.02;
      rightCrystal.position.y = 0.6 + Math.cos(elapsed * 2.5) * 0.08;
      rightCrystal.rotation.y -= 0.02;

      // Rotate coronas & orbs
      corona1.rotation.z += 0.008;
      corona2.rotation.y += 0.012;
      sunOrb.rotation.y += 0.03;
      moonOrb.rotation.y += 0.02;

      // Particles gentle drift
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += 0.004;
        if (positions[i] > 5) positions[i] = -1;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Smooth target heights for celestial bodies
      // Target Y when active is ~2.7, when inactive is -4.5
      const sunTargetY = currentStim === 'SUN' ? 2.6 : -4.5;
      const moonTargetY = currentStim === 'MOON' ? 2.6 : -4.5;
      const cloudTargetY = currentStim === 'CLOUD' ? 2.6 : -4.5;

      sunGroup.position.y = THREE.MathUtils.lerp(sunGroup.position.y, sunTargetY, 0.08);
      moonGroup.position.y = THREE.MathUtils.lerp(moonGroup.position.y, moonTargetY, 0.08);
      cloudGroup.position.y = THREE.MathUtils.lerp(cloudGroup.position.y, cloudTargetY, 0.08);

      // Cloud rumble wobble
      if (currentStim === 'CLOUD') {
        cloudGroup.position.x = Math.sin(elapsed * 4) * 0.08;
        cloudGroup.position.z = Math.cos(elapsed * 3) * 0.08;
      } else {
        cloudGroup.position.x = 0;
        cloudGroup.position.z = 0;
      }

      // Dynamic Sky & Ambient Colors
      if (currentStim === 'SUN') {
        ambientLight.color.lerp(new THREE.Color(0x451a03), 0.05); // warm amber
        celestialLight.color.lerp(new THREE.Color(0xfde047), 0.05);
        particleMat.color.setHex(0xfde047);
      } else if (currentStim === 'MOON') {
        ambientLight.color.lerp(new THREE.Color(0x1e1b4b), 0.05); // deep indigo
        celestialLight.color.lerp(new THREE.Color(0xa5b4fc), 0.05);
        particleMat.color.setHex(0xa5b4fc);
      } else if (currentStim === 'CLOUD') {
        ambientLight.color.lerp(new THREE.Color(0x1e293b), 0.05); // moody storm slate
        celestialLight.color.lerp(new THREE.Color(0x64748b), 0.05);
        particleMat.color.setHex(0x94a3b8);
      } else {
        ambientLight.color.lerp(new THREE.Color(0x1e293b), 0.05);
      }

      // Eclipse / Stroop purple tint
      if (eclipse) {
        altarGlowLight.color.lerp(new THREE.Color(0xc084fc), 0.1);
      } else {
        altarGlowLight.color.lerp(new THREE.Color(0x38bdf8), 0.1);
      }

      // Action Beams logic
      const targetSunBeamOpacity = action === 'SUN' ? 0.8 : 0;
      const targetMoonBeamOpacity = action === 'MOON' ? 0.8 : 0;
      sunBeamMat.opacity = THREE.MathUtils.lerp(sunBeamMat.opacity, targetSunBeamOpacity, 0.2);
      moonBeamMat.opacity = THREE.MathUtils.lerp(moonBeamMat.opacity, targetMoonBeamOpacity, 0.2);

      // Shield dome expands if Cloud is holding
      if (currentStim === 'CLOUD') {
        const targetDomeOpacity = THREE.MathUtils.clamp(hold * 0.6 + 0.1, 0, 0.7);
        domeMat.opacity = THREE.MathUtils.lerp(domeMat.opacity, targetDomeOpacity, 0.1);
        shieldDome.rotation.y += 0.01;
      } else {
        domeMat.opacity = THREE.MathUtils.lerp(domeMat.opacity, 0, 0.15);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // RESIZE OBSERVER
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      islandGeo.dispose();
      islandMat.dispose();
      sunCoreGeo.dispose();
      sunCoreMat.dispose();
      moonCoreGeo.dispose();
      moonCoreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};
