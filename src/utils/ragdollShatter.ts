import * as THREE from 'three';
import { AvatarColors } from '../components/AvatarViewer';
import { createFaceMesh } from './faceTexture';
import { attachShirtToLimbs } from './shirtTexture';
import { attachPantsToLimbs } from './pantsTexture';
import { createHairMesh, createHairMeshAsync } from './hairMesh';
import { createAccessoryMesh } from './accessoryMesh';

export interface ShatteredPiece {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
}

export class RagdollShatterManager {
  private pieces: ShatteredPiece[] = [];
  private animFrameId: number | null = null;
  private scene: THREE.Scene | null = null;
  private respawnTimer: any = null;

  public shatterCharacter(
    originPos: THREE.Vector3,
    scene: THREE.Scene,
    colors: AvatarColors,
    faceId: string = 'classic-smile',
    onRespawn?: () => void,
    shirtUrl?: string | null,
    pantsUrl?: string | null,
    hairId?: string,
    hairColor?: string,
    customHairObj?: string | null,
    accessoryId?: string
  ) {
    this.cleanup();
    this.scene = scene;

    const makeMat = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex || '#d4d4d4'),
        roughness: 0.45,
        metalness: 0.08,
      });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
    const torsoMesh = new THREE.Mesh(torsoGeo, makeMat(colors.torso));
    torsoMesh.position.set(originPos.x, originPos.y + 3, originPos.z);
    torsoMesh.castShadow = true;
    scene.add(torsoMesh);
    this.addPiece(torsoMesh, 1.2);

    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(originPos.x, originPos.y + 4.7, originPos.z);
    const headMat = makeMat(colors.head);
    const cylinderGeo = new THREE.CylinderGeometry(0.625, 0.625, 0.95, 24);
    const headCylinder = new THREE.Mesh(cylinderGeo, headMat);
    headCylinder.castShadow = true;
    headGroup.add(headCylinder);

    const topCapGeo = new THREE.SphereGeometry(0.625, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    topCapGeo.scale(1, 0.35, 1);
    const topCap = new THREE.Mesh(topCapGeo, headMat);
    topCap.position.y = 0.475;
    topCap.castShadow = true;
    headGroup.add(topCap);

    const botCapGeo = new THREE.SphereGeometry(0.625, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    botCapGeo.scale(1, 0.35, 1);
    const botCap = new THREE.Mesh(botCapGeo, headMat);
    botCap.position.y = -0.475;
    botCap.castShadow = true;
    headGroup.add(botCap);

    const faceMesh = createFaceMesh(faceId);
    headGroup.add(faceMesh);

    // Hair
    if (hairId && hairId !== 'none') {
      const hairMesh = createHairMesh(hairId, hairColor || '#4a2e1b', customHairObj);
      if (hairMesh) {
        headGroup.add(hairMesh);
      } else {
        createHairMeshAsync(hairId, hairColor || '#4a2e1b', customHairObj)
          .then((asyncHair) => {
            if (asyncHair) headGroup.add(asyncHair);
          })
          .catch(() => {});
      }
    }

    // Accessory
    if (accessoryId && accessoryId !== 'none') {
      const accMesh = createAccessoryMesh(accessoryId);
      if (accMesh) headGroup.add(accMesh);
    }

    scene.add(headGroup);
    this.addPiece(headGroup, 1.6);

    // 3. Left Arm
    const armGeo = new THREE.BoxGeometry(1, 2, 1);
    const leftArmMesh = new THREE.Mesh(armGeo, makeMat(colors.leftArm));
    leftArmMesh.position.set(originPos.x + 1.5, originPos.y + 3, originPos.z);
    leftArmMesh.castShadow = true;
    scene.add(leftArmMesh);
    this.addPiece(leftArmMesh, 1.4);

    // 4. Right Arm
    const rightArmMesh = new THREE.Mesh(armGeo, makeMat(colors.rightArm));
    rightArmMesh.position.set(originPos.x - 1.5, originPos.y + 3, originPos.z);
    rightArmMesh.castShadow = true;
    scene.add(rightArmMesh);
    this.addPiece(rightArmMesh, 1.4);

    // 5. Left Leg
    const legGeo = new THREE.BoxGeometry(1, 2, 1);
    const leftLegMesh = new THREE.Mesh(legGeo, makeMat(colors.leftLeg));
    leftLegMesh.position.set(originPos.x + 0.5, originPos.y + 1, originPos.z);
    leftLegMesh.castShadow = true;
    scene.add(leftLegMesh);
    this.addPiece(leftLegMesh, 1.1);

    // 6. Right Leg
    const rightLegMesh = new THREE.Mesh(legGeo, makeMat(colors.rightLeg));
    rightLegMesh.position.set(originPos.x - 0.5, originPos.y + 1, originPos.z);
    rightLegMesh.castShadow = true;
    scene.add(rightLegMesh);
    this.addPiece(rightLegMesh, 1.1);

    // Attach Shirt & Pants textures to severed pieces
    if (shirtUrl) {
      attachShirtToLimbs(torsoMesh, leftArmMesh, rightArmMesh, shirtUrl);
    }
    if (pantsUrl) {
      attachPantsToLimbs(torsoMesh, leftLegMesh, rightLegMesh, pantsUrl);
    }

    // Start physics simulation
    this.startPhysicsLoop();

    // 3-second respawn timer
    this.respawnTimer = setTimeout(() => {
      this.cleanup();
      if (onRespawn) onRespawn();
    }, 3000);
  }

  private addPiece(mesh: THREE.Object3D, blastPower: number = 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 4 + 3) * blastPower;
    const vel = new THREE.Vector3(
      Math.cos(angle) * speed,
      Math.random() * 5 + 4,
      Math.sin(angle) * speed
    );
    const angVel = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12
    );

    this.pieces.push({
      mesh,
      velocity: vel,
      angularVelocity: angVel,
    });
  }

  private startPhysicsLoop() {
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const gravity = -30;

      for (const piece of this.pieces) {
        // Gravity
        piece.velocity.y += gravity * dt;

        // Position update
        piece.mesh.position.x += piece.velocity.x * dt;
        piece.mesh.position.y += piece.velocity.y * dt;
        piece.mesh.position.z += piece.velocity.z * dt;

        // Rotation update
        piece.mesh.rotation.x += piece.angularVelocity.x * dt;
        piece.mesh.rotation.y += piece.angularVelocity.y * dt;
        piece.mesh.rotation.z += piece.angularVelocity.z * dt;

        // Floor bounce at y = 0.5
        if (piece.mesh.position.y < 0.5) {
          piece.mesh.position.y = 0.5;
          piece.velocity.y = -piece.velocity.y * 0.35; // bounce restitution
          piece.velocity.x *= 0.85; // friction
          piece.velocity.z *= 0.85;
          piece.angularVelocity.multiplyScalar(0.85);
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public cleanup() {
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
      this.respawnTimer = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.scene) {
      for (const piece of this.pieces) {
        this.scene.remove(piece.mesh);
      }
    }
    this.pieces = [];
  }
}
