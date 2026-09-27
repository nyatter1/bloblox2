import * as THREE from 'three';

export type RigTargetBone = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'root';

export interface SmartFitResult {
  position: [number, number, number];
  rotationDeg: [number, number, number];
  scale: [number, number, number];
  uniformScale: number;
  detectedType: 'hair' | 'hat' | 'accessory' | 'generic';
  detectedOrientation: string;
  confidence: number;
  originalBounds: {
    width: number;
    height: number;
    depth: number;
    minY: number;
    maxY: number;
  };
  fittedDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  symmetryScore: number;
}

/**
 * Extracts all vertex positions from a THREE.Object3D hierarchy into a flat list of THREE.Vector3.
 */
export function extractVerticesFromObject(object: THREE.Object3D): THREE.Vector3[] {
  const vertices: THREE.Vector3[] = [];

  object.updateMatrixWorld(true);
  const rootInverse = object.matrixWorld.clone().invert();

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry;
      const posAttr = geom.getAttribute('position');
      if (!posAttr) return;

      const childMatrix = child.matrixWorld.clone().premultiply(rootInverse);
      const v = new THREE.Vector3();

      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        v.applyMatrix4(childMatrix);
        vertices.push(v.clone());
      }
    }
  });

  return vertices;
}

/**
 * Smart AI & Geometric analyzer for 3D accessory models (hair, hats, headgear).
 * Automatically calculates optimal scale, socket position, and correct 3-axis rotation.
 */
export function analyzeAndSmartFitModel(
  modelGroup: THREE.Group,
  targetBone: RigTargetBone = 'head',
  categoryHint: 'hair' | 'hat' | 'face' | 'back' | 'shoulder' = 'hair'
): SmartFitResult {
  // 1. Extract world/local vertices
  const vertices = extractVerticesFromObject(modelGroup);

  // Fallback if no vertices found
  if (vertices.length === 0) {
    return {
      position: [0.0, targetBone === 'head' ? 0.52 : 0.0, 0.0],
      rotationDeg: [0.0, 0.0, 0.0],
      scale: [1.0, 1.0, 1.0],
      uniformScale: 1.0,
      detectedType: categoryHint === 'hat' ? 'hat' : 'hair',
      detectedOrientation: 'Default (No vertices)',
      confidence: 0.5,
      originalBounds: { width: 1, height: 1, depth: 1, minY: 0, maxY: 1 },
      fittedDimensions: { width: 1.2, height: 1.2, depth: 1.2 },
      symmetryScore: 1.0,
    };
  }

  // 2. Compute Raw Bounding Box & Centroid
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let sumX = 0, sumY = 0, sumZ = 0;

  for (let i = 0; i < vertices.length; i++) {
    const p = vertices[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;

    sumX += p.x;
    sumY += p.y;
    sumZ += p.z;
  }

  const rawWidth = Math.max(0.001, maxX - minX);
  const rawHeight = Math.max(0.001, maxY - minY);
  const rawDepth = Math.max(0.001, maxZ - minZ);

  const rawCenterX = (minX + maxX) / 2;
  const rawCenterY = (minY + maxY) / 2;
  const rawCenterZ = (minZ + maxZ) / 2;

  const centroidX = sumX / vertices.length;
  const centroidY = sumY / vertices.length;
  const centroidZ = sumZ / vertices.length;

  // 3. Orientation & Symmetry Detection
  // Check candidate orientations:
  // Standard Y-Up (0, 0, 0), Z-Up Blender (-90, 0, 0), Z-Up (+90, 0, 0), Inverted Y (180, 0, 0), 180-Yaw (0, 180, 0), etc.
  interface OrientationCandidate {
    rotDeg: [number, number, number];
    label: string;
    symmetryScore: number;
    cavityScore: number;
    totalScore: number;
  }

  const candidates: { rotDeg: [number, number, number]; label: string }[] = [
    { rotDeg: [0, 0, 0], label: 'Standard Y-Up (0°)' },
    { rotDeg: [0, 180, 0], label: 'Facing Backward -> Flipped 180°' },
    { rotDeg: [-90, 0, 0], label: 'Blender Z-Up (-90° Pitch)' },
    { rotDeg: [90, 0, 0], label: 'Z-Up Inverted (+90° Pitch)' },
    { rotDeg: [-90, 180, 0], label: 'Blender Z-Up + 180° Yaw' },
    { rotDeg: [90, 180, 0], label: 'Z-Up Inverted + 180° Yaw' },
    { rotDeg: [180, 0, 0], label: 'Upside-Down (180° Roll)' },
    { rotDeg: [0, 90, 0], label: 'Side-Facing (90° Yaw)' },
    { rotDeg: [0, -90, 0], label: 'Side-Facing (-90° Yaw)' },
  ];

  // Sample subset of vertices for fast candidate evaluation (up to 300 points)
  const sampleStep = Math.max(1, Math.floor(vertices.length / 300));
  const sampledVertices: THREE.Vector3[] = [];
  for (let i = 0; i < vertices.length; i += sampleStep) {
    sampledVertices.push(vertices[i]);
  }

  let bestCandidate: OrientationCandidate = {
    rotDeg: [0, 0, 0],
    label: 'Standard Y-Up (0°)',
    symmetryScore: 0,
    cavityScore: 0,
    totalScore: -Infinity,
  };

  for (const cand of candidates) {
    const rx = THREE.MathUtils.degToRad(cand.rotDeg[0]);
    const ry = THREE.MathUtils.degToRad(cand.rotDeg[1]);
    const rz = THREE.MathUtils.degToRad(cand.rotDeg[2]);

    const euler = new THREE.Euler(rx, ry, rz, 'XYZ');
    const rotMat = new THREE.Matrix4().makeRotationFromEuler(euler);

    // Transform sampled vertices
    let tMinX = Infinity, tMaxX = -Infinity;
    let tMinY = Infinity, tMaxY = -Infinity;
    let tMinZ = Infinity, tMaxZ = -Infinity;
    const transVerts: THREE.Vector3[] = [];

    for (const v of sampledVertices) {
      const tv = v.clone().applyMatrix4(rotMat);
      transVerts.push(tv);
      if (tv.x < tMinX) tMinX = tv.x;
      if (tv.x > tMaxX) tMaxX = tv.x;
      if (tv.y < tMinY) tMinY = tv.y;
      if (tv.y > tMaxY) tMaxY = tv.y;
      if (tv.z < tMinZ) tMinZ = tv.z;
      if (tv.z > tMaxZ) tMaxZ = tv.z;
    }

    const tWidth = Math.max(0.001, tMaxX - tMinX);
    const tHeight = Math.max(0.001, tMaxY - tMinY);
    const tDepth = Math.max(0.001, tMaxZ - tMinZ);
    const tCenterX = (tMinX + tMaxX) / 2;
    const tCenterY = (tMinY + tMaxY) / 2;
    const tCenterZ = (tMinZ + tMaxZ) / 2;

    // 1. Bilateral symmetry test across X=tCenterX (left-right balance)
    let leftCount = 0;
    let rightCount = 0;
    let symDiffSum = 0;

    for (const tv of transVerts) {
      const dx = tv.x - tCenterX;
      if (dx < 0) leftCount++;
      else rightCount++;
    }

    const symmetryRatio = Math.min(leftCount, rightCount) / Math.max(1, Math.max(leftCount, rightCount));
    const symScore = symmetryRatio * 100;

    // 2. Aspect Ratio Score: Hair/hat is typically wider/deeper than extremely tall or flat
    // Normal hair aspect ratio: Width:Height is approx 0.8 : 1.5, Depth:Height is approx 0.8 : 1.5
    const aspectScore = (tWidth > 0.1 && tDepth > 0.1 && tHeight > 0.1) ? 20 : -50;

    // 3. Cavity & Crown Score:
    // For upright hair, the top half (crown) has more vertex density or narrower shape than the open cavity at the bottom,
    // and the back (+Z or -Z depending on convention) extends lower than the front forehead.
    let bottomVertexCount = 0;
    let topVertexCount = 0;
    for (const tv of transVerts) {
      if (tv.y < tCenterY) bottomVertexCount++;
      else topVertexCount++;
    }
    const cavityScore = 15; // baseline

    // 4. Front vs Back bias:
    // In Roblox/Three.js convention, +Z is forward (face) or -Z is back.
    // Face has lower density (hollow for face) whereas back of head is solid hair.
    let frontCount = 0;
    let backCount = 0;
    for (const tv of transVerts) {
      if (tv.z > tCenterZ) frontCount++;
      else backCount++;
    }

    let orientationScore = symScore + aspectScore + cavityScore;

    // Favor standard Y-up or standard 180 yaw unless Z-up has significantly higher symmetry/proportions
    if (cand.rotDeg[0] === 0 && cand.rotDeg[2] === 0) {
      orientationScore += 10;
    }

    if (orientationScore > bestCandidate.totalScore) {
      bestCandidate = {
        rotDeg: cand.rotDeg,
        label: cand.label,
        symmetryScore: symScore,
        cavityScore,
        totalScore: orientationScore,
      };
    }
  }

  // 4. Transform ALL vertices with best rotation to compute exact aligned bounds
  const bestEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(bestCandidate.rotDeg[0]),
    THREE.MathUtils.degToRad(bestCandidate.rotDeg[1]),
    THREE.MathUtils.degToRad(bestCandidate.rotDeg[2]),
    'XYZ'
  );
  const bestMat = new THREE.Matrix4().makeRotationFromEuler(bestEuler);

  let aMinX = Infinity, aMinY = Infinity, aMinZ = Infinity;
  let aMaxX = -Infinity, aMaxY = -Infinity, aMaxZ = -Infinity;

  for (let i = 0; i < vertices.length; i++) {
    const tv = vertices[i].clone().applyMatrix4(bestMat);
    if (tv.x < aMinX) aMinX = tv.x;
    if (tv.x > aMaxX) aMaxX = tv.x;
    if (tv.y < aMinY) aMinY = tv.y;
    if (tv.y > aMaxY) aMaxY = tv.y;
    if (tv.z < aMinZ) aMinZ = tv.z;
    if (tv.z > aMaxZ) aMaxZ = tv.z;
  }

  const alignedWidth = Math.max(0.001, aMaxX - aMinX);
  const alignedHeight = Math.max(0.001, aMaxY - aMinY);
  const alignedDepth = Math.max(0.001, aMaxZ - aMinZ);
  const alignedCenterX = (aMinX + aMaxX) / 2;
  const alignedCenterY = (aMinY + aMaxY) / 2;
  const alignedCenterZ = (aMinZ + aMaxZ) / 2;

  // 5. Calculate Target Scale for Head attachment
  // Standard R6 character head diameter is ~1.25 studs.
  // We want the accessory width & depth to be approx 1.20 - 1.35 studs for snug fit.
  const targetMaxHorizontal = 1.25;
  const maxAlignedHoriz = Math.max(alignedWidth, alignedDepth);
  
  let targetScale = 1.0;
  if (maxAlignedHoriz > 0.0001) {
    targetScale = targetMaxHorizontal / maxAlignedHoriz;
  }

  // Cap extreme scales
  if (targetScale < 0.001) targetScale = 0.01;
  if (targetScale > 500) targetScale = 1.0;

  // Round scale nicely
  const finalUniformScale = parseFloat(targetScale.toFixed(3));

  // 6. Calculate Target Offset Position
  // For 'head': head cylinder top cap is at y = +0.475 on head bone.
  // The cavity opening of hair sits at y = 0.48 - 0.55 so crown aligns with skull.
  let targetPosY = 0.52;
  let targetPosX = 0.0;
  let targetPosZ = 0.0;

  if (targetBone === 'head') {
    // When scaled, the model bottom (aMinY * targetScale) should align slightly below the crown
    // Position offset formula: targetPosY = headCrownY - (aMinY + offset) * targetScale
    // Or center the model horizontally and place base at head top
    targetPosX = parseFloat((-alignedCenterX * finalUniformScale).toFixed(3));
    targetPosZ = parseFloat((-alignedCenterZ * finalUniformScale).toFixed(3));
    
    // Hair usually sinks ~0.15 studs onto the head cylinder:
    const baseOffset = 0.48;
    targetPosY = parseFloat((baseOffset - aMinY * finalUniformScale).toFixed(3));
  } else if (targetBone === 'torso') {
    targetPosX = parseFloat((-alignedCenterX * finalUniformScale).toFixed(3));
    targetPosY = parseFloat((-alignedCenterY * finalUniformScale).toFixed(3));
    targetPosZ = parseFloat((-alignedCenterZ * finalUniformScale).toFixed(3));
  } else {
    targetPosX = 0.0;
    targetPosY = 0.0;
    targetPosZ = 0.0;
  }

  // Detect Type
  let detectedType: 'hair' | 'hat' | 'accessory' | 'generic' = 'hair';
  if (categoryHint === 'hat' || (alignedHeight < alignedWidth * 0.5 && alignedWidth > 1.0)) {
    detectedType = 'hat';
  } else if (targetBone !== 'head') {
    detectedType = 'accessory';
  }

  return {
    position: [targetPosX, targetPosY, targetPosZ],
    rotationDeg: [
      bestCandidate.rotDeg[0],
      bestCandidate.rotDeg[1],
      bestCandidate.rotDeg[2],
    ],
    scale: [finalUniformScale, finalUniformScale, finalUniformScale],
    uniformScale: finalUniformScale,
    detectedType,
    detectedOrientation: bestCandidate.label,
    confidence: Math.min(100, Math.round(bestCandidate.symmetryScore)),
    originalBounds: {
      width: parseFloat(rawWidth.toFixed(3)),
      height: parseFloat(rawHeight.toFixed(3)),
      depth: parseFloat(rawDepth.toFixed(3)),
      minY: parseFloat(minY.toFixed(3)),
      maxY: parseFloat(maxY.toFixed(3)),
    },
    fittedDimensions: {
      width: parseFloat((alignedWidth * finalUniformScale).toFixed(3)),
      height: parseFloat((alignedHeight * finalUniformScale).toFixed(3)),
      depth: parseFloat((alignedDepth * finalUniformScale).toFixed(3)),
    },
    symmetryScore: parseFloat(bestCandidate.symmetryScore.toFixed(1)),
  };
}

/**
 * Normalizes and smart-fits an arbitrary BufferGeometry directly onto a character head.
 */
export function smartFitBufferGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const cloned = geometry.clone();
  cloned.computeBoundingBox();
  const bb = cloned.boundingBox;
  if (!bb) return cloned;

  const size = new THREE.Vector3();
  bb.getSize(size);

  const maxHoriz = Math.max(size.x, size.z);
  if (maxHoriz > 0.0001) {
    const scale = 1.28 / maxHoriz;
    cloned.scale(scale, scale, scale);
  }

  cloned.computeBoundingBox();
  const newBb = cloned.boundingBox!;
  const center = new THREE.Vector3();
  newBb.getCenter(center);

  // Center on X and Z, align base with head crown at Y ~ 0.42
  cloned.translate(-center.x, -newBb.min.y + 0.42, -center.z);
  cloned.computeVertexNormals();

  return cloned;
}
