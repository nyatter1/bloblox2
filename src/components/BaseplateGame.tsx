import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import {
  HelpCircle,
  Settings2,
  MessageSquare,
  Send,
  Users,
  UserPlus,
  UserCheck,
  X,
  Check,
  Bell,
  ChevronRight,
  ChevronLeft,
  Gamepad,
  Smartphone,
  ArrowUp
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { createFaceMesh, getFaceTexture } from '../utils/faceTexture';
import { attachShirtToLimbs } from '../utils/shirtTexture';
import { attachPantsToLimbs } from '../utils/pantsTexture';
import { createAccessoryMesh } from '../utils/accessoryMesh';
import { createHairMesh, createHairMeshAsync } from '../utils/hairMesh';
import { ExperienceData, StudioPart } from '../types/experience';
import { applyTextureProperties } from '../utils/textureMapping';
import { RagdollShatterManager } from '../utils/ragdollShatter';
import { gameAudio } from '../utils/gameAudio';
import {
  UserProfile,
  LivePlayerPresence,
  LiveChatMessage,
  joinGamePresence,
  updateGamePresence,
  leaveGamePresence,
  subscribeGamePlayers,
  sendChatMessage,
  subscribeChatMessages,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  subscribeUserProfile,
  subscribeExperienceById
} from '../services/firebase';
import AvatarProfileIcon from './AvatarProfileIcon';
import VerifiedBadge, { isOwnerUser, isVerifiedUser } from './VerifiedBadge';

interface BaseplateGameProps {
  onLeaveGame: () => void;
  avatarColors: AvatarColors;
  selectedFaceId?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  selectedAccessoryId?: string;
  selectedHairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  experience?: ExperienceData | null;
  currentUser?: UserProfile | null;
  onOpenProfile?: (userId: string) => void;
}

function createNametagSprite(username: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(16, 12, 224, 40, 8);
  else ctx.rect(16, 12, 224, 40);
  ctx.fill();

  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isVerifiedUser(username)) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${username} ✔`, 128, 32);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(username, 128, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 0.8, 1);
  sprite.position.set(0, 5.8, 0);
  return sprite;
}

function createChatBubbleSprite(message: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 16, 472, 80, 20);
  else ctx.rect(20, 16, 472, 80);
  ctx.fill();

  // Little bubble triangle pointing down
  ctx.beginPath();
  ctx.moveTo(240, 96);
  ctx.lineTo(256, 114);
  ctx.lineTo(272, 96);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
  ctx.fill();

  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 16, 472, 80, 20);
  else ctx.rect(20, 16, 472, 80);
  ctx.stroke();

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#1e1b4b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const displayMsg = message.length > 36 ? message.slice(0, 34) + '...' : message;
  ctx.fillText(displayMsg, 256, 56);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.8, 1.2, 1);
  sprite.position.set(0, 7.2, 0);
  return sprite;
}

function createR6Character({
  colors,
  faceId,
  hairId,
  hairColor,
  customHairObj,
  accessoryId,
  shirtUrl,
  pantsUrl,
  username,
  showNametag = false,
}: {
  colors: AvatarColors;
  faceId?: string;
  hairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  accessoryId?: string;
  shirtUrl?: string | null;
  pantsUrl?: string | null;
  username: string;
  showNametag?: boolean;
}) {
  const characterGroup = new THREE.Group();

  const makeMat = (hex: string) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex || DEFAULT_GREY),
      roughness: 0.45,
      metalness: 0.08,
    });

  // Torso (2 x 2 x 1, centered at y = 3)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), makeMat(colors.torso));
  torso.position.y = 3;
  torso.castShadow = true;
  torso.receiveShadow = true;
  characterGroup.add(torso);

  // Head Group (Smooth R6 Cylinder with Top and Bottom Spherical Caps - Identical to Avatar Creator!)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 4.7, 0);
  const headMat = makeMat(colors.head);
  const headCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.625, 0.625, 0.95, 36), headMat);
  headCylinder.castShadow = true;
  headGroup.add(headCylinder);

  const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.625, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2), headMat);
  topCap.scale.set(1, 0.35, 1);
  topCap.position.y = 0.475;
  topCap.castShadow = true;
  headGroup.add(topCap);

  const botCap = new THREE.Mesh(new THREE.SphereGeometry(0.625, 36, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), headMat);
  botCap.scale.set(1, 0.35, 1);
  botCap.position.y = -0.475;
  botCap.castShadow = true;
  headGroup.add(botCap);

  // Face Mesh
  const faceMesh = createFaceMesh(faceId || 'classic-smile');
  headGroup.add(faceMesh);

  // Synchronous / Asynchronous 3D Hair & Accessories (Matches Avatar Creator 100%)
  if (hairId && hairId !== 'none') {
    const syncHair = createHairMesh(hairId, hairColor || '#4a2e1b', customHairObj);
    if (syncHair) {
      headGroup.add(syncHair);
    } else {
      createHairMeshAsync(hairId, hairColor || '#4a2e1b', customHairObj)
        .then((asyncHair) => {
          if (asyncHair) {
            headGroup.add(asyncHair);
          }
        })
        .catch(() => {});
    }
  }

  // Head Accessory
  if (accessoryId && accessoryId !== 'none') {
    const accMesh = createAccessoryMesh(accessoryId);
    if (accMesh) headGroup.add(accMesh);
  }

  characterGroup.add(headGroup);

  // Nametag overhead (only added for remote players so local camera view is completely clean)
  let nametag: THREE.Sprite | null = null;
  if (showNametag) {
    nametag = createNametagSprite(username);
    characterGroup.add(nametag);
  }

  // Limbs
  const armGeo = new THREE.BoxGeometry(1, 2, 1);
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(1.5, 4, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, makeMat(colors.leftArm));
  leftArmMesh.position.set(0, -1, 0);
  leftArmMesh.castShadow = true;
  leftArmGroup.add(leftArmMesh);
  characterGroup.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-1.5, 4, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, makeMat(colors.rightArm));
  rightArmMesh.position.set(0, -1, 0);
  rightArmMesh.castShadow = true;
  rightArmGroup.add(rightArmMesh);
  characterGroup.add(rightArmGroup);

  const legGeo = new THREE.BoxGeometry(1, 2, 1);
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(0.5, 2, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, makeMat(colors.leftLeg));
  leftLegMesh.position.set(0, -1, 0);
  leftLegMesh.castShadow = true;
  leftLegGroup.add(leftLegMesh);
  characterGroup.add(leftLegGroup);

  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(-0.5, 2, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, makeMat(colors.rightLeg));
  rightLegMesh.position.set(0, -1, 0);
  rightLegMesh.castShadow = true;
  rightLegGroup.add(rightLegMesh);
  characterGroup.add(rightLegGroup);

  const detachShirt = attachShirtToLimbs(torso, leftArmGroup, rightArmGroup, shirtUrl);
  const detachPants = attachPantsToLimbs(torso, leftLegGroup, rightLegGroup, pantsUrl);

  return {
    characterGroup,
    headGroup,
    torso,
    limbs: {
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
    },
    nametag,
    detachShirt,
    detachPants,
  };
}

function buildPartMesh(part: StudioPart, texLoader: THREE.TextureLoader): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  if (part.shape === 'sphere') {
    geo = new THREE.SphereGeometry(part.size[0] / 2, 32, 24);
  } else if (part.shape === 'cylinder') {
    geo = new THREE.CylinderGeometry(part.size[0] / 2, part.size[0] / 2, part.size[1], 32);
  } else if (part.shape === 'wedge') {
    geo = new THREE.BufferGeometry();
    const w = part.size[0] / 2;
    const h = part.size[1];
    const bd = part.size[2] / 2;
    const vertices = new Float32Array([
      -w, 0, bd,  w, 0, bd,  -w, h, -bd,
      w, 0, bd,   w, h, -bd, -w, h, -bd,
      -w, 0, -bd, -w, h, -bd,  w, h, -bd,
      -w, 0, -bd,  w, h, -bd,  w, 0, -bd,
      -w, 0, -bd,  w, 0, -bd,  w, 0, bd,
      -w, 0, -bd,  w, 0, bd,  -w, 0, bd,
      -w, 0, bd,  -w, h, -bd,  w, h, -bd,
      -w, 0, bd,   w, h, -bd,  w, 0, bd,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
  } else {
    geo = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
  }

  const isNeon = part.material === 'Neon';
  const isGlass = part.material === 'Glass';
  const isMetal = part.material === 'Metal';

  const baseProps: THREE.MeshStandardMaterialParameters = {
    color: new THREE.Color(part.color || '#94a3b8'),
    roughness: isMetal ? 0.2 : isGlass ? 0.1 : 0.5,
    metalness: isMetal ? 0.8 : 0.05,
    transparent: (part.transparency || 0) > 0 || isGlass,
    opacity: isGlass ? 0.4 : 1 - (part.transparency || 0),
    emissive: isNeon ? new THREE.Color(part.color) : new THREE.Color(0x000000),
    emissiveIntensity: isNeon ? 0.9 : 0,
  };

  let mat: THREE.Material | THREE.Material[];
  if (part.textures) {
    const texProps = part.textureProperties || { mode: 'stretch', repeatX: 1, repeatY: 1 };
    if (part.textures.all) {
      const tex = texLoader.load(part.textures.all);
      applyTextureProperties(tex, texProps);
      mat = new THREE.MeshStandardMaterial({ ...baseProps, map: tex });
    } else if (part.shape === 'block') {
      const faceKeys: (keyof typeof part.textures)[] = ['right', 'left', 'top', 'bottom', 'front', 'back'];
      mat = faceKeys.map((key) => {
        const url = part.textures?.[key];
        if (url) {
          const tex = texLoader.load(url);
          applyTextureProperties(tex, texProps);
          return new THREE.MeshStandardMaterial({ ...baseProps, map: tex });
        }
        return new THREE.MeshStandardMaterial(baseProps);
      });
    } else {
      mat = new THREE.MeshStandardMaterial(baseProps);
    }
  } else {
    mat = new THREE.MeshStandardMaterial(baseProps);
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(part.position[0], part.position[1], part.position[2]);
  mesh.rotation.set(
    (part.rotation[0] * Math.PI) / 180,
    (part.rotation[1] * Math.PI) / 180,
    (part.rotation[2] * Math.PI) / 180
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export default function BaseplateGame({
  onLeaveGame,
  avatarColors,
  selectedFaceId = 'classic-smile',
  shirtDataUrl,
  pantsDataUrl,
  selectedAccessoryId = 'none',
  selectedHairId = 'none',
  hairColor = '#4a2e1b',
  customHairObj = null,
  experience = null,
  currentUser = null,
  onOpenProfile,
}: BaseplateGameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active Experience ID
  const expId = experience?.id || 'classic-baseplate-sandbox';

  // Resolved user identity
  const effectiveUser: UserProfile = currentUser || {
    id: 'guest-' + Math.random().toString(36).substring(2, 8),
    username: 'Guest',
    email: 'guest@boblox.app',
    displayName: 'Guest Player',
    joinedDate: 'Joined Sep 2026',
    createdAt: Date.now(),
    lastActive: Date.now(),
    avatarColors,
    selectedFaceId,
    shirtDataUrl,
    pantsDataUrl,
    selectedHairId,
    hairColor,
    friends: [],
    friendRequests: [],
    followers: [],
    following: [],
  };

  // Pause menu state
  const [isPaused, setIsPaused] = useState(false);
  const [showControlsHint, setShowControlsHint] = useState(false);

  // Multiplayer Chat State
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Leaderstats State
  const [leaderstatsOpen, setLeaderstatsOpen] = useState(false);
  const [remotePlayers, setRemotePlayers] = useState<LivePlayerPresence[]>([]);
  const [sentFriendReqUids, setSentFriendReqUids] = useState<Set<string>>(new Set());

  // In-Game Friend Request Toast Notification
  const [activeFriendToast, setActiveFriendToast] = useState<{
    fromUid: string;
    fromUsername: string;
  } | null>(null);

  // Mobile & Gamepad detection
  const [isDead, setIsDead] = useState<boolean>(false);
  const [deathCountdown, setDeathCountdown] = useState<number>(3);
  const isDeadRef = useRef<boolean>(false);
  isDeadRef.current = isDead;

  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(max-width: 900px) and (pointer: coarse)').matches
    );
  });
  const [gamepadConnected, setGamepadConnected] = useState<boolean>(false);

  // Touch Virtual Joystick State & Refs
  const [joystickThumb, setJoystickThumb] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState<boolean>(false);
  const touchVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchJoystickTouchIdRef = useRef<number | null>(null);
  const touchLookTouchIdRef = useRef<number | null>(null);
  const touchLookPrevRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchPinchDistRef = useRef<number | null>(null);

  // Xbox Gamepad button state tracker
  const gamepadPrevJumpRef = useRef<boolean>(false);
  const gamepadPrevStartRef = useRef<boolean>(false);

  // Camera settings
  const [invertX, setInvertX] = useState(false);
  const [invertY, setInvertY] = useState(false);
  const invertXRef = useRef(invertX);
  invertXRef.current = invertX;
  const invertYRef = useRef(invertY);
  invertYRef.current = invertY;

  // Game loop references
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;
  const isChatInputFocusedRef = useRef(false);

  // Camera zoom distance (3rd person)
  const targetCameraDistanceRef = useRef<number>(9.5);
  const currentCameraDistanceRef = useRef<number>(9.5);
  const cameraYawRef = useRef<number>(0);
  const cameraPitchRef = useRef<number>(0.25);

  // Character movement physics
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const playerVelocityYRef = useRef<number>(0);
  const isGroundedRef = useRef<boolean>(true);
  const playerHeadingRef = useRef<number>(0);

  // Local chat bubble ref
  const localChatBubbleRef = useRef<THREE.Sprite | null>(null);
  const localChatTimeoutRef = useRef<any>(null);

  // Limbs
  const limbsRef = useRef<{
    characterGroup?: THREE.Group;
    headGroup?: THREE.Group;
    torso?: THREE.Mesh;
    leftArm?: THREE.Group;
    rightArm?: THREE.Group;
    leftLeg?: THREE.Group;
    rightLeg?: THREE.Group;
  }>({});

  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const isDraggingRef = useRef<boolean>(false);
  const prevMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Unified Jump Action (Keyboard, Mobile Touch Button, Xbox A button)
  const triggerJump = () => {
    if (isGroundedRef.current) {
      playerVelocityYRef.current = 15.5;
      isGroundedRef.current = false;
      gameAudio.playJumpSound();
      // Immediately broadcast jumping state to Firestore
      updateGamePresence(expId, effectiveUser.id, {
        position: [
          Math.round(playerPosRef.current.x * 10) / 10,
          Math.round((playerPosRef.current.y + 1.2) * 10) / 10,
          Math.round(playerPosRef.current.z * 10) / 10,
        ],
        rotationY: Math.round(playerHeadingRef.current * 100) / 100,
        isMoving: true,
        isJumping: true,
      });
    }
  };

  const sceneRef = useRef<THREE.Scene | null>(null);
  const ragdollManagerRef = useRef<RagdollShatterManager>(new RagdollShatterManager());
  const remoteRagdollsRef = useRef<Map<string, RagdollShatterManager>>(new Map());
  const remotePrevDeadRef = useRef<Map<string, boolean>>(new Map());
  const lastBroadcastMovingRef = useRef<boolean>(false);
  const lastBroadcastJumpingRef = useRef<boolean>(false);

  const triggerPlayerDeath = () => {
    if (isDeadRef.current) return;
    setIsDead(true);
    isDeadRef.current = true;
    setDeathCountdown(3);

    // Play classic Roblox OOF / Death audio
    gameAudio.playDeathSound();

    // Broadcast death state to Firestore so all remote players see the ragdoll shatter in real-time!
    updateGamePresence(expId, effectiveUser.id, {
      isDead: true,
      isMoving: false,
      isJumping: false,
      position: [
        Math.round(playerPosRef.current.x * 10) / 10,
        Math.round(playerPosRef.current.y * 10) / 10,
        Math.round(playerPosRef.current.z * 10) / 10,
      ],
    });

    if (limbsRef.current.characterGroup) {
      limbsRef.current.characterGroup.visible = false;
    }

    if (sceneRef.current) {
      ragdollManagerRef.current.shatterCharacter(
        playerPosRef.current,
        sceneRef.current,
        avatarColors,
        selectedFaceId,
        () => {},
        shirtDataUrl,
        pantsDataUrl,
        selectedHairId,
        hairColor,
        customHairObj,
        selectedAccessoryId
      );
    }

    let remaining = 3;
    const timer = setInterval(() => {
      remaining -= 1;
      setDeathCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        ragdollManagerRef.current.cleanup();
        setIsDead(false);
        isDeadRef.current = false;

        const spawnPart = experience?.parts?.find((p) => p.name.toLowerCase().includes('spawn'));
        const spawnPos: [number, number, number] = spawnPart
          ? [spawnPart.position[0], spawnPart.position[1] + spawnPart.size[1] / 2 + 0.1, spawnPart.position[2]]
          : [0, 0.1, 0];

        playerPosRef.current.set(spawnPos[0], spawnPos[1], spawnPos[2]);
        playerVelocityYRef.current = 0;
        isGroundedRef.current = true;

        if (limbsRef.current.characterGroup) {
          limbsRef.current.characterGroup.visible = true;
          limbsRef.current.characterGroup.position.set(spawnPos[0], spawnPos[1], spawnPos[2]);
        }

        // Broadcast alive/respawn state to Firestore
        updateGamePresence(expId, effectiveUser.id, {
          isDead: false,
          position: spawnPos,
          isMoving: false,
          isJumping: false,
        });
      }
    }, 1000);
  };

  // Remote Players 3D Meshes in Scene
  const remotePlayerMeshesRef = useRef<
    Map<
      string,
      {
        group: THREE.Group;
        limbs: { leftArm: THREE.Group; rightArm: THREE.Group; leftLeg: THREE.Group; rightLeg: THREE.Group };
        nametag: THREE.Sprite;
        chatBubble?: THREE.Sprite | null;
        lastChatTime?: number;
        walkAnimTimer: number;
        detachShirt: () => void;
        detachPants: () => void;
      }
    >
  >(new Map());
  const remotePlayersRef = useRef<LivePlayerPresence[]>([]);

  // Subscribe to real-time incoming friend requests for in-game notification!
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserProfile(currentUser.id, (profile) => {
      if (!profile || !profile.friendRequests || profile.friendRequests.length === 0) return;
      const latest = profile.friendRequests[profile.friendRequests.length - 1];
      if (Date.now() - (latest.timestamp || 0) < 15000) {
        setActiveFriendToast({
          fromUid: latest.fromUid,
          fromUsername: latest.fromUsername,
        });
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Auto-dismiss friend request notification after 10s
  useEffect(() => {
    if (activeFriendToast) {
      const timer = setTimeout(() => {
        setActiveFriendToast(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeFriendToast]);

  // 1. Join Firebase Presence on Mount, update heartbeat, leave on unmount
  useEffect(() => {
    // Spawn position on spawn pad
    const spawnPart = experience?.parts?.find((p) => p.name.toLowerCase().includes('spawn'));
    const initialPos: [number, number, number] = spawnPart
      ? [spawnPart.position[0], spawnPart.position[1] + spawnPart.size[1] / 2 + 0.1, spawnPart.position[2]]
      : [0, 0, 0];

    playerPosRef.current.set(initialPos[0], initialPos[1], initialPos[2]);

    joinGamePresence(expId, effectiveUser, initialPos);

    // Heartbeat every 8s
    const heartbeat = setInterval(() => {
      updateGamePresence(expId, effectiveUser.id, {
        position: [
          Math.round(playerPosRef.current.x * 10) / 10,
          Math.round(playerPosRef.current.y * 10) / 10,
          Math.round(playerPosRef.current.z * 10) / 10,
        ],
        rotationY: Math.round(playerHeadingRef.current * 100) / 100,
        lastPing: Date.now(),
      });
    }, 8000);

    // Tab visibility & close listeners: if tab closes or user navigates away, leave game immediately
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        leaveGamePresence(expId, effectiveUser.id);
        onLeaveGame();
      }
    };

    const handleBeforeUnload = () => {
      leaveGamePresence(expId, effectiveUser.id);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      leaveGamePresence(expId, effectiveUser.id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [expId]);

  // 2. Subscribe to remote players in this game
  useEffect(() => {
    const unsub = subscribeGamePlayers(expId, effectiveUser.id, (players) => {
      remotePlayersRef.current = players;
      setRemotePlayers(players);
    });
    return () => unsub();
  }, [expId, effectiveUser.id]);

  // 3. Subscribe to real-time chat messages
  useEffect(() => {
    const unsub = subscribeChatMessages(expId, (messages) => {
      setChatMessages(messages);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 50);
    });
    return () => unsub();
  }, [expId]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean) return;
    setChatInput('');

    // Trigger local chat bubble immediately
    if (limbsRef.current.characterGroup) {
      if (localChatBubbleRef.current) {
        limbsRef.current.characterGroup.remove(localChatBubbleRef.current);
        localChatBubbleRef.current = null;
      }
      const bubble = createChatBubbleSprite(clean);
      limbsRef.current.characterGroup.add(bubble);
      localChatBubbleRef.current = bubble;

      if (localChatTimeoutRef.current) clearTimeout(localChatTimeoutRef.current);
      localChatTimeoutRef.current = setTimeout(() => {
        if (localChatBubbleRef.current && limbsRef.current.characterGroup) {
          limbsRef.current.characterGroup.remove(localChatBubbleRef.current);
          localChatBubbleRef.current = null;
        }
      }, 6500);
    }

    await sendChatMessage(expId, effectiveUser, clean);
  };

  const handleResetCharacter = () => {
    const spawnPart = experience?.parts?.find((p) => p.name.toLowerCase().includes('spawn'));
    if (spawnPart) {
      playerPosRef.current.set(spawnPart.position[0], spawnPart.position[1] + spawnPart.size[1] / 2 + 0.1, spawnPart.position[2]);
    } else {
      playerPosRef.current.set(0, 0, 0);
    }
    playerVelocityYRef.current = 0;
    isGroundedRef.current = true;
    setIsPaused(false);
  };

  // Main Three.js Scene Setup & Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene & Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x8cb6e8);
    scene.fog = new THREE.FogExp2(0x8cb6e8, 0.007);

    // Camera
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7e6, 1.9);
    sunLight.position.set(60, 100, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 250;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x666666, 0.6);
    scene.add(hemiLight);

    // Baseplate (512x512)
    const createStudTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#63676c';
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#4e5156';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 64, 64);
      ctx.beginPath();
      ctx.arc(32, 32, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#72767c';
      ctx.fill();
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(256, 256);
      return texture;
    };

    const baseplateGeo = new THREE.BoxGeometry(512, 2, 512);
    const baseplateMat = new THREE.MeshStandardMaterial({
      map: createStudTexture(),
      roughness: 0.8,
      metalness: 0.1,
    });
    const baseplate = new THREE.Mesh(baseplateGeo, baseplateMat);
    baseplate.position.y = -1;
    baseplate.receiveShadow = true;
    scene.add(baseplate);

    // Custom Experience Parts Group & Live Sync
    const partsGroup = new THREE.Group();
    scene.add(partsGroup);

    let currentPartMeshes: { part: StudioPart; mesh: THREE.Mesh; velY: number; currentY: number }[] = [];
    let currentPartsList: StudioPart[] = experience?.parts || [];
    const texLoader = new THREE.TextureLoader();

    const syncParts = (newParts: StudioPart[]) => {
      // Clear previous parts
      while (partsGroup.children.length > 0) {
        const obj = partsGroup.children[0] as THREE.Mesh;
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
        partsGroup.remove(obj);
      }

      currentPartMeshes = [];
      currentPartsList = newParts || [];

      currentPartsList.forEach((part) => {
        const mesh = buildPartMesh(part, texLoader);
        partsGroup.add(mesh);
        currentPartMeshes.push({
          part,
          mesh,
          velY: 0,
          currentY: part.position[1],
        });
      });
    };

    // Initial build from experience prop if present
    syncParts(experience?.parts || []);

    // Live subscription to experience parts in Firestore so any device/tab sees parts instantly
    const unsubExp = subscribeExperienceById(expId, (liveExp) => {
      if (liveExp && liveExp.parts && liveExp.parts.length > 0) {
        syncParts(liveExp.parts);
      }
    });

    // Local Player Character Setup (nametag hidden so local player camera view is completely clean)
    const localChar = createR6Character({
      colors: avatarColors,
      faceId: selectedFaceId,
      hairId: selectedHairId,
      hairColor,
      accessoryId: selectedAccessoryId,
      shirtUrl: shirtDataUrl,
      pantsUrl: pantsDataUrl,
      username: effectiveUser.username,
      showNametag: false,
    });
    scene.add(localChar.characterGroup);
    const characterGroup = localChar.characterGroup;
    limbsRef.current = {
      characterGroup: localChar.characterGroup,
      headGroup: localChar.headGroup,
      torso: localChar.torso,
      leftArm: localChar.limbs.leftArm,
      rightArm: localChar.limbs.rightArm,
      leftLeg: localChar.limbs.leftLeg,
      rightLeg: localChar.limbs.rightLeg,
    };
    const detachShirt = localChar.detachShirt;
    const detachPants = localChar.detachPants;

    // Input listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (isChatInputFocusedRef.current) return;

      if (e.key === 'Escape') {
        setIsPaused((prev) => !prev);
        return;
      }
      if (isPausedRef.current) return;

      keysPressedRef.current[e.key.toLowerCase()] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        triggerJump();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isChatInputFocusedRef.current) return;
      keysPressedRef.current[e.key.toLowerCase()] = false;

      // Check if all movement keys released to immediately sync staying still
      const stillMoving =
        keysPressedRef.current['w'] ||
        keysPressedRef.current['a'] ||
        keysPressedRef.current['s'] ||
        keysPressedRef.current['d'] ||
        keysPressedRef.current['arrowup'] ||
        keysPressedRef.current['arrowdown'] ||
        keysPressedRef.current['arrowleft'] ||
        keysPressedRef.current['arrowright'] ||
        Math.hypot(touchVectorRef.current.x, touchVectorRef.current.y) > 0.1;

      if (!stillMoving) {
        updateGamePresence(expId, effectiveUser.id, {
          position: [
            Math.round(playerPosRef.current.x * 10) / 10,
            Math.round(playerPosRef.current.y * 10) / 10,
            Math.round(playerPosRef.current.z * 10) / 10,
          ],
          rotationY: Math.round(playerHeadingRef.current * 100) / 100,
          isMoving: false,
          isJumping: !isGroundedRef.current,
        });
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isPausedRef.current) return;
      if (e.button === 0 || e.button === 2) {
        isDraggingRef.current = true;
        prevMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isPausedRef.current || !isDraggingRef.current) return;
      const dx = e.clientX - prevMousePosRef.current.x;
      const dy = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      const sens = 0.005;
      const xFactor = invertXRef.current ? -1 : 1;
      const yFactor = invertYRef.current ? -1 : 1;

      cameraYawRef.current -= dx * sens * xFactor;
      cameraPitchRef.current = THREE.MathUtils.clamp(
        cameraPitchRef.current + dy * sens * yFactor,
        -1.15,
        1.25
      );
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isPausedRef.current) return;
      targetCameraDistanceRef.current = THREE.MathUtils.clamp(
        targetCameraDistanceRef.current + e.deltaY * 0.008,
        4.0,
        18.0
      );
    };

    // Mobile touch drag to look around / orbit camera and pinch to zoom
    const onTouchStartCanvas = (e: TouchEvent) => {
      if (isPausedRef.current) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // If touch is on right half or upper part of screen, treat as camera look touch
        if (touchLookTouchIdRef.current === null && (touch.clientX > window.innerWidth * 0.35 || touch.clientY < window.innerHeight * 0.6)) {
          touchLookTouchIdRef.current = touch.identifier;
          touchLookPrevRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }

      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchPinchDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      }
    };

    const onTouchMoveCanvas = (e: TouchEvent) => {
      if (isPausedRef.current) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchLookTouchIdRef.current) {
          const dx = touch.clientX - touchLookPrevRef.current.x;
          const dy = touch.clientY - touchLookPrevRef.current.y;
          touchLookPrevRef.current = { x: touch.clientX, y: touch.clientY };

          const sens = 0.0075;
          const xFactor = invertXRef.current ? -1 : 1;
          const yFactor = invertYRef.current ? -1 : 1;

          cameraYawRef.current -= dx * sens * xFactor;
          cameraPitchRef.current = THREE.MathUtils.clamp(
            cameraPitchRef.current + dy * sens * yFactor,
            -1.15,
            1.25
          );
        }
      }

      if (e.touches.length === 2 && touchPinchDistRef.current !== null) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const diff = touchPinchDistRef.current - newDist;
        targetCameraDistanceRef.current = THREE.MathUtils.clamp(
          targetCameraDistanceRef.current + diff * 0.03,
          4.0,
          18.0
        );
        touchPinchDistRef.current = newDist;
      }
    };

    const onTouchEndCanvas = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchLookTouchIdRef.current) {
          touchLookTouchIdRef.current = null;
        }
      }
      if (e.touches.length < 2) {
        touchPinchDistRef.current = null;
      }
    };

    // Gamepad connection events
    const onGamepadConnected = () => setGamepadConnected(true);
    const onGamepadDisconnected = () => setGamepadConnected(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStartCanvas, { passive: true });
    window.addEventListener('touchmove', onTouchMoveCanvas, { passive: true });
    window.addEventListener('touchend', onTouchEndCanvas, { passive: true });
    window.addEventListener('touchcancel', onTouchEndCanvas, { passive: true });
    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

    // Main Loop
    let animationFrameId: number;
    let walkAnimTime = 0;
    let lastTime = performance.now();
    let presenceThrottleTime = 0;

    const loop = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(loop);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      if (!isPausedRef.current) {
        // ==========================================
        // XBOX / GAMEPAD CONTROLLER SUPPORT
        // ==========================================
        let gpForward = 0;
        let gpRight = 0;
        const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
        const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

        if (gp) {
          // Left analog stick (movement)
          const deadzone = 0.18;
          const leftX = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
          const leftY = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;
          if (leftX !== 0 || leftY !== 0) {
            gpRight += leftX;
            gpForward += -leftY;
          }

          // D-pad movement fallback (buttons 12=Up, 13=Down, 14=Left, 15=Right)
          if (gp.buttons[12]?.pressed) gpForward += 1;
          if (gp.buttons[13]?.pressed) gpForward -= 1;
          if (gp.buttons[14]?.pressed) gpRight -= 1;
          if (gp.buttons[15]?.pressed) gpRight += 1;

          // Right analog stick (camera look around)
          const rightLookX = Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0;
          const rightLookY = Math.abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0;
          if (rightLookX !== 0 || rightLookY !== 0) {
            const lookSens = 2.4 * delta;
            const xFactor = invertXRef.current ? -1 : 1;
            const yFactor = invertYRef.current ? -1 : 1;
            cameraYawRef.current -= rightLookX * lookSens * xFactor;
            cameraPitchRef.current = THREE.MathUtils.clamp(
              cameraPitchRef.current + rightLookY * lookSens * yFactor,
              -1.15,
              1.25
            );
          }

          // Button A (index 0): Jump
          const aPressed = gp.buttons[0]?.pressed;
          if (aPressed && !gamepadPrevJumpRef.current) {
            triggerJump();
          }
          gamepadPrevJumpRef.current = !!aPressed;

          // Button Start / Menu (index 9) or Select (index 8): Toggle Pause
          const startPressed = gp.buttons[9]?.pressed || gp.buttons[8]?.pressed;
          if (startPressed && !gamepadPrevStartRef.current) {
            setIsPaused((p) => !p);
          }
          gamepadPrevStartRef.current = !!startPressed;
        }

        // 1. Unanchored Parts Physics
        currentPartMeshes.forEach((item) => {
          if (!item.part.anchored) {
            item.velY -= 32 * delta;
            item.currentY += item.velY * delta;
            const halfH = item.part.size[1] / 2;
            let floorY = halfH;

            currentPartsList.forEach((other) => {
              if (other.id !== item.part.id && other.canCollide !== false) {
                const minX1 = item.part.position[0] - item.part.size[0] / 2;
                const maxX1 = item.part.position[0] + item.part.size[0] / 2;
                const minZ1 = item.part.position[2] - item.part.size[2] / 2;
                const maxZ1 = item.part.position[2] + item.part.size[2] / 2;

                const minX2 = other.position[0] - other.size[0] / 2;
                const maxX2 = other.position[0] + other.size[0] / 2;
                const minZ2 = other.position[2] - other.size[2] / 2;
                const maxZ2 = other.position[2] + other.size[2] / 2;

                if (maxX1 > minX2 && minX1 < maxX2 && maxZ1 > minZ2 && minZ1 < maxZ2) {
                  const otherTop = other.position[1] + other.size[1] / 2;
                  if (item.currentY - halfH <= otherTop && item.currentY + halfH >= otherTop) {
                    floorY = Math.max(floorY, otherTop + halfH);
                  }
                }
              }
            });

            if (item.currentY <= floorY) {
              item.currentY = floorY;
              item.velY = 0;
            }
            item.mesh.position.y = item.currentY;
          }
        });

        // 2. Character Movement (Combined Keyboard, Mobile Touch Joystick, & Xbox Controller)
        const forwardX = -Math.sin(cameraYawRef.current);
        const forwardZ = -Math.cos(cameraYawRef.current);
        const rightX = Math.cos(cameraYawRef.current);
        const rightZ = -Math.sin(cameraYawRef.current);

        const keys = isChatInputFocusedRef.current ? {} : keysPressedRef.current;
        let inputForward = gpForward + -touchVectorRef.current.y;
        let inputRight = gpRight + touchVectorRef.current.x;

        if (keys['w'] || keys['arrowup']) inputForward += 1;
        if (keys['s'] || keys['arrowdown']) inputForward -= 1;
        if (keys['d'] || keys['arrowright']) inputRight += 1;
        if (keys['a'] || keys['arrowleft']) inputRight -= 1;

        const isMoving = Math.abs(inputForward) > 0.05 || Math.abs(inputRight) > 0.05;

        if (isMoving) {
          const len = Math.hypot(inputForward, inputRight);
          const normF = inputForward / len;
          const normR = inputRight / len;
          const moveDirX = normF * forwardX + normR * rightX;
          const moveDirZ = normF * forwardZ + normR * rightZ;

          const moveSpeed = 16;
          const targetX = playerPosRef.current.x + moveDirX * moveSpeed * delta;
          const targetZ = playerPosRef.current.z + moveDirZ * moveSpeed * delta;

          let canMoveX = true;
          let canMoveZ = true;
          const charRadius = 0.85;
          const charHeight = 5.0;

          currentPartsList.forEach((part) => {
            if (part.canCollide !== false) {
              const currentPartY = !part.anchored
                ? currentPartMeshes.find((m) => m.part.id === part.id)?.currentY || part.position[1]
                : part.position[1];

              const halfX = part.size[0] / 2;
              const halfY = part.size[1] / 2;
              const halfZ = part.size[2] / 2;
              const pX = part.position[0];
              const pZ = part.position[2];

              const minY = currentPartY - halfY;
              const maxY = currentPartY + halfY;

              if (playerPosRef.current.y + 0.4 < maxY && playerPosRef.current.y + charHeight > minY + 0.3) {
                if (
                  targetX + charRadius > pX - halfX &&
                  targetX - charRadius < pX + halfX &&
                  playerPosRef.current.z + charRadius > pZ - halfZ &&
                  playerPosRef.current.z - charRadius < pZ + halfZ
                ) {
                  canMoveX = false;
                }
                if (
                  playerPosRef.current.x + charRadius > pX - halfX &&
                  playerPosRef.current.x - charRadius < pX + halfX &&
                  targetZ + charRadius > pZ - halfZ &&
                  targetZ - charRadius < pZ + halfZ
                ) {
                  canMoveZ = false;
                }
              }
            }
          });

          if (canMoveX) playerPosRef.current.x = targetX;
          if (canMoveZ) playerPosRef.current.z = targetZ;

          playerHeadingRef.current = Math.atan2(moveDirX, moveDirZ);
        }

        // 3. Ground & Gravity
        let floorY = 0;
        const charRadius = 0.7;

        currentPartsList.forEach((part) => {
          if (part.canCollide !== false) {
            const currentPartY = !part.anchored
              ? currentPartMeshes.find((m) => m.part.id === part.id)?.currentY || part.position[1]
              : part.position[1];

            const halfX = part.size[0] / 2;
            const halfY = part.size[1] / 2;
            const halfZ = part.size[2] / 2;
            const pX = part.position[0];
            const pZ = part.position[2];
            const partTop = currentPartY + halfY;

            if (
              playerPosRef.current.x >= pX - halfX - charRadius &&
              playerPosRef.current.x <= pX + halfX + charRadius &&
              playerPosRef.current.z >= pZ - halfZ - charRadius &&
              playerPosRef.current.z <= pZ + halfZ + charRadius
            ) {
              if (playerPosRef.current.y >= partTop - 2.0) {
                floorY = Math.max(floorY, partTop);
              }
            }
          }
        });

        playerVelocityYRef.current -= 34 * delta;
        playerPosRef.current.y += playerVelocityYRef.current * delta;

        if (playerPosRef.current.y <= floorY + 0.2) {
          playerPosRef.current.y = floorY;
          playerVelocityYRef.current = 0;
          isGroundedRef.current = true;
        } else {
          isGroundedRef.current = false;
        }

        // Void Fall
        if (playerPosRef.current.y < -40 && !isDeadRef.current) {
          triggerPlayerDeath();
        }

        // Kill Brick Touch Detection
        if (!isDeadRef.current) {
          currentPartsList.forEach((part) => {
            const isKill =
              part.name.toLowerCase().includes('kill') ||
              part.name.toLowerCase().includes('lava') ||
              part.name.toLowerCase().includes('acid') ||
              ((part.color === '#ff0000' || part.color === '#ff2222' || part.color === '#dc2626' || part.color === '#ef4444') && part.material === 'Neon') ||
              (part.scripts && part.scripts.some((s) => s.code.toLowerCase().includes('health = 0') || s.code.toLowerCase().includes('takedamage')));

            if (isKill) {
              const dx = Math.abs(playerPosRef.current.x - part.position[0]);
              const dy = Math.abs(playerPosRef.current.y + 2.5 - part.position[1]);
              const dz = Math.abs(playerPosRef.current.z - part.position[2]);
              if (dx <= part.size[0] / 2 + 0.8 && dy <= part.size[1] / 2 + 2.5 && dz <= part.size[2] / 2 + 0.8) {
                triggerPlayerDeath();
              }
            }
          });
        }

        characterGroup.position.set(playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.z);
        characterGroup.rotation.y = playerHeadingRef.current;

        // Limb Animations
        const { leftArm, rightArm, leftLeg, rightLeg } = limbsRef.current;
        if (leftArm && rightArm && leftLeg && rightLeg) {
          if (!isGroundedRef.current) {
            if (playerVelocityYRef.current > 0) {
              leftArm.rotation.x = -Math.PI;
              rightArm.rotation.x = -Math.PI;
              leftLeg.rotation.x = 0.35;
              rightLeg.rotation.x = -0.35;
            } else {
              leftArm.rotation.x = 0;
              rightArm.rotation.x = 0;
              leftLeg.rotation.x = 0.1;
              rightLeg.rotation.x = -0.1;
            }
          } else if (isMoving) {
            walkAnimTime += delta * 12;
            const swing = Math.sin(walkAnimTime) * 0.75;
            leftArm.rotation.set(-swing, 0, 0);
            rightArm.rotation.set(swing, 0, 0);
            leftLeg.rotation.set(swing, 0, 0);
            rightLeg.rotation.set(-swing, 0, 0);
          } else {
            leftArm.rotation.set(0, 0, 0);
            rightArm.rotation.set(0, 0, 0);
            leftLeg.rotation.set(0, 0, 0);
            rightLeg.rotation.set(0, 0, 0);
          }

          // Footstep walking audio loop
          const isActuallyWalking = isMoving && isGroundedRef.current && !isDeadRef.current;
          gameAudio.setWalking(isActuallyWalking);
        }

        // Camera Follow
        currentCameraDistanceRef.current +=
          (targetCameraDistanceRef.current - currentCameraDistanceRef.current) * 0.15;
        const dist = currentCameraDistanceRef.current;
        const targetLookAt = new THREE.Vector3(
          playerPosRef.current.x,
          playerPosRef.current.y + 2.8,
          playerPosRef.current.z
        );

        const camX =
          playerPosRef.current.x +
          dist * Math.sin(cameraYawRef.current) * Math.cos(cameraPitchRef.current);
        const camY =
          playerPosRef.current.y + 2.8 + dist * Math.sin(cameraPitchRef.current);
        const camZ =
          playerPosRef.current.z +
          dist * Math.cos(cameraYawRef.current) * Math.cos(cameraPitchRef.current);

        camera.position.set(camX, Math.max(0.5, camY), camZ);
        camera.lookAt(targetLookAt);

        // Periodically broadcast local player movement to Firestore (every ~100ms when moving/jumping)
        presenceThrottleTime += delta;
        const currentIsJumping = !isGroundedRef.current;
        const movementStateChanged =
          isMoving !== lastBroadcastMovingRef.current || currentIsJumping !== lastBroadcastJumpingRef.current;

        if (
          (isMoving || currentIsJumping || movementStateChanged) &&
          (presenceThrottleTime > 0.1 || movementStateChanged)
        ) {
          presenceThrottleTime = 0;
          lastBroadcastMovingRef.current = isMoving;
          lastBroadcastJumpingRef.current = currentIsJumping;
          updateGamePresence(expId, effectiveUser.id, {
            position: [
              Math.round(playerPosRef.current.x * 10) / 10,
              Math.round(playerPosRef.current.y * 10) / 10,
              Math.round(playerPosRef.current.z * 10) / 10,
            ],
            rotationY: Math.round(playerHeadingRef.current * 100) / 100,
            isMoving,
            isJumping: currentIsJumping,
          });
        }
      }

      // ==========================================
      // 4. SYNC REMOTE PLAYERS (3D R6 Characters, Nametags & Overhead Chat Bubbles)
      // ==========================================
      const currentRemoteMap = remotePlayerMeshesRef.current;
      const activeRemotePlayers = remotePlayersRef.current;
      const activeIds = new Set(activeRemotePlayers.map((p) => p.userId));

      // Remove disconnected players
      currentRemoteMap.forEach((entry, uid) => {
        if (!activeIds.has(uid)) {
          entry.detachShirt();
          entry.detachPants();
          scene.remove(entry.group);
          currentRemoteMap.delete(uid);
          const ragdoll = remoteRagdollsRef.current.get(uid);
          if (ragdoll) {
            ragdoll.cleanup();
            remoteRagdollsRef.current.delete(uid);
          }
          remotePrevDeadRef.current.delete(uid);
        }
      });

      // Update or create remote player meshes
      activeRemotePlayers.forEach((rp) => {
        let entry = currentRemoteMap.get(rp.userId);

        if (!entry) {
          // Create new 3D character for remote player with identical R6 proportions and head!
          const rChar = createR6Character({
            colors: rp.avatarColors || {
              head: DEFAULT_GREY,
              torso: DEFAULT_GREY,
              leftArm: DEFAULT_GREY,
              rightArm: DEFAULT_GREY,
              leftLeg: DEFAULT_GREY,
              rightLeg: DEFAULT_GREY,
            },
            faceId: rp.selectedFaceId || 'classic-smile',
            hairId: rp.selectedHairId,
            hairColor: rp.hairColor,
            customHairObj: rp.customHairObj,
            accessoryId: rp.selectedAccessoryId,
            shirtUrl: rp.shirtDataUrl,
            pantsUrl: rp.pantsDataUrl,
            username: rp.username,
            showNametag: true,
          });

          rChar.characterGroup.position.set(rp.position[0], rp.position[1], rp.position[2]);
          rChar.characterGroup.rotation.y = rp.rotationY;
          scene.add(rChar.characterGroup);

          entry = {
            group: rChar.characterGroup,
            limbs: {
              leftArm: rChar.limbs.leftArm,
              rightArm: rChar.limbs.rightArm,
              leftLeg: rChar.limbs.leftLeg,
              rightLeg: rChar.limbs.rightLeg,
            },
            nametag: rChar.nametag!,
            walkAnimTimer: 0,
            detachShirt: rChar.detachShirt,
            detachPants: rChar.detachPants,
          };
          currentRemoteMap.set(rp.userId, entry);
        }

        // Handle remote player death shattering in real-time
        const wasDead = remotePrevDeadRef.current.get(rp.userId) || false;
        const isNowDead = !!rp.isDead;

        if (isNowDead) {
          entry.group.visible = false;
          if (!wasDead) {
            remotePrevDeadRef.current.set(rp.userId, true);
            let ragdoll = remoteRagdollsRef.current.get(rp.userId);
            if (!ragdoll) {
              ragdoll = new RagdollShatterManager();
              remoteRagdollsRef.current.set(rp.userId, ragdoll);
            }
            ragdoll.shatterCharacter(
              entry.group.position,
              scene,
              rp.avatarColors || {
                head: DEFAULT_GREY,
                torso: DEFAULT_GREY,
                leftArm: DEFAULT_GREY,
                rightArm: DEFAULT_GREY,
                leftLeg: DEFAULT_GREY,
                rightLeg: DEFAULT_GREY,
              },
              rp.selectedFaceId || 'classic-smile',
              () => {},
              rp.shirtDataUrl,
              rp.pantsDataUrl,
              rp.selectedHairId,
              rp.hairColor,
              rp.customHairObj,
              rp.selectedAccessoryId
            );
            gameAudio.playDeathSound();
          }
        } else {
          if (wasDead) {
            remotePrevDeadRef.current.set(rp.userId, false);
            const ragdoll = remoteRagdollsRef.current.get(rp.userId);
            if (ragdoll) {
              ragdoll.cleanup();
            }
          }
          entry.group.visible = true;
        }

        // Smooth Exponential Decay Interpolation (removes lag/jitter completely)
        const targetPos = new THREE.Vector3(rp.position[0], rp.position[1], rp.position[2]);
        const distToTarget = entry.group.position.distanceTo(targetPos);
        if (distToTarget > 25) {
          entry.group.position.copy(targetPos);
        } else {
          const lerpFactor = 1.0 - Math.exp(-14 * delta);
          entry.group.position.lerp(targetPos, lerpFactor);
        }

        // Shortest-arc smooth rotation interpolation
        let diffY = (rp.rotationY - entry.group.rotation.y) % (Math.PI * 2);
        if (diffY > Math.PI) diffY -= Math.PI * 2;
        if (diffY < -Math.PI) diffY += Math.PI * 2;
        entry.group.rotation.y += diffY * (1.0 - Math.exp(-16 * delta));

        // Animate limbs: smoothly blend jumping, walking, or idle
        const isActuallyMoving = rp.isMoving || distToTarget > 0.05;
        if (rp.isJumping) {
          entry.limbs.leftArm.rotation.x += (-Math.PI * 0.85 - entry.limbs.leftArm.rotation.x) * 0.2;
          entry.limbs.rightArm.rotation.x += (-Math.PI * 0.85 - entry.limbs.rightArm.rotation.x) * 0.2;
          entry.limbs.leftLeg.rotation.x += (0.3 - entry.limbs.leftLeg.rotation.x) * 0.2;
          entry.limbs.rightLeg.rotation.x += (-0.3 - entry.limbs.rightLeg.rotation.x) * 0.2;
        } else if (isActuallyMoving) {
          entry.walkAnimTimer += delta * 12;
          const swing = Math.sin(entry.walkAnimTimer) * 0.75;
          entry.limbs.leftArm.rotation.x = -swing;
          entry.limbs.rightArm.rotation.x = swing;
          entry.limbs.leftLeg.rotation.x = swing;
          entry.limbs.rightLeg.rotation.x = -swing;
        } else {
          entry.limbs.leftArm.rotation.x += (0 - entry.limbs.leftArm.rotation.x) * 0.25;
          entry.limbs.rightArm.rotation.x += (0 - entry.limbs.rightArm.rotation.x) * 0.25;
          entry.limbs.leftLeg.rotation.x += (0 - entry.limbs.leftLeg.rotation.x) * 0.25;
          entry.limbs.rightLeg.rotation.x += (0 - entry.limbs.rightLeg.rotation.x) * 0.25;
        }

        // Floating Chat Bubble for remote player when they send something in chat!
        const now = Date.now();
        if (rp.currentChat && now - (rp.currentChat.timestamp || 0) < 7000) {
          if (!entry.chatBubble || entry.lastChatTime !== rp.currentChat.timestamp) {
            if (entry.chatBubble) {
              entry.group.remove(entry.chatBubble);
            }
            const bubble = createChatBubbleSprite(rp.currentChat.message);
            entry.group.add(bubble);
            entry.chatBubble = bubble;
            entry.lastChatTime = rp.currentChat.timestamp;
          }
        } else if (entry.chatBubble) {
          entry.group.remove(entry.chatBubble);
          entry.chatBubble = null;
        }
      });

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(loop);

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      unsubExp();
      cancelAnimationFrame(animationFrameId);
      detachShirt();
      detachPants();
      remotePlayerMeshesRef.current.forEach((entry) => {
        entry.detachShirt();
        entry.detachPants();
        scene.remove(entry.group);
      });
      remotePlayerMeshesRef.current.clear();
      remoteRagdollsRef.current.forEach((r) => r.cleanup());
      remoteRagdollsRef.current.clear();
      gameAudio.stopWalking();

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [expId]);

  const allPlayersInGame = [
    {
      id: effectiveUser.id,
      username: effectiveUser.username,
      isSelf: true,
      avatarColors: effectiveUser.avatarColors,
      selectedFaceId: effectiveUser.selectedFaceId,
      shirtDataUrl: effectiveUser.shirtDataUrl,
      pantsDataUrl: effectiveUser.pantsDataUrl,
    },
    ...remotePlayers.map((rp) => ({
      id: rp.userId,
      username: rp.username,
      isSelf: false,
      avatarColors: rp.avatarColors,
      selectedFaceId: rp.selectedFaceId,
      shirtDataUrl: rp.shirtDataUrl,
      pantsDataUrl: rp.pantsDataUrl,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black select-none overflow-hidden font-sans">
      {/* 3D Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-default" />

      {/* Top Left: Pause / Leave Menu & Controls Info */}
      <div className="absolute top-3 left-4 flex items-center gap-2 sm:gap-3 pointer-events-auto z-10 flex-wrap">
        <button
          onClick={() => setIsPaused(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg transition-colors cursor-pointer group"
          title="Open Pause Menu (Esc)"
        >
          <img
            src={logoImg}
            alt="BoBlox"
            className="h-5 w-auto object-contain select-none group-hover:scale-105 transition-transform"
          />
          <span className="text-[11px] text-purple-300 font-mono hidden sm:inline">ESC / Menu</span>
        </button>

        <div className="px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm border border-white/10 text-[11px] text-white/80 font-medium hidden md:flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{experience?.name || 'Baseplate Sandbox'}</span>
        </div>

        {/* Controller / Mobile indicator */}
        {gamepadConnected && (
          <div className="px-2.5 py-1 rounded-md bg-purple-900/60 backdrop-blur-sm border border-purple-400/40 text-[11px] text-purple-200 font-medium flex items-center gap-1.5">
            <Gamepad className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Xbox Controller Active</span>
          </div>
        )}

        {/* Mobile touch toggle button */}
        <button
          onClick={() => setIsTouchDevice((p) => !p)}
          className={`px-2.5 py-1 rounded-md backdrop-blur-sm border text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            isTouchDevice
              ? 'bg-purple-600/70 border-purple-400 text-white'
              : 'bg-black/40 border-white/10 text-purple-300 hover:text-white'
          }`}
          title="Toggle Mobile Touch Joystick & Jump Controls"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isTouchDevice ? 'Touch: ON' : 'Touch: OFF'}</span>
        </button>
      </div>

      {/* Top Right: Leaderstats (Tab / Players List) Toggle */}
      <div className="absolute top-3 right-4 flex items-center gap-2 pointer-events-auto z-10">
        <button
          onClick={() => setLeaderstatsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-bold transition-all cursor-pointer shadow-lg ${
            leaderstatsOpen
              ? 'bg-purple-600 border-purple-400 text-white shadow-purple-600/40'
              : 'bg-black/60 hover:bg-black/80 border-white/20 text-purple-200 hover:text-white'
          }`}
          title="Toggle Leaderboard / Players Tab"
        >
          <Users className="w-4 h-4 text-purple-300" />
          <span>Players ({allPlayersInGame.length})</span>
        </button>
      </div>

      {/* ===================== LEADERSTATS PANEL (TOP RIGHT TAB) ===================== */}
      {leaderstatsOpen && (
        <div className="absolute top-14 right-4 z-20 w-72 bg-[#120c24]/95 backdrop-blur-md border border-purple-500/30 rounded-2xl shadow-2xl p-3 animate-fadeIn pointer-events-auto">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 mb-2">
            <span className="text-xs font-black tracking-wider text-purple-200 uppercase">
              LEADERBOARD • {allPlayersInGame.length} ONLINE
            </span>
            <button
              onClick={() => setLeaderstatsOpen(false)}
              className="p-1 rounded-lg text-purple-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {allPlayersInGame.map((p) => {
              const isFriend = currentUser?.friends?.includes(p.id);
              const hasSent = sentFriendReqUids.has(p.id);

              return (
                <div
                  key={p.id}
                  className="p-2 rounded-xl bg-[#1c1338]/80 hover:bg-[#25194a] border border-purple-500/15 flex items-center justify-between gap-2.5 transition-colors"
                >
                  <div
                    onClick={() => onOpenProfile?.(p.id)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                    title={`View ${p.username}'s profile`}
                  >
                    <AvatarProfileIcon
                      colors={p.avatarColors}
                      selectedFaceId={p.selectedFaceId}
                      shirtDataUrl={p.shirtDataUrl}
                      pantsDataUrl={p.pantsDataUrl}
                      size={28}
                      shape="circle"
                      border={false}
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {p.username} {p.isSelf && <span className="text-[10px] text-purple-400 font-normal">(You)</span>}
                      </p>
                    </div>
                  </div>

                  {!p.isSelf && (
                    <div>
                      {isFriend ? (
                        <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30">
                          Friends ✓
                        </span>
                      ) : hasSent ? (
                        <span className="text-[10px] text-purple-300 font-medium px-2 py-0.5 rounded-md bg-purple-900/40">
                          Sent ✓
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            if (currentUser) {
                              setSentFriendReqUids((prev) => new Set(prev).add(p.id));
                              await sendFriendRequest(currentUser, p.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                          title="Add Friend in game"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== IN-GAME CHAT BOX (BOTTOM LEFT) ===================== */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto max-w-sm w-full">
        {chatOpen ? (
          <div className="bg-black/65 backdrop-blur-md border border-purple-500/30 rounded-2xl shadow-2xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>In-Game Chat</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-[10px] text-purple-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10"
              >
                Minimize
              </button>
            </div>

            {/* Chat History */}
            <div
              ref={chatScrollRef}
              className="h-36 overflow-y-auto space-y-1 text-xs text-slate-100 pr-1 select-text scrollbar-thin scrollbar-thumb-purple-800"
            >
              {chatMessages.length === 0 ? (
                <div className="text-[11px] text-purple-300/50 py-4 text-center">
                  Chat with other players live in game!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="leading-snug break-words flex items-start gap-1">
                    <span className="font-extrabold text-purple-300 mr-1 shrink-0 inline-flex items-center gap-1">
                      <span>[{msg.senderUsername}]</span>
                      {isVerifiedUser(msg.senderUsername) && <VerifiedBadge username={msg.senderUsername} size="sm" />}
                      <span>:</span>
                    </span>
                    <span className="text-slate-100">{msg.message}</span>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onFocus={() => {
                  isChatInputFocusedRef.current = true;
                }}
                onBlur={() => {
                  isChatInputFocusedRef.current = false;
                }}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Type here to chat..."
                className="flex-1 h-8 px-3 rounded-lg bg-[#140e26] border border-purple-500/30 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-purple-500/30 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-purple-300" />
            <span>Chat ({chatMessages.length})</span>
          </button>
        )}
      </div>

      {/* ===================== BOTTOM RIGHT: IN-GAME FRIEND REQUEST NOTIFICATION ===================== */}
      {activeFriendToast && (
        <div className="absolute bottom-4 right-4 z-30 max-w-xs w-full bg-[#1b1236] border-2 border-purple-400 rounded-2xl shadow-2xl p-4 animate-slideUp pointer-events-auto">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
              <span className="font-black text-xs text-white">Friend Request!</span>
            </div>
            <button
              onClick={() => setActiveFriendToast(null)}
              className="text-purple-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-purple-200 mb-3">
            <strong className="text-white">{activeFriendToast.fromUsername}</strong> wants to be your friend!
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (currentUser) {
                  await acceptFriendRequest(currentUser.id, activeFriendToast.fromUid);
                  setActiveFriendToast(null);
                }
              }}
              className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
            <button
              onClick={async () => {
                if (currentUser) {
                  await declineFriendRequest(currentUser.id, activeFriendToast.fromUid);
                  setActiveFriendToast(null);
                }
              }}
              className="flex-1 py-1.5 rounded-lg bg-purple-950/60 hover:bg-red-900/40 text-purple-300 hover:text-red-200 border border-purple-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* ===================== MOBILE ON-SCREEN CONTROLS ===================== */}
      {isTouchDevice && !isPaused && (
        <>
          {/* Virtual Movement Joystick (Bottom Left) */}
          <div
            className="absolute bottom-6 left-6 z-30 pointer-events-auto touch-none select-none flex items-center justify-center"
            onTouchStart={(e) => {
              const touch = e.changedTouches[0];
              touchJoystickTouchIdRef.current = touch.identifier;
              setIsJoystickActive(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const rawDx = touch.clientX - centerX;
              const rawDy = touch.clientY - centerY;
              const maxDist = 44;
              const dist = Math.hypot(rawDx, rawDy);
              const clampedDist = Math.min(dist, maxDist);
              const angle = Math.atan2(rawDy, rawDx);
              const thumbX = Math.cos(angle) * clampedDist;
              const thumbY = Math.sin(angle) * clampedDist;
              setJoystickThumb({ x: thumbX, y: thumbY });
              touchVectorRef.current = { x: thumbX / maxDist, y: thumbY / maxDist };
            }}
            onTouchMove={(e) => {
              if (!isJoystickActive && touchJoystickTouchIdRef.current === null) return;
              for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === touchJoystickTouchIdRef.current) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const rawDx = touch.clientX - centerX;
                  const rawDy = touch.clientY - centerY;
                  const maxDist = 44;
                  const dist = Math.hypot(rawDx, rawDy);
                  const clampedDist = Math.min(dist, maxDist);
                  const angle = Math.atan2(rawDy, rawDx);
                  const thumbX = Math.cos(angle) * clampedDist;
                  const thumbY = Math.sin(angle) * clampedDist;
                  setJoystickThumb({ x: thumbX, y: thumbY });
                  touchVectorRef.current = { x: thumbX / maxDist, y: thumbY / maxDist };
                }
              }
            }}
            onTouchEnd={(e) => {
              for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchJoystickTouchIdRef.current) {
                  touchJoystickTouchIdRef.current = null;
                  setIsJoystickActive(false);
                  setJoystickThumb({ x: 0, y: 0 });
                  touchVectorRef.current = { x: 0, y: 0 };
                }
              }
            }}
            onTouchCancel={() => {
              touchJoystickTouchIdRef.current = null;
              setIsJoystickActive(false);
              setJoystickThumb({ x: 0, y: 0 });
              touchVectorRef.current = { x: 0, y: 0 };
            }}
          >
            {/* Outer Joystick Base */}
            <div className="w-28 h-28 rounded-full bg-black/45 backdrop-blur-md border-2 border-purple-400/40 shadow-2xl flex items-center justify-center relative">
              <div className="absolute w-full h-[1px] bg-purple-500/20" />
              <div className="absolute h-full w-[1px] bg-purple-500/20" />
              
              {/* Joystick Knob */}
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-700 to-purple-500 border-2 border-white/80 shadow-lg shadow-purple-500/50 flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`,
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white/60" />
              </div>
            </div>
          </div>

          {/* Virtual Jump Button (Bottom Right) */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerJump();
            }}
            onClick={(e) => {
              e.preventDefault();
              triggerJump();
            }}
            className="absolute bottom-8 right-8 z-30 w-20 h-20 rounded-full bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 active:scale-95 border-2 border-white/80 shadow-2xl shadow-purple-600/60 flex flex-col items-center justify-center text-white pointer-events-auto cursor-pointer touch-none select-none transition-transform"
            title="Jump"
          >
            <ArrowUp className="w-7 h-7 stroke-[3] text-white animate-pulse" />
            <span className="text-[10px] font-black tracking-wider uppercase drop-shadow">JUMP</span>
          </button>
        </>
      )}

      {/* ===================== ROBLOX PAUSE / ESCAPE MENU ===================== */}
      {isPaused && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#18122c] border border-purple-500/30 rounded-2xl shadow-2xl p-6 relative flex flex-col space-y-5 text-center">
            <div className="flex flex-col items-center justify-center space-y-2">
              <img
                src={logoImg}
                alt="BoBlox"
                className="h-10 w-auto object-contain select-none"
              />
              <p className="text-xs text-purple-300/70">{experience?.name || 'Baseplate Sandbox'}</p>
            </div>

            <div className="space-y-3 pt-1">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-600/40 transition-all cursor-pointer"
              >
                Resume Game
              </button>

              <div className="p-3 bg-[#130d24] rounded-xl border border-purple-500/20 text-xs text-left space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-purple-200">
                  <Settings2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Camera Controls Preference</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-purple-300/80">Invert Horizontal (X)</span>
                  <button
                    onClick={() => setInvertX((p) => !p)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      invertX
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {invertX ? 'Inverted' : 'Standard'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-300/80">Invert Vertical (Y)</span>
                  <button
                    onClick={() => setInvertY((p) => !p)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      invertY
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {invertY ? 'Inverted' : 'Standard'}
                  </button>
                </div>
              </div>

              <button
                onClick={handleResetCharacter}
                className="w-full py-2.5 rounded-xl bg-[#261d44] hover:bg-[#322659] border border-purple-500/20 text-purple-200 hover:text-white font-semibold text-xs tracking-wide transition-colors cursor-pointer"
              >
                Reset Character (Respawn)
              </button>

              <button
                onClick={() => {
                  setIsPaused(false);
                  onLeaveGame();
                }}
                className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-200 hover:text-red-100 font-semibold text-xs tracking-wide transition-colors cursor-pointer"
              >
                Leave Game
              </button>
            </div>

            <p className="text-[11px] text-purple-400/50 pt-1 border-t border-purple-500/15">
              Press <strong>ESC</strong> anytime to toggle this menu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
