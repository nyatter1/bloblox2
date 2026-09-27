import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Sparkles,
  Upload,
  Download,
  AlertCircle,
  Check,
  Palette,
  Play,
  Pause,
  ChevronDown,
  Scissors,
  FileCode,
  Layers,
  Wrench,
  Shirt
} from 'lucide-react';
import {
  ROBLOX_FACES,
  createFaceMesh,
  updateFaceMeshTexture,
  getClassicSmilePreviewUrl,
  getFacePreviewUrl
} from '../utils/faceTexture';
import {
  validateShirtTemplate,
  attachShirtToLimbs,
  generateBlankRobloxTemplateDataUrl
} from '../utils/shirtTexture';
import {
  validatePantsTemplate,
  attachPantsToLimbs,
  generateBlankRobloxPantsTemplateDataUrl,
  generateClassicRobloxPants
} from '../utils/pantsTexture';
import { generateClassicRobloxShirt } from '../utils/sampleShirts';
import {
  HAIR_CATALOG,
  HAIR_COLORS,
  createHairMesh,
  createHairMeshAsync,
  HairColorOption
} from '../utils/hairMesh';
import {
  COMPREHENSIVE_SKIN_TONES,
  SkinToneItem
} from '../utils/skinTones';
import {
  generateShirt2DFrontPreview,
  generatePants2DFrontPreview
} from '../utils/preview2D';
import {
  getSavedShirtsInventory,
  getSavedPantsInventory,
  CustomClothingItem
} from '../types/avatarInventory';
import { load3DModelFromFile } from '../utils/model3DLoader';
import { analyzeAndSmartFitModel } from '../utils/smartAutoFitter';

export type BodyPartName = 'all' | 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

export interface AvatarColors {
  head: string;
  torso: string;
  leftArm: string;
  rightArm: string;
  leftLeg: string;
  rightLeg: string;
}

export const DEFAULT_GREY = '#D4D4D4';

let memoizedTuxedoDataUrl: string | null = null;
export function getMemoizedTuxedo(): string {
  if (!memoizedTuxedoDataUrl) {
    memoizedTuxedoDataUrl = generateClassicRobloxShirt('tuxedo');
  }
  return memoizedTuxedoDataUrl;
}

let memoizedBlackPantsDataUrl: string | null = null;
export function getMemoizedBlackPants(): string {
  if (!memoizedBlackPantsDataUrl) {
    memoizedBlackPantsDataUrl = generateClassicRobloxPants('black-slacks');
  }
  return memoizedBlackPantsDataUrl;
}

interface AvatarViewerProps {
  onBackToHome?: () => void;
  username?: string;
  colors?: AvatarColors;
  onChangeColors?: (newColors: AvatarColors) => void;
  selectedFaceId?: string;
  onSelectFace?: (faceId: string) => void;
  shirtDataUrl?: string | null;
  onSelectShirt?: (url: string | null) => void;
  pantsDataUrl?: string | null;
  onSelectPants?: (url: string | null) => void;
  selectedHairId?: string;
  onSelectHair?: (hairId: string) => void;
  hairColor?: string;
  onChangeHairColor?: (color: string) => void;
  customHairObj?: string | null;
  onUploadCustomHairObj?: (objText: string | null) => void;
}

type MainCategory = 'Clothing' | 'Hair' | 'Body' | 'Animations';
type ClothingSubcategory = 'Classic Shirts' | 'Classic Pants';
type BodySubcategory = 'Faces' | 'Skin Tone';

export default function AvatarViewer({
  onBackToHome,
  username,
  colors: externalColors,
  onChangeColors,
  selectedFaceId: externalFaceId,
  onSelectFace,
  shirtDataUrl: externalShirtDataUrl,
  onSelectShirt,
  pantsDataUrl: externalPantsDataUrl,
  onSelectPants,
  selectedHairId: externalHairId,
  onSelectHair,
  hairColor: externalHairColor,
  onChangeHairColor,
  customHairObj: externalCustomHairObj,
  onUploadCustomHairObj,
}: AvatarViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const faceMeshRef = useRef<THREE.Mesh | null>(null);
  const hairGroupRef = useRef<THREE.Group | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);

  // Active categories in Roblox avatar editor
  const [mainCategory, setMainCategory] = useState<MainCategory>('Clothing');
  const [clothingSub, setClothingSub] = useState<ClothingSubcategory>('Classic Pants');
  const [bodySub, setBodySub] = useState<BodySubcategory>('Skin Tone');

  // Customization state
  const [internalColors, setInternalColors] = useState<AvatarColors>({
    head: DEFAULT_GREY,
    torso: DEFAULT_GREY,
    leftArm: DEFAULT_GREY,
    rightArm: DEFAULT_GREY,
    leftLeg: DEFAULT_GREY,
    rightLeg: DEFAULT_GREY,
  });

  const [internalFaceId, setInternalFaceId] = useState<string>('classic-smile');
  const selectedFaceId = externalFaceId || internalFaceId;

  const [internalShirtDataUrl, setInternalShirtDataUrl] = useState<string | null>(null);
  const shirtDataUrl = externalShirtDataUrl !== undefined ? externalShirtDataUrl : internalShirtDataUrl;

  const [internalPantsDataUrl, setInternalPantsDataUrl] = useState<string | null>(null);
  const pantsDataUrl = externalPantsDataUrl !== undefined ? externalPantsDataUrl : internalPantsDataUrl;

  const [internalHairId, setInternalHairId] = useState<string>('none');
  const selectedHairId = externalHairId !== undefined ? externalHairId : internalHairId;

  const [internalHairColor, setInternalHairColor] = useState<string>('#4a2e1b');
  const hairColor = externalHairColor !== undefined ? externalHairColor : internalHairColor;

  const [internalCustomHairObj, setInternalCustomHairObj] = useState<string | null>(null);
  const customHairObj = externalCustomHairObj !== undefined ? externalCustomHairObj : internalCustomHairObj;

  const [hairObjError, setHairObjError] = useState<string | null>(null);
  const [customModelFileName, setCustomModelFileName] = useState<string | null>(null);

  // 2D Front Previews for Shirts & Pants
  const [tuxedo2DPreview, setTuxedo2DPreview] = useState<string>('');
  const [blackPants2DPreview, setBlackPants2DPreview] = useState<string>('');
  const [customShirt2DPreview, setCustomShirt2DPreview] = useState<string | null>(null);
  const [customPants2DPreview, setCustomPants2DPreview] = useState<string | null>(null);

  // Upload status and errors
  const [shirtError, setShirtError] = useState<string | null>(null);
  const [pantsError, setPantsError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Skin tone filtering and selection
  const [activePart, setActivePart] = useState<BodyPartName>('all');
  const [skinCategoryFilter, setSkinCategoryFilter] = useState<'all' | 'natural' | 'classic' | 'fantasy'>('all');

  const [animationMode, setAnimationMode] = useState<'static' | 'idle' | 'walk' | 'wave'>('static');
  const [isRotatingAuto, setIsRotatingAuto] = useState<boolean>(false);
  const [bodyTypeScale, setBodyTypeScale] = useState<number>(0);

  // References to Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialsRef = useRef<{ [key in keyof AvatarColors]?: THREE.MeshStandardMaterial }>({});
  const limbGroupsRef = useRef<{
    head?: THREE.Mesh;
    torso?: THREE.Mesh;
    leftArm?: THREE.Group;
    rightArm?: THREE.Group;
    leftLeg?: THREE.Group;
    rightLeg?: THREE.Group;
    characterGroup?: THREE.Group;
  }>({});

  const animTimeRef = useRef<number>(0);
  const animationModeRef = useRef(animationMode);
  animationModeRef.current = animationMode;
  const isRotatingAutoRef = useRef(isRotatingAuto);
  isRotatingAutoRef.current = isRotatingAuto;

  const colors = externalColors || internalColors;
  const isProbablyNotUser =
    username?.toLowerCase().includes('probablynot') ||
    username?.toLowerCase() === 'probablynot' ||
    username?.toLowerCase().includes('probablyynot');

  // Generate 2D Front previews for default items on mount
  useEffect(() => {
    const tuxData = getMemoizedTuxedo();
    generateShirt2DFrontPreview(tuxData).then((url) => setTuxedo2DPreview(url));

    const pantsData = getMemoizedBlackPants();
    generatePants2DFrontPreview(pantsData).then((url) => setBlackPants2DPreview(url));
  }, []);

  // Generate 2D Front preview whenever custom shirt changes
  useEffect(() => {
    if (shirtDataUrl && shirtDataUrl !== getMemoizedTuxedo()) {
      generateShirt2DFrontPreview(shirtDataUrl).then((url) => setCustomShirt2DPreview(url));
    } else {
      setCustomShirt2DPreview(null);
    }
  }, [shirtDataUrl]);

  // Generate 2D Front preview whenever custom pants change
  useEffect(() => {
    if (pantsDataUrl && pantsDataUrl !== getMemoizedBlackPants()) {
      generateShirt2DFrontPreview(pantsDataUrl).then((url) => setCustomPants2DPreview(url));
    } else {
      setCustomPants2DPreview(null);
    }
  }, [pantsDataUrl]);

  // Update Three.js mesh materials when skin colors change
  useEffect(() => {
    if (!materialsRef.current) return;
    (Object.keys(colors) as (keyof AvatarColors)[]).forEach((part) => {
      const mat = materialsRef.current[part];
      if (mat) {
        mat.color.set(colors[part]);
      }
    });
  }, [colors]);

  // Update Face Texture dynamically
  useEffect(() => {
    if (faceMeshRef.current) {
      updateFaceMeshTexture(faceMeshRef.current, selectedFaceId);
    }
  }, [selectedFaceId]);

  // Update Hair / 3D Model Mesh dynamically (supports registered calibrated models and uploads)
  useEffect(() => {
    if (!headGroupRef.current) return;
    let isActive = true;

    // Remove existing hair
    if (hairGroupRef.current) {
      headGroupRef.current.remove(hairGroupRef.current);
      hairGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      hairGroupRef.current = null;
    }

    // Add new custom 3D model if equipped
    if (selectedHairId && selectedHairId !== 'none') {
      const syncMesh = createHairMesh(selectedHairId, hairColor, customHairObj);
      if (syncMesh && isActive) {
        headGroupRef.current.add(syncMesh);
        hairGroupRef.current = syncMesh;
      } else {
        createHairMeshAsync(selectedHairId, hairColor, customHairObj).then((asyncMesh) => {
          if (isActive && asyncMesh && headGroupRef.current) {
            // Remove previous if still attached
            if (hairGroupRef.current) {
              headGroupRef.current.remove(hairGroupRef.current);
            }
            headGroupRef.current.add(asyncMesh);
            hairGroupRef.current = asyncMesh;
          }
        }).catch((err) => console.error('Failed to attach hair:', err));
      }
    }

    return () => {
      isActive = false;
    };
  }, [selectedHairId, hairColor, customHairObj]);

  // Re-attach shirt layers on limb changes or URL update
  useEffect(() => {
    const detach = attachShirtToLimbs(
      limbGroupsRef.current.torso,
      limbGroupsRef.current.leftArm,
      limbGroupsRef.current.rightArm,
      shirtDataUrl
    );
    return () => detach();
  }, [shirtDataUrl]);

  // Re-attach pants layers (pelvis & legs) on limb changes or URL update
  useEffect(() => {
    const detach = attachPantsToLimbs(
      limbGroupsRef.current.torso,
      limbGroupsRef.current.leftLeg,
      limbGroupsRef.current.rightLeg,
      pantsDataUrl
    );
    return () => detach();
  }, [pantsDataUrl]);

  // Initialize Three.js 3D Viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 475;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.9, 9.2);
    camera.lookAt(0, 0.2, 0);

    // 3. WebGLRenderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    const canvasDom = renderer.domElement;
    canvasDom.style.position = 'relative';
    canvasDom.style.zIndex = '10';
    canvasDom.style.width = '100%';
    canvasDom.style.height = '100%';
    container.appendChild(canvasDom);

    // Lighting (neutral balanced light so face and skin tones reflect accurately without blue tint)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 7, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfff7ed, 0.7);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    // Shadow plane
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.4;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Character Group
    const characterGroup = new THREE.Group();
    characterGroup.position.set(0, -2.4, 0);
    scene.add(characterGroup);
    limbGroupsRef.current.characterGroup = characterGroup;

    const createMat = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.45,
        metalness: 0.08,
      });

    const headMat = createMat(colors.head);
    const torsoMat = createMat(colors.torso);
    const leftArmMat = createMat(colors.leftArm);
    const rightArmMat = createMat(colors.rightArm);
    const leftLegMat = createMat(colors.leftLeg);
    const rightLegMat = createMat(colors.rightLeg);

    materialsRef.current = {
      head: headMat,
      torso: torsoMat,
      leftArm: leftArmMat,
      rightArm: rightArmMat,
      leftLeg: leftLegMat,
      rightLeg: rightLegMat,
    };

    // --- Torso (2 x 2 x 1, centered at y = 3) ---
    const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 3, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    characterGroup.add(torso);
    limbGroupsRef.current.torso = torso;

    // --- Head (cylinder with rounded caps, centered at y = 4.7) ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 4.7, 0);
    headGroupRef.current = headGroup;

    const cylinderGeo = new THREE.CylinderGeometry(0.625, 0.625, 0.95, 36);
    const headCylinder = new THREE.Mesh(cylinderGeo, headMat);
    headCylinder.castShadow = true;
    headGroup.add(headCylinder);

    const topCapGeo = new THREE.SphereGeometry(0.625, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    topCapGeo.scale(1, 0.35, 1);
    const topCap = new THREE.Mesh(topCapGeo, headMat);
    topCap.position.y = 0.475;
    topCap.castShadow = true;
    headGroup.add(topCap);

    const botCapGeo = new THREE.SphereGeometry(0.625, 36, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    botCapGeo.scale(1, 0.35, 1);
    const botCap = new THREE.Mesh(botCapGeo, headMat);
    botCap.position.y = -0.475;
    botCap.castShadow = true;
    headGroup.add(botCap);

    // Front Face
    const faceMesh = createFaceMesh(selectedFaceId);
    faceMeshRef.current = faceMesh;
    headGroup.add(faceMesh);

    // Attached Custom 3D Model (if any)
    if (selectedHairId && selectedHairId !== 'none' && customHairObj) {
      const hMesh = createHairMesh(selectedHairId, hairColor, customHairObj);
      if (hMesh) {
        headGroup.add(hMesh);
        hairGroupRef.current = hMesh;
      }
    }

    characterGroup.add(headGroup);
    limbGroupsRef.current.head = headCylinder;

    // --- Left Arm ---
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(1.5, 4, 0);
    const armGeo = new THREE.BoxGeometry(1, 2, 1);
    const leftArmMesh = new THREE.Mesh(armGeo, leftArmMat);
    leftArmMesh.position.set(0, -1, 0);
    leftArmMesh.castShadow = true;
    leftArmMesh.receiveShadow = true;
    leftArmGroup.add(leftArmMesh);
    characterGroup.add(leftArmGroup);
    limbGroupsRef.current.leftArm = leftArmGroup;

    // --- Right Arm ---
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-1.5, 4, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, rightArmMat);
    rightArmMesh.position.set(0, -1, 0);
    rightArmMesh.castShadow = true;
    rightArmMesh.receiveShadow = true;
    rightArmGroup.add(rightArmMesh);
    characterGroup.add(rightArmGroup);
    limbGroupsRef.current.rightArm = rightArmGroup;

    // --- Left Leg ---
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(0.5, 2, 0);
    const legGeo = new THREE.BoxGeometry(1, 2, 1);
    const leftLegMesh = new THREE.Mesh(legGeo, leftLegMat);
    leftLegMesh.position.set(0, -1, 0);
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    leftLegGroup.add(leftLegMesh);
    characterGroup.add(leftLegGroup);
    limbGroupsRef.current.leftLeg = leftLegGroup;

    // --- Right Leg ---
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(-0.5, 2, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, rightLegMat);
    rightLegMesh.position.set(0, -1, 0);
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    rightLegGroup.add(rightLegMesh);
    characterGroup.add(rightLegGroup);
    limbGroupsRef.current.rightLeg = rightLegGroup;

    // Attach current shirt and pants immediately
    const detachShirt = attachShirtToLimbs(torso, leftArmGroup, rightArmGroup, shirtDataUrl);
    const detachPants = attachPantsToLimbs(torso, leftLegGroup, rightLegGroup, pantsDataUrl);

    // Mouse drag rotation in 3D
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      characterGroup.rotation.y += deltaX * 0.01;
      characterGroup.rotation.x = THREE.MathUtils.clamp(
        characterGroup.rotation.x + deltaY * 0.005,
        -0.3,
        0.3
      );
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    canvasDom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Mobile touch drag listeners for rotating avatar preview
    let prevTouchX = 0;
    let prevTouchY = 0;
    let isTouching = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isTouching = true;
        prevTouchX = e.touches[0].clientX;
        prevTouchY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTouching || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevTouchX;
      const deltaY = e.touches[0].clientY - prevTouchY;
      characterGroup.rotation.y += deltaX * 0.015;
      characterGroup.rotation.x = THREE.MathUtils.clamp(
        characterGroup.rotation.x + deltaY * 0.008,
        -0.3,
        0.3
      );
      prevTouchX = e.touches[0].clientX;
      prevTouchY = e.touches[0].clientY;
    };

    const onTouchEnd = () => {
      isTouching = false;
    };

    canvasDom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      animTimeRef.current += delta;
      const t = animTimeRef.current;

      if (isRotatingAutoRef.current && !isDragging) {
        characterGroup.rotation.y += delta * 0.6;
      }

      const mode = animationModeRef.current;
      if (mode === 'idle') {
        const breath = Math.sin(t * 2) * 0.04;
        torso.position.y = 3 + breath * 0.5;
        leftArmGroup.rotation.z = 0.08 + Math.sin(t * 2) * 0.03;
        rightArmGroup.rotation.z = -0.08 - Math.sin(t * 2) * 0.03;
        leftArmGroup.rotation.x = 0;
        rightArmGroup.rotation.x = 0;
        leftLegGroup.rotation.x = 0;
        rightLegGroup.rotation.x = 0;
      } else if (mode === 'walk') {
        const speed = 7.5;
        const swing = Math.sin(t * speed) * 0.6;
        leftLegGroup.rotation.x = swing;
        rightLegGroup.rotation.x = -swing;
        leftArmGroup.rotation.x = -swing * 0.8;
        rightArmGroup.rotation.x = swing * 0.8;
        torso.position.y = 3 + Math.abs(Math.sin(t * speed)) * 0.12;
      } else if (mode === 'wave') {
        rightArmGroup.rotation.x = 0;
        rightArmGroup.rotation.z = Math.PI - 0.4 + Math.sin(t * 8) * 0.25;
        leftArmGroup.rotation.set(0, 0, 0.08);
        leftLegGroup.rotation.set(0, 0, 0);
        rightLegGroup.rotation.set(0, 0, 0);
        torso.position.y = 3;
      } else {
        leftArmGroup.rotation.set(0, 0, 0);
        rightArmGroup.rotation.set(0, 0, 0);
        leftLegGroup.rotation.set(0, 0, 0);
        rightLegGroup.rotation.set(0, 0, 0);
        torso.position.y = 3;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvasDom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvasDom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      cancelAnimationFrame(animId);
      detachShirt();
      detachPants();
      renderer.dispose();
      if (container.contains(canvasDom)) {
        container.removeChild(canvasDom);
      }
    };
  }, []);

  const handleRedraw = () => {
    if (limbGroupsRef.current.characterGroup) {
      limbGroupsRef.current.characterGroup.rotation.set(0, 0, 0);
    }
  };

  const handleColorSelect = (hex: string) => {
    let next: AvatarColors;
    if (activePart === 'all') {
      next = {
        head: hex,
        torso: hex,
        leftArm: hex,
        rightArm: hex,
        leftLeg: hex,
        rightLeg: hex,
      };
    } else {
      next = { ...colors, [activePart]: hex };
    }

    if (onChangeColors) {
      onChangeColors(next);
    } else {
      setInternalColors(next);
    }
  };

  const handleSelectFaceItem = (faceId: string) => {
    if (onSelectFace) {
      onSelectFace(faceId);
    } else {
      setInternalFaceId(faceId);
    }
  };

  const handleSelectShirtPreset = (_key: string, dataUrl: string | null) => {
    setShirtError(null);
    if (onSelectShirt) {
      onSelectShirt(dataUrl);
    } else {
      setInternalShirtDataUrl(dataUrl);
    }
  };

  const handleSelectPantsPreset = (_key: string, dataUrl: string | null) => {
    setPantsError(null);
    if (onSelectPants) {
      onSelectPants(dataUrl);
    } else {
      setInternalPantsDataUrl(dataUrl);
    }
  };

  const handleSelectHairItem = (hairId: string) => {
    if (onSelectHair) {
      onSelectHair(hairId);
    } else {
      setInternalHairId(hairId);
    }
  };

  const handleSelectHairColor = (colorHex: string) => {
    if (onChangeHairColor) {
      onChangeHairColor(colorHex);
    } else {
      setInternalHairColor(colorHex);
    }
  };

  // Upload Custom 3D Model (.obj or .glb)
  const handle3DModelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHairObjError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      setCustomModelFileName(file.name);

      if (ext === 'obj') {
        const text = await file.text();
        if (!text.includes('v ') || !text.includes('f ')) {
          setHairObjError('File does not appear to be a valid Wavefront .OBJ (missing vertices or faces).');
          return;
        }
        if (onUploadCustomHairObj) {
          onUploadCustomHairObj(text);
        } else {
          setInternalCustomHairObj(text);
        }
        handleSelectHairItem('custom-3d');
      } else if (ext === 'glb' || ext === 'gltf') {
        // Parse GLB and apply Smart Auto-Fitting
        const loaded = await load3DModelFromFile(file);
        if (headGroupRef.current && loaded.group) {
          if (hairGroupRef.current) {
            headGroupRef.current.remove(hairGroupRef.current);
          }

          // Smart Auto-Fit: Detect dimensions, rotation, cavity, scale
          const fitResult = analyzeAndSmartFitModel(loaded.group, 'head', 'hair');
          const fittedContainer = new THREE.Group();
          fittedContainer.name = 'smart_fitted_custom_glb';

          loaded.group.position.set(fitResult.position[0], fitResult.position[1], fitResult.position[2]);
          loaded.group.rotation.set(
            THREE.MathUtils.degToRad(fitResult.rotationDeg[0]),
            THREE.MathUtils.degToRad(fitResult.rotationDeg[1]),
            THREE.MathUtils.degToRad(fitResult.rotationDeg[2])
          );
          loaded.group.scale.set(fitResult.uniformScale, fitResult.uniformScale, fitResult.uniformScale);

          fittedContainer.add(loaded.group);
          headGroupRef.current.add(fittedContainer);
          hairGroupRef.current = fittedContainer;
        }
        handleSelectHairItem('custom-3d');
      } else {
        setHairObjError('Please upload a .obj, .glb, or .gltf file.');
      }
    } catch (err: any) {
      setHairObjError(err?.message || 'Failed to read 3D model file.');
    }
  };

  const handleClearCustomModel = () => {
    if (onUploadCustomHairObj) {
      onUploadCustomHairObj(null);
    } else {
      setInternalCustomHairObj(null);
    }
    setCustomModelFileName(null);
    handleSelectHairItem('none');
  };

  // Upload custom 585x559 shirt
  const handleShirtFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShirtError(null);
    setIsUploading(true);

    try {
      const result = await validateShirtTemplate(file);
      if (!result.valid) {
        setShirtError(result.error || 'Failed to validate shirt template.');
        setIsUploading(false);
        return;
      }

      if (result.dataUrl) {
        handleSelectShirtPreset('custom-upload', result.dataUrl);
      }
    } catch (err: any) {
      setShirtError(err?.message || 'Error uploading shirt template.');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload custom 585x559 pants
  const handlePantsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPantsError(null);
    setIsUploading(true);

    try {
      const result = await validatePantsTemplate(file);
      if (!result.valid) {
        setPantsError(result.error || 'Failed to validate pants template.');
        setIsUploading(false);
        return;
      }

      if (result.dataUrl) {
        handleSelectPantsPreset('custom-upload', result.dataUrl);
      }
    } catch (err: any) {
      setPantsError(err?.message || 'Error uploading pants template.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadBlankShirtTemplate = () => {
    const dataUrl = generateBlankRobloxTemplateDataUrl();
    const link = document.createElement('a');
    link.download = 'classic_roblox_shirt_template_585x559.png';
    link.href = dataUrl;
    link.click();
  };

  const handleDownloadBlankPantsTemplate = () => {
    const dataUrl = generateBlankRobloxPantsTemplateDataUrl();
    const link = document.createElement('a');
    link.download = 'classic_roblox_pants_template_585x559.png';
    link.href = dataUrl;
    link.click();
  };

  const filteredSkinTones = COMPREHENSIVE_SKIN_TONES.filter((st) => {
    if (skinCategoryFilter === 'all') return true;
    return st.category === skinCategoryFilter;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-black text-white tracking-tight">
              Avatar Editor
            </h1>
            {username && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-900/50 border border-purple-500/30 text-purple-300 font-semibold shadow-inner">
                {username}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToHome}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Main Grid: Left Avatar Card + Right Category Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: 3D AVATAR CARD ================= */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#3a2754] via-[#211736] to-[#120c22]">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
            <div ref={mountRef} className="relative z-10 w-full h-full cursor-grab active:cursor-grabbing" />

            <div className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-md select-none pointer-events-none">
              3D
            </div>

            <button
              onClick={() => setIsRotatingAuto((p) => !p)}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/15 text-xs transition-colors cursor-pointer"
              title="Auto-rotate avatar"
            >
              {isRotatingAuto ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-white/80 font-medium">
              <span>Body Type</span>
              <span>{bodyTypeScale}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={bodyTypeScale}
              onChange={(e) => setBodyTypeScale(Number(e.target.value))}
              className="w-full h-1.5 bg-[#251b3d] rounded-lg appearance-none cursor-pointer accent-white"
            />

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-white/60">Avatar not loading properly?</span>
              <button
                onClick={handleRedraw}
                className="text-white hover:underline font-semibold cursor-pointer underline-offset-2"
              >
                Redraw
              </button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CATEGORIES & ITEMS ================= */}
        <div className="lg:col-span-8 bg-[#18112c]/90 border border-white/10 rounded-2xl p-5 shadow-xl space-y-5">
          {/* Top Horizontal Navigation Bar */}
          <div className="flex items-center gap-1 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
            {(['Clothing', 'Hair', 'Body', 'Animations'] as MainCategory[]).map((cat) => {
              const isActive = mainCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setMainCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white/15 text-white border-b-2 border-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{cat}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              );
            })}
          </div>

          {/* Subcategory: Clothing */}
          {mainCategory === 'Clothing' && (
            <div className="flex items-center gap-2">
              {(['Classic Shirts', 'Classic Pants'] as ClothingSubcategory[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setClothingSub(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    clothingSub === sub
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          {/* Subcategory: Body */}
          {mainCategory === 'Body' && (
            <div className="flex items-center gap-2">
              {(['Faces', 'Skin Tone'] as BodySubcategory[]).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setBodySub(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    bodySub === sub
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          {/* ================= VIEW: HAIR ================= */}
          {mainCategory === 'Hair' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-purple-400" />
                    <span>Hair Styles</span>
                  </h3>
                  <p className="text-xs text-white/60">
                    Equip hair styles for your avatar head.
                  </p>
                </div>
              </div>

              {/* Notice Banner: No hair available & uploads locked for future */}
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-200 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>No Hair Items Available</span>
                </div>
                <p className="text-xs text-purple-300/80 leading-relaxed">
                  There are currently no hair items available in inventory. Hair styles, customization options, and custom 3D model uploads are locked and being saved for a future update!
                </p>
              </div>

              {/* Available Hair Items Grid (Bare Head / None) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* 1. None (Bare Head) */}
                <button
                  onClick={() => handleSelectHairItem('none')}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                    selectedHairId === 'none'
                      ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                      : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-[#120d24] border border-white/15 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-6 h-6 text-white/50" />
                  </div>
                  <span className="text-xs font-bold text-white text-center">Bare Head</span>
                  <span className="text-[10px] text-white/50 text-center mt-0.5">Natural head shape</span>

                  {selectedHairId === 'none' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: CLOTHING -> CLASSIC SHIRTS ================= */}
          {mainCategory === 'Clothing' && clothingSub === 'Classic Shirts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Classic Shirts</h3>
                  <p className="text-xs text-white/60">
                    Equip the Classic Tuxedo or upload your custom 585x559 PNG shirt template.
                  </p>
                </div>

                <button
                  onClick={handleDownloadBlankShirtTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  title="Download standard 585x559 PNG template"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Blank Template</span>
                </button>
              </div>

              {/* Upload Box for Custom 585x559 Shirt Template */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Upload Custom Classic Shirt</span>
                  </div>
                  <span className="text-[11px] font-mono text-purple-300/80">585 × 559 PNG</span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handleShirtFileUpload}
                      className="hidden"
                    />
                    <div className="w-full py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold text-center transition-all shadow-md flex items-center justify-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Validating PNG...' : 'Choose 585x559 Shirt File'}</span>
                    </div>
                  </label>

                  {shirtDataUrl && (
                    <button
                      onClick={() => handleSelectShirtPreset('none', null)}
                      className="px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Clear Shirt
                    </button>
                  )}
                </div>

                {shirtError && (
                  <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{shirtError}</span>
                  </div>
                )}
              </div>

              {/* Classic Shirts Grid with 2D Front Views */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* 1. None (Bare Torso) */}
                <button
                  onClick={() => handleSelectShirtPreset('none', null)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                    !shirtDataUrl
                      ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                      : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-[#120d24] border border-white/15 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                    <div className="w-10 h-10 rounded bg-[#8A929E] border border-white/20 shadow-inner flex items-center justify-center text-[10px] font-bold text-slate-700">
                      Bare
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white text-center">None</span>
                  <span className="text-[10px] text-white/50 text-center mt-0.5">Bare torso skin</span>

                  {!shirtDataUrl && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* 2. Classic Tuxedo with 2D Front View */}
                <button
                  onClick={() => handleSelectShirtPreset('tuxedo', generateClassicRobloxShirt('tuxedo'))}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                    shirtDataUrl === generateClassicRobloxShirt('tuxedo')
                      ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                      : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-[#120d24] border border-white/15 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform overflow-hidden p-1">
                    {tuxedo2DPreview ? (
                      <img
                        src={tuxedo2DPreview}
                        alt="Classic Tuxedo 2D Front"
                        className="w-full h-full object-contain filter drop-shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[#181818] border border-white/20 flex flex-col items-center justify-center p-1">
                        <div className="w-4 h-3 bg-white" />
                        <div className="w-2 h-1 bg-red-600 mt-0.5" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white text-center">Classic Tuxedo</span>
                  <span className="text-[10px] text-white/50 text-center mt-0.5">Front 2D View</span>

                  {shirtDataUrl === getMemoizedTuxedo() && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Saved Custom Shirts from Inventory */}
                {getSavedShirtsInventory().map((s) => {
                  const isEquipped = shirtDataUrl === s.dataUrl;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectShirtPreset(s.id, s.dataUrl)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                        isEquipped
                          ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                          : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-xl bg-[#120d24] border border-white/15 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform overflow-hidden p-1">
                        {s.previewUrl ? (
                          <img
                            src={s.previewUrl}
                            alt={s.name}
                            className="w-full h-full object-contain filter drop-shadow"
                          />
                        ) : (
                          <Shirt className="w-8 h-8 text-purple-400" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white text-center truncate w-full px-1">
                        {s.name}
                      </span>
                      <span className="text-[10px] text-purple-300 text-center mt-0.5">Inventory Shirt</span>

                      {isEquipped && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= VIEW: CLOTHING -> CLASSIC PANTS ================= */}
          {mainCategory === 'Clothing' && clothingSub === 'Classic Pants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Classic Pants</h3>
                  <p className="text-xs text-white/60">
                    Equip the Black Pants or upload your custom 585x559 PNG pants template.
                  </p>
                </div>

                <button
                  onClick={handleDownloadBlankPantsTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  title="Download standard 585x559 PNG template"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Blank Template</span>
                </button>
              </div>

              {/* Upload Box for Custom 585x559 Pants Template */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Upload Custom Classic Pants</span>
                  </div>
                  <span className="text-[11px] font-mono text-purple-300/80">585 × 559 PNG</span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handlePantsFileUpload}
                      className="hidden"
                    />
                    <div className="w-full py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold text-center transition-all shadow-md flex items-center justify-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Validating PNG...' : 'Choose 585x559 Pants File'}</span>
                    </div>
                  </label>

                  {pantsDataUrl && (
                    <button
                      onClick={() => handleSelectPantsPreset('none', null)}
                      className="px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Clear Pants
                    </button>
                  )}
                </div>

                {pantsError && (
                  <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{pantsError}</span>
                  </div>
                )}
              </div>

              {/* Classic Pants Grid with 2D Front Views */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* 1. None (Bare Legs) */}
                <button
                  onClick={() => handleSelectPantsPreset('none', null)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                    !pantsDataUrl
                      ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                      : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-[#120d24] border border-white/15 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                    <div className="w-10 h-10 rounded bg-[#8A929E] border border-white/20 shadow-inner flex items-center justify-center text-[10px] font-bold text-slate-700">
                      Bare
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white text-center">None</span>
                  <span className="text-[10px] text-white/50 text-center mt-0.5">Bare leg skin</span>

                  {!pantsDataUrl && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* 2. Black Pants with 2D Front View */}
                <button
                  onClick={() =>
                    handleSelectPantsPreset('black-pants', getMemoizedBlackPants())
                  }
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                    pantsDataUrl === getMemoizedBlackPants()
                      ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                      : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-[#120d24] border border-white/15 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform overflow-hidden p-1">
                    {blackPants2DPreview ? (
                      <img
                        src={blackPants2DPreview}
                        alt="Black Pants 2D Front"
                        className="w-full h-full object-contain filter drop-shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[#181818] border border-white/20 flex flex-col items-center justify-center p-1">
                        <div className="w-6 h-2 bg-slate-400" />
                        <div className="w-6 h-6 bg-[#141416] mt-0.5" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white text-center">Black Pants</span>
                  <span className="text-[10px] text-white/50 text-center mt-0.5">Front 2D View</span>

                  {pantsDataUrl === getMemoizedBlackPants() && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Saved Custom Pants from Inventory */}
                {getSavedPantsInventory().map((p) => {
                  const isEquipped = pantsDataUrl === p.dataUrl;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPantsPreset(p.id, p.dataUrl)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                        isEquipped
                          ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                          : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-xl bg-[#120d24] border border-white/15 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform overflow-hidden p-1">
                        {p.previewUrl ? (
                          <img
                            src={p.previewUrl}
                            alt={p.name}
                            className="w-full h-full object-contain filter drop-shadow"
                          />
                        ) : (
                          <Shirt className="w-8 h-8 text-purple-400" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white text-center truncate w-full px-1">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-purple-300 text-center mt-0.5">Inventory Pants</span>

                      {isEquipped && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= VIEW: BODY -> FACES ================= */}
          {mainCategory === 'Body' && bodySub === 'Faces' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Classic Roblox Faces</h3>
                <p className="text-xs text-white/60">Choose your avatar expression.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {ROBLOX_FACES.map((face) => {
                  const isEquipped = selectedFaceId === face.id;
                  return (
                    <button
                      key={face.id}
                      onClick={() => handleSelectFaceItem(face.id)}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                        isEquipped
                          ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                          : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full bg-[#fde047] border border-amber-400 flex items-center justify-center mb-2 shadow-md group-hover:scale-105 transition-transform overflow-hidden p-1">
                        <img
                          src={getFacePreviewUrl(face.id)}
                          alt={face.name}
                          crossOrigin="anonymous"
                          className="w-full h-full object-contain filter contrast-125"
                        />
                      </div>

                      <span className="text-xs font-bold text-white text-center line-clamp-1 w-full px-1">
                        {face.name}
                      </span>
                      <span className="text-[10px] text-white/50 text-center line-clamp-1 w-full px-1 mt-0.5">
                        Classic Face
                      </span>

                      {isEquipped && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= VIEW: BODY -> SKIN TONE ================= */}
          {mainCategory === 'Body' && bodySub === 'Skin Tone' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Body Skin Tone</h3>
                  <p className="text-xs text-white/60">
                    Select a limb or choose &quot;All Body&quot; to change skin tone.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-[#120d24] p-1 rounded-xl border border-white/10 overflow-x-auto">
                  {(
                    [
                      { id: 'all', label: 'All Body' },
                      { id: 'head', label: 'Head' },
                      { id: 'torso', label: 'Torso' },
                      { id: 'leftArm', label: 'L Arm' },
                      { id: 'rightArm', label: 'R Arm' },
                      { id: 'leftLeg', label: 'L Leg' },
                      { id: 'rightLeg', label: 'R Leg' },
                    ] as { id: BodyPartName; label: string }[]
                  ).map((part) => (
                    <button
                      key={part.id}
                      onClick={() => setActivePart(part.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activePart === part.id
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {part.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin Tone Filter */}
              <div className="flex items-center gap-2">
                {(
                  [
                    { id: 'all', label: 'All Tones' },
                    { id: 'natural', label: 'Natural Tones' },
                    { id: 'classic', label: 'Classic Roblox' },
                    { id: 'fantasy', label: 'Vibrant Colors' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSkinCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      skinCategoryFilter === cat.id
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Skin Swatches */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {filteredSkinTones.map((st) => {
                  const currentPartColor =
                    activePart === 'all' ? colors.head : colors[activePart as keyof AvatarColors];
                  const isSelected =
                    currentPartColor.toLowerCase() === st.hex.toLowerCase();

                  return (
                    <button
                      key={st.id}
                      onClick={() => handleColorSelect(st.hex)}
                      title={`${st.name} (${st.hex})`}
                      className={`relative flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                          : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full border border-white/20 shadow-md group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: st.hex }}
                      />
                      <span className="text-[10px] text-white/70 font-semibold truncate w-full text-center mt-1.5">
                        {st.name}
                      </span>

                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-sm">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= VIEW: ANIMATIONS ================= */}
          {mainCategory === 'Animations' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Character Animations</h3>
                <p className="text-xs text-white/60">Test classic R6 poses and movement cycles.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {(
                  [
                    { id: 'static', name: 'Neutral Stance', desc: 'Classic R6 T-pose / idle' },
                    { id: 'idle', name: 'Idle Breathing', desc: 'Subtle breathing motion' },
                    { id: 'walk', name: 'Walking Cycle', desc: 'Classic leg & arm swing' },
                    { id: 'wave', name: 'Friendly Wave', desc: 'High wave greeting' },
                  ] as const
                ).map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => setAnimationMode(anim.id)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all group cursor-pointer aspect-square ${
                      animationMode === anim.id
                        ? 'border-purple-400 bg-purple-900/30 ring-2 ring-purple-500/40'
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#120d24] border border-white/15 flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform text-lg">
                      {anim.id === 'static' && '🧍'}
                      {anim.id === 'idle' && '💨'}
                      {anim.id === 'walk' && '🚶'}
                      {anim.id === 'wave' && '👋'}
                    </div>

                    <span className="text-xs font-bold text-white text-center">{anim.name}</span>
                    <span className="text-[10px] text-white/50 text-center mt-0.5">{anim.desc}</span>

                    {animationMode === anim.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
