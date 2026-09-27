import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export interface Loaded3DModel {
  group: THREE.Group;
  format: 'obj' | 'glb' | 'gltf';
  rawData?: string; // for obj string or base64
}

export async function load3DModelFromUrl(
  url: string,
  hintFormat?: 'obj' | 'glb' | 'gltf'
): Promise<Loaded3DModel> {
  const ext = hintFormat || url.split('.').pop()?.toLowerCase() || '';

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch model from ${url} (status: ${res.status})`);
  }

  if (ext === 'obj') {
    const text = await res.text();
    return load3DModelFromObjText(text);
  }

  const arrayBuffer = await res.arrayBuffer();
  return load3DModelFromGlbBuffer(arrayBuffer);
}

/**
 * Loads a 3D model from a File (.obj, .glb, .gltf) or raw text.
 */
export async function load3DModelFromFile(file: File): Promise<Loaded3DModel> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'obj') {
    const text = await file.text();
    return load3DModelFromObjText(text);
  }

  if (ext === 'glb' || ext === 'gltf') {
    const arrayBuffer = await file.arrayBuffer();
    return load3DModelFromGlbBuffer(arrayBuffer);
  }

  throw new Error('Unsupported file format. Please upload a .obj, .glb, or .gltf file.');
}

export function load3DModelFromObjText(objText: string): Promise<Loaded3DModel> {
  return new Promise((resolve, reject) => {
    try {
      const loader = new OBJLoader();
      const group = loader.parse(objText);
      
      // Ensure all meshes cast/receive shadows and have standard materials
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      resolve({
        group,
        format: 'obj',
        rawData: objText,
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function load3DModelFromGlbBuffer(buffer: ArrayBuffer): Promise<Loaded3DModel> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      '',
      (gltf) => {
        const group = new THREE.Group();
        group.add(gltf.scene);
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve({
          group,
          format: 'glb',
        });
      },
      (err) => {
        reject(err);
      }
    );
  });
}

/**
 * Normalizes model size and centers it to fit standard Roblox accessory dimensions.
 */
export function normalizeAccessoryGroup(
  group: THREE.Group,
  targetMaxDimension: number = 1.4
): THREE.Group {
  const container = new THREE.Group();
  container.add(group);

  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0.0001) {
    const scale = targetMaxDimension / maxDim;
    group.scale.set(scale, scale, scale);
  }

  // Recalculate box after scale
  const updatedBox = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  updatedBox.getCenter(center);

  // Center horizontally, bottom aligned
  group.position.x -= center.x;
  group.position.y -= updatedBox.min.y;
  group.position.z -= center.z;

  return container;
}
