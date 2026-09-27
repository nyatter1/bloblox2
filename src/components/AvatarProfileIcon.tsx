import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import { getFaceTexture, createFaceMesh } from '../utils/faceTexture';
import { attachShirtToLimbs } from '../utils/shirtTexture';
import { attachPantsToLimbs } from '../utils/pantsTexture';
import { createHairMesh } from '../utils/hairMesh';

interface AvatarProfileIconProps {
  colors?: AvatarColors;
  selectedFaceId?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  selectedHairId?: string;
  hairColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  shape?: 'circle' | 'rounded';
  border?: boolean;
  fullBody?: boolean;
  framing?: 'head' | 'bust' | 'face-and-lower-body' | 'fullBody';
}

export default function AvatarProfileIcon({
  colors = {
    head: DEFAULT_GREY,
    torso: DEFAULT_GREY,
    leftArm: DEFAULT_GREY,
    rightArm: DEFAULT_GREY,
    leftLeg: DEFAULT_GREY,
    rightLeg: DEFAULT_GREY,
  },
  selectedFaceId = 'classic-smile',
  shirtDataUrl = null,
  pantsDataUrl = null,
  selectedHairId = 'none',
  hairColor = '#4a2e1b',
  size = 'md',
  className = '',
  shape = 'circle',
  border = true,
  fullBody = false,
  framing = 'bust',
}: AvatarProfileIconProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);

  const pixelSize = typeof size === 'number'
    ? size
    : size === 'xs'
    ? 24
    : size === 'sm'
    ? 32
    : size === 'md'
    ? 44
    : size === 'lg'
    ? 64
    : size === 'xl'
    ? 80
    : size === '2xl'
    ? 120
    : 100;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera framing: precisely captures head, chest, left arm, and right arm (classic Roblox bust thumbnail)
    const isFull = fullBody || framing === 'fullBody';
    const isHeadOnly = framing === 'head';
    
    let camera: THREE.PerspectiveCamera;
    if (isFull) {
      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
      camera.position.set(0.2, 2.5, 7.8);
      camera.lookAt(0, 2.3, 0);
    } else if (isHeadOnly) {
      camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0.1, 4.65, 3.8);
      camera.lookAt(0, 4.65, 0);
    } else {
      // Default: 'bust' / 'face-and-lower-body'
      // Frames the head, hair, upper/mid chest, and both left and right arms
      camera = new THREE.PerspectiveCamera(43, 1, 0.1, 50);
      camera.position.set(0.12, 3.9, 5.05);
      camera.lookAt(0, 3.82, 0);
    }

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(pixelSize, pixelSize);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Neutral Natural Lighting (Accurate skin tone and face rendition with NO blue tint)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffdfa, 2.2);
    sunLight.position.set(4, 8, 6);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xfff7ed, 0.7);
    fillLight.position.set(-4, 3, -3);
    scene.add(fillLight);

    // 5. Character Mesh Construction
    const characterGroup = new THREE.Group();
    characterGroup.rotation.y = -0.1;
    scene.add(characterGroup);
    characterGroupRef.current = characterGroup;

    const createMat = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex || DEFAULT_GREY),
        roughness: 0.45,
        metalness: 0.08,
      });

    const headMat = createMat(colors.head);
    const torsoMat = createMat(colors.torso);
    const leftArmMat = createMat(colors.leftArm);
    const rightArmMat = createMat(colors.rightArm);
    const leftLegMat = createMat(colors.leftLeg);
    const rightLegMat = createMat(colors.rightLeg);

    // --- Torso ---
    const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, 3, 0);
    characterGroup.add(torsoMesh);

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 4.7, 0);

    const cylinderGeo = new THREE.CylinderGeometry(0.625, 0.625, 0.95, 32);
    const headCylinder = new THREE.Mesh(cylinderGeo, headMat);
    headGroup.add(headCylinder);

    const topCapGeo = new THREE.SphereGeometry(0.625, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    topCapGeo.scale(1, 0.35, 1);
    const topCap = new THREE.Mesh(topCapGeo, headMat);
    topCap.position.y = 0.475;
    headGroup.add(topCap);

    const botCapGeo = new THREE.SphereGeometry(0.625, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    botCapGeo.scale(1, 0.35, 1);
    const botCap = new THREE.Mesh(botCapGeo, headMat);
    botCap.position.y = -0.475;
    headGroup.add(botCap);

    // Face Texture
    const faceMesh = createFaceMesh(selectedFaceId);
    headGroup.add(faceMesh);

    // Hair if selected
    if (selectedHairId && selectedHairId !== 'none') {
      const hairMesh = createHairMesh(selectedHairId, hairColor);
      if (hairMesh) {
        headGroup.add(hairMesh);
      }
    }

    characterGroup.add(headGroup);

    // --- Arms ---
    const armGeo = new THREE.BoxGeometry(1, 2, 1);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(1.5, 4, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, leftArmMat);
    leftArmMesh.position.set(0, -1, 0);
    leftArmGroup.add(leftArmMesh);
    leftArmGroup.rotation.z = -0.05;
    characterGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-1.5, 4, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, rightArmMat);
    rightArmMesh.position.set(0, -1, 0);
    rightArmGroup.add(rightArmMesh);
    rightArmGroup.rotation.z = 0.05;
    characterGroup.add(rightArmGroup);

    // --- Legs ---
    const legGeo = new THREE.BoxGeometry(1, 2, 1);
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(0.5, 2, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, leftLegMat);
    leftLegMesh.position.set(0, -1, 0);
    leftLegGroup.add(leftLegMesh);
    characterGroup.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(-0.5, 2, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, rightLegMat);
    rightLegMesh.position.set(0, -1, 0);
    rightLegGroup.add(rightLegMesh);
    characterGroup.add(rightLegGroup);

    const triggerRender = () => {
      renderer.render(scene, camera);
    };

    // Attach Shirt Texture if equipped
    let detachShirt = () => {};
    if (shirtDataUrl) {
      detachShirt = attachShirtToLimbs(torsoMesh, leftArmGroup, rightArmGroup, shirtDataUrl, triggerRender);
    }

    // Attach Pants Texture if equipped
    let detachPants = () => {};
    if (pantsDataUrl) {
      detachPants = attachPantsToLimbs(torsoMesh, leftLegGroup, rightLegGroup, pantsDataUrl, triggerRender);
    }

    // Render initial snapshot
    triggerRender();

    // Render again on next frame in case images load immediately from memory/cache
    const frameId = requestAnimationFrame(triggerRender);

    return () => {
      cancelAnimationFrame(frameId);
      detachShirt();
      detachPants();
      renderer.dispose();
      cylinderGeo.dispose();
      topCapGeo.dispose();
      botCapGeo.dispose();
      faceMesh.geometry.dispose();
      torsoGeo.dispose();
      armGeo.dispose();
      legGeo.dispose();
      headMat.dispose();
      torsoMat.dispose();
      leftArmMat.dispose();
      rightArmMat.dispose();
      leftLegMat.dispose();
      rightLegMat.dispose();
      (faceMesh.material as THREE.Material).dispose();
    };
  }, [colors, selectedFaceId, shirtDataUrl, pantsDataUrl, selectedHairId, hairColor, pixelSize, fullBody]);

  return (
    <div
      style={{ width: pixelSize, height: pixelSize }}
      className={`relative shrink-0 overflow-hidden bg-gradient-to-b from-[#2e1f52] to-[#120b22] select-none flex items-center justify-center ${
        shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
      } ${
        border ? 'border border-purple-400/40 shadow-md shadow-purple-950/60' : ''
      } ${className}`}
      title="3D Avatar Portrait"
    >
      {/* 3D WebGL Canvas container */}
      <div ref={mountRef} className="w-full h-full flex items-center justify-center pointer-events-none" />
    </div>
  );
}
