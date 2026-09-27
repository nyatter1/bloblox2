import * as THREE from 'three';
import { StudioPart, StudioScript } from '../types/experience';

export interface ScriptLogMessage {
  id: string;
  type: 'info' | 'warn' | 'error' | 'print';
  message: string;
  source?: string;
  timestamp: number;
}

export interface PlayerHumanoid {
  Health: number;
  MaxHealth: number;
  WalkSpeed: number;
  JumpPower: number;
  Position: THREE.Vector3;
  TakeDamage: (damage: number) => void;
  Die: () => void;
}

/**
 * Roblox Vector3 with arithmetic methods for clean Lua interop
 */
export class LuaVector3 {
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = Number(x) || 0;
    this.y = Number(y) || 0;
    this.z = Number(z) || 0;
  }

  get X() {
    return this.x;
  }
  set X(v: number) {
    this.x = Number(v) || 0;
  }
  get Y() {
    return this.y;
  }
  set Y(v: number) {
    this.y = Number(v) || 0;
  }
  get Z() {
    return this.z;
  }
  set Z(v: number) {
    this.z = Number(v) || 0;
  }

  get magnitude(): number {
    return Math.hypot(this.x, this.y, this.z);
  }

  get Unit(): LuaVector3 {
    const mag = this.magnitude;
    if (mag === 0) return new LuaVector3(0, 0, 0);
    return new LuaVector3(this.x / mag, this.y / mag, this.z / mag);
  }

  public add(other: any): LuaVector3 {
    const ox = other?.x ?? other?.X ?? (typeof other === 'number' ? other : 0);
    const oy = other?.y ?? other?.Y ?? (typeof other === 'number' ? other : 0);
    const oz = other?.z ?? other?.Z ?? (typeof other === 'number' ? other : 0);
    return new LuaVector3(this.x + ox, this.y + oy, this.z + oz);
  }

  public sub(other: any): LuaVector3 {
    const ox = other?.x ?? other?.X ?? (typeof other === 'number' ? other : 0);
    const oy = other?.y ?? other?.Y ?? (typeof other === 'number' ? other : 0);
    const oz = other?.z ?? other?.Z ?? (typeof other === 'number' ? other : 0);
    return new LuaVector3(this.x - ox, this.y - oy, this.z - oz);
  }

  public mul(scalarOrVec: any): LuaVector3 {
    if (typeof scalarOrVec === 'number') {
      return new LuaVector3(this.x * scalarOrVec, this.y * scalarOrVec, this.z * scalarOrVec);
    }
    const ox = scalarOrVec?.x ?? scalarOrVec?.X ?? 1;
    const oy = scalarOrVec?.y ?? scalarOrVec?.Y ?? 1;
    const oz = scalarOrVec?.z ?? scalarOrVec?.Z ?? 1;
    return new LuaVector3(this.x * ox, this.y * oy, this.z * oz);
  }

  public div(scalar: number): LuaVector3 {
    const s = Number(scalar) || 1;
    return new LuaVector3(this.x / s, this.y / s, this.z / s);
  }

  public Lerp(target: any, alpha: number): LuaVector3 {
    const a = Math.max(0, Math.min(1, Number(alpha) || 0));
    const tx = target?.x ?? target?.X ?? this.x;
    const ty = target?.y ?? target?.Y ?? this.y;
    const tz = target?.z ?? target?.Z ?? this.z;
    return new LuaVector3(
      this.x + (tx - this.x) * a,
      this.y + (ty - this.y) * a,
      this.z + (tz - this.z) * a
    );
  }

  public clone(): LuaVector3 {
    return new LuaVector3(this.x, this.y, this.z);
  }

  public toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  public toString(): string {
    return `Vector3(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
  }
}

export function createPlayerHitProxy(
  getHealth: () => number,
  setHealth: (hp: number) => void,
  onKill: () => void,
  walkSpeed = 16,
  jumpPower = 50
) {
  const humanoidProxy: any = {
    Name: 'Humanoid',
    ClassName: 'Humanoid',
    MaxHealth: 100,
    WalkSpeed: walkSpeed,
    JumpPower: jumpPower,
    get Health() {
      return getHealth();
    },
    set Health(val: number) {
      const newHp = Number(val);
      setHealth(newHp);
      if (newHp <= 0) {
        onKill();
      }
    },
    TakeDamage: (dmg: number) => {
      const cur = getHealth();
      const next = Math.max(0, cur - Number(dmg));
      setHealth(next);
      if (next <= 0) {
        onKill();
      }
    },
    takeDamage: (dmg: number) => {
      humanoidProxy.TakeDamage(dmg);
    },
  };

  const characterProxy: any = {
    Name: 'Player',
    ClassName: 'Model',
    Humanoid: humanoidProxy,
    humanoid: humanoidProxy,
    FindFirstChild: (n: string) => (n.toLowerCase() === 'humanoid' ? humanoidProxy : null),
    findFirstChild: (n: string) => (n.toLowerCase() === 'humanoid' ? humanoidProxy : null),
    FindFirstChildWhichIsA: (c: string) => (c.toLowerCase() === 'humanoid' ? humanoidProxy : null),
  };

  const hitProxy: any = {
    Name: 'HumanoidRootPart',
    ClassName: 'Part',
    Parent: characterProxy,
    parent: characterProxy,
  };

  return hitProxy;
}

export interface ScriptRuntimeContext {
  parts: Map<string, StudioPart>;
  meshes: Map<string, THREE.Mesh>;
  humanoid: PlayerHumanoid;
  onLog: (log: ScriptLogMessage) => void;
  onKillPlayer: () => void;
  onPartUpdated?: (partId: string, updated: Partial<StudioPart>) => void;
}

interface ActiveTween {
  partId: string;
  duration: number;
  easingStyle: string;
  easingDirection: string;
  repeatCount: number;
  remainingRepeats: number;
  reverses: boolean;
  isReversing: boolean;
  delayTime: number;
  delayRemaining: number;
  goals: Record<string, any>;
  originalStartVals: Record<string, any>;
  currentStartVals: Record<string, any>;
  currentTargetVals: Record<string, any>;
  elapsed: number;
  state: 'ready' | 'playing' | 'paused' | 'completed' | 'cancelled';
  completedCallbacks: Array<() => void>;
}

export class LuaScriptRunner {
  private isRunning: boolean = false;
  private abortControllers: AbortController[] = [];
  private activeTweens: ActiveTween[] = [];
  private touchedListeners: Map<string, Array<(hit: any) => void>> = new Map();
  private context: ScriptRuntimeContext | null = null;
  private animFrameId: number | null = null;

  public start(
    scripts: StudioScript[],
    allParts: StudioPart[],
    meshes: Map<string, THREE.Mesh>,
    humanoid: PlayerHumanoid,
    onLog: (log: ScriptLogMessage) => void,
    onKillPlayer: () => void,
    onPartUpdated?: (partId: string, updated: Partial<StudioPart>) => void
  ) {
    this.stop();
    this.isRunning = true;
    this.touchedListeners.clear();
    this.activeTweens = [];

    const partsMap = new Map<string, StudioPart>();
    allParts.forEach((p) => partsMap.set(p.id, { ...p }));

    this.context = {
      parts: partsMap,
      meshes,
      humanoid,
      onLog,
      onKillPlayer,
      onPartUpdated,
    };

    // Execute all enabled scripts
    for (const script of scripts) {
      if (!script.enabled) continue;
      this.executeScript(script);
    }

    // Start tween update loop
    this.startTweenLoop();
  }

  public stop() {
    this.isRunning = false;
    for (const ac of this.abortControllers) {
      ac.abort();
    }
    this.abortControllers = [];
    this.touchedListeners.clear();
    this.activeTweens = [];
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.context = null;
  }

  public triggerTouched(partId: string, hitObject: any) {
    if (!this.isRunning) return;
    const listeners = this.touchedListeners.get(partId);
    if (listeners && listeners.length > 0) {
      for (const cb of listeners) {
        try {
          cb(hitObject);
        } catch (e: any) {
          this.context?.onLog({
            id: Math.random().toString(36).slice(2),
            type: 'error',
            message: `Runtime Error in Touched: ${e?.message || e}`,
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  private startTweenLoop() {
    let lastTime = performance.now();

    const loop = () => {
      if (!this.isRunning) return;
      const now = performance.now();
      const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update active tweens
      for (let i = this.activeTweens.length - 1; i >= 0; i--) {
        const tween = this.activeTweens[i];
        if (tween.state === 'playing') {
          if (tween.delayRemaining > 0) {
            tween.delayRemaining -= deltaSec;
            continue;
          }

          tween.elapsed += deltaSec;
          const progress = Math.min(1, tween.elapsed / Math.max(0.001, tween.duration));
          const eased = this.applyEasing(progress, tween.easingStyle, tween.easingDirection);

          // Interpolate properties
          for (const [prop, targetVal] of Object.entries(tween.currentTargetVals)) {
            const startVal = tween.currentStartVals[prop];
            this.interpolateProperty(tween.partId, prop, startVal, targetVal, eased);
          }

          if (progress >= 1) {
            if (tween.reverses && !tween.isReversing) {
              // Reversing back to start
              tween.isReversing = true;
              tween.elapsed = 0;
              tween.currentStartVals = { ...tween.currentTargetVals };
              tween.currentTargetVals = { ...tween.originalStartVals };
            } else if (tween.repeatCount === -1 || tween.remainingRepeats > 0) {
              if (tween.remainingRepeats > 0) tween.remainingRepeats--;
              tween.elapsed = 0;
              tween.isReversing = false;
              tween.currentStartVals = { ...tween.originalStartVals };
              tween.currentTargetVals = { ...tween.goals };
            } else {
              tween.state = 'completed';
              this.activeTweens.splice(i, 1);
              for (const cb of tween.completedCallbacks) {
                try {
                  cb();
                } catch {
                  // ignore
                }
              }
            }
          }
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private applyEasing(t: number, style: string = 'Quad', direction: string = 'InOut'): number {
    const s = (style || 'Quad').toLowerCase();
    const d = (direction || 'InOut').toLowerCase();

    const easeIn = (p: number): number => {
      switch (s) {
        case 'linear':
          return p;
        case 'sine':
          return 1 - Math.cos((p * Math.PI) / 2);
        case 'cubic':
          return p * p * p;
        case 'quad':
          return p * p;
        case 'exponential':
        case 'expo':
          return p === 0 ? 0 : Math.pow(2, 10 * (p - 1));
        case 'circular':
        case 'circ':
          return 1 - Math.sqrt(1 - p * p);
        case 'bounce': {
          const b = (n: number) => {
            if (n < 1 / 2.75) return 7.5625 * n * n;
            if (n < 2 / 2.75) return 7.5625 * (n -= 1.5 / 2.75) * n + 0.75;
            if (n < 2.5 / 2.75) return 7.5625 * (n -= 2.25 / 2.75) * n + 0.9375;
            return 7.5625 * (n -= 2.625 / 2.75) * n + 0.984375;
          };
          return 1 - b(1 - p);
        }
        case 'elastic': {
          if (p === 0 || p === 1) return p;
          const pPeriod = 0.3;
          return -Math.pow(2, 10 * (p - 1)) * Math.sin(((p - 1 - pPeriod / 4) * (2 * Math.PI)) / pPeriod);
        }
        default:
          return p * p;
      }
    };

    if (d === 'in') return easeIn(t);
    if (d === 'out') return 1 - easeIn(1 - t);
    // InOut
    return t < 0.5 ? 0.5 * easeIn(t * 2) : 0.5 * (2 - easeIn((1 - t) * 2));
  }

  private interpolateProperty(partId: string, prop: string, start: any, target: any, t: number) {
    if (!this.context) return;
    const part = this.context.parts.get(partId);
    const mesh = this.context.meshes.get(partId);
    if (!part || !mesh) return;

    const lowerProp = prop.toLowerCase();

    if (lowerProp === 'position' || lowerProp === 'cframe') {
      const sx = start?.x ?? start?.X ?? start?.[0] ?? 0;
      const sy = start?.y ?? start?.Y ?? start?.[1] ?? 0;
      const sz = start?.z ?? start?.Z ?? start?.[2] ?? 0;
      const tx = target?.x ?? target?.X ?? target?.[0] ?? sx;
      const ty = target?.y ?? target?.Y ?? target?.[1] ?? sy;
      const tz = target?.z ?? target?.Z ?? target?.[2] ?? sz;

      const curX = sx + (tx - sx) * t;
      const curY = sy + (ty - sy) * t;
      const curZ = sz + (tz - sz) * t;

      mesh.position.set(curX, curY, curZ);
      part.position = [curX, curY, curZ];
      this.context.onPartUpdated?.(partId, { position: [curX, curY, curZ] });
    } else if (lowerProp === 'size') {
      const sx = start?.x ?? start?.X ?? start?.[0] ?? 1;
      const sy = start?.y ?? start?.Y ?? start?.[1] ?? 1;
      const sz = start?.z ?? start?.Z ?? start?.[2] ?? 1;
      const tx = target?.x ?? target?.X ?? target?.[0] ?? sx;
      const ty = target?.y ?? target?.Y ?? target?.[1] ?? sy;
      const tz = target?.z ?? target?.Z ?? target?.[2] ?? sz;

      const curX = sx + (tx - sx) * t;
      const curY = sy + (ty - sy) * t;
      const curZ = sz + (tz - sz) * t;

      mesh.scale.set(curX / Math.max(0.001, part.size[0]), curY / Math.max(0.001, part.size[1]), curZ / Math.max(0.001, part.size[2]));
      part.size = [curX, curY, curZ];
      this.context.onPartUpdated?.(partId, { size: [curX, curY, curZ] });
    } else if (lowerProp === 'orientation' || lowerProp === 'rotation') {
      const rx = (start?.x ?? start?.X ?? start?.[0] ?? 0) + ((target?.x ?? target?.X ?? target?.[0] ?? 0) - (start?.x ?? start?.X ?? start?.[0] ?? 0)) * t;
      const ry = (start?.y ?? start?.Y ?? start?.[1] ?? 0) + ((target?.y ?? target?.Y ?? target?.[1] ?? 0) - (start?.y ?? start?.Y ?? start?.[1] ?? 0)) * t;
      const rz = (start?.z ?? start?.Z ?? start?.[2] ?? 0) + ((target?.z ?? target?.Z ?? target?.[2] ?? 0) - (start?.z ?? start?.Z ?? start?.[2] ?? 0)) * t;

      mesh.rotation.set(
        THREE.MathUtils.degToRad(rx),
        THREE.MathUtils.degToRad(ry),
        THREE.MathUtils.degToRad(rz)
      );
      part.rotation = [rx, ry, rz];
      this.context.onPartUpdated?.(partId, { rotation: [rx, ry, rz] });
    } else if (lowerProp === 'transparency') {
      const s = typeof start === 'number' ? start : 0;
      const tg = typeof target === 'number' ? target : 0;
      const val = Math.max(0, Math.min(1, s + (tg - s) * t));
      part.transparency = val;
      if (mesh.material && !Array.isArray(mesh.material)) {
        mesh.material.opacity = Math.max(0, 1 - val);
        mesh.material.transparent = val > 0;
      }
      this.context.onPartUpdated?.(partId, { transparency: val });
    } else if (lowerProp === 'color') {
      // Color interpolation
      let sHex = typeof start === 'string' ? start : start?.hex || '#ffffff';
      let tHex = typeof target === 'string' ? target : target?.hex || '#ffffff';
      const c1 = new THREE.Color(sHex);
      const c2 = new THREE.Color(tHex);
      c1.lerp(c2, t);
      const hexStr = `#${c1.getHexString()}`;
      part.color = hexStr;
      if (mesh.material && !Array.isArray(mesh.material)) {
        (mesh.material as THREE.MeshStandardMaterial).color.copy(c1);
      }
      this.context.onPartUpdated?.(partId, { color: hexStr });
    }
  }

  private executeScript(script: StudioScript) {
    if (!this.context) return;
    const abortController = new AbortController();
    this.abortControllers.push(abortController);

    const ctx = this.context;
    const scriptParentPartId = script.parentId;
    const parentPart = ctx.parts.get(scriptParentPartId) || null;

    // Build standard Roblox sandbox environment
    const createPartProxy = (part: StudioPart | null, pId: string): any => {
      if (!part) return null;

      const proxy: any = {
        get Name() {
          return part.name;
        },
        set Name(val: string) {
          part.name = val;
          ctx.onPartUpdated?.(pId, { name: val });
        },
        get Position() {
          return new LuaVector3(part.position[0], part.position[1], part.position[2]);
        },
        set Position(val: any) {
          const x = val?.x ?? val?.X ?? val?.[0] ?? part.position[0];
          const y = val?.y ?? val?.Y ?? val?.[1] ?? part.position[1];
          const z = val?.z ?? val?.Z ?? val?.[2] ?? part.position[2];
          part.position = [x, y, z];
          const mesh = ctx.meshes.get(pId);
          if (mesh) mesh.position.set(x, y, z);
          ctx.onPartUpdated?.(pId, { position: [x, y, z] });
        },
        get CFrame() {
          return {
            Position: proxy.Position,
            p: proxy.Position,
            LookVector: new LuaVector3(0, 0, -1),
          };
        },
        set CFrame(val: any) {
          if (val?.Position) proxy.Position = val.Position;
          else if (val?.p) proxy.Position = val.p;
          else if (val?.x !== undefined) proxy.Position = val;
        },
        get Size() {
          return new LuaVector3(part.size[0], part.size[1], part.size[2]);
        },
        set Size(val: any) {
          const x = val?.x ?? val?.X ?? val?.[0] ?? part.size[0];
          const y = val?.y ?? val?.Y ?? val?.[1] ?? part.size[1];
          const z = val?.z ?? val?.Z ?? val?.[2] ?? part.size[2];
          part.size = [x, y, z];
          const mesh = ctx.meshes.get(pId);
          if (mesh) {
            mesh.scale.set(x, y, z);
          }
          ctx.onPartUpdated?.(pId, { size: [x, y, z] });
        },
        get Orientation() {
          return new LuaVector3(part.rotation[0], part.rotation[1], part.rotation[2]);
        },
        set Orientation(val: any) {
          const x = val?.x ?? val?.X ?? val?.[0] ?? part.rotation[0];
          const y = val?.y ?? val?.Y ?? val?.[1] ?? part.rotation[1];
          const z = val?.z ?? val?.Z ?? val?.[2] ?? part.rotation[2];
          part.rotation = [x, y, z];
          const mesh = ctx.meshes.get(pId);
          if (mesh) {
            mesh.rotation.set(
              THREE.MathUtils.degToRad(x),
              THREE.MathUtils.degToRad(y),
              THREE.MathUtils.degToRad(z)
            );
          }
          ctx.onPartUpdated?.(pId, { rotation: [x, y, z] });
        },
        get Rotation() {
          return proxy.Orientation;
        },
        set Rotation(val: any) {
          proxy.Orientation = val;
        },
        get Transparency() {
          return part.transparency;
        },
        set Transparency(val: number) {
          part.transparency = Number(val) || 0;
          const mesh = ctx.meshes.get(pId);
          if (mesh && mesh.material && !Array.isArray(mesh.material)) {
            mesh.material.opacity = Math.max(0, 1 - part.transparency);
            mesh.material.transparent = part.transparency > 0;
          }
          ctx.onPartUpdated?.(pId, { transparency: part.transparency });
        },
        get CanCollide() {
          return part.canCollide;
        },
        set CanCollide(val: boolean) {
          part.canCollide = !!val;
          ctx.onPartUpdated?.(pId, { canCollide: !!val });
        },
        get Anchored() {
          return part.anchored;
        },
        set Anchored(val: boolean) {
          part.anchored = !!val;
          ctx.onPartUpdated?.(pId, { anchored: !!val });
        },
        get Color() {
          return {
            hex: part.color,
            toString: () => part.color,
          };
        },
        set Color(val: any) {
          let hex = '#cccccc';
          if (typeof val === 'string') hex = val;
          else if (val && val.hex) hex = val.hex;
          else if (val && typeof val.r === 'number') {
            const r = Math.round(val.r <= 1 ? val.r * 255 : val.r);
            const g = Math.round(val.g <= 1 ? val.g * 255 : val.g);
            const b = Math.round(val.b <= 1 ? val.b * 255 : val.b);
            hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          }
          part.color = hex;
          const mesh = ctx.meshes.get(pId);
          if (mesh && mesh.material && !Array.isArray(mesh.material)) {
            (mesh.material as THREE.MeshStandardMaterial).color.set(hex);
          }
          ctx.onPartUpdated?.(pId, { color: hex });
        },
        get BrickColor() {
          return {
            Name: part.color,
            Color: proxy.Color,
          };
        },
        set BrickColor(val: any) {
          proxy.Color = val;
        },
        get Material() {
          return part.material;
        },
        set Material(val: string) {
          part.material = val as any;
          ctx.onPartUpdated?.(pId, { material: part.material });
        },
        FindFirstChild: (n: string) => null,
        findFirstChild: (n: string) => null,
        Touched: {
          Connect: (callback: (hit: any) => void) => {
            let listeners = this.touchedListeners.get(pId);
            if (!listeners) {
              listeners = [];
              this.touchedListeners.set(pId, listeners);
            }
            listeners.push(callback);
            return {
              Disconnect: () => {
                const arr = this.touchedListeners.get(pId);
                if (arr) {
                  const idx = arr.indexOf(callback);
                  if (idx !== -1) arr.splice(idx, 1);
                }
              },
            };
          },
        },
        Destroy: () => {
          const mesh = ctx.meshes.get(pId);
          if (mesh && mesh.parent) mesh.parent.remove(mesh);
          ctx.parts.delete(pId);
        },
        TweenPosition: (targetPos: any, easingDir = 'InOut', easingStyle = 'Quad', time = 1) => {
          const tween = TweenService.Create(
            proxy,
            TweenInfo.new(time, easingStyle, easingDir),
            { Position: targetPos }
          );
          tween.Play();
          return tween;
        },
        TweenSize: (targetSize: any, easingDir = 'InOut', easingStyle = 'Quad', time = 1) => {
          const tween = TweenService.Create(
            proxy,
            TweenInfo.new(time, easingStyle, easingDir),
            { Size: targetSize }
          );
          tween.Play();
          return tween;
        },
      };

      return proxy;
    };

    const scriptParentProxy = parentPart ? createPartProxy(parentPart, scriptParentPartId) : null;

    // Find first child helper
    const findPartByName = (name: string) => {
      for (const [id, p] of ctx.parts.entries()) {
        if (p.name.toLowerCase() === name.toLowerCase()) {
          return createPartProxy(p, id);
        }
      }
      return null;
    };

    const workspaceProxy: any = {
      Name: 'Workspace',
      FindFirstChild: (name: string) => findPartByName(name),
      findFirstChild: (name: string) => findPartByName(name),
      GetChildren: () => Array.from(ctx.parts.entries()).map(([id, p]) => createPartProxy(p, id)),
    };

    // Allow workspace.PartName access
    for (const [id, p] of ctx.parts.entries()) {
      workspaceProxy[p.name] = createPartProxy(p, id);
    }

    const TweenService = {
      Create: (partObj: any, tweenInfo: any, goals: any) => {
        let targetPartId = scriptParentPartId;
        for (const [id, p] of ctx.parts.entries()) {
          if (p.name === partObj?.Name || partObj === createPartProxy(p, id)) {
            targetPartId = id;
            break;
          }
        }

        const part = ctx.parts.get(targetPartId);
        const startVals: Record<string, any> = {};
        if (part) {
          for (const prop of Object.keys(goals || {})) {
            const lp = prop.toLowerCase();
            if (lp === 'position' || lp === 'cframe') startVals[prop] = new LuaVector3(part.position[0], part.position[1], part.position[2]);
            else if (lp === 'size') startVals[prop] = new LuaVector3(part.size[0], part.size[1], part.size[2]);
            else if (lp === 'orientation' || lp === 'rotation') startVals[prop] = new LuaVector3(part.rotation[0], part.rotation[1], part.rotation[2]);
            else if (lp === 'transparency') startVals[prop] = part.transparency;
            else if (lp === 'color') startVals[prop] = part.color;
          }
        }

        const duration = tweenInfo?.time || tweenInfo?.Time || 1;
        const easingStyle = tweenInfo?.easingStyle || tweenInfo?.EasingStyle || 'Quad';
        const easingDirection = tweenInfo?.easingDirection || tweenInfo?.EasingDirection || 'InOut';
        const repeatCount = tweenInfo?.repeatCount !== undefined ? tweenInfo.repeatCount : 0;
        const reverses = !!(tweenInfo?.reverses ?? tweenInfo?.Reverses);
        const delayTime = tweenInfo?.delayTime || tweenInfo?.DelayTime || 0;

        const tweenRecord: ActiveTween = {
          partId: targetPartId,
          duration,
          easingStyle,
          easingDirection,
          repeatCount,
          remainingRepeats: repeatCount,
          reverses,
          isReversing: false,
          delayTime,
          delayRemaining: delayTime,
          goals: { ...goals },
          originalStartVals: { ...startVals },
          currentStartVals: { ...startVals },
          currentTargetVals: { ...goals },
          elapsed: 0,
          state: 'ready',
          completedCallbacks: [],
        };

        const tweenHandle = {
          Play: () => {
            // Recalculate fresh start values from live part state
            const currentPart = ctx.parts.get(targetPartId);
            if (currentPart) {
              for (const prop of Object.keys(goals || {})) {
                const lp = prop.toLowerCase();
                if (lp === 'position' || lp === 'cframe') tweenRecord.currentStartVals[prop] = new LuaVector3(currentPart.position[0], currentPart.position[1], currentPart.position[2]);
                else if (lp === 'size') tweenRecord.currentStartVals[prop] = new LuaVector3(currentPart.size[0], currentPart.size[1], currentPart.size[2]);
                else if (lp === 'orientation' || lp === 'rotation') tweenRecord.currentStartVals[prop] = new LuaVector3(currentPart.rotation[0], currentPart.rotation[1], currentPart.rotation[2]);
                else if (lp === 'transparency') tweenRecord.currentStartVals[prop] = currentPart.transparency;
                else if (lp === 'color') tweenRecord.currentStartVals[prop] = currentPart.color;
              }
              tweenRecord.originalStartVals = { ...tweenRecord.currentStartVals };
            }
            tweenRecord.state = 'playing';
            tweenRecord.elapsed = 0;
            tweenRecord.isReversing = false;
            tweenRecord.currentTargetVals = { ...tweenRecord.goals };

            if (!this.activeTweens.includes(tweenRecord)) {
              this.activeTweens.push(tweenRecord);
            }
          },
          play: () => tweenHandle.Play(),
          Pause: () => {
            tweenRecord.state = 'paused';
          },
          pause: () => tweenHandle.Pause(),
          Cancel: () => {
            tweenRecord.state = 'cancelled';
            const idx = this.activeTweens.indexOf(tweenRecord);
            if (idx !== -1) this.activeTweens.splice(idx, 1);
          },
          cancel: () => tweenHandle.Cancel(),
          Completed: {
            Connect: (fn: () => void) => {
              tweenRecord.completedCallbacks.push(fn);
              return {
                Disconnect: () => {
                  const idx = tweenRecord.completedCallbacks.indexOf(fn);
                  if (idx !== -1) tweenRecord.completedCallbacks.splice(idx, 1);
                },
              };
            },
          },
        };

        return tweenHandle;
      },
      create: (partObj: any, tweenInfo: any, goals: any) => TweenService.Create(partObj, tweenInfo, goals),
    };

    const TweenInfo = {
      new: (
        time: number = 1,
        easingStyle: any = 'Quad',
        easingDirection: any = 'InOut',
        repeatCount: number = 0,
        reverses: boolean = false,
        delayTime: number = 0
      ) => ({
        time: typeof time === 'number' ? time : 1,
        easingStyle: typeof easingStyle === 'string' ? easingStyle : easingStyle?.name || 'Quad',
        easingDirection: typeof easingDirection === 'string' ? easingDirection : easingDirection?.name || 'InOut',
        repeatCount: Number(repeatCount) || 0,
        reverses: !!reverses,
        delayTime: Number(delayTime) || 0,
      }),
    };

    const Vector3 = {
      new: (x: number = 0, y: number = 0, z: number = 0) => new LuaVector3(x, y, z),
      zero: new LuaVector3(0, 0, 0),
      one: new LuaVector3(1, 1, 1),
    };

    const CFrame = {
      new: (x: number = 0, y: number = 0, z: number = 0) => ({
        Position: new LuaVector3(x, y, z),
        p: new LuaVector3(x, y, z),
      }),
      Angles: (rx: number = 0, ry: number = 0, rz: number = 0) => ({
        Rotation: new LuaVector3(THREE.MathUtils.radToDeg(rx), THREE.MathUtils.radToDeg(ry), THREE.MathUtils.radToDeg(rz)),
      }),
    };

    const Color3 = {
      fromRGB: (r: number, g: number, b: number) => ({
        r,
        g,
        b,
        hex: `#${Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, Math.round(g))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, Math.round(b))).toString(16).padStart(2, '0')}`,
      }),
      new: (r: number, g: number, b: number) => ({
        r: r * 255,
        g: g * 255,
        b: b * 255,
        hex: `#${Math.max(0, Math.min(255, Math.round(r * 255))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, Math.round(g * 255))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, Math.round(b * 255))).toString(16).padStart(2, '0')}`,
      }),
      fromHex: (hex: string) => ({ hex }),
    };

    const gameProxy: any = {
      Workspace: workspaceProxy,
      workspace: workspaceProxy,
      ServerScriptService: { Name: 'ServerScriptService' },
      GetService: (serviceName: string) => {
        const s = serviceName.toLowerCase();
        if (s === 'tweenservice') return TweenService;
        if (s === 'workspace') return workspaceProxy;
        return { Name: serviceName };
      },
      getService: (serviceName: string) => gameProxy.GetService(serviceName),
    };

    const waitHelper = (seconds: number = 0.03): Promise<number> => {
      const s = Math.max(0.01, Number(seconds) || 0.03);
      return new Promise((resolve) => {
        if (abortController.signal.aborted) return resolve(s);
        const timer = setTimeout(() => {
          resolve(s);
        }, s * 1000);

        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve(s);
        });
      });
    };

    try {
      const jsCode = this.transpileLuaToJS(script.code);

      const sandboxFunction = new Function(
        'script',
        'workspace',
        'game',
        'Vector3',
        'CFrame',
        'Color3',
        'TweenService',
        'TweenInfo',
        'Enum',
        'task',
        'wait',
        'print',
        'warn',
        'error',
        'math',
        'string',
        'table',
        'abortSignal',
        `return (async () => {\n${jsCode}\n})();`
      );

      const scriptContext = {
        Parent: scriptParentProxy,
        parent: scriptParentProxy,
        Name: script.name,
        Enabled: true,
      };

      const enumProxy = {
        EasingStyle: {
          Linear: 'Linear',
          Sine: 'Sine',
          Quad: 'Quad',
          Cubic: 'Cubic',
          Bounce: 'Bounce',
          Elastic: 'Elastic',
          Circular: 'Circular',
          Exponential: 'Exponential',
        },
        EasingDirection: {
          In: 'In',
          Out: 'Out',
          InOut: 'InOut',
        },
        Material: {
          SmoothPlastic: 'SmoothPlastic',
          Neon: 'Neon',
          Wood: 'Wood',
          Metal: 'Metal',
          Brick: 'Brick',
          Glass: 'Glass',
        },
      };

      const taskProxy = {
        wait: waitHelper,
        delay: (sec: number, fn: Function) => setTimeout(fn, sec * 1000),
        spawn: (fn: Function) => setTimeout(fn, 0),
      };

      const logPrint = (...args: any[]) => {
        const msg = args.map((a) => (typeof a === 'object' && a?.toString ? a.toString() : String(a))).join(' ');
        ctx.onLog({
          id: Math.random().toString(36).slice(2),
          type: 'print',
          message: msg,
          source: script.name,
          timestamp: Date.now(),
        });
      };

      const logWarn = (...args: any[]) => {
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        ctx.onLog({
          id: Math.random().toString(36).slice(2),
          type: 'warn',
          message: msg,
          source: script.name,
          timestamp: Date.now(),
        });
      };

      const logError = (...args: any[]) => {
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        ctx.onLog({
          id: Math.random().toString(36).slice(2),
          type: 'error',
          message: msg,
          source: script.name,
          timestamp: Date.now(),
        });
      };

      const mathProxy = {
        ...Math,
        random: (min?: number, max?: number) => {
          if (min !== undefined && max !== undefined) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
          }
          if (min !== undefined) {
            return Math.floor(Math.random() * min) + 1;
          }
          return Math.random();
        },
        rad: (deg: number) => THREE.MathUtils.degToRad(deg),
        deg: (rad: number) => THREE.MathUtils.radToDeg(rad),
        clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
        huge: Infinity,
        pi: Math.PI,
      };

      sandboxFunction(
        scriptContext,
        workspaceProxy,
        gameProxy,
        Vector3,
        CFrame,
        Color3,
        TweenService,
        TweenInfo,
        enumProxy,
        taskProxy,
        waitHelper,
        logPrint,
        logWarn,
        logError,
        mathProxy,
        String,
        { insert: (arr: any[], v: any) => arr.push(v), remove: (arr: any[], i: number) => arr.splice(i - 1, 1) },
        abortController.signal
      ).catch((err: any) => {
        if (!abortController.signal.aborted) {
          ctx.onLog({
            id: Math.random().toString(36).slice(2),
            type: 'error',
            message: `Script [${script.name}] Error: ${err?.message || err}`,
            source: script.name,
            timestamp: Date.now(),
          });
        }
      });
    } catch (syntaxErr: any) {
      ctx.onLog({
        id: Math.random().toString(36).slice(2),
        type: 'error',
        message: `Script [${script.name}] Syntax Error: ${syntaxErr?.message || syntaxErr}`,
        source: script.name,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Translates Roblox Lua idioms and syntax into valid asynchronous JavaScript
   */
  private transpileLuaToJS(luaCode: string): string {
    let code = luaCode;

    // 1. Strip comments
    code = code.replace(/--\[\[[\s\S]*?\]\]/g, '');
    code = code.replace(/--.*$/gm, '');

    // 2. Convert Lua Method calls: object:Method(...) -> object.Method(...)
    code = code.replace(/([a-zA-Z0-9_\)\]])\s*:\s*([a-zA-Z0-9_]+)\s*\(/g, '$1.$2(');

    // 3. Convert table dictionary literals: { Key = Value, ... } -> { Key: Value, ... }
    // Replace { Position = ..., Size = ... } inside curly braces
    code = code.replace(/\{([\s\S]*?)\}/g, (match, body) => {
      // Replace Identifier = inside object literals with Identifier:
      const convertedBody = body.replace(/([a-zA-Z0-9_]+)\s*=\s*/g, '$1: ');
      return `{${convertedBody}}`;
    });

    // 4. Keywords
    code = code.replace(/\bnil\b/g, 'null');
    code = code.replace(/~=/g, '!==');
    code = code.replace(/\bnot\b/g, '!');
    code = code.replace(/\band\b/g, '&&');
    code = code.replace(/\bor\b/g, '||');
    code = code.replace(/\blocal\b/g, 'let');

    // 5. Loops & Conditionals
    // while <cond> do
    code = code.replace(
      /\bwhile\s+([\s\S]+?)\s+do\b/g,
      'while ($1) {\n  if (abortSignal && abortSignal.aborted) return;\n'
    );

    // for i = 1, 10, 1 do
    code = code.replace(
      /\bfor\s+([a-zA-Z0-9_]+)\s*=\s*([^,]+),\s*([^,]+)(?:,\s*([^,]+))?\s+do\b/g,
      (_m, v, start, end, step) => {
        const s = step ? step.trim() : '1';
        return `for (let ${v} = ${start.trim()}; ${v} <= ${end.trim()}; ${v} += ${s}) {\n`;
      }
    );

    // if <cond> then
    code = code.replace(/\bif\s+([\s\S]+?)\s+then\b/g, 'if ($1) {');

    // elseif <cond> then
    code = code.replace(/\belseif\s+([\s\S]+?)\s+then\b/g, '} else if ($1) {');

    // else
    code = code.replace(/\belse\b/g, '} else {');

    // function Name(args) -> async function Name(args) {
    code = code.replace(/\bfunction\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g, 'async function $1($2) {');

    // function(args) -> async function(args) {
    code = code.replace(/\bfunction\s*\(([^)]*)\)/g, 'async function($1) {');

    // end -> }
    code = code.replace(/\bend\b/g, '}');

    // 6. Async waits
    code = code.replace(/\b(?<!await\s+)task\.wait\b/g, 'await task.wait');
    code = code.replace(/\b(?<!await\s+)wait\b/g, 'await wait');

    // 7. Handle string concatenation .. -> +
    code = code.replace(/\s*\.\.\s*/g, ' + ');

    return code;
  }
}

export const LUA_PRESET_TEMPLATES = [
  {
    name: 'Kill Brick (Lava / Hazard)',
    description: 'Instantly destroys player health and shatters character on contact',
    code: `local part = script.Parent

local function onTouch(hit)
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        humanoid.Health = 0
    end
end

part.Touched:Connect(onTouch)`,
  },
  {
    name: 'Tweening Moving Platform (Elevator)',
    description: 'Smoothly moves platform up and down in a continuous loop',
    code: `local part = script.Parent
local TweenService = game:GetService("TweenService")

local tweenInfo = TweenInfo.new(3, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut, -1, true)
local goal = { Position = part.Position.add(Vector3.new(0, 14, 0)) }

local tween = TweenService:Create(part, tweenInfo, goal)
tween:Play()`,
  },
  {
    name: 'Spinning Obstacle Spinner',
    description: 'Continuously rotates around the Y axis',
    code: `local part = script.Parent

while true do
    part.Orientation = part.Orientation.add(Vector3.new(0, 4, 0))
    task.wait(0.03)
end`,
  },
  {
    name: 'Disappearing Fading Bridge',
    description: 'Fades and disables collision when stepped on, then reappears',
    code: `local part = script.Parent
local debounce = false

local function onTouch(hit)
    if debounce then return end
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        debounce = true
        task.wait(0.4)
        part.Transparency = 0.85
        part.CanCollide = false
        task.wait(3)
        part.Transparency = 0
        part.CanCollide = true
        debounce = false
    end
end

part.Touched:Connect(onTouch)`,
  },
  {
    name: 'Speed Boost Pad (+WalkSpeed)',
    description: 'Grants temporary high walking speed when touched',
    code: `local part = script.Parent

local function onTouch(hit)
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid and humanoid.WalkSpeed == 16 then
        humanoid.WalkSpeed = 36
        task.wait(4)
        humanoid.WalkSpeed = 16
    end
end

part.Touched:Connect(onTouch)`,
  },
  {
    name: 'Jump Boost Pad (+JumpPower)',
    description: 'Grants super jump boost power when touched',
    code: `local part = script.Parent

local function onTouch(hit)
    local humanoid = hit.Parent and hit.Parent:FindFirstChild("Humanoid")
    if humanoid and humanoid.JumpPower == 50 then
        humanoid.JumpPower = 95
        task.wait(3.5)
        humanoid.JumpPower = 50
    end
end

part.Touched:Connect(onTouch)`,
  },
  {
    name: 'Color Cycle Disco Part',
    description: 'Cycles through random bright neon disco colors',
    code: `local part = script.Parent

while true do
    part.Color = Color3.fromRGB(math.random(60, 255), math.random(60, 255), math.random(60, 255))
    task.wait(0.4)
end`,
  },
];
