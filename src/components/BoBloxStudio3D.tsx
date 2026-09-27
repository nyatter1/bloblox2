import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Boxes,
  Play,
  Square,
  Save,
  LogOut,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Layers,
  Settings,
  Move,
  Maximize2,
  RotateCw,
  MousePointer,
  Upload,
  X,
  Anchor,
  Shield,
  Image as ImageIcon,
  Sparkles,
  Compass,
  GripHorizontal,
  PanelLeft,
  PanelBottom,
  PanelRight,
  ExternalLink,
  Undo2,
  Redo2,
  ClipboardPaste,
  Check,
  FileCode,
  Folder,
  Terminal,
  Activity,
  Zap,
  Globe
} from 'lucide-react';
import {
  ExperienceData,
  StudioPart,
  StudioScript,
  PartShape,
  PartMaterial,
  PartFaceName,
  TextureMappingMode,
  TextureProperties
} from '../types/experience';
import { AvatarColors } from './AvatarViewer';
import { createFaceMesh } from '../utils/faceTexture';
import { attachShirtToLimbs } from '../utils/shirtTexture';
import { attachPantsToLimbs } from '../utils/pantsTexture';
import { createHairMesh, createHairMeshAsync } from '../utils/hairMesh';
import { createAccessoryMesh } from '../utils/accessoryMesh';
import { applyTextureProperties, PRESET_TEXTURES } from '../utils/textureMapping';
import { LuaScriptRunner, ScriptLogMessage } from '../utils/luaScriptEngine';
import { RagdollShatterManager } from '../utils/ragdollShatter';
import { gameAudio } from '../utils/gameAudio';
import StudioScriptEditor from './StudioScriptEditor';

interface BoBloxStudio3DProps {
  experience: ExperienceData;
  onSaveExperience: (updatedExp: ExperienceData, andPublish?: boolean) => void;
  onSaveAndExit: (updatedExp: ExperienceData) => void;
  onCloseWithoutSaving: () => void;
  avatarColors: AvatarColors;
  selectedFaceId: string;
  shirtDataUrl: string | null;
  pantsDataUrl: string | null;
  selectedHairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  selectedAccessoryId?: string;
}

type StudioToolMode = 'select' | 'move' | 'scale' | 'rotate';
type DockPosition = 'right' | 'left' | 'bottom' | 'floating';
type SelectedExplorerItemType = 'part' | 'baseplate' | 'script' | 'serverscriptservice' | 'workspace' | null;

interface GizmoHandleUserData {
  type: 'gizmo';
  tool: 'move' | 'scale' | 'rotate';
  axis: 'x' | 'y' | 'z';
  dir?: 1 | -1;
}

export default function BoBloxStudio3D({
  experience,
  onSaveExperience,
  onSaveAndExit,
  onCloseWithoutSaving,
  avatarColors,
  selectedFaceId,
  shirtDataUrl,
  pantsDataUrl,
  selectedHairId = 'none',
  hairColor = '#4a2e1b',
  customHairObj = null,
  selectedAccessoryId = 'none',
}: BoBloxStudio3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Experience Data State
  const [expName, setExpName] = useState(experience.name);
  const [parts, setParts] = useState<StudioPart[]>(experience.parts || []);
  const partsRef = useRef<StudioPart[]>(experience.parts || []);
  partsRef.current = parts;

  // Baseplate setting (can be deleted / toggled)
  const [baseplateEnabled, setBaseplateEnabled] = useState<boolean>(experience.baseplateEnabled !== false);
  const baseplateEnabledRef = useRef<boolean>(experience.baseplateEnabled !== false);
  baseplateEnabledRef.current = baseplateEnabled;

  const [baseplateColor, setBaseplateColor] = useState<string>(experience.baseplateColor || '#4b5563');

  // ServerScriptService & Global Scripts
  const [serverScripts, setServerScripts] = useState<StudioScript[]>(experience.scripts || []);
  const serverScriptsRef = useRef<StudioScript[]>(experience.scripts || []);
  serverScriptsRef.current = serverScripts;

  // Selection state in Explorer and 3D scene
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const selectedPartIdRef = useRef<string | null>(null);
  selectedPartIdRef.current = selectedPartId;
  const selectedPart = parts.find((p) => p.id === selectedPartId) || null;

  const [selectedItemType, setSelectedItemType] = useState<SelectedExplorerItemType>('workspace');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  // Expanded folders in Explorer tree
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({
    workspace: true,
    serverscriptservice: true,
  });

  // Script Editor Modal State
  const [editingScript, setEditingScript] = useState<StudioScript | null>(null);
  const [editingScriptParentName, setEditingScriptParentName] = useState<string>('Workspace');
  const [scriptLogs, setScriptLogs] = useState<ScriptLogMessage[]>([]);

  // Studio Mode: Edit vs Playtest
  const [isPlaytesting, setIsPlaytesting] = useState(false);
  const isPlaytestingRef = useRef(false);
  isPlaytestingRef.current = isPlaytesting;

  // Tool Mode (1: Select, 2: Move, 3: Scale, 4: Rotate)
  const [toolMode, setToolMode] = useState<StudioToolMode>('select');
  const toolModeRef = useRef<StudioToolMode>(toolMode);
  toolModeRef.current = toolMode;

  // UI Panels & Modals
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [insertPartMenuOpen, setInsertPartMenuOpen] = useState(false);
  const [textureModalPartId, setTextureModalPartId] = useState<string | null>(null);
  const [textureFaceTarget, setTextureFaceTarget] = useState<PartFaceName>('all');
  const [textureUploadError, setTextureUploadError] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Player Health & Death Shatter State during Playtest
  const [playerHealth, setPlayerHealth] = useState<number>(100);
  const [playerWalkSpeed, setPlayerWalkSpeed] = useState<number>(16);
  const [playerJumpPower, setPlayerJumpPower] = useState<number>(50);
  const [isDead, setIsDead] = useState<boolean>(false);
  const [deathCountdown, setDeathCountdown] = useState<number>(3);
  const deathTimerIntervalRef = useRef<any>(null);

  // Lua Runner & Ragdoll Managers
  const luaRunnerRef = useRef<LuaScriptRunner>(new LuaScriptRunner());
  const ragdollManagerRef = useRef<RagdollShatterManager>(new RagdollShatterManager());

  // Properties Panel Docking & Resizing State
  const [propertiesDock, setPropertiesDock] = useState<DockPosition>('right');
  const [floatingRect, setFloatingRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 40,
    y: 80,
    width: 320,
    height: 480,
  });
  const [bottomDockHeight, setBottomDockHeight] = useState<number>(240);
  const [sideDockWidth, setSideDockWidth] = useState<number>(320);
  const [isDraggingPropertiesHeader, setIsDraggingPropertiesHeader] = useState(false);
  const [dragDropTarget, setDragDropTarget] = useState<'left' | 'bottom' | 'right' | null>(null);
  const [resizingSide, setResizingSide] = useState<'bottom-top' | 'side-left' | 'side-right' | 'float-br' | null>(null);
  const dragHeaderStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Right-click context menu in Explorer
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    partId?: string;
    scriptId?: string;
  } | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const partMeshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const baseplateMeshRef = useRef<THREE.Mesh | null>(null);
  const textureLoaderRef = useRef<THREE.TextureLoader>(new THREE.TextureLoader());

  // Gizmo & Selection Visuals
  const selectionOutlineGroupRef = useRef<THREE.Group | null>(null);
  const gizmoRootGroupRef = useRef<THREE.Group | null>(null);
  const moveGizmoGroupRef = useRef<THREE.Group | null>(null);
  const scaleGizmoGroupRef = useRef<THREE.Group | null>(null);
  const rotateGizmoGroupRef = useRef<THREE.Group | null>(null);

  // Toolbox drawer state
  const [showToolbox, setShowToolbox] = useState<boolean>(true);

  // Snapping settings
  const [gridSnapMove, setGridSnapMove] = useState<number>(1);
  const gridSnapMoveRef = useRef<number>(1);
  gridSnapMoveRef.current = gridSnapMove;

  const [gridSnapRotate, setGridSnapRotate] = useState<number>(15);
  const gridSnapRotateRef = useRef<number>(15);
  gridSnapRotateRef.current = gridSnapRotate;

  // Real-time transformation feedback tooltip
  const [gizmoTooltip, setGizmoTooltip] = useState<string | null>(null);

  // Drag plane for gizmo raycasting
  const dragPlaneRef = useRef<THREE.Plane | null>(null);
  const dragPlaneStartIntersectionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const hoveredGizmoMeshRef = useRef<THREE.Mesh | null>(null);

  // Gizmo Dragging State
  const isDraggingGizmoRef = useRef(false);
  const activeGizmoHandleRef = useRef<GizmoHandleUserData | null>(null);
  const gizmoDragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    partPos: [number, number, number];
    partSize: [number, number, number];
    partRot: [number, number, number];
  } | null>(null);

  // Studio Free-Flight Camera controls
  const studioCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 14, 26));
  const studioCamPitchRef = useRef<number>(-0.45);
  const studioCamYawRef = useRef<number>(0);
  const isRightClickDownRef = useRef(false);
  const isLeftClickDownRef = useRef(false);
  const rightClickStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rightClickMovedRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Playtest Camera & Character Physics
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const playerVelocityYRef = useRef<number>(0);
  const isGroundedRef = useRef(true);
  const playerCharacterGroupRef = useRef<THREE.Group | null>(null);
  const playtestCamYawRef = useRef<number>(0);
  const playtestCamPitchRef = useRef<number>(0.35);
  const playtestCamDistRef = useRef<number>(10);

  // Unanchored parts dynamic simulation during playtest
  const unanchoredPhysicsRef = useRef<Map<string, { velY: number; currentY: number }>>(new Map());

  // Clipboard & Undo/Redo Stacks
  const clipboardPartRef = useRef<StudioPart | null>(null);
  const historyStackRef = useRef<StudioPart[][]>([]);
  const redoStackRef = useRef<StudioPart[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const showToast = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => {
      setStatusNotification((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const pushUndoSnapshot = useCallback((overrideParts?: StudioPart[]) => {
    const current = JSON.parse(JSON.stringify(overrideParts || partsRef.current));
    historyStackRef.current.push(current);
    if (historyStackRef.current.length > 40) historyStackRef.current.shift();
    redoStackRef.current = [];
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleUndo = useCallback(() => {
    if (historyStackRef.current.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    const previous = historyStackRef.current.pop()!;
    redoStackRef.current.push(JSON.parse(JSON.stringify(partsRef.current)));
    partsRef.current = previous;
    setParts(previous);
    updateUndoRedoState();
    showToast('Undo (Ctrl+Z)');
  }, [updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) {
      showToast('Nothing to redo');
      return;
    }
    const next = redoStackRef.current.pop()!;
    historyStackRef.current.push(JSON.parse(JSON.stringify(partsRef.current)));
    partsRef.current = next;
    setParts(next);
    updateUndoRedoState();
    showToast('Redo (Ctrl+Y)');
  }, [updateUndoRedoState]);

  // -------------------------------------------------------------
  // SCRIPT MANAGEMENT
  // -------------------------------------------------------------
  const handleAddScriptToPart = (partId: string) => {
    pushUndoSnapshot();
    const newScript: StudioScript = {
      id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'Script',
      parentId: partId,
      code: `-- Script inside Part
local part = script.Parent

local function onTouch(hit)
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        humanoid.Health = 0 -- Kill brick
    end
end

part.Touched:Connect(onTouch)`,
      enabled: true,
      createdAt: Date.now(),
    };

    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        return {
          ...p,
          scripts: [...(p.scripts || []), newScript],
        };
      })
    );

    setExpandedFolders((prev) => ({ ...prev, [partId]: true }));
    showToast(`Added Script to ${parts.find((p) => p.id === partId)?.name || 'Part'}`);
  };

  const handleAddServerScript = () => {
    const newScript: StudioScript = {
      id: `script-srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'ServerScript',
      parentId: 'serverscriptservice',
      code: `-- ServerScriptService Script
print("ServerScriptService initialized!")

while true do
    task.wait(5)
    print("Server heartbeat active")
end`,
      enabled: true,
      createdAt: Date.now(),
    };

    setServerScripts((prev) => [...prev, newScript]);
    setExpandedFolders((prev) => ({ ...prev, serverscriptservice: true }));
    showToast('Added Script to ServerScriptService');
  };

  const handleOpenScriptEditor = (script: StudioScript, parentName: string) => {
    setEditingScript(script);
    setEditingScriptParentName(parentName);
  };

  const handleSaveEditedScript = (updatedScript: StudioScript) => {
    if (updatedScript.parentId === 'serverscriptservice') {
      setServerScripts((prev) =>
        prev.map((s) => (s.id === updatedScript.id ? updatedScript : s))
      );
    } else {
      setParts((prev) =>
        prev.map((p) => {
          if (p.id !== updatedScript.parentId) return p;
          return {
            ...p,
            scripts: (p.scripts || []).map((s) =>
              s.id === updatedScript.id ? updatedScript : s
            ),
          };
        })
      );
    }
    setEditingScript(updatedScript);
    showToast(`Saved ${updatedScript.name}`);
  };

  const handleDeleteScript = (scriptId: string, parentId: string) => {
    if (parentId === 'serverscriptservice') {
      setServerScripts((prev) => prev.filter((s) => s.id !== scriptId));
    } else {
      setParts((prev) =>
        prev.map((p) => {
          if (p.id !== parentId) return p;
          return {
            ...p,
            scripts: (p.scripts || []).filter((s) => s.id !== scriptId),
          };
        })
      );
    }
    showToast('Deleted Script');
  };

  // -------------------------------------------------------------
  // CHARACTER DEATH & SHATTER RAGDOLL ENGINE
  // -------------------------------------------------------------
  const triggerPlayerDeath = useCallback(() => {
    if (!isPlaytestingRef.current || isDead) return;
    setIsDead(true);
    setDeathCountdown(3);

    // Play classic Roblox OOF / Death audio
    gameAudio.playDeathSound();

    // Hide intact player group and trigger physics shattering of all 6 limbs!
    if (playerCharacterGroupRef.current && sceneRef.current) {
      playerCharacterGroupRef.current.visible = false;
      ragdollManagerRef.current.shatterCharacter(
        playerPosRef.current,
        sceneRef.current,
        avatarColors,
        selectedFaceId,
        () => {
          // Respawn callback after 3 seconds
          respawnPlayer();
        },
        shirtDataUrl,
        pantsDataUrl,
        selectedHairId,
        hairColor,
        customHairObj,
        selectedAccessoryId
      );
    }

    // Countdown interval
    let remaining = 3;
    if (deathTimerIntervalRef.current) clearInterval(deathTimerIntervalRef.current);
    deathTimerIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setDeathCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(deathTimerIntervalRef.current);
      }
    }, 1000);
  }, [isDead, avatarColors, selectedFaceId]);

  const respawnPlayer = useCallback(() => {
    setIsDead(false);
    setPlayerHealth(100);
    setPlayerWalkSpeed(16);
    setPlayerJumpPower(50);

    const spawnPart = partsRef.current.find((p) => p.name.toLowerCase().includes('spawn')) || partsRef.current[0];
    if (spawnPart) {
      playerPosRef.current.set(spawnPart.position[0], spawnPart.position[1] + spawnPart.size[1] / 2 + 0.1, spawnPart.position[2]);
    } else {
      playerPosRef.current.set(0, 0.1, 0);
    }
    playerVelocityYRef.current = 0;
    isGroundedRef.current = true;

    if (playerCharacterGroupRef.current) {
      playerCharacterGroupRef.current.visible = true;
      playerCharacterGroupRef.current.position.copy(playerPosRef.current);
    }
    showToast('Respawned');
  }, []);

  // -------------------------------------------------------------
  // PLAYTEST START / STOP HANDLER
  // -------------------------------------------------------------
  const handleTogglePlaytest = useCallback(() => {
    setIsPlaytesting((prev) => {
      const next = !prev;
      isPlaytestingRef.current = next;

      if (next) {
        // Collect all scripts (parts + server)
        const allScripts: StudioScript[] = [...serverScriptsRef.current];
        partsRef.current.forEach((p) => {
          if (p.scripts) allScripts.push(...p.scripts);
        });

        // Initialize spawn point
        const spawnPart = partsRef.current.find((p) => p.name.toLowerCase().includes('spawn')) || partsRef.current[0];
        if (spawnPart) {
          playerPosRef.current.set(spawnPart.position[0], spawnPart.position[1] + spawnPart.size[1] / 2 + 0.1, spawnPart.position[2]);
        } else {
          playerPosRef.current.set(0, 0.1, 0);
        }

        playerVelocityYRef.current = 0;
        isGroundedRef.current = true;
        setIsDead(false);
        setPlayerHealth(100);
        setPlayerWalkSpeed(16);
        setPlayerJumpPower(50);
        setScriptLogs([]);

        // Start Lua Engine
        const humanoidProxy = {
          get Health() {
            return playerHealth;
          },
          set Health(val: number) {
            setPlayerHealth(val);
            if (val <= 0) triggerPlayerDeath();
          },
          get MaxHealth() {
            return 100;
          },
          get WalkSpeed() {
            return playerWalkSpeed;
          },
          set WalkSpeed(val: number) {
            setPlayerWalkSpeed(val);
          },
          get JumpPower() {
            return playerJumpPower;
          },
          set JumpPower(val: number) {
            setPlayerJumpPower(val);
          },
          Position: playerPosRef.current,
          TakeDamage: (dmg: number) => {
            const next = Math.max(0, playerHealth - dmg);
            setPlayerHealth(next);
            if (next <= 0) triggerPlayerDeath();
          },
          Die: () => triggerPlayerDeath(),
        };

        luaRunnerRef.current.start(
          allScripts,
          partsRef.current,
          partMeshesMapRef.current,
          humanoidProxy,
          (log) => setScriptLogs((prev) => [...prev.slice(-100), log]),
          () => triggerPlayerDeath(),
          (partId, updated) => {
            setParts((prev) =>
              prev.map((p) => (p.id === partId ? { ...p, ...updated } : p))
            );
          }
        );

        setStatusNotification('Playtest Started (WASD to walk, Space to jump, Click & Drag to orbit camera, F5 to exit)');
      } else {
        luaRunnerRef.current.stop();
        ragdollManagerRef.current.cleanup();
        setIsDead(false);
        if (playerCharacterGroupRef.current) playerCharacterGroupRef.current.visible = false;
        setStatusNotification('Playtest Stopped - Returned to Edit Mode');
      }

      return next;
    });
  }, [playerHealth, playerWalkSpeed, playerJumpPower, triggerPlayerDeath]);

  // -------------------------------------------------------------
  // PART MANAGEMENT
  // -------------------------------------------------------------
  const handleAddPart = (shape: PartShape) => {
    pushUndoSnapshot();
    const id = `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newPart: StudioPart = {
      id,
      name: `Part`,
      shape,
      position: [
        Math.round((studioCamPosRef.current.x + Math.sin(studioCamYawRef.current) * 8) * 2) / 2,
        Math.max(1, Math.round(studioCamPosRef.current.y * 2) / 2),
        Math.round((studioCamPosRef.current.z - Math.cos(studioCamYawRef.current) * 8) * 2) / 2,
      ],
      size: shape === 'wedge' ? [4, 2, 4] : [4, 1.2, 2],
      rotation: [0, 0, 0],
      color: '#94a3b8',
      material: 'SmoothPlastic',
      transparency: 0,
      reflectance: 0,
      anchored: true,
      canCollide: true,
    };

    setParts((prev) => [...prev, newPart]);
    setSelectedPartId(id);
    setSelectedItemType('part');
    setToolMode('move');
    setInsertPartMenuOpen(false);
    showToast(`Added ${shape} Part (Move Tool active)`);
  };

  const handleDeletePart = (partId: string) => {
    pushUndoSnapshot();
    setParts((prev) => prev.filter((p) => p.id !== partId));
    if (selectedPartId === partId) {
      setSelectedPartId(null);
      setSelectedItemType('workspace');
    }
    showToast('Deleted Part');
  };

  const handleDuplicatePart = (partId: string) => {
    const target = parts.find((p) => p.id === partId);
    if (!target) return;
    pushUndoSnapshot();
    const id = `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const dup: StudioPart = {
      ...JSON.parse(JSON.stringify(target)),
      id,
      name: `${target.name} (Copy)`,
      position: [target.position[0] + 2, target.position[1], target.position[2] + 2],
    };
    setParts((prev) => [...prev, dup]);
    setSelectedPartId(id);
    setSelectedItemType('part');
    showToast(`Duplicated "${target.name}"`);
  };

  const handleCutPart = (partId: string) => {
    const target = parts.find((p) => p.id === partId);
    if (!target) return;
    clipboardPartRef.current = JSON.parse(JSON.stringify(target));
    handleDeletePart(partId);
    showToast(`Cut "${target.name}"`);
  };

  const handleCopyPart = (partId: string) => {
    const target = parts.find((p) => p.id === partId);
    if (!target) return;
    clipboardPartRef.current = JSON.parse(JSON.stringify(target));
    showToast(`Copied "${target.name}" to clipboard`);
  };

  const handlePastePart = () => {
    if (!clipboardPartRef.current) {
      showToast('Clipboard is empty');
      return;
    }
    pushUndoSnapshot();
    const source = clipboardPartRef.current;
    const id = `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const pasted: StudioPart = {
      ...JSON.parse(JSON.stringify(source)),
      id,
      name: `${source.name} (Pasted)`,
      position: [source.position[0] + 2, source.position[1], source.position[2] + 2],
    };
    setParts((prev) => [...prev, pasted]);
    setSelectedPartId(id);
    setSelectedItemType('part');
    showToast(`Pasted "${source.name}"`);
  };

  const handleZoomToPart = (partId: string) => {
    const target = parts.find((p) => p.id === partId);
    if (!target) return;
    studioCamPosRef.current.set(target.position[0], target.position[1] + 6, target.position[2] + 12);
    studioCamPitchRef.current = -0.3;
    studioCamYawRef.current = 0;
    showToast(`Focused on "${target.name}"`);
  };

  const handleInsertToolboxItem = (itemKey: 'killbrick' | 'speedpad' | 'jumppad' | 'spawn' | 'lavapit' | 'truss') => {
    pushUndoSnapshot();
    const id = `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const spawnX = Math.round(studioCamPosRef.current.x + Math.sin(studioCamYawRef.current) * 8);
    const spawnZ = Math.round(studioCamPosRef.current.z - Math.cos(studioCamYawRef.current) * 8);

    if (itemKey === 'killbrick') {
      const killScript: StudioScript = {
        id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: 'KillScript',
        parentId: id,
        code: `-- Kill Brick Script
local part = script.Parent

local function onTouch(hit)
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        humanoid.Health = 0
    end
end

part.Touched:Connect(onTouch)`,
        enabled: true,
        createdAt: Date.now(),
      };

      const newPart: StudioPart = {
        id,
        name: 'Kill Brick',
        shape: 'block',
        position: [spawnX, 0.5, spawnZ],
        size: [6, 1, 6],
        rotation: [0, 0, 0],
        color: '#ef4444',
        material: 'Neon',
        transparency: 0,
        reflectance: 0.3,
        anchored: true,
        canCollide: true,
        scripts: [killScript],
      };

      setParts((prev) => [...prev, newPart]);
      setSelectedPartId(id);
      setSelectedItemType('part');
      setToolMode('move');
      showToast('Inserted Kill Brick with working Lua Script!');
    } else if (itemKey === 'speedpad') {
      const speedScript: StudioScript = {
        id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: 'SpeedScript',
        parentId: id,
        code: `-- Speed Boost Pad Script
local part = script.Parent

local function onTouch(hit)
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        humanoid.WalkSpeed = 48
        task.wait(4)
        humanoid.WalkSpeed = 16
    end
end

part.Touched:Connect(onTouch)`,
        enabled: true,
        createdAt: Date.now(),
      };

      const newPart: StudioPart = {
        id,
        name: 'Speed Pad',
        shape: 'block',
        position: [spawnX, 0.25, spawnZ],
        size: [6, 0.5, 6],
        rotation: [0, 0, 0],
        color: '#06b6d4',
        material: 'Neon',
        transparency: 0,
        reflectance: 0.4,
        anchored: true,
        canCollide: true,
        scripts: [speedScript],
      };

      setParts((prev) => [...prev, newPart]);
      setSelectedPartId(id);
      setSelectedItemType('part');
      setToolMode('move');
      showToast('Inserted Speed Pad with Lua Script!');
    } else if (itemKey === 'jumppad') {
      const jumpScript: StudioScript = {
        id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: 'JumpScript',
        parentId: id,
        code: `-- Super Jump Pad Script
local part = script.Parent

local function onTouch(hit)
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        humanoid.JumpPower = 110
        task.wait(3)
        humanoid.JumpPower = 50
    end
end

part.Touched:Connect(onTouch)`,
        enabled: true,
        createdAt: Date.now(),
      };

      const newPart: StudioPart = {
        id,
        name: 'Jump Pad',
        shape: 'block',
        position: [spawnX, 0.25, spawnZ],
        size: [6, 0.5, 6],
        rotation: [0, 0, 0],
        color: '#22c55e',
        material: 'Neon',
        transparency: 0,
        reflectance: 0.4,
        anchored: true,
        canCollide: true,
        scripts: [jumpScript],
      };

      setParts((prev) => [...prev, newPart]);
      setSelectedPartId(id);
      setSelectedItemType('part');
      setToolMode('move');
      showToast('Inserted Super Jump Pad with Lua Script!');
    } else if (itemKey === 'spawn') {
      const newPart: StudioPart = {
        id,
        name: 'SpawnLocation',
        shape: 'cylinder',
        position: [spawnX, 0.25, spawnZ],
        size: [6, 0.5, 6],
        rotation: [0, 0, 0],
        color: '#64748b',
        material: 'SmoothPlastic',
        transparency: 0,
        reflectance: 0.2,
        anchored: true,
        canCollide: true,
      };

      setParts((prev) => [...prev, newPart]);
      setSelectedPartId(id);
      setSelectedItemType('part');
      setToolMode('move');
      showToast('Inserted SpawnLocation!');
    } else if (itemKey === 'lavapit') {
      const lavaScript: StudioScript = {
        id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: 'LavaDamage',
        parentId: id,
        code: `-- Lava Damage Script
local part = script.Parent

local function onTouch(hit)
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        humanoid:TakeDamage(100)
    end
end

part.Touched:Connect(onTouch)`,
        enabled: true,
        createdAt: Date.now(),
      };

      const newPart: StudioPart = {
        id,
        name: 'Lava Block',
        shape: 'block',
        position: [spawnX, 0.25, spawnZ],
        size: [10, 0.5, 10],
        rotation: [0, 0, 0],
        color: '#ea580c',
        material: 'Neon',
        transparency: 0.1,
        reflectance: 0.5,
        anchored: true,
        canCollide: true,
        scripts: [lavaScript],
      };

      setParts((prev) => [...prev, newPart]);
      setSelectedPartId(id);
      setSelectedItemType('part');
      setToolMode('move');
      showToast('Inserted Lava Block with Lua script!');
    } else if (itemKey === 'truss') {
      const newPart: StudioPart = {
        id,
        name: 'Truss',
        shape: 'block',
        position: [spawnX, 4, spawnZ],
        size: [2, 8, 2],
        rotation: [0, 0, 0],
        color: '#94a3b8',
        material: 'Metal',
        transparency: 0,
        reflectance: 0.3,
        anchored: true,
        canCollide: true,
      };

      setParts((prev) => [...prev, newPart]);
      setSelectedPartId(id);
      setSelectedItemType('part');
      setToolMode('move');
      showToast('Inserted Truss Ladder!');
    }
  };

  const handleUpdateSelectedPart = (updates: Partial<StudioPart>) => {
    if (!selectedPartId) return;
    setParts((prev) =>
      prev.map((p) => (p.id === selectedPartId ? { ...p, ...updates } : p))
    );
  };

  // Save Handlers
  const handleSave = () => {
    const updatedExp: ExperienceData = {
      ...experience,
      name: expName.trim() || experience.name,
      parts,
      scripts: serverScripts,
      baseplateEnabled,
      baseplateColor,
      lastUpdated: Date.now(),
    };
    onSaveExperience(updatedExp, false);
    showToast('Saved experience to local storage!');
    setFileMenuOpen(false);
  };

  const handleSaveAndPublish = () => {
    const updatedExp: ExperienceData = {
      ...experience,
      name: expName.trim() || experience.name,
      parts,
      scripts: serverScripts,
      baseplateEnabled,
      baseplateColor,
      published: true,
      lastUpdated: Date.now(),
    };
    onSaveExperience(updatedExp, true);
    showToast('Published experience to BoBlox Discover!');
    setFileMenuOpen(false);
  };

  // -------------------------------------------------------------
  // THREE.JS SETUP & ENGINE
  // -------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8cb6e8);
    scene.fog = new THREE.FogExp2(0x8cb6e8, 0.005);
    sceneRef.current = scene;
    partMeshesMapRef.current.clear();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.copy(studioCamPosRef.current);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ea, 2.0);
    sunLight.position.set(50, 100, 30);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // 5. Classic Baseplate
    const baseplateGeo = new THREE.BoxGeometry(512, 1, 512);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = baseplateColor;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 128, 128);
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(64, 64, 8, 0, Math.PI * 2);
    ctx.fill();

    const gridTexture = new THREE.CanvasTexture(canvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(128, 128);

    const baseplateMat = new THREE.MeshStandardMaterial({
      map: gridTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const baseplate = new THREE.Mesh(baseplateGeo, baseplateMat);
    baseplate.position.set(0, -0.5, 0);
    baseplate.receiveShadow = true;
    baseplate.userData = { isBaseplate: true };
    baseplateMeshRef.current = baseplate;

    if (baseplateEnabledRef.current) {
      scene.add(baseplate);
    }

    // 6. Selection Outline Group
    const outlineGroup = new THREE.Group();
    outlineGroup.visible = false;
    scene.add(outlineGroup);
    selectionOutlineGroupRef.current = outlineGroup;

    // 7. Gizmo Root Group
    const gizmoRoot = new THREE.Group();
    gizmoRoot.visible = false;
    scene.add(gizmoRoot);
    gizmoRootGroupRef.current = gizmoRoot;

    // A. Move Gizmo (3 Axis Arrows with interactive userData)
    const moveGizmo = new THREE.Group();
    gizmoRoot.add(moveGizmo);
    moveGizmoGroupRef.current = moveGizmo;

    const makeMoveAxis = (axis: 'x' | 'y' | 'z', hex: number) => {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({
        color: hex,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.95,
      });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 12), mat);
      shaft.position.y = 1.1;
      shaft.userData = { type: 'gizmo', tool: 'move', axis, baseColor: hex };

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 16), mat);
      cone.position.y = 2.4;
      cone.userData = { type: 'gizmo', tool: 'move', axis, baseColor: hex };

      g.add(shaft, cone);
      if (axis === 'x') g.rotation.z = -Math.PI / 2;
      if (axis === 'z') g.rotation.x = Math.PI / 2;
      return g;
    };
    moveGizmo.add(makeMoveAxis('x', 0xef4444));
    moveGizmo.add(makeMoveAxis('y', 0x22c55e));
    moveGizmo.add(makeMoveAxis('z', 0x3b82f6));

    // B. Rotate Gizmo (3 Rotation Rings for X, Y, Z with interactive userData)
    const rotateGizmo = new THREE.Group();
    gizmoRoot.add(rotateGizmo);
    rotateGizmoGroupRef.current = rotateGizmo;

    const makeRotateRing = (axis: 'x' | 'y' | 'z', hex: number) => {
      const mat = new THREE.MeshBasicMaterial({
        color: hex,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.92,
      });
      const ringGeo = new THREE.TorusGeometry(2.4, 0.08, 12, 48);
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.userData = { type: 'gizmo', tool: 'rotate', axis, baseColor: hex };
      if (axis === 'x') ring.rotation.y = Math.PI / 2;
      if (axis === 'y') ring.rotation.x = Math.PI / 2;
      return ring;
    };
    rotateGizmo.add(makeRotateRing('x', 0xef4444));
    rotateGizmo.add(makeRotateRing('y', 0x22c55e));
    rotateGizmo.add(makeRotateRing('z', 0x3b82f6));

    // C. Scale Gizmo (6 Face Box Handles with interactive userData)
    const scaleGizmo = new THREE.Group();
    gizmoRoot.add(scaleGizmo);
    scaleGizmoGroupRef.current = scaleGizmo;

    const makeScaleHandle = (axis: 'x' | 'y' | 'z', dir: 1 | -1, hex: number) => {
      const mat = new THREE.MeshBasicMaterial({
        color: hex,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.95,
      });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), mat);
      box.userData = { type: 'gizmo', tool: 'scale', axis, dir, baseColor: hex };
      return box;
    };
    scaleGizmo.add(makeScaleHandle('x', 1, 0xef4444));
    scaleGizmo.add(makeScaleHandle('x', -1, 0xef4444));
    scaleGizmo.add(makeScaleHandle('y', 1, 0x22c55e));
    scaleGizmo.add(makeScaleHandle('y', -1, 0x22c55e));
    scaleGizmo.add(makeScaleHandle('z', 1, 0x3b82f6));
    scaleGizmo.add(makeScaleHandle('z', -1, 0x3b82f6));

    // 8. Player Character Group (Playtest Avatar)
    const playerGroup = new THREE.Group();
    playerGroup.visible = false;
    scene.add(playerGroup);
    playerCharacterGroupRef.current = playerGroup;

    const makeMat = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex || '#d4d4d4'),
        roughness: 0.45,
        metalness: 0.08,
      });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), makeMat(avatarColors.torso));
    torso.position.y = 3;
    playerGroup.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.y = 4.7;
    const headMat = makeMat(avatarColors.head);
    const headCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.625, 0.625, 0.95, 36), headMat);
    headGroup.add(headCyl);

    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.625, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2), headMat);
    topCap.scale.set(1, 0.35, 1);
    topCap.position.y = 0.475;
    headGroup.add(topCap);

    const botCap = new THREE.Mesh(new THREE.SphereGeometry(0.625, 36, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), headMat);
    botCap.scale.set(1, 0.35, 1);
    botCap.position.y = -0.475;
    headGroup.add(botCap);

    const faceMesh = createFaceMesh(selectedFaceId);
    headGroup.add(faceMesh);

    // Synchronous & Asynchronous 3D Hair
    if (selectedHairId && selectedHairId !== 'none') {
      const syncHair = createHairMesh(selectedHairId, hairColor || '#4a2e1b', customHairObj);
      if (syncHair) {
        headGroup.add(syncHair);
      } else {
        createHairMeshAsync(selectedHairId, hairColor || '#4a2e1b', customHairObj)
          .then((asyncHair) => {
            if (asyncHair) headGroup.add(asyncHair);
          })
          .catch(() => {});
      }
    }

    // Accessory
    if (selectedAccessoryId && selectedAccessoryId !== 'none') {
      const accMesh = createAccessoryMesh(selectedAccessoryId);
      if (accMesh) headGroup.add(accMesh);
    }

    playerGroup.add(headGroup);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(1.5, 4, 0);
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), makeMat(avatarColors.leftArm));
    leftArm.position.y = -1;
    leftArmGroup.add(leftArm);
    playerGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-1.5, 4, 0);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), makeMat(avatarColors.rightArm));
    rightArm.position.y = -1;
    rightArmGroup.add(rightArm);
    playerGroup.add(rightArmGroup);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(0.5, 2, 0);
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), makeMat(avatarColors.leftLeg));
    leftLeg.position.y = -1;
    leftLegGroup.add(leftLeg);
    playerGroup.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(-0.5, 2, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), makeMat(avatarColors.rightLeg));
    rightLeg.position.y = -1;
    rightLegGroup.add(rightLeg);
    playerGroup.add(rightLegGroup);

    attachShirtToLimbs(torso, leftArmGroup, rightArmGroup, shirtDataUrl);
    attachPantsToLimbs(torso, leftLegGroup, rightLegGroup, pantsDataUrl);

    // Keyboard & Mouse Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
      keysPressedRef.current[e.key.toLowerCase()] = true;

      if (e.code === 'F5') {
        e.preventDefault();
        handleTogglePlaytest();
        return;
      }

      if (!isPlaytestingRef.current) {
        if (e.key === '1') setToolMode('select');
        if (e.key === '2') setToolMode('move');
        if (e.key === '3') setToolMode('scale');
        if (e.key === '4') setToolMode('rotate');
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          handleUndo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleSave();
        }
        if (e.key === 'Delete' && selectedPartIdRef.current) {
          handleDeletePart(selectedPartIdRef.current);
        }
      } else {
        if (e.code === 'Space' && isGroundedRef.current) {
          playerVelocityYRef.current = 15.5;
          isGroundedRef.current = false;
          gameAudio.playJumpSound();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightClickDownRef.current = true;
        rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
        rightClickMovedRef.current = false;
      }
      if (e.button === 0) isLeftClickDownRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      // Raycast click part selection or gizmo handle drag in Edit mode
      if (!isPlaytestingRef.current && e.button === 0 && camera) {
        setContextMenu(null);
        const rect = container.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

        // 1. Raycast against active Gizmo Handles first
        if (selectedPartIdRef.current && gizmoRootGroupRef.current && gizmoRootGroupRef.current.visible) {
          const gizmoMeshes: THREE.Mesh[] = [];
          const activeGizmo =
            toolModeRef.current === 'move' ? moveGizmoGroupRef.current :
            toolModeRef.current === 'rotate' ? rotateGizmoGroupRef.current :
            toolModeRef.current === 'scale' ? scaleGizmoGroupRef.current : null;

          if (activeGizmo && activeGizmo.visible) {
            activeGizmo.traverse((child) => {
              if (child instanceof THREE.Mesh && child.userData && child.userData.type === 'gizmo') {
                gizmoMeshes.push(child);
              }
            });
          }

          const gizmoHits = raycaster.intersectObjects(gizmoMeshes, false);
          if (gizmoHits.length > 0) {
            const hitObj = gizmoHits[0].object as THREE.Mesh;
            const uData = hitObj.userData as GizmoHandleUserData;
            const curPart = partsRef.current.find((p) => p.id === selectedPartIdRef.current);
            if (curPart) {
              isDraggingGizmoRef.current = true;
              activeGizmoHandleRef.current = uData;
              gizmoDragStartRef.current = {
                mouseX: e.clientX,
                mouseY: e.clientY,
                partPos: [...curPart.position],
                partSize: [...curPart.size],
                partRot: [...curPart.rotation],
              };

              // Drag plane perpendicular to camera facing
              const camDir = new THREE.Vector3();
              camera.getWorldDirection(camDir);
              dragPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(
                camDir.negate(),
                new THREE.Vector3(...curPart.position)
              );

              const intersection = new THREE.Vector3();
              raycaster.ray.intersectPlane(dragPlaneRef.current, intersection);
              dragPlaneStartIntersectionRef.current.copy(intersection);
              return;
            }
          }
        }

        // 2. Raycast to select part in scene
        const meshes = Array.from(partMeshesMapRef.current.values());
        const hits = raycaster.intersectObjects(meshes, true);
        if (hits.length > 0) {
          let hitMesh = hits[0].object as THREE.Mesh;
          for (const [id, m] of partMeshesMapRef.current.entries()) {
            if (m === hitMesh || m.children.includes(hitMesh)) {
              setSelectedPartId(id);
              setSelectedItemType('part');
              return;
            }
          }
        }
      }
    };

    const handleMouseUp = () => {
      isRightClickDownRef.current = false;
      isLeftClickDownRef.current = false;

      if (isDraggingGizmoRef.current) {
        isDraggingGizmoRef.current = false;
        activeGizmoHandleRef.current = null;
        gizmoDragStartRef.current = null;
        setGizmoTooltip(null);
        setParts([...partsRef.current]);
        pushUndoSnapshot(partsRef.current);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (isPlaytestingRef.current) {
        if (isRightClickDownRef.current || isLeftClickDownRef.current) {
          playtestCamYawRef.current -= dx * 0.005;
          playtestCamPitchRef.current = THREE.MathUtils.clamp(
            playtestCamPitchRef.current + dy * 0.005,
            -1.1,
            1.25
          );
        }
      } else {
        // Edit Mode Gizmo Dragging
        if (isDraggingGizmoRef.current && activeGizmoHandleRef.current && gizmoDragStartRef.current && camera) {
          const rect = container.getBoundingClientRect();
          const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

          const currentIntersection = new THREE.Vector3();
          if (dragPlaneRef.current && raycaster.ray.intersectPlane(dragPlaneRef.current, currentIntersection)) {
            const planeDelta = currentIntersection.clone().sub(dragPlaneStartIntersectionRef.current);
            const handle = activeGizmoHandleRef.current;
            const start = gizmoDragStartRef.current;
            const snapMove = gridSnapMoveRef.current;
            const snapRot = gridSnapRotateRef.current;
            const pId = selectedPartIdRef.current;

            if (handle.tool === 'move' && pId) {
              const axis = handle.axis;
              let axisDelta = axis === 'x' ? planeDelta.x : axis === 'y' ? planeDelta.y : planeDelta.z;
              if (snapMove > 0) {
                axisDelta = Math.round(axisDelta / snapMove) * snapMove;
              }
              const newPos: [number, number, number] = [
                axis === 'x' ? start.partPos[0] + axisDelta : start.partPos[0],
                axis === 'y' ? Math.max(0.5, start.partPos[1] + axisDelta) : start.partPos[1],
                axis === 'z' ? start.partPos[2] + axisDelta : start.partPos[2],
              ];

              partsRef.current = partsRef.current.map((p) => (p.id === pId ? { ...p, position: newPos } : p));
              const mesh = partMeshesMapRef.current.get(pId);
              if (mesh) mesh.position.set(newPos[0], newPos[1], newPos[2]);
              if (gizmoRootGroupRef.current) gizmoRootGroupRef.current.position.set(newPos[0], newPos[1], newPos[2]);
              setGizmoTooltip(`Move ${axis.toUpperCase()}: ${axisDelta >= 0 ? '+' : ''}${axisDelta.toFixed(1)} studs [${newPos[0].toFixed(1)}, ${newPos[1].toFixed(1)}, ${newPos[2].toFixed(1)}]`);
            } else if (handle.tool === 'rotate' && pId) {
              const axis = handle.axis;
              const screenDx = e.clientX - start.mouseX;
              const screenDy = e.clientY - start.mouseY;
              let angleDeg = (axis === 'y' ? screenDx : -screenDy) * 0.75;
              if (snapRot > 0) {
                angleDeg = Math.round(angleDeg / snapRot) * snapRot;
              }
              const newRot: [number, number, number] = [
                axis === 'x' ? Math.round((start.partRot[0] + angleDeg) % 360) : start.partRot[0],
                axis === 'y' ? Math.round((start.partRot[1] + angleDeg) % 360) : start.partRot[1],
                axis === 'z' ? Math.round((start.partRot[2] + angleDeg) % 360) : start.partRot[2],
              ];

              partsRef.current = partsRef.current.map((p) => (p.id === pId ? { ...p, rotation: newRot } : p));
              const mesh = partMeshesMapRef.current.get(pId);
              if (mesh) {
                mesh.rotation.set(
                  THREE.MathUtils.degToRad(newRot[0]),
                  THREE.MathUtils.degToRad(newRot[1]),
                  THREE.MathUtils.degToRad(newRot[2])
                );
              }
              setGizmoTooltip(`Rotate ${axis.toUpperCase()}: ${angleDeg >= 0 ? '+' : ''}${Math.round(angleDeg)}°`);
            } else if (handle.tool === 'scale' && pId) {
              const axis = handle.axis;
              const dir = handle.dir || 1;
              let axisDelta = (axis === 'x' ? planeDelta.x : axis === 'y' ? planeDelta.y : planeDelta.z) * dir;
              if (snapMove > 0) {
                axisDelta = Math.round(axisDelta / snapMove) * snapMove;
              }
              const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
              const newDim = Math.max(0.5, start.partSize[axisIdx] + axisDelta);
              const actualDelta = newDim - start.partSize[axisIdx];

              const newSize: [number, number, number] = [...start.partSize];
              newSize[axisIdx] = Math.round(newDim * 2) / 2;

              const newPos: [number, number, number] = [...start.partPos];
              newPos[axisIdx] = Math.round((start.partPos[axisIdx] + (actualDelta / 2) * dir) * 2) / 2;

              partsRef.current = partsRef.current.map((p) => (p.id === pId ? { ...p, size: newSize, position: newPos } : p));
              const mesh = partMeshesMapRef.current.get(pId);
              if (mesh) {
                mesh.position.set(newPos[0], newPos[1], newPos[2]);
                mesh.scale.set(
                  newSize[0] / start.partSize[0],
                  newSize[1] / start.partSize[1],
                  newSize[2] / start.partSize[2]
                );
              }
              if (gizmoRootGroupRef.current) gizmoRootGroupRef.current.position.set(newPos[0], newPos[1], newPos[2]);
              setGizmoTooltip(`Size ${axis.toUpperCase()}: ${newSize[0].toFixed(1)} × ${newSize[1].toFixed(1)} × ${newSize[2].toFixed(1)} studs`);
            }
          }
          return;
        }

        // Camera flight with right click
        if (isRightClickDownRef.current) {
          const totalMoved = Math.hypot(
            e.clientX - rightClickStartPosRef.current.x,
            e.clientY - rightClickStartPosRef.current.y
          );
          if (totalMoved > 5) {
            rightClickMovedRef.current = true;
          }
          studioCamYawRef.current -= dx * 0.003;
          studioCamPitchRef.current = THREE.MathUtils.clamp(
            studioCamPitchRef.current - dy * 0.003,
            -Math.PI / 2.1,
            Math.PI / 2.1
          );
        } else if (camera) {
          // Hover highlighting on gizmo handles
          const rect = container.getBoundingClientRect();
          const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

          const gizmoMeshes: THREE.Mesh[] = [];
          const activeGizmo =
            toolModeRef.current === 'move' ? moveGizmoGroupRef.current :
            toolModeRef.current === 'rotate' ? rotateGizmoGroupRef.current :
            toolModeRef.current === 'scale' ? scaleGizmoGroupRef.current : null;

          if (activeGizmo && activeGizmo.visible) {
            activeGizmo.traverse((child) => {
              if (child instanceof THREE.Mesh && child.userData && child.userData.type === 'gizmo') {
                gizmoMeshes.push(child);
              }
            });
          }

          const hits = raycaster.intersectObjects(gizmoMeshes, false);
          if (hits.length > 0) {
            const hitMesh = hits[0].object as THREE.Mesh;
            if (hoveredGizmoMeshRef.current && hoveredGizmoMeshRef.current !== hitMesh) {
              const prev = hoveredGizmoMeshRef.current;
              if (prev.material && !Array.isArray(prev.material)) {
                (prev.material as THREE.MeshBasicMaterial).color.set(prev.userData.baseColor || 0xffffff);
              }
            }
            hoveredGizmoMeshRef.current = hitMesh;
            if (hitMesh.material && !Array.isArray(hitMesh.material)) {
              (hitMesh.material as THREE.MeshBasicMaterial).color.set(0xfacc15); // highlight yellow
            }
          } else if (hoveredGizmoMeshRef.current) {
            const prev = hoveredGizmoMeshRef.current;
            if (prev.material && !Array.isArray(prev.material)) {
              (prev.material as THREE.MeshBasicMaterial).color.set(prev.userData.baseColor || 0xffffff);
            }
            hoveredGizmoMeshRef.current = null;
          }
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't show context menu during playtesting or if user dragged to rotate the camera
      if (isPlaytestingRef.current || rightClickMovedRef.current) {
        return;
      }

      if (camera) {
        const rect = container.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        const meshes = Array.from(partMeshesMapRef.current.values());
        const hits = raycaster.intersectObjects(meshes, true);
        if (hits.length > 0) {
          let hitMesh = hits[0].object as THREE.Mesh;
          for (const [id, m] of partMeshesMapRef.current.entries()) {
            if (m === hitMesh || m.children.includes(hitMesh)) {
              setSelectedPartId(id);
              setSelectedItemType('part');
              break;
            }
          }
        }
      }

      setContextMenu({
        x: Math.min(window.innerWidth - 220, e.clientX),
        y: Math.min(window.innerHeight - 340, e.clientY),
        partId: selectedPartIdRef.current || undefined,
      });
    };

    const handleWindowContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleWheel = (e: WheelEvent) => {
      if (isPlaytestingRef.current) {
        playtestCamDistRef.current = THREE.MathUtils.clamp(
          playtestCamDistRef.current + e.deltaY * 0.015,
          4,
          24
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('contextmenu', handleWindowContextMenu);

    // Main Engine Animation Loop
    let animId = 0;
    let walkAnimTimer = 0;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      // Baseplate visibility sync
      if (baseplateMeshRef.current) {
        baseplateMeshRef.current.visible = baseplateEnabledRef.current;
      }

      if (!isPlaytestingRef.current) {
        // Edit Mode Camera
        if (playerGroup) playerGroup.visible = false;
        const forward = new THREE.Vector3(
          -Math.sin(studioCamYawRef.current) * Math.cos(studioCamPitchRef.current),
          Math.sin(studioCamPitchRef.current),
          -Math.cos(studioCamYawRef.current) * Math.cos(studioCamPitchRef.current)
        ).normalize();
        const right = new THREE.Vector3(
          Math.cos(studioCamYawRef.current),
          0,
          -Math.sin(studioCamYawRef.current)
        ).normalize();

        const moveSpeed = keysPressedRef.current['ShiftLeft'] ? 40 : 20;
        if (keysPressedRef.current['KeyW']) studioCamPosRef.current.addScaledVector(forward, moveSpeed * delta);
        if (keysPressedRef.current['KeyS']) studioCamPosRef.current.addScaledVector(forward, -moveSpeed * delta);
        if (keysPressedRef.current['KeyA']) studioCamPosRef.current.addScaledVector(right, -moveSpeed * delta);
        if (keysPressedRef.current['KeyD']) studioCamPosRef.current.addScaledVector(right, moveSpeed * delta);
        if (keysPressedRef.current['KeyE'] || keysPressedRef.current['Space']) studioCamPosRef.current.y += moveSpeed * delta;
        if (keysPressedRef.current['KeyQ']) studioCamPosRef.current.y -= moveSpeed * delta;

        camera.position.copy(studioCamPosRef.current);
        camera.lookAt(studioCamPosRef.current.clone().add(forward));

        // Gizmo & Outline
        const curSel = partsRef.current.find((p) => p.id === selectedPartIdRef.current);
        if (curSel && outlineGroup && gizmoRoot) {
          const mesh = partMeshesMapRef.current.get(curSel.id);
          if (mesh) {
            outlineGroup.position.copy(mesh.position);
            outlineGroup.rotation.copy(mesh.rotation);
            outlineGroup.visible = true;

            gizmoRoot.position.set(curSel.position[0], curSel.position[1], curSel.position[2]);
            gizmoRoot.visible = toolModeRef.current !== 'select';
            const dist = camera.position.distanceTo(gizmoRoot.position);
            const sf = Math.max(0.65, dist * 0.085);
            if (moveGizmoGroupRef.current) {
              moveGizmoGroupRef.current.visible = toolModeRef.current === 'move';
              moveGizmoGroupRef.current.scale.set(sf, sf, sf);
            }
            if (rotateGizmoGroupRef.current) {
              rotateGizmoGroupRef.current.visible = toolModeRef.current === 'rotate';
              rotateGizmoGroupRef.current.scale.set(sf, sf, sf);
            }
            if (scaleGizmoGroupRef.current) {
              scaleGizmoGroupRef.current.visible = toolModeRef.current === 'scale';
              scaleGizmoGroupRef.current.scale.set(sf, sf, sf);
              const halfX = (curSel.size[0] / 2) / sf;
              const halfY = (curSel.size[1] / 2) / sf;
              const halfZ = (curSel.size[2] / 2) / sf;
              const handles = scaleGizmoGroupRef.current.children as THREE.Mesh[];
              if (handles.length >= 6) {
                handles[0].position.set(halfX, 0, 0);
                handles[1].position.set(-halfX, 0, 0);
                handles[2].position.set(0, halfY, 0);
                handles[3].position.set(0, -halfY, 0);
                handles[4].position.set(0, 0, halfZ);
                handles[5].position.set(0, 0, -halfZ);
              }
            }
          }
        } else {
          if (outlineGroup) outlineGroup.visible = false;
          if (gizmoRoot) gizmoRoot.visible = false;
        }
      } else {
        // Playtest Mode Physics
        if (playerGroup) playerGroup.visible = !isDead;
        if (outlineGroup) outlineGroup.visible = false;
        if (gizmoRoot) gizmoRoot.visible = false;

        const curParts = partsRef.current;

        // Player Movement
        const yaw = playtestCamYawRef.current;
        let inF = 0;
        let inR = 0;
        const keys = keysPressedRef.current;
        if (keys['w'] || keys['keyw']) inF += 1;
        if (keys['s'] || keys['keys']) inF -= 1;
        if (keys['d'] || keys['keyd']) inR += 1;
        if (keys['a'] || keys['keya']) inR -= 1;

        const isMoving = inF !== 0 || inR !== 0;
        if (isMoving && !isDead) {
          const len = Math.hypot(inF, inR);
          const fX = -Math.sin(yaw);
          const fZ = -Math.cos(yaw);
          const rX = Math.cos(yaw);
          const rZ = -Math.sin(yaw);
          const dirX = (inF / len) * fX + (inR / len) * rX;
          const dirZ = (inF / len) * fZ + (inR / len) * rZ;

          playerPosRef.current.x += dirX * playerWalkSpeed * delta;
          playerPosRef.current.z += dirZ * playerWalkSpeed * delta;
          playerGroup.rotation.y = Math.atan2(dirX, dirZ);
          walkAnimTimer += delta * 14;
        }

        // Gravity & Void Detection
        playerVelocityYRef.current -= 34 * delta;
        playerPosRef.current.y += playerVelocityYRef.current * delta;

        let floorY = baseplateEnabledRef.current ? 0 : -999;
        curParts.forEach((part) => {
          if (part.canCollide !== false) {
            const hx = part.size[0] / 2 + 0.7;
            const hz = part.size[2] / 2 + 0.7;
            if (
              playerPosRef.current.x >= part.position[0] - hx &&
              playerPosRef.current.x <= part.position[0] + hx &&
              playerPosRef.current.z >= part.position[2] - hz &&
              playerPosRef.current.z <= part.position[2] + hz
            ) {
              const partTop = part.position[1] + part.size[1] / 2;
              if (playerPosRef.current.y >= partTop - 2.0) {
                floorY = Math.max(floorY, partTop);
              }
            }
          }
        });

        if (playerPosRef.current.y <= floorY + 0.2) {
          playerPosRef.current.y = floorY;
          playerVelocityYRef.current = 0;
          isGroundedRef.current = true;
        } else {
          isGroundedRef.current = false;
        }

        // Footstep walking audio loop
        const isActuallyWalking = isMoving && isGroundedRef.current && !isDead;
        gameAudio.setWalking(isActuallyWalking);

        // Void Fall Kill Brick
        if (playerPosRef.current.y < -40 && !isDead) {
          triggerPlayerDeath();
        }

        // Touched events check with Lua Runner & Hazard detection
        if (!isDead) {
          curParts.forEach((p) => {
            const dx = Math.abs(playerPosRef.current.x - p.position[0]);
            const dy = Math.abs(playerPosRef.current.y + 2.5 - p.position[1]);
            const dz = Math.abs(playerPosRef.current.z - p.position[2]);
            if (dx <= p.size[0] / 2 + 0.8 && dy <= p.size[1] / 2 + 2.5 && dz <= p.size[2] / 2 + 0.8) {
              // Direct killbrick detection
              const isKill =
                p.name.toLowerCase().includes('kill') ||
                p.name.toLowerCase().includes('lava') ||
                p.name.toLowerCase().includes('acid') ||
                ((p.color === '#ef4444' || p.color === '#ff0000' || p.color === '#dc2626') && p.material === 'Neon') ||
                (p.scripts && p.scripts.some((s) => s.code.toLowerCase().includes('health = 0') || s.code.toLowerCase().includes('takedamage')));

              if (isKill) {
                triggerPlayerDeath();
                return;
              }

              // Speed pad
              if (p.name.toLowerCase().includes('speed') && p.material === 'Neon') {
                setPlayerWalkSpeed(48);
                setTimeout(() => setPlayerWalkSpeed(16), 4000);
              }

              // Jump pad
              if (p.name.toLowerCase().includes('jump') && p.material === 'Neon') {
                playerVelocityYRef.current = 28;
                isGroundedRef.current = false;
              }

              // Also trigger Lua script
              const humanoidProxy = {
                Name: 'Humanoid',
                ClassName: 'Humanoid',
                get Health() {
                  return playerHealth;
                },
                set Health(val: number) {
                  const hp = Number(val);
                  setPlayerHealth(hp);
                  if (hp <= 0) triggerPlayerDeath();
                },
                TakeDamage: (dmg: number) => {
                  setPlayerHealth((h) => {
                    const next = Math.max(0, h - dmg);
                    if (next <= 0) triggerPlayerDeath();
                    return next;
                  });
                },
                takeDamage: (dmg: number) => {
                  setPlayerHealth((h) => {
                    const next = Math.max(0, h - dmg);
                    if (next <= 0) triggerPlayerDeath();
                    return next;
                  });
                },
                get WalkSpeed() {
                  return playerWalkSpeed;
                },
                set WalkSpeed(val: number) {
                  setPlayerWalkSpeed(val);
                },
                get JumpPower() {
                  return playerJumpPower;
                },
                set JumpPower(val: number) {
                  setPlayerJumpPower(val);
                },
              };

              luaRunnerRef.current.triggerTouched(p.id, {
                Name: 'HumanoidRootPart',
                ClassName: 'Part',
                Parent: {
                  Name: 'Player',
                  ClassName: 'Model',
                  Humanoid: humanoidProxy,
                  humanoid: humanoidProxy,
                  FindFirstChild: (n: string) => (n.toLowerCase() === 'humanoid' ? humanoidProxy : null),
                  findFirstChild: (n: string) => (n.toLowerCase() === 'humanoid' ? humanoidProxy : null),
                },
              });
            }
          });
        }

        playerGroup.position.copy(playerPosRef.current);

        // Arm / Leg walk swings
        if (isMoving && isGroundedRef.current) {
          const swing = Math.sin(walkAnimTimer) * 0.75;
          leftArmGroup.rotation.x = -swing;
          rightArmGroup.rotation.x = swing;
          leftLegGroup.rotation.x = swing;
          rightLegGroup.rotation.x = -swing;
        } else {
          leftArmGroup.rotation.x = 0;
          rightArmGroup.rotation.x = 0;
          leftLegGroup.rotation.x = 0;
          rightLegGroup.rotation.x = 0;
        }

        // Follow Camera
        const pCamDist = playtestCamDistRef.current;
        const camX = playerPosRef.current.x + Math.sin(playtestCamYawRef.current) * Math.cos(playtestCamPitchRef.current) * pCamDist;
        const camY = playerPosRef.current.y + 2.5 + Math.sin(playtestCamPitchRef.current) * pCamDist;
        const camZ = playerPosRef.current.z + Math.cos(playtestCamYawRef.current) * Math.cos(playtestCamPitchRef.current) * pCamDist;
        camera.position.set(camX, camY, camZ);
        camera.lookAt(playerPosRef.current.x, playerPosRef.current.y + 2.5, playerPosRef.current.z);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('contextmenu', handleWindowContextMenu);
      luaRunnerRef.current.stop();
      ragdollManagerRef.current.cleanup();
      partMeshesMapRef.current.clear();
      gameAudio.stopWalking();
    };
  }, [baseplateColor, avatarColors, selectedFaceId, shirtDataUrl, pantsDataUrl, handleTogglePlaytest, handleUndo, handleRedo, triggerPlayerDeath, playerWalkSpeed, playerHealth]);

  // Sync parts into 3D meshes map
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentMap = partMeshesMapRef.current;
    const activePartIds = new Set(parts.map((p) => p.id));

    // Remove deleted meshes
    for (const [id, mesh] of currentMap.entries()) {
      if (!activePartIds.has(id)) {
        scene.remove(mesh);
        currentMap.delete(id);
      }
    }

    // Add or update meshes
    parts.forEach((part) => {
      let mesh = currentMap.get(part.id);
      if (!mesh) {
        let geo: THREE.BufferGeometry;
        if (part.shape === 'sphere') geo = new THREE.SphereGeometry(part.size[0] / 2, 32, 24);
        else if (part.shape === 'cylinder') geo = new THREE.CylinderGeometry(part.size[0] / 2, part.size[0] / 2, part.size[1], 32);
        else geo = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(part.color || '#94a3b8'),
          roughness: 0.45,
          metalness: 0.08,
          transparent: (part.transparency || 0) > 0,
          opacity: Math.max(0, 1 - (part.transparency || 0)),
        });

        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        currentMap.set(part.id, mesh);
      } else if (mesh.parent !== scene) {
        scene.add(mesh);
      }

      mesh.position.set(part.position[0], part.position[1], part.position[2]);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(part.rotation[0]),
        THREE.MathUtils.degToRad(part.rotation[1]),
        THREE.MathUtils.degToRad(part.rotation[2])
      );
      if (mesh.material && !Array.isArray(mesh.material)) {
        (mesh.material as THREE.MeshStandardMaterial).color.set(part.color);
        mesh.material.opacity = Math.max(0, 1 - part.transparency);
        mesh.material.transparent = part.transparency > 0;
      }
    });
  }, [parts]);

  // -------------------------------------------------------------
  // RENDER PROPERTIES PANEL CONTENT
  // -------------------------------------------------------------
  const renderPropertiesContent = () => {
    // 1. BASEPLATE PROPERTIES
    if (selectedItemType === 'baseplate') {
      return (
        <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-purple-300/70 uppercase">Baseplate Object</label>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 font-mono">Workspace.Baseplate</span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/70">Grid Color</label>
              <div className="flex items-center gap-2 mt-1 px-2.5 py-1.5 rounded-lg bg-[#1a1233] border border-purple-500/20">
                <input
                  type="color"
                  value={baseplateColor}
                  onChange={(e) => setBaseplateColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-xs uppercase text-purple-200">{baseplateColor}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1233] border border-purple-500/20">
              <span className="font-bold text-white">Baseplate Enabled</span>
              <button
                onClick={() => setBaseplateEnabled((p) => !p)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  baseplateEnabled ? 'bg-emerald-600 text-white' : 'bg-red-950 text-red-300 border border-red-500/30'
                }`}
              >
                {baseplateEnabled ? 'Visible' : 'Deleted / Off'}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setBaseplateEnabled(false);
              showToast('Deleted Baseplate from Workspace');
            }}
            className="w-full py-2 px-3 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Baseplate</span>
          </button>
        </div>
      );
    }

    // 2. PART PROPERTIES
    if (selectedPart) {
      return (
        <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
          {/* Header info */}
          <div className="space-y-2 pb-2 border-b border-purple-500/15">
            <div>
              <label className="text-[10px] font-bold text-purple-300/70 uppercase">Part Name</label>
              <input
                type="text"
                value={selectedPart.name}
                onChange={(e) => handleUpdateSelectedPart({ name: e.target.value })}
                className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-[#1a1233] border border-purple-500/20 text-white font-medium focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-purple-300/70 uppercase">Color</label>
                <div className="flex items-center gap-2 mt-0.5 px-2 py-1 rounded-lg bg-[#1a1233] border border-purple-500/20">
                  <input
                    type="color"
                    value={selectedPart.color}
                    onChange={(e) => handleUpdateSelectedPart({ color: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[10px] uppercase text-purple-200">{selectedPart.color}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-purple-300/70 uppercase">Material</label>
                <select
                  value={selectedPart.material}
                  onChange={(e) => handleUpdateSelectedPart({ material: e.target.value as PartMaterial })}
                  className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-[#1a1233] border border-purple-500/20 text-white focus:outline-none text-xs"
                >
                  <option value="SmoothPlastic">SmoothPlastic</option>
                  <option value="Neon">Neon</option>
                  <option value="Wood">Wood</option>
                  <option value="Metal">Metal</option>
                  <option value="Brick">Brick</option>
                  <option value="Glass">Glass</option>
                </select>
              </div>
            </div>
          </div>

          {/* Physics / Collision */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-purple-300/70 uppercase">Physics &amp; Collision</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateSelectedPart({ anchored: !selectedPart.anchored })}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg font-semibold border transition-all cursor-pointer ${
                  selectedPart.anchored ? 'bg-purple-600/30 text-purple-200 border-purple-400/50' : 'bg-red-950/40 text-red-300 border-red-500/30'
                }`}
              >
                <Anchor className="w-3.5 h-3.5" />
                <span>{selectedPart.anchored ? 'Anchored' : 'Unanchored'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateSelectedPart({ canCollide: !selectedPart.canCollide })}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg font-semibold border transition-all cursor-pointer ${
                  selectedPart.canCollide ? 'bg-purple-600/30 text-purple-200 border-purple-400/50' : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{selectedPart.canCollide ? 'CanCollide' : 'CanCollide: Off'}</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] text-purple-300">
                <span className="font-bold uppercase">Transparency</span>
                <span>{Math.round(selectedPart.transparency * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedPart.transparency}
                onChange={(e) => handleUpdateSelectedPart({ transparency: parseFloat(e.target.value) })}
                className="w-full mt-1 accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Attached Scripts Section */}
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/25 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Scripts ({(selectedPart.scripts || []).length})</span>
              </span>
              <button
                onClick={() => handleAddScriptToPart(selectedPart.id)}
                className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Script</span>
              </button>
            </div>

            {(selectedPart.scripts || []).length === 0 ? (
              <p className="text-[11px] text-white/40 italic">
                No scripts inside this part. Click &quot;+ Script&quot; to make a kill brick, elevator, etc.
              </p>
            ) : (
              <div className="space-y-1.5">
                {(selectedPart.scripts || []).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#140e24] border border-white/5 hover:border-purple-500/30 group"
                  >
                    <div
                      onClick={() => handleOpenScriptEditor(s, selectedPart.name)}
                      className="flex items-center gap-2 cursor-pointer flex-1 truncate"
                    >
                      <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                        {s.name}.lua
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenScriptEditor(s, selectedPart.name)}
                        className="px-2 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600 text-purple-200 text-[10px] font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteScript(s.id, selectedPart.id)}
                        className="p-1 rounded text-red-400 hover:text-white hover:bg-red-950 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default Workspace Overview
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-purple-400/50 space-y-2">
        <Boxes className="w-8 h-8 opacity-30 text-purple-400" />
        <p className="font-semibold text-purple-300/70">Workspace</p>
        <p className="text-[11px] text-purple-400/50">
          Click any part in Explorer or 3D scene to inspect and modify its properties.
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0918] text-slate-100 flex flex-col font-sans select-none overflow-hidden animate-fadeIn">
      {/* Top Menu Bar */}
      <header className="h-10 bg-[#140e26] border-b border-purple-500/20 px-3 flex items-center justify-between text-xs shrink-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-display font-extrabold text-white tracking-wide">
            <Boxes className="w-4 h-4 text-purple-400" />
            <span>BoBlox Studio</span>
          </div>

          <span className="text-purple-500/40">|</span>

          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setFileMenuOpen((p) => !p)}
              className="px-2.5 py-1 rounded hover:bg-purple-950/60 text-purple-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            >
              <span>File</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {fileMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1 w-52 bg-[#191130] border border-purple-500/30 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleSave}
                  className="w-full px-3 py-2 rounded-lg text-left text-xs text-white hover:bg-purple-600/30 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-purple-400" />
                    <span>Save</span>
                  </span>
                  <span className="text-[10px] text-purple-400/60 font-mono">Ctrl+S</span>
                </button>

                <button
                  onClick={handleSaveAndPublish}
                  className="w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-purple-200 hover:text-white bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Save &amp; Publish</span>
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono">Home</span>
                </button>

                <button
                  onClick={() => onSaveAndExit({ ...experience, name: expName, parts, scripts: serverScripts, baseplateEnabled, baseplateColor })}
                  className="w-full px-3 py-2 rounded-lg text-left text-xs text-white hover:bg-purple-600/30 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-purple-400" />
                  <span>Save and Exit</span>
                </button>

                <button
                  onClick={onCloseWithoutSaving}
                  className="w-full px-3 py-2 rounded-lg text-left text-xs text-red-300 hover:bg-red-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                  <span>Close Without Saving</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            value={expName}
            onChange={(e) => setExpName(e.target.value)}
            className="px-2 py-0.5 rounded bg-black/30 border border-purple-500/20 text-xs text-purple-200 font-medium focus:outline-none focus:border-purple-400 max-w-[200px]"
            title="Rename Experience"
          />
        </div>

        {/* Playtest Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlaytest}
            className={`px-4 py-1.5 rounded-lg font-display font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              isPlaytesting
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
            }`}
          >
            {isPlaytesting ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Playtest</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Playtest (F5)</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Save & Exit */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAndPublish}
            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <Sparkles className="w-3 h-3" />
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* Ribbon Toolbar */}
      <div className="h-12 bg-[#120c22] border-b border-purple-500/20 px-3 flex items-center justify-between gap-3 text-xs shrink-0 z-30">
        <div className="flex items-center gap-1 bg-[#18102d] p-1 rounded-xl border border-purple-500/20">
          {(
            [
              { id: 'select', label: 'Select', keyNum: '1', icon: MousePointer },
              { id: 'move', label: 'Move', keyNum: '2', icon: Move },
              { id: 'scale', label: 'Scale', keyNum: '3', icon: Maximize2 },
              { id: 'rotate', label: 'Rotate', keyNum: '4', icon: RotateCw },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = toolMode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setToolMode(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  active ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-300/70 hover:text-white hover:bg-purple-950/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                <span className="text-[10px] font-mono opacity-60">[{t.keyNum}]</span>
              </button>
            );
          })}
        </div>

        {/* Add Part Dropdown */}
        <div className="relative">
          <button
            onClick={() => setInsertPartMenuOpen((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Part</span>
            <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
          </button>

          {insertPartMenuOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-44 bg-[#191130] border border-purple-500/30 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              {(['block', 'sphere', 'cylinder', 'wedge'] as PartShape[]).map((shape) => (
                <button
                  key={shape}
                  onClick={() => handleAddPart(shape)}
                  className="w-full px-3 py-2 rounded-lg text-left text-xs capitalize text-white hover:bg-purple-600/30 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>{shape}</span>
                  <span className="text-[10px] text-purple-400/60 font-mono">3D</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center 3D Viewport */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div ref={containerRef} className="flex-1 w-full h-full relative cursor-crosshair focus:outline-none" tabIndex={0} />

          {/* Viewport Overlay Controls HUD */}
          <div className="absolute top-3 left-3 pointer-events-none space-y-2">
            <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-purple-200 font-mono flex items-center gap-2 shadow-lg">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span>Right-Click + WASD to Fly • 1: Select • 2: Move • 3: Scale • 4: Rotate • F5: Playtest</span>
            </div>

            {statusNotification && (
              <div className="px-3.5 py-2 rounded-xl bg-purple-600/90 text-white text-xs font-bold shadow-xl border border-purple-400/50 animate-fadeIn pointer-events-auto">
                {statusNotification}
              </div>
            )}
          </div>

          {/* Death Red Vignette & 3-Second Respawn Banner */}
          {isDead && (
            <div className="absolute inset-0 z-50 bg-red-950/40 pointer-events-none flex flex-col items-center justify-center animate-fadeIn backdrop-blur-[2px]">
              <div className="p-6 rounded-2xl bg-black/80 border border-red-500/50 shadow-2xl text-center space-y-2">
                <h2 className="text-3xl font-black font-display text-red-500 tracking-tight">YOU DIED</h2>
                <p className="text-xs text-red-200 font-medium">Your avatar shattered into pieces.</p>
                <div className="text-sm font-bold text-white font-mono pt-1">
                  Respawning in <span className="text-amber-400 text-lg">{deathCountdown}</span>...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Explorer & Properties */}
        <aside style={{ width: sideDockWidth }} className="bg-[#120c22] border-l border-purple-500/20 flex flex-col shrink-0 z-20 overflow-hidden shadow-2xl relative">
          {/* Top Half: Explorer Panel */}
          <div className="h-64 flex flex-col border-b border-purple-500/20 overflow-hidden">
            <div className="p-2.5 bg-[#17102c] border-b border-purple-500/15 flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Explorer</span>
              </span>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-mono">
              {/* Workspace Root */}
              <div
                onClick={() => setSelectedItemType('workspace')}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                  selectedItemType === 'workspace' ? 'bg-purple-600/30 text-purple-200 font-bold' : 'text-purple-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-purple-400" />
                  <span>Workspace</span>
                </div>
              </div>

              {/* Baseplate */}
              {baseplateEnabled && (
                <div
                  onClick={() => {
                    setSelectedItemType('baseplate');
                    setSelectedPartId(null);
                  }}
                  className={`flex items-center justify-between pl-6 pr-2 py-1 rounded cursor-pointer ${
                    selectedItemType === 'baseplate' ? 'bg-purple-600 text-white font-bold shadow-sm' : 'text-purple-400/80 hover:bg-purple-950/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-xs bg-slate-600" />
                    <span>Baseplate</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBaseplateEnabled(false);
                      showToast('Deleted Baseplate');
                    }}
                    className="text-red-400 hover:text-white p-0.5 rounded cursor-pointer"
                    title="Delete Baseplate"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Custom Parts Tree with Scripts */}
              {parts.map((part) => {
                const isSelected = selectedPartId === part.id && selectedItemType === 'part';
                const hasScripts = (part.scripts || []).length > 0;
                const isExpanded = expandedFolders[part.id] !== false;

                return (
                  <div key={part.id} className="space-y-0.5">
                    <div
                      onClick={() => {
                        setSelectedPartId(part.id);
                        setSelectedItemType('part');
                      }}
                      className={`flex items-center justify-between pl-6 pr-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
                        isSelected ? 'bg-purple-600 text-white font-bold shadow-sm' : 'text-purple-200/90 hover:bg-purple-950/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <div className="w-2.5 h-2.5 rounded-xs shrink-0 border border-white/20" style={{ backgroundColor: part.color }} />
                        <span className="truncate">{part.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddScriptToPart(part.id);
                          }}
                          className="p-1 hover:bg-purple-500/40 rounded text-blue-300"
                          title="Add Script to Part"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePart(part.id);
                          }}
                          className="p-1 hover:bg-red-500/40 rounded text-red-400"
                          title="Delete Part"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Attached Scripts child list */}
                    {hasScripts && isExpanded && (
                      <div className="pl-10 space-y-0.5">
                        {part.scripts!.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleOpenScriptEditor(s, part.name)}
                            className="flex items-center justify-between px-2 py-1 rounded text-[11px] text-blue-300 bg-blue-950/30 hover:bg-blue-900/40 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <FileCode className="w-3 h-3" />
                              <span className="truncate">{s.name}.lua</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ServerScriptService Folder */}
              <div className="pt-2 border-t border-purple-500/10 space-y-0.5">
                <div
                  onClick={() => setSelectedItemType('serverscriptservice')}
                  className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                    selectedItemType === 'serverscriptservice' ? 'bg-purple-600/30 text-purple-200 font-bold' : 'text-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-blue-400" />
                    <span>ServerScriptService</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddServerScript();
                    }}
                    className="p-1 hover:bg-blue-500/40 rounded text-blue-300"
                    title="Add Script to ServerScriptService"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Server Scripts List */}
                <div className="pl-6 space-y-0.5">
                  {serverScripts.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleOpenScriptEditor(s, 'ServerScriptService')}
                      className="flex items-center justify-between px-2 py-1 rounded text-[11px] text-blue-300 bg-blue-950/30 hover:bg-blue-900/40 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <FileCode className="w-3 h-3" />
                        <span className="truncate">{s.name}.lua</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Half: Properties Panel */}
          <div className="flex-1 flex flex-col bg-[#140e26] overflow-hidden">
            <div className="p-2.5 bg-[#17102c] border-b border-purple-500/15 flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-purple-300" />
                <span>Properties</span>
              </span>
            </div>

            {renderPropertiesContent()}
          </div>
        </aside>
      </div>

      {/* Lua Script Editor Modal */}
      {editingScript && (
        <StudioScriptEditor
          script={editingScript}
          parentName={editingScriptParentName}
          onSaveScript={handleSaveEditedScript}
          onClose={() => setEditingScript(null)}
          logs={scriptLogs}
          onClearLogs={() => setScriptLogs([])}
        />
      )}
    </div>
  );
}
