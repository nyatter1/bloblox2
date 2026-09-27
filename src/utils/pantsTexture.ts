import * as THREE from 'three';
import { ShirtSliceRect, TEMPLATE_WIDTH, TEMPLATE_HEIGHT } from './shirtTexture';

export { TEMPLATE_WIDTH, TEMPLATE_HEIGHT };

/**
 * Roblox Classic Pants UV Coordinates (585 x 559)
 * Official layout:
 * - Torso: Lower half / pelvis of the torso (waistband & hips)
 * - Right Leg: (x: 19..281, y: 289..549)
 * - Left Leg: (x: 308..570, y: 289..549)
 */
export const PANTS_COORDS = {
  // Limbs UV Box (Left Leg and Right Leg)
  rightLeg: {
    // Face 0 (+X): Inner side facing other leg (column 3: R)
    inner: { x: 151, y: 355, w: 64, h: 128 },
    // Face 1 (-X): Outer side facing outward (column 1: L)
    outer: { x: 19, y: 355, w: 64, h: 128 },
    // Face 2 (+Y): Top thigh (column 4: U)
    top: { x: 217, y: 289, w: 64, h: 64 },
    // Face 3 (-Y): Sole of foot (column 4: D)
    bottom: { x: 217, y: 485, w: 64, h: 64 },
    // Face 4 (+Z): Front shin (column 4: F)
    front: { x: 217, y: 355, w: 64, h: 128 },
    // Face 5 (-Z): Back calf (column 2: B)
    back: { x: 85, y: 355, w: 64, h: 128 },
  },
  leftLeg: {
    // Face 0 (+X): Outer side facing outward (column 4: R)
    outer: { x: 506, y: 355, w: 64, h: 128 },
    // Face 1 (-X): Inner side facing other leg (column 2: L)
    inner: { x: 374, y: 355, w: 64, h: 128 },
    // Face 2 (+Y): Top thigh (column 1: U)
    top: { x: 308, y: 289, w: 64, h: 64 },
    // Face 3 (-Y): Sole of foot (column 1: D)
    bottom: { x: 308, y: 485, w: 64, h: 64 },
    // Face 4 (+Z): Front shin (column 1: F)
    front: { x: 308, y: 355, w: 64, h: 128 },
    // Face 5 (-Z): Back calf (column 3: B)
    back: { x: 440, y: 355, w: 64, h: 128 },
  },
};

/**
 * Validates whether an uploaded image matches the strict 585x559 Roblox pants template.
 */
export function validatePantsTemplate(
  file: File
): Promise<{ valid: boolean; error?: string; image?: HTMLImageElement; dataUrl?: string }> {
  return new Promise((resolve) => {
    if (!file.type.includes('png') && !file.type.includes('image')) {
      resolve({ valid: false, error: 'Please upload a valid PNG image.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width !== TEMPLATE_WIDTH || img.height !== TEMPLATE_HEIGHT) {
          resolve({
            valid: false,
            error: `Invalid dimensions (${img.width}x${img.height}). The pants template MUST be exactly ${TEMPLATE_WIDTH}x${TEMPLATE_HEIGHT} pixels in the standard Roblox template layout.`,
          });
          return;
        }
        resolve({ valid: true, image: img, dataUrl });
      };
      img.onerror = () => {
        resolve({ valid: false, error: 'Failed to read image file.' });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function sliceToCanvas(img: HTMLImageElement, rect: ShirtSliceRect): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return canvas;
}

function createBoxMaterialFromCanvas(canvas: HTMLCanvasElement): THREE.MeshStandardMaterial {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.FrontSide,
  });
}

function createTransparentMaterial(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 4;
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
}

/**
 * Creates 6 materials for a leg BoxGeometry:
 * 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
 */
function createLegMaterials(
  img: HTMLImageElement,
  legCoords: {
    outer: ShirtSliceRect;
    inner: ShirtSliceRect;
    top: ShirtSliceRect;
    bottom: ShirtSliceRect;
    front: ShirtSliceRect;
    back: ShirtSliceRect;
  },
  isLeftLeg: boolean
): THREE.Material[] {
  // For Left Leg (+X is outer, -X is inner)
  // For Right Leg (+X is inner, -X is outer)
  const facePosX = isLeftLeg ? legCoords.outer : legCoords.inner;
  const faceNegX = isLeftLeg ? legCoords.inner : legCoords.outer;

  const faces = [
    facePosX,         // 0: +X
    faceNegX,         // 1: -X
    legCoords.top,    // 2: +Y
    legCoords.bottom, // 3: -Y
    legCoords.front,  // 4: +Z (Front)
    legCoords.back,   // 5: -Z (Back)
  ];

  return faces.map((rect) => {
    const canvas = sliceToCanvas(img, rect);
    return createBoxMaterialFromCanvas(canvas);
  });
}

/**
 * Extracts and creates materials for the PELVIS / LOWER TORSO ONLY.
 * Roblox pants NEVER cover the chest or upper torso!
 * It checks whether the template has the waistband in the 128x64 box at y: 204
 * or in the lower ~44 pixels of the front torso (y: 158..202).
 */
function createPelvisMaterials(img: HTMLImageElement): THREE.Material[] {
  // 1. Check if the box at y: 204 (128x64) has visible pixel content
  const checkCanvas = document.createElement('canvas');
  checkCanvas.width = 128;
  checkCanvas.height = 64;
  const checkCtx = checkCanvas.getContext('2d')!;
  checkCtx.drawImage(img, 231, 204, 128, 64, 0, 0, 128, 64);
  const data = checkCtx.getImageData(0, 0, 128, 64).data;

  let hasContentAt204 = false;
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] > 25) {
      hasContentAt204 = true;
      break;
    }
  }

  // Front (+Z) waistband canvas
  const frontCanvas = document.createElement('canvas');
  frontCanvas.width = 128;
  frontCanvas.height = 64;
  const frontCtx = frontCanvas.getContext('2d')!;

  if (hasContentAt204) {
    // Exact waistband with button, fly, pockets, and chain (matches user template)
    frontCtx.drawImage(img, 231, 204, 128, 64, 0, 0, 128, 64);
  } else {
    // Lower ~48px of the front torso box (y: 154..202)
    frontCtx.drawImage(img, 231, 148, 128, 54, 0, 0, 128, 64);
  }

  // Back (-Z) waistband canvas
  const backCanvas = document.createElement('canvas');
  backCanvas.width = 128;
  backCanvas.height = 64;
  const backCtx = backCanvas.getContext('2d')!;
  backCtx.drawImage(img, 427, 148, 128, 54, 0, 0, 128, 64);

  // Left (+X) side hip canvas
  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = 64;
  leftCanvas.height = 64;
  const leftCtx = leftCanvas.getContext('2d')!;
  leftCtx.drawImage(img, 361, 148, 64, 54, 0, 0, 64, 64);

  // Right (-X) side hip canvas
  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = 64;
  rightCanvas.height = 64;
  const rightCtx = rightCanvas.getContext('2d')!;
  rightCtx.drawImage(img, 165, 148, 64, 54, 0, 0, 64, 64);

  // Bottom (-Y) crotch canvas
  const bottomCanvas = document.createElement('canvas');
  bottomCanvas.width = 128;
  bottomCanvas.height = 64;
  const bottomCtx = bottomCanvas.getContext('2d')!;
  bottomCtx.drawImage(img, 231, 204, 128, 64, 0, 0, 128, 64);

  return [
    createBoxMaterialFromCanvas(leftCanvas),   // 0: +X
    createBoxMaterialFromCanvas(rightCanvas),  // 1: -X
    createTransparentMaterial(),               // 2: +Y (top is hidden inside torso)
    createBoxMaterialFromCanvas(bottomCanvas), // 3: -Y
    createBoxMaterialFromCanvas(frontCanvas),  // 4: +Z (Front waistband)
    createBoxMaterialFromCanvas(backCanvas),   // 5: -Z (Back waistband)
  ];
}

/**
 * Creates 3D pants materials for Pelvis (lower torso), Right Leg, and Left Leg.
 */
export function createPantsMaterialsFromImage(img: HTMLImageElement) {
  return {
    pelvis: createPelvisMaterials(img),
    rightLeg: createLegMaterials(img, PANTS_COORDS.rightLeg, false),
    leftLeg: createLegMaterials(img, PANTS_COORDS.leftLeg, true),
  };
}

function disposePantsMaterials(materials: ReturnType<typeof createPantsMaterialsFromImage>) {
  const allMats = [...materials.pelvis, ...materials.leftLeg, ...materials.rightLeg];
  allMats.forEach((m) => {
    (m as any).map?.dispose();
    m.dispose();
  });
}

function removeExistingPants(parent: THREE.Object3D) {
  for (let i = parent.children.length - 1; i >= 0; i--) {
    const child = parent.children[i];
    if (child.userData?.isClothingMesh === 'pants') {
      parent.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        // Do not dispose material here because it is cached in pantsMaterialCache.
        // Disposing cached materials caused the avatar to go white when cycling pants!
      }
    }
  }
}

/**
 * Cache sliced pants materials to prevent repeated canvas allocation and WebGL texture leaks
 */
const pantsMaterialCache = new Map<string, ReturnType<typeof createPantsMaterialsFromImage>>();

/**
 * Attaches pants mesh layers to the R6 character limbs.
 * IMPORTANT: Pants ONLY covers the pelvis (lower 0.56 studs of torso) and the two legs.
 * It NEVER covers the chest or upper torso (shirt area), exactly matching Roblox classic pants!
 */
export function attachPantsToLimbs(
  torsoMesh: THREE.Mesh | undefined,
  leftLegGroup: THREE.Group | undefined,
  rightLegGroup: THREE.Group | undefined,
  pantsDataUrl: string | null | undefined,
  onLoaded?: () => void
): () => void {
  if (!torsoMesh || !leftLegGroup || !rightLegGroup) {
    return () => {};
  }

  // Always clean up existing pants first
  removeExistingPants(torsoMesh);
  removeExistingPants(leftLegGroup);
  removeExistingPants(rightLegGroup);

  if (!pantsDataUrl) {
    return () => {};
  }

  let isCancelled = false;

  const applyMaterials = (materials: ReturnType<typeof createPantsMaterialsFromImage>) => {
    if (isCancelled) return;
    removeExistingPants(torsoMesh);
    removeExistingPants(leftLegGroup);
    removeExistingPants(rightLegGroup);

    // 1. Torso Pelvis Pants Layer
    const pelvisHeight = 0.56;
    const torsoPantsGeo = new THREE.BoxGeometry(2.014, pelvisHeight, 1.014);
    const torsoPants = new THREE.Mesh(torsoPantsGeo, materials.pelvis);
    torsoPants.position.set(0, -1.0 + pelvisHeight / 2, 0);
    torsoPants.castShadow = true;
    torsoPants.userData = { isClothingMesh: 'pants' };
    torsoMesh.add(torsoPants);

    // 2. Left Leg Pants Layer
    const legGeo = new THREE.BoxGeometry(1.016, 2.016, 1.016);
    const leftLegPants = new THREE.Mesh(legGeo, materials.leftLeg);
    leftLegPants.position.set(0, -1, 0);
    leftLegPants.castShadow = true;
    leftLegPants.userData = { isClothingMesh: 'pants' };
    leftLegGroup.add(leftLegPants);

    // 3. Right Leg Pants Layer
    const rightLegPants = new THREE.Mesh(legGeo, materials.rightLeg);
    rightLegPants.position.set(0, -1, 0);
    rightLegPants.castShadow = true;
    rightLegPants.userData = { isClothingMesh: 'pants' };
    rightLegGroup.add(rightLegPants);

    onLoaded?.();
  };

  // Instant cache hit
  if (pantsMaterialCache.has(pantsDataUrl)) {
    applyMaterials(pantsMaterialCache.get(pantsDataUrl)!);
    return () => {
      isCancelled = true;
      removeExistingPants(torsoMesh);
      removeExistingPants(leftLegGroup);
      removeExistingPants(rightLegGroup);
    };
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    if (isCancelled) return;
    try {
      const materials = createPantsMaterialsFromImage(img);
      if (pantsMaterialCache.size > 25) {
        const firstKey = pantsMaterialCache.keys().next().value;
        if (firstKey) {
          const oldMat = pantsMaterialCache.get(firstKey);
          if (oldMat) disposePantsMaterials(oldMat);
          pantsMaterialCache.delete(firstKey);
        }
      }
      pantsMaterialCache.set(pantsDataUrl, materials);
      applyMaterials(materials);
    } catch (e) {
      console.warn('Failed to parse pants template image:', e);
    }
  };
  img.onerror = () => {
    if (isCancelled) return;
    removeExistingPants(torsoMesh);
    removeExistingPants(leftLegGroup);
    removeExistingPants(rightLegGroup);
  };
  img.src = pantsDataUrl;

  return () => {
    isCancelled = true;
    removeExistingPants(torsoMesh);
    removeExistingPants(leftLegGroup);
    removeExistingPants(rightLegGroup);
  };
}

/**
 * Built-in Classic Roblox Pants Template Generator (585x559) for downloads
 */
export function generateBlankRobloxPantsTemplateDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = TEMPLATE_WIDTH;
  canvas.height = TEMPLATE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1;

  const drawRegion = (r: ShirtSliceRect, label: string) => {
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#777777';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
    ctx.fillStyle = '#ffffff';
  };

  // Torso / Pelvis
  drawRegion({ x: 231, y: 8, w: 128, h: 64 }, 'UP');
  drawRegion({ x: 231, y: 74, w: 128, h: 128 }, 'FRONT');
  drawRegion({ x: 427, y: 74, w: 128, h: 128 }, 'BACK');
  drawRegion({ x: 165, y: 74, w: 64, h: 128 }, 'R');
  drawRegion({ x: 361, y: 74, w: 64, h: 128 }, 'L');
  drawRegion({ x: 231, y: 204, w: 128, h: 64 }, 'DOWN');

  // Right Leg
  drawRegion(PANTS_COORDS.rightLeg.top, 'U');
  drawRegion(PANTS_COORDS.rightLeg.front, 'F');
  drawRegion(PANTS_COORDS.rightLeg.back, 'B');
  drawRegion(PANTS_COORDS.rightLeg.outer, 'L');
  drawRegion(PANTS_COORDS.rightLeg.inner, 'R');
  drawRegion(PANTS_COORDS.rightLeg.bottom, 'D');

  // Left Leg
  drawRegion(PANTS_COORDS.leftLeg.top, 'U');
  drawRegion(PANTS_COORDS.leftLeg.front, 'F');
  drawRegion(PANTS_COORDS.leftLeg.back, 'B');
  drawRegion(PANTS_COORDS.leftLeg.inner, 'L');
  drawRegion(PANTS_COORDS.leftLeg.outer, 'R');
  drawRegion(PANTS_COORDS.leftLeg.bottom, 'D');

  // Titles
  ctx.fillStyle = '#444444';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TORSO (PELVIS)', 360, 50);
  ctx.fillText('RIGHT LEG', 30, 530);
  ctx.fillText('LEFT LEG', 340, 530);

  return canvas.toDataURL('image/png');
}

/**
 * Built-in Classic Roblox Pants Preset:
 * User requested: ONLY keep "black pants". Remove all others.
 */
export function generateClassicRobloxPants(_type: 'black-slacks' = 'black-slacks'): string {
  const canvas = document.createElement('canvas');
  canvas.width = TEMPLATE_WIDTH;
  canvas.height = TEMPLATE_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);

  const fill = (r: ShirtSliceRect, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  };

  const legs = [PANTS_COORDS.rightLeg, PANTS_COORDS.leftLeg];
  const darkBlack = '#141416';
  const beltBlack = '#0c0c0e';

  // 1. Pelvis Waistband only (bottom ~48px of torso boxes, upper torso left transparent!)
  fill({ x: 231, y: 154, w: 128, h: 48 }, darkBlack);
  fill({ x: 427, y: 154, w: 128, h: 48 }, darkBlack);
  fill({ x: 361, y: 154, w: 64, h: 48 }, darkBlack);
  fill({ x: 165, y: 154, w: 64, h: 48 }, darkBlack);
  fill({ x: 231, y: 204, w: 128, h: 64 }, darkBlack);

  // Belt line on pelvis
  [
    { x: 231, y: 154, w: 128, h: 14 },
    { x: 427, y: 154, w: 128, h: 14 },
    { x: 361, y: 154, w: 64, h: 14 },
    { x: 165, y: 154, w: 64, h: 14 },
  ].forEach((r) => {
    ctx.fillStyle = beltBlack;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  });

  // Silver Belt Buckle on front
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(231 + 64 - 10, 156, 20, 10);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(231 + 64 - 5, 158, 10, 6);

  // 2. Both Legs
  legs.forEach((leg) => {
    fill(leg.top, darkBlack);
    fill(leg.front, darkBlack);
    fill(leg.back, darkBlack);
    fill(leg.outer, darkBlack);
    fill(leg.inner, darkBlack);
    // Soles
    fill(leg.bottom, '#09090b');
  });

  return canvas.toDataURL('image/png');
}
