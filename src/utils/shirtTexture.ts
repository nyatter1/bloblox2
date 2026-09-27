import * as THREE from 'three';

export interface ShirtSliceRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const TEMPLATE_WIDTH = 585;
export const TEMPLATE_HEIGHT = 559;

export const SHIRT_COORDS = {
  torso: {
    // Face 0 (+X) Left side of torso (facing Left arm at x = +1.5)
    leftSide: { x: 361, y: 74, w: 64, h: 128 },
    // Face 1 (-X) Right side of torso (facing Right arm at x = -1.5)
    rightSide: { x: 165, y: 74, w: 64, h: 128 },
    top: { x: 231, y: 8, w: 128, h: 64 },      // +Y (neck/shoulders)
    bottom: { x: 231, y: 204, w: 128, h: 64 }, // -Y (waist)
    front: { x: 231, y: 74, w: 128, h: 128 },  // +Z (chest)
    back: { x: 427, y: 74, w: 128, h: 128 },   // -Z (back)
  },
  rightArm: {
    // Face 0 (+X): Inner side facing torso
    inner: { x: 151, y: 355, w: 64, h: 128 },
    // Face 1 (-X): Outer side facing outward
    outer: { x: 19, y: 355, w: 64, h: 128 },
    top: { x: 217, y: 289, w: 64, h: 64 },     // +Y
    bottom: { x: 217, y: 485, w: 64, h: 64 },  // -Y
    front: { x: 217, y: 355, w: 64, h: 128 },  // +Z
    back: { x: 85, y: 355, w: 64, h: 128 },    // -Z
  },
  leftArm: {
    // Face 0 (+X): Outer side facing outward
    outer: { x: 506, y: 355, w: 64, h: 128 },
    // Face 1 (-X): Inner side facing torso
    inner: { x: 374, y: 355, w: 64, h: 128 },
    top: { x: 308, y: 289, w: 64, h: 64 },     // +Y
    bottom: { x: 308, y: 485, w: 64, h: 64 },  // -Y
    front: { x: 308, y: 355, w: 64, h: 128 },  // +Z
    back: { x: 440, y: 355, w: 64, h: 128 },   // -Z
  },
};

/**
 * Validates whether an uploaded image matches the 585x559 Roblox shirt template layout.
 */
export function validateShirtTemplate(
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
            error: `Invalid dimensions (${img.width}x${img.height}). The shirt template MUST be exactly ${TEMPLATE_WIDTH}x${TEMPLATE_HEIGHT} pixels in the standard Roblox template layout.`,
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

function sliceToCanvas(
  img: HTMLImageElement,
  rect: ShirtSliceRect
): HTMLCanvasElement {
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

export interface ShirtMaterials {
  torso: THREE.Material[];
  rightArm: THREE.Material[];
  leftArm: THREE.Material[];
}

/**
 * Creates 3D shirt materials for Torso, Right Arm, and Left Arm.
 */
export function createShirtMaterialsFromImage(img: HTMLImageElement): ShirtMaterials {
  // Torso Faces: 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
  const torsoFaces = [
    SHIRT_COORDS.torso.leftSide,  // 0: +X
    SHIRT_COORDS.torso.rightSide, // 1: -X
    SHIRT_COORDS.torso.top,       // 2: +Y
    SHIRT_COORDS.torso.bottom,    // 3: -Y
    SHIRT_COORDS.torso.front,     // 4: +Z
    SHIRT_COORDS.torso.back,      // 5: -Z
  ];

  // Right Arm (+X is inner, -X is outer)
  const rightArmFaces = [
    SHIRT_COORDS.rightArm.inner,  // 0: +X
    SHIRT_COORDS.rightArm.outer,  // 1: -X
    SHIRT_COORDS.rightArm.top,    // 2: +Y
    SHIRT_COORDS.rightArm.bottom, // 3: -Y
    SHIRT_COORDS.rightArm.front,  // 4: +Z
    SHIRT_COORDS.rightArm.back,   // 5: -Z
  ];

  // Left Arm (+X is outer, -X is inner)
  const leftArmFaces = [
    SHIRT_COORDS.leftArm.outer,  // 0: +X
    SHIRT_COORDS.leftArm.inner,  // 1: -X
    SHIRT_COORDS.leftArm.top,    // 2: +Y
    SHIRT_COORDS.leftArm.bottom, // 3: -Y
    SHIRT_COORDS.leftArm.front,  // 4: +Z
    SHIRT_COORDS.leftArm.back,   // 5: -Z
  ];

  return {
    torso: torsoFaces.map((r) => createBoxMaterialFromCanvas(sliceToCanvas(img, r))),
    rightArm: rightArmFaces.map((r) => createBoxMaterialFromCanvas(sliceToCanvas(img, r))),
    leftArm: leftArmFaces.map((r) => createBoxMaterialFromCanvas(sliceToCanvas(img, r))),
  };
}

function disposeShirtMaterials(materials: ShirtMaterials) {
  const allMats = [...materials.torso, ...materials.leftArm, ...materials.rightArm];
  allMats.forEach((m) => {
    (m as any).map?.dispose();
    m.dispose();
  });
}

function removeExistingShirt(parent: THREE.Object3D) {
  for (let i = parent.children.length - 1; i >= 0; i--) {
    const child = parent.children[i];
    if (child.userData?.isClothingMesh === 'shirt') {
      parent.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        // Do not dispose material here because it is cached in shirtMaterialCache.
        // Disposing cached materials caused the avatar to go white when cycling shirts!
      }
    }
  }
}

/**
 * Cache sliced materials to prevent repeated canvas allocation and WebGL texture leaks
 */
const shirtMaterialCache = new Map<string, ShirtMaterials>();

/**
 * Attaches the shirt layers to the character rig.
 */
export function attachShirtToLimbs(
  torsoMesh: THREE.Mesh | undefined,
  leftArmGroup: THREE.Group | undefined,
  rightArmGroup: THREE.Group | undefined,
  shirtDataUrl: string | null | undefined,
  onLoaded?: () => void
): () => void {
  if (!torsoMesh || !leftArmGroup || !rightArmGroup) {
    return () => {};
  }

  // Always remove old shirt first to prevent overlapping layers and memory leaks
  removeExistingShirt(torsoMesh);
  removeExistingShirt(leftArmGroup);
  removeExistingShirt(rightArmGroup);

  if (!shirtDataUrl) {
    return () => {};
  }

  let isCancelled = false;

  const applyMaterials = (materials: ShirtMaterials) => {
    if (isCancelled) return;
    removeExistingShirt(torsoMesh);
    removeExistingShirt(leftArmGroup);
    removeExistingShirt(rightArmGroup);

    // Torso Shirt Layer (attached directly inside torsoMesh, height 2.016)
    const torsoGeo = new THREE.BoxGeometry(2.016, 2.016, 1.016);
    const torsoShirt = new THREE.Mesh(torsoGeo, materials.torso);
    torsoShirt.position.set(0, 0, 0);
    torsoShirt.castShadow = true;
    torsoShirt.userData = { isClothingMesh: 'shirt' };
    torsoMesh.add(torsoShirt);

    // Left Arm Shirt Layer (attached to leftArmGroup, hangs at (0, -1, 0))
    const armGeo = new THREE.BoxGeometry(1.016, 2.016, 1.016);
    const leftArmShirt = new THREE.Mesh(armGeo, materials.leftArm);
    leftArmShirt.position.set(0, -1, 0);
    leftArmShirt.castShadow = true;
    leftArmShirt.userData = { isClothingMesh: 'shirt' };
    leftArmGroup.add(leftArmShirt);

    // Right Arm Shirt Layer (attached to rightArmGroup, hangs at (0, -1, 0))
    const rightArmShirt = new THREE.Mesh(armGeo, materials.rightArm);
    rightArmShirt.position.set(0, -1, 0);
    rightArmShirt.castShadow = true;
    rightArmShirt.userData = { isClothingMesh: 'shirt' };
    rightArmGroup.add(rightArmShirt);

    onLoaded?.();
  };

  // Check cache for instant attachment without image decode churn
  if (shirtMaterialCache.has(shirtDataUrl)) {
    applyMaterials(shirtMaterialCache.get(shirtDataUrl)!);
    return () => {
      isCancelled = true;
      removeExistingShirt(torsoMesh);
      removeExistingShirt(leftArmGroup);
      removeExistingShirt(rightArmGroup);
    };
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    if (isCancelled) return;
    try {
      const materials = createShirtMaterialsFromImage(img);
      // Cache up to 25 shirts in memory
      if (shirtMaterialCache.size > 25) {
        const firstKey = shirtMaterialCache.keys().next().value;
        if (firstKey) {
          const oldMat = shirtMaterialCache.get(firstKey);
          if (oldMat) disposeShirtMaterials(oldMat);
          shirtMaterialCache.delete(firstKey);
        }
      }
      shirtMaterialCache.set(shirtDataUrl, materials);
      applyMaterials(materials);
    } catch (e) {
      console.warn('Failed to parse shirt template image:', e);
    }
  };
  img.onerror = () => {
    if (isCancelled) return;
    removeExistingShirt(torsoMesh);
    removeExistingShirt(leftArmGroup);
    removeExistingShirt(rightArmGroup);
  };
  img.src = shirtDataUrl;

  return () => {
    isCancelled = true;
    removeExistingShirt(torsoMesh);
    removeExistingShirt(leftArmGroup);
    removeExistingShirt(rightArmGroup);
  };
}

/**
 * Built-in Classic Roblox Template Generator for downloading and reference
 */
export function generateBlankRobloxTemplateDataUrl(): string {
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

  // Torso
  drawRegion(SHIRT_COORDS.torso.top, 'TOP');
  drawRegion(SHIRT_COORDS.torso.front, 'FRONT');
  drawRegion(SHIRT_COORDS.torso.back, 'BACK');
  drawRegion(SHIRT_COORDS.torso.rightSide, 'R');
  drawRegion(SHIRT_COORDS.torso.leftSide, 'L');
  drawRegion(SHIRT_COORDS.torso.bottom, 'B');

  // Right Arm
  drawRegion(SHIRT_COORDS.rightArm.top, 'TOP');
  drawRegion(SHIRT_COORDS.rightArm.front, 'F');
  drawRegion(SHIRT_COORDS.rightArm.back, 'B');
  drawRegion(SHIRT_COORDS.rightArm.outer, 'L');
  drawRegion(SHIRT_COORDS.rightArm.inner, 'R');
  drawRegion(SHIRT_COORDS.rightArm.bottom, 'D');

  // Left Arm
  drawRegion(SHIRT_COORDS.leftArm.top, 'TOP');
  drawRegion(SHIRT_COORDS.leftArm.front, 'F');
  drawRegion(SHIRT_COORDS.leftArm.back, 'B');
  drawRegion(SHIRT_COORDS.leftArm.inner, 'L');
  drawRegion(SHIRT_COORDS.leftArm.outer, 'R');
  drawRegion(SHIRT_COORDS.leftArm.bottom, 'D');

  // Titles
  ctx.fillStyle = '#444444';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TORSO', 380, 50);
  ctx.fillText('RIGHT ARM', 30, 530);
  ctx.fillText('LEFT ARM', 340, 530);

  return canvas.toDataURL('image/png');
}
