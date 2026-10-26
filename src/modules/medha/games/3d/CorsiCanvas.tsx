/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 3D Corsi Block-Tapping Canvas (Three.js WebGL)
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface CorsiCanvasProps {
  stage: 'READY' | 'WATCH' | 'RECALL' | 'FEEDBACK';
  highlightedCube: number | null; // For the sequence playback
  userSequence: number[]; // Cubes the user has clicked
  correctSequence: number[]; // The correct sequence for feedback
  isCorrect: boolean | null; // Overall trial feedback
  onCubeClick: (cubeIndex: number) => void;
  className?: string;
}

// 9 Standard Corsi Block positions (normalized for a 3D isometric grid)
const CUBE_POSITIONS = [
  new THREE.Vector3(-2.5, 0, -1.5),
  new THREE.Vector3(0, 0, -2.5),
  new THREE.Vector3(2.5, 0, -1.5),
  new THREE.Vector3(-1.5, 0, 0),
  new THREE.Vector3(1, 0, 0.5),
  new THREE.Vector3(2.5, 0, 1.5),
  new THREE.Vector3(-2.5, 0, 2),
  new THREE.Vector3(-0.5, 0, 2.5),
  new THREE.Vector3(1.5, 0, 2.8),
];

export const CorsiCanvas: React.FC<CorsiCanvasProps> = ({
  stage,
  highlightedCube,
  userSequence,
  correctSequence,
  isCorrect,
  onCubeClick,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  
  // Use a ref to hold latest props for the animation loop / event listeners
  const stateRef = useRef({ stage, highlightedCube, userSequence, correctSequence, isCorrect });
  useEffect(() => {
    stateRef.current = { stage, highlightedCube, userSequence, correctSequence, isCorrect };
  }, [stage, highlightedCube, userSequence, correctSequence, isCorrect]);

  const onCubeClickRef = useRef(onCubeClick);
  useEffect(() => {
    onCubeClickRef.current = onCubeClick;
  }, [onCubeClick]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.05);

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 7, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xe2e8f0, 2.0);
    dirLight.position.set(5, 10, 2);
    scene.add(dirLight);

    // PLATFORM
    const platformGeo = new THREE.CylinderGeometry(5.5, 5, 0.5, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.5;
    scene.add(platform);

    // CUBES
    const cubeGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    
    // Base material (idle)
    const idleMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // slate-700
      roughness: 0.2,
      metalness: 0.1,
    });
    
    // Highlight material (system showing sequence)
    const highlightMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // sky-400
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.5,
    });

    // Selected material (user clicked)
    const selectedMat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa, // violet-400
      emissive: 0x7c3aed,
      emissiveIntensity: 0.6,
      roughness: 0.1,
    });
    
    // Success material
    const successMat = new THREE.MeshStandardMaterial({
      color: 0x34d399, // emerald-400
      emissive: 0x059669,
      emissiveIntensity: 0.8,
    });

    // Error material
    const errorMat = new THREE.MeshStandardMaterial({
      color: 0xf87171, // red-400
      emissive: 0xdc2626,
      emissiveIntensity: 0.8,
    });

    const cubeMeshes: THREE.Mesh[] = [];
    CUBE_POSITIONS.forEach((pos, idx) => {
      const mesh = new THREE.Mesh(cubeGeo, idleMat.clone());
      mesh.position.copy(pos);
      mesh.userData = { index: idx, basePosY: pos.y, hoverOffset: 0 };
      scene.add(mesh);
      cubeMeshes.push(mesh);
    });

    // RAYCASTING FOR INTERACTION
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-2, -2); // Start off-screen
    let hoveredIndex: number | null = null;

    const updateMousePos = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      updateMousePos(e.clientX, e.clientY);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (stateRef.current.stage !== 'RECALL') return;
      
      updateMousePos(e.clientX, e.clientY);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cubeMeshes);
      
      if (intersects.length > 0) {
        const clickedCube = intersects[0].object as THREE.Mesh;
        const idx = clickedCube.userData.index;
        
        // Prevent double clicking same cube if it's already the last one selected
        const currentSeq = stateRef.current.userSequence;
        if (currentSeq.length === 0 || currentSeq[currentSeq.length - 1] !== idx) {
          onCubeClickRef.current(idx);
          
          // Little click bounce animation
          clickedCube.position.y = -0.2;
        }
      }
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);

    // ANIMATION LOOP
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      
      const { stage, highlightedCube, userSequence, correctSequence, isCorrect } = stateRef.current;

      // Handle hover logic
      if (stage === 'RECALL') {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cubeMeshes);
        hoveredIndex = intersects.length > 0 ? (intersects[0].object as THREE.Mesh).userData.index : null;
        container.style.cursor = hoveredIndex !== null ? 'pointer' : 'default';
      } else {
        hoveredIndex = null;
        container.style.cursor = 'default';
      }

      // Update each cube's material and position
      cubeMeshes.forEach((mesh, idx) => {
        const isSystemHighlighted = stage === 'WATCH' && highlightedCube === idx;
        const isUserSelected = userSequence.includes(idx);
        
        // Material determination
        let targetMat = idleMat;
        if (stage === 'FEEDBACK') {
          if (isCorrect === true && userSequence.includes(idx)) {
            targetMat = successMat;
          } else if (isCorrect === false) {
            // Show correct sequence in green, user errors in red
            if (correctSequence.includes(idx) && !userSequence.includes(idx)) {
               targetMat = highlightMat; // Missed
            } else if (userSequence.includes(idx) && !correctSequence.includes(idx)) {
               targetMat = errorMat; // Commission error
            } else if (userSequence.includes(idx) && correctSequence.includes(idx)) {
               // Order matters, but for simplistic visual we just show it was part of it
               targetMat = successMat; 
            }
          }
        } else if (isSystemHighlighted) {
          targetMat = highlightMat;
        } else if (isUserSelected) {
          targetMat = selectedMat;
        } else if (hoveredIndex === idx) {
          // Hover state
          targetMat = highlightMat;
        }

        mesh.material = targetMat;

        // Position animation (floating and bouncing)
        const basePosY = mesh.userData.basePosY;
        let targetY = basePosY;

        if (isSystemHighlighted || isUserSelected) {
          targetY = basePosY + 0.3; // Pop up
        } else if (hoveredIndex === idx) {
          targetY = basePosY + 0.15; // Slight hover pop
        }
        
        // Smooth lerp position
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 0.15);
        
        // Gentle idle floating when not doing anything else
        if (targetY === basePosY) {
           mesh.position.y += Math.sin(elapsed * 2 + idx) * 0.02;
        }
      });

      // Platform rotation slowly
      platform.rotation.y = Math.sin(elapsed * 0.2) * 0.1;

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
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      renderer.dispose();
      platformGeo.dispose();
      platformMat.dispose();
      cubeGeo.dispose();
      idleMat.dispose();
      highlightMat.dispose();
      selectedMat.dispose();
      successMat.dispose();
      errorMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};
