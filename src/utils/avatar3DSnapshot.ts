import * as THREE from 'three';
import { AvatarColors, DEFAULT_GREY } from '../components/AvatarViewer';
import { createFaceMesh } from './faceTexture';
import { attachShirtToLimbs } from './shirtTexture';
import { attachPantsToLimbs } from './pantsTexture';
import { createHairMesh, createHairMeshAsync } from './hairMesh';
import { createAccessoryMesh } from './accessoryMesh';

export type AvatarFraming = 'bust' | 'fullBody' | 'head' | 'face-and-lower-body';

export interface AvatarSnapshotOptions {
  colors?: AvatarColors;
  selectedFaceId?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  selectedHairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  selectedAccessoryId?: string;
  framing?: AvatarFraming;
}

// In-memory LRU cache of rendered snapshots
const snapshotCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string>>();

// Singleton Three.js resources
let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedCanvas: HTMLCanvasElement | null = null;

function getSharedRenderer(): { renderer: THREE.WebGLRenderer; canvas: HTMLCanvasElement } {
  if (!sharedRenderer || !sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCanvas.width = 256;
    sharedCanvas.height = 256;
    sharedRenderer = new THREE.WebGLRenderer({
      canvas: sharedCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    sharedRenderer.setSize(256, 256, false);
    sharedRenderer.setPixelRatio(1);
    sharedRenderer.shadowMap.enabled = true;
    sharedRenderer.shadowMap.type = THREE.PCFShadowMap;
  }
  return { renderer: sharedRenderer, canvas: sharedCanvas };
}

function makeCacheKey(opts: AvatarSnapshotOptions): string {
  const c = opts.colors || {
    head: DEFAULT_GREY,
    torso: DEFAULT_GREY,
    leftArm: DEFAULT_GREY,
    rightArm: DEFAULT_GREY,
    leftLeg: DEFAULT_GREY,
    rightLeg: DEFAULT_GREY,
  };
  return `${c.head}_${c.torso}_${c.leftArm}_${c.rightArm}_${c.leftLeg}_${c.rightLeg}|${opts.selectedFaceId || 'classic-smile'}|${opts.shirtDataUrl ? opts.shirtDataUrl.slice(-40) : 'none'}|${opts.pantsDataUrl ? opts.pantsDataUrl.slice(-40) : 'none'}|${opts.selectedHairId || 'none'}|${opts.hairColor || '#4a2e1b'}|${opts.customHairObj ? 'custom' : 'none'}|${opts.selectedAccessoryId || 'none'}|${opts.framing || 'bust'}`;
}

/**
 * Generates an ultra-crisp 3D snapshot using the exact Avatar Editor R6 model geometry,
 * materials, lighting, clothing UV layers, and custom 3D hair/accessories.
 */
export async function getAvatar3DSnapshot(opts: AvatarSnapshotOptions): Promise<string> {
  const key = makeCacheKey(opts);
  if (snapshotCache.has(key)) {
    return snapshotCache.get(key)!;
  }

  if (pendingPromises.has(key)) {
    return pendingPromises.get(key)!;
  }

  const promise = (async () => {
    try {
      const { renderer, canvas } = getSharedRenderer();
      const scene = new THREE.Scene();

      // Framing & Camera
      const framing = opts.framing || 'bust';
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);

      if (framing === 'head') {
        camera.position.set(0, 4.75, 2.6);
        camera.lookAt(0, 4.75, 0);
      } else if (framing === 'fullBody') {
        camera.position.set(0, 2.7, 7.8);
        camera.lookAt(0, 2.5, 0);
      } else if (framing === 'face-and-lower-body') {
        camera.position.set(0, 3.4, 5.2);
        camera.lookAt(0, 3.2, 0);
      } else {
        // 'bust' (Roblox avatar portrait standard)
        camera.position.set(0, 3.85, 4.2);
        camera.lookAt(0, 3.85, 0);
      }

      // Neutral Balanced Lighting (matching Avatar Viewer exactly)
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
      keyLight.position.set(4, 7, 6);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xfff7ed, 0.7);
      fillLight.position.set(-5, 3, -3);
      scene.add(fillLight);

      // Character Group
      const characterGroup = new THREE.Group();
      scene.add(characterGroup);

      const colors = opts.colors || {
        head: DEFAULT_GREY,
        torso: DEFAULT_GREY,
        leftArm: DEFAULT_GREY,
        rightArm: DEFAULT_GREY,
        leftLeg: DEFAULT_GREY,
        rightLeg: DEFAULT_GREY,
      };

      const makeMat = (hex: string) =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(hex || DEFAULT_GREY),
          roughness: 0.45,
          metalness: 0.08,
        });

      // 1. Torso
      const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
      const torsoMat = makeMat(colors.torso);
      const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
      torsoMesh.position.set(0, 3, 0);
      characterGroup.add(torsoMesh);

      // 2. Head (Cylinder + Top & Bottom Spherical Caps)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 4.7, 0);
      const headMat = makeMat(colors.head);

      const cylinderGeo = new THREE.CylinderGeometry(0.625, 0.625, 0.95, 36);
      const headCylinder = new THREE.Mesh(cylinderGeo, headMat);
      headGroup.add(headCylinder);

      const topCapGeo = new THREE.SphereGeometry(0.625, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      topCapGeo.scale(1, 0.35, 1);
      const topCap = new THREE.Mesh(topCapGeo, headMat);
      topCap.position.y = 0.475;
      headGroup.add(topCap);

      const botCapGeo = new THREE.SphereGeometry(0.625, 36, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      botCapGeo.scale(1, 0.35, 1);
      const botCap = new THREE.Mesh(botCapGeo, headMat);
      botCap.position.y = -0.475;
      headGroup.add(botCap);

      // Face Decal Mesh
      const faceMesh = createFaceMesh(opts.selectedFaceId || 'classic-smile');
      headGroup.add(faceMesh);

      // Hair (Sync or Async)
      if (opts.selectedHairId && opts.selectedHairId !== 'none') {
        const syncHair = createHairMesh(opts.selectedHairId, opts.hairColor || '#4a2e1b', opts.customHairObj);
        if (syncHair) {
          headGroup.add(syncHair);
        } else {
          try {
            const asyncHair = await createHairMeshAsync(opts.selectedHairId, opts.hairColor || '#4a2e1b', opts.customHairObj);
            if (asyncHair) headGroup.add(asyncHair);
          } catch {
            // Ignore hair async load failure
          }
        }
      }

      // Accessory
      if (opts.selectedAccessoryId && opts.selectedAccessoryId !== 'none') {
        const accMesh = createAccessoryMesh(opts.selectedAccessoryId);
        if (accMesh) headGroup.add(accMesh);
      }

      characterGroup.add(headGroup);

      // 3. Left Arm
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(1.5, 4, 0);
      const armGeo = new THREE.BoxGeometry(1, 2, 1);
      const leftArmMesh = new THREE.Mesh(armGeo, makeMat(colors.leftArm));
      leftArmMesh.position.set(0, -1, 0);
      leftArmGroup.add(leftArmMesh);
      characterGroup.add(leftArmGroup);

      // 4. Right Arm
      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(-1.5, 4, 0);
      const rightArmMesh = new THREE.Mesh(armGeo, makeMat(colors.rightArm));
      rightArmMesh.position.set(0, -1, 0);
      rightArmGroup.add(rightArmMesh);
      characterGroup.add(rightArmGroup);

      // 5. Left Leg
      const leftLegGroup = new THREE.Group();
      leftLegGroup.position.set(0.5, 2, 0);
      const legGeo = new THREE.BoxGeometry(1, 2, 1);
      const leftLegMesh = new THREE.Mesh(legGeo, makeMat(colors.leftLeg));
      leftLegMesh.position.set(0, -1, 0);
      leftLegGroup.add(leftLegMesh);
      characterGroup.add(leftLegGroup);

      // 6. Right Leg
      const rightLegGroup = new THREE.Group();
      rightLegGroup.position.set(-0.5, 2, 0);
      const rightLegMesh = new THREE.Mesh(legGeo, makeMat(colors.rightLeg));
      rightLegMesh.position.set(0, -1, 0);
      rightLegGroup.add(rightLegMesh);
      characterGroup.add(rightLegGroup);

      // Attach Shirt & Pants UV textures
      if (opts.shirtDataUrl) {
        await new Promise<void>((resolve) => {
          attachShirtToLimbs(torsoMesh, leftArmGroup, rightArmGroup, opts.shirtDataUrl, () => resolve());
          // Fallback if texture is already loaded
          setTimeout(resolve, 80);
        });
      }

      if (opts.pantsDataUrl) {
        await new Promise<void>((resolve) => {
          attachPantsToLimbs(torsoMesh, leftLegGroup, rightLegGroup, opts.pantsDataUrl, () => resolve());
          // Fallback if texture is already loaded
          setTimeout(resolve, 80);
        });
      }

      // Render to shared canvas
      renderer.render(scene, camera);
      const dataUrl = canvas.toDataURL('image/png');

      // Cleanup scene objects
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      snapshotCache.set(key, dataUrl);
      return dataUrl;
    } finally {
      pendingPromises.delete(key);
    }
  })();

  pendingPromises.set(key, promise);
  return promise;
}
