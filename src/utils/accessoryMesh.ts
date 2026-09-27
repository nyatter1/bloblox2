import * as THREE from 'three';

export interface AccessoryItem {
  id: string;
  name: string;
  category: 'hat';
  description: string;
  previewColor: string;
  badge?: string;
  scale?: number;
}

export const ACCESSORY_CATALOG: AccessoryItem[] = [
  {
    id: 'none',
    name: 'None',
    category: 'hat',
    description: 'Unequip all head accessories',
    previewColor: '#475569',
  },
  {
    id: 'dominus',
    name: 'Dominus',
    category: 'hat',
    description: 'Iconic dark Dominus hooded cowl with ornate golden wing rings',
    previewColor: '#18181b',
    badge: 'Legendary',
  },
  {
    id: 'dominus-viridis',
    name: 'Dominus Viridis',
    category: 'hat',
    description: 'Mythical emerald green Dominus Viridis with grand golden wings',
    previewColor: '#059669',
    badge: 'Mythic',
  },
];

/**
 * Creates a procedural 3D Dominus cowl mesh with golden wing rings
 */
function createProceduralDominus(type: 'dominus' | 'dominus-viridis'): THREE.Group {
  const group = new THREE.Group();
  group.name = `procedural_${type}`;

  const isViridis = type === 'dominus-viridis';
  const hoodColor = isViridis ? 0x065f46 : 0x111113;
  const trimColor = isViridis ? 0x10b981 : 0xd97706;
  const goldColor = 0xf59e0b;

  const hoodMat = new THREE.MeshStandardMaterial({
    color: hoodColor,
    roughness: 0.7,
    metalness: 0.15,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: goldColor,
    roughness: 0.25,
    metalness: 0.85,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.4,
    metalness: 0.3,
  });

  // 1. Hood Outer Shell (Cowl covering top, back, and sides of head)
  const hoodGeo = new THREE.SphereGeometry(0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.75);
  hoodGeo.scale(1.05, 1.15, 1.12);
  const hoodMesh = new THREE.Mesh(hoodGeo, hoodMat);
  hoodMesh.position.set(0, 0.08, -0.04);
  hoodMesh.castShadow = true;
  group.add(hoodMesh);

  // 2. Hood Brim / Peak (Points slightly forward over forehead)
  const brimGeo = new THREE.CylinderGeometry(0.74, 0.76, 0.2, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9);
  const brimMesh = new THREE.Mesh(brimGeo, trimMat);
  brimMesh.position.set(0, 0.35, 0.08);
  brimMesh.rotation.x = 0.2;
  group.add(brimMesh);

  // 3. Ornate Golden Wing Rings on Left & Right
  [-1, 1].forEach((side) => {
    const ringGroup = new THREE.Group();
    ringGroup.position.set(side * 0.75, 0.15, -0.05);
    ringGroup.rotation.y = side * 0.3;

    // Torus Ring
    const torusGeo = new THREE.TorusGeometry(0.24, 0.045, 12, 24);
    const torusMesh = new THREE.Mesh(torusGeo, goldMat);
    torusMesh.rotation.y = Math.PI / 2;
    ringGroup.add(torusMesh);

    // Feathers extending back
    for (let f = 0; f < 3; f++) {
      const featherGeo = new THREE.ConeGeometry(0.06, 0.45 + f * 0.1, 8);
      featherGeo.scale(0.4, 1, 1.2);
      const featherMesh = new THREE.Mesh(featherGeo, goldMat);
      featherMesh.position.set(0, 0.1 - f * 0.12, -0.25 - f * 0.15);
      featherMesh.rotation.x = -Math.PI * 0.45 + f * 0.12;
      featherMesh.rotation.z = side * (0.15 + f * 0.08);
      ringGroup.add(featherMesh);
    }

    group.add(ringGroup);
  });

  return group;
}

const accessoryMeshCache = new Map<string, THREE.Group>();

export function createAccessoryMesh(accessoryId: string): THREE.Group | null {
  if (!accessoryId || accessoryId === 'none') {
    return null;
  }

  if (accessoryMeshCache.has(accessoryId)) {
    return accessoryMeshCache.get(accessoryId)!.clone(true);
  }

  if (accessoryId === 'dominus') {
    const mesh = createProceduralDominus('dominus');
    accessoryMeshCache.set(accessoryId, mesh);
    return mesh.clone(true);
  }

  if (accessoryId === 'dominus-viridis') {
    const mesh = createProceduralDominus('dominus-viridis');
    accessoryMeshCache.set(accessoryId, mesh);
    return mesh.clone(true);
  }

  return null;
}

export async function loadAccessoryModel(accessoryId: string): Promise<THREE.Group | null> {
  return createAccessoryMesh(accessoryId);
}

export function attachAccessoryToHead(
  headGroup: THREE.Group | undefined | null,
  accessoryId: string | undefined | null
): () => void {
  if (!headGroup) return () => {};

  const oldAccessory = headGroup.children.find((c) => c.name.startsWith('accessory-') || c.name.startsWith('procedural_'));
  if (oldAccessory) {
    headGroup.remove(oldAccessory);
    oldAccessory.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }

  if (!accessoryId || accessoryId === 'none') {
    return () => {};
  }

  const mesh = createAccessoryMesh(accessoryId);
  if (mesh) {
    mesh.name = `accessory-${accessoryId}`;
    headGroup.add(mesh);
  }

  return () => {
    if (mesh && mesh.parent) {
      mesh.parent.remove(mesh);
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
  };
}
