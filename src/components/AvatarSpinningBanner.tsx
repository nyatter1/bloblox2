import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import { getFaceTexture, createFaceMesh } from '../utils/faceTexture';
import { attachShirtToLimbs } from '../utils/shirtTexture';
import { attachPantsToLimbs } from '../utils/pantsTexture';
import { createHairMesh, createHairMeshAsync } from '../utils/hairMesh';

interface AvatarSpinningBannerProps {
  colors?: AvatarColors;
  selectedFaceId?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  selectedHairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  className?: string;
}

export default function AvatarSpinningBanner({
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
  customHairObj = null,
  className = '',
}: AvatarSpinningBannerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId = 0;
    let isMounted = true;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = null; // transparent canvas so gradient behind shows

    // 2. Camera: Wide perspective framing the full spinning avatar and podium
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 180;
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 9.2);
    camera.lookAt(0, 2.3, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting (Neutral natural lights with no blue/purple tint)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfffdf8, 2.2);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xfff7ed, 0.6);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    // 5. Glowing Pedestal on floor
    const pedestalGroup = new THREE.Group();
    const pedestalGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.14, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1f143a,
      roughness: 0.3,
      metalness: 0.6,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = -0.07;
    pedestalGroup.add(pedestalMesh);

    // Neon edge ring
    const ringGeo = new THREE.TorusGeometry(2.22, 0.04, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.01;
    pedestalGroup.add(ringMesh);
    scene.add(pedestalGroup);

    // 6. Floating ambient dust sparkles in background
    const particlesCount = 35;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 14;
      positions[i + 1] = Math.random() * 6 - 0.5;
      positions[i + 2] = (Math.random() - 0.5) * 6 - 1;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xe9d5ff,
      size: 0.12,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Full Character Assembly
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

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

    // Torso
    const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, 3, 0);
    characterGroup.add(torsoMesh);

    // Head
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

    // Hair
    if (customHairObj) {
      createHairMeshAsync(selectedHairId, hairColor, customHairObj).then((m) => {
        if (m && isMounted) headGroup.add(m);
      });
    } else if (selectedHairId && selectedHairId !== 'none') {
      const hairMesh = createHairMesh(selectedHairId, hairColor);
      if (hairMesh) headGroup.add(hairMesh);
    }

    characterGroup.add(headGroup);

    // Arms
    const armGeo = new THREE.BoxGeometry(1, 2, 1);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(1.5, 4, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, leftArmMat);
    leftArmMesh.position.set(0, -1, 0);
    leftArmGroup.add(leftArmMesh);
    characterGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-1.5, 4, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, rightArmMat);
    rightArmMesh.position.set(0, -1, 0);
    rightArmGroup.add(rightArmMesh);
    characterGroup.add(rightArmGroup);

    // Legs
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

    // Shirt & Pants attachments
    let detachShirt = () => {};
    if (shirtDataUrl) {
      detachShirt = attachShirtToLimbs(torsoMesh, leftArmGroup, rightArmGroup, shirtDataUrl);
    }

    let detachPants = () => {};
    if (pantsDataUrl) {
      detachPants = attachPantsToLimbs(torsoMesh, leftLegGroup, rightLegGroup, pantsDataUrl);
    }

    // 8. Stationary rendered view
    const animate = () => {
      if (!isMounted) return;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container || !isMounted) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
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
      pedestalGeo.dispose();
      pedestalMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      headMat.dispose();
      torsoMat.dispose();
      leftArmMat.dispose();
      rightArmMat.dispose();
      leftLegMat.dispose();
      rightLegMat.dispose();
      (faceMesh.material as THREE.Material).dispose();
    };
  }, [
    colors,
    selectedFaceId,
    shirtDataUrl,
    pantsDataUrl,
    selectedHairId,
    hairColor,
    customHairObj,
  ]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full relative select-none pointer-events-none ${className}`}
      title="Live 3D Spinning Avatar Banner"
    />
  );
}
