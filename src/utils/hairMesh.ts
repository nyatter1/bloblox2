import * as THREE from 'three';
import { load3DModelFromObjText, normalizeAccessoryGroup } from './model3DLoader';
import { REGISTERED_CUSTOM_ITEMS, loadCustomRiggedItemMesh, CustomRiggedItem } from './customItems';
import { smartFitBufferGeometry } from './smartAutoFitter';

export interface HairItem {
  id: string;
  name: string;
  description: string;
  previewColor: string;
  iconType: string;
  customItem?: CustomRiggedItem;
}

export interface HairColorOption {
  id: string;
  name: string;
  hex: string;
}

export const HAIR_COLORS: HairColorOption[] = [
  { id: 'chestnut', name: 'Chestnut Brown', hex: '#4a2e1b' },
  { id: 'dark-brown', name: 'Chocolate Brown', hex: '#2b1b10' },
  { id: 'black', name: 'Raven Black', hex: '#18181b' },
  { id: 'blonde', name: 'Classic Blonde', hex: '#e8c56c' },
  { id: 'platinum', name: 'Platinum Silver', hex: '#d4d8df' },
  { id: 'auburn', name: 'Auburn Red', hex: '#8a2818' },
  { id: 'purple', name: 'Neon Purple', hex: '#9333ea' },
  { id: 'cyan', name: 'Electric Cyan', hex: '#06b6d4' },
  { id: 'pink', name: 'Pastel Pink', hex: '#ec4899' },
];

/**
 * Hair catalog: Bare head only for now (no hair items available and no uploads for future release).
 */
export const HAIR_CATALOG: HairItem[] = [
  {
    id: 'none',
    name: 'Bare Head / None',
    description: 'Unequip 3D hair and show natural head',
    previewColor: '#64748b',
    iconType: 'none',
  },
];

/**
 * Lightweight, zero-dependency Wavefront .OBJ parser with smart AI auto-fitting.
 */
export function parseObjToGeometry(objText: string): THREE.BufferGeometry | null {
  try {
    const lines = objText.split('\n');
    const positions: number[] = [];
    const vList: number[][] = [];
    const vnList: number[][] = [];
    const finalNormals: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      const parts = line.split(/\s+/);
      const type = parts[0];

      if (type === 'v') {
        const x = parseFloat(parts[1]) || 0;
        const y = parseFloat(parts[2]) || 0;
        const z = parseFloat(parts[3]) || 0;
        vList.push([x, y, z]);
      } else if (type === 'vn') {
        const nx = parseFloat(parts[1]) || 0;
        const ny = parseFloat(parts[2]) || 0;
        const nz = parseFloat(parts[3]) || 0;
        vnList.push([nx, ny, nz]);
      } else if (type === 'f') {
        const faceVertices: { vIdx: number; vnIdx: number | null }[] = [];
        for (let j = 1; j < parts.length; j++) {
          const segs = parts[j].split('/');
          const vIdx = parseInt(segs[0], 10) - 1;
          const vnIdx = segs.length >= 3 && segs[2] ? parseInt(segs[2], 10) - 1 : null;
          if (!isNaN(vIdx) && vList[vIdx]) {
            faceVertices.push({ vIdx, vnIdx });
          }
        }

        for (let k = 1; k < faceVertices.length - 1; k++) {
          const tri = [faceVertices[0], faceVertices[k], faceVertices[k + 1]];
          for (const item of tri) {
            const v = vList[item.vIdx];
            positions.push(v[0], v[1], v[2]);
            if (item.vnIdx !== null && vnList[item.vnIdx]) {
              const vn = vnList[item.vnIdx];
              finalNormals.push(vn[0], vn[1], vn[2]);
            }
          }
        }
      }
    }

    if (positions.length === 0) return null;

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    if (finalNormals.length === positions.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(finalNormals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    // Apply Smart Fit (auto-scale to head width, center, and align to skull crown)
    geometry = smartFitBufferGeometry(geometry);

    return geometry;
  } catch (err) {
    console.error('Failed to parse OBJ file:', err);
    return null;
  }
}

/**
 * Asynchronously creates or loads a hair/accessory mesh (supports registered items with exact calibrated transforms).
 */
export async function createHairMeshAsync(
  hairId: string,
  hairColorHex: string = '#4a2e1b',
  customObjData?: string | null
): Promise<THREE.Group | null> {
  if (!hairId || hairId === 'none') {
    return null;
  }

  // 1. Check if it's one of the registered custom items
  const registered = REGISTERED_CUSTOM_ITEMS.find((item) => item.id === hairId);
  if (registered) {
    try {
      const group = await loadCustomRiggedItemMesh(registered, hairColorHex);
      return group;
    } catch (err) {
      console.error(`Failed to load registered item ${hairId}:`, err);
    }
  }

  // 2. Check if it's a raw custom uploaded OBJ
  if (customObjData) {
    const geo = parseObjToGeometry(customObjData);
    if (geo) {
      const hairGroup = new THREE.Group();
      hairGroup.name = `custom-3d-model`;

      const mainMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hairColorHex),
        roughness: 0.6,
        metalness: 0.05,
      });

      const customMesh = new THREE.Mesh(geo, mainMat);
      customMesh.castShadow = true;
      customMesh.receiveShadow = true;
      hairGroup.add(customMesh);
      return hairGroup;
    }
  }

  return null;
}

/**
 * Synchronous creator fallback for fast rendering.
 */
export function createHairMesh(
  hairId: string,
  hairColorHex: string = '#4a2e1b',
  customObjData?: string | null
): THREE.Group | null {
  if (!hairId || hairId === 'none') {
    return null;
  }

  if (customObjData) {
    const geo = parseObjToGeometry(customObjData);
    if (geo) {
      const hairGroup = new THREE.Group();
      hairGroup.name = `custom-3d-model`;

      const mainMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hairColorHex),
        roughness: 0.6,
        metalness: 0.05,
      });

      const customMesh = new THREE.Mesh(geo, mainMat);
      customMesh.castShadow = true;
      customMesh.receiveShadow = true;
      hairGroup.add(customMesh);
      return hairGroup;
    }
  }

  return null;
}
