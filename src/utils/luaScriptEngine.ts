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

export function createPlayerHitProxy(
  getHealth: () => number,
  setHealth: (hp: number) => void,
  onKill: () => void,
  walkSpeed = 16,
  jumpPower = 50
) {
  const humanoidProxy = {
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
      const cur = getHealth();
      const next = Math.max(0, cur - Number(dmg));
      setHealth(next);
      if (next <= 0) {
        onKill();
      }
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

export class LuaScriptRunner {
  private isRunning: boolean = false;
  private abortControllers: AbortController[] = [];
  private activeTweens: any[] = [];
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
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      // Update active tweens
      for (let i = this.activeTweens.length - 1; i >= 0; i--) {
        const tween = this.activeTweens[i];
        if (tween.state === 'playing') {
          tween.elapsed += deltaSec;
          const progress = Math.min(1, tween.elapsed / tween.duration);
          const eased = this.applyEasing(progress, tween.easingStyle, tween.easingDirection);

          // Interpolate properties
          for (const [prop, targetVal] of Object.entries(tween.goals)) {
            this.interpolateProperty(tween.partId, prop, tween.startVals[prop], targetVal, eased);
          }

          if (progress >= 1) {
            if (tween.reverses && !tween.isReversing) {
              // Reverse back
              tween.isReversing = true;
              tween.elapsed = 0;
              const temp = { ...tween.startVals };
              tween.startVals = { ...tween.goals };
              tween.goals = temp;
            } else if (tween.repeatCount === -1 || tween.repeatCount > 0) {
              if (tween.repeatCount > 0) tween.repeatCount--;
              tween.elapsed = 0;
              if (tween.reverses) {
                tween.isReversing = false;
                const temp = { ...tween.startVals };
                tween.startVals = { ...tween.goals };
                tween.goals = temp;
              }
            } else {
              tween.state = 'completed';
              this.activeTweens.splice(i, 1);
              if (tween.onComplete) tween.onComplete();
            }
          }
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private applyEasing(t: number, style: string = 'Quad', direction: string = 'InOut'): number {
    // Standard Roblox Easing calculation
    const easeIn = (p: number): number => {
      switch (style?.toLowerCase()) {
        case 'linear':
          return p;
        case 'sine':
          return 1 - Math.cos((p * Math.PI) / 2);
        case 'cubic':
          return p * p * p;
        case 'bounce': {
          const b = (n: number) => {
            if (n < 1 / 2.75) return 7.5625 * n * n;
            if (n < 2 / 2.75) return 7.5625 * (n -= 1.5 / 2.75) * n + 0.75;
            if (n < 2.5 / 2.75) return 7.5625 * (n -= 2.25 / 2.75) * n + 0.9375;
            return 7.5625 * (n -= 2.625 / 2.75) * n + 0.984375;
          };
          return 1 - b(1 - p);
        }
        case 'quad':
        default:
          return p * p;
      }
    };

    const dir = direction?.toLowerCase() || 'inout';
    if (dir === 'in') return easeIn(t);
    if (dir === 'out') return 1 - easeIn(1 - t);
    // InOut
    return t < 0.5 ? 0.5 * easeIn(t * 2) : 0.5 * (2 - easeIn((1 - t) * 2));
  }

  private interpolateProperty(partId: string, prop: string, start: any, target: any, t: number) {
    if (!this.context) return;
    const part = this.context.parts.get(partId);
    const mesh = this.context.meshes.get(partId);
    if (!part || !mesh) return;

    const lowerProp = prop.toLowerCase();

    if (lowerProp === 'position') {
      const sx = start.x ?? start[0] ?? 0;
      const sy = start.y ?? start[1] ?? 0;
      const sz = start.z ?? start[2] ?? 0;
      const tx = target.x ?? target[0] ?? 0;
      const ty = target.y ?? target[1] ?? 0;
      const tz = target.z ?? target[2] ?? 0;

      const curX = sx + (tx - sx) * t;
      const curY = sy + (ty - sy) * t;
      const curZ = sz + (tz - sz) * t;

      mesh.position.set(curX, curY, curZ);
      part.position = [curX, curY, curZ];
      this.context.onPartUpdated?.(partId, { position: [curX, curY, curZ] });
    } else if (lowerProp === 'size') {
      const sx = start.x ?? start[0] ?? 1;
      const sy = start.y ?? start[1] ?? 1;
      const sz = start.z ?? start[2] ?? 1;
      const tx = target.x ?? target[0] ?? 1;
      const ty = target.y ?? target[1] ?? 1;
      const tz = target.z ?? target[2] ?? 1;

      const curX = sx + (tx - sx) * t;
      const curY = sy + (ty - sy) * t;
      const curZ = sz + (tz - sz) * t;

      mesh.scale.set(curX / part.size[0], curY / part.size[1], curZ / part.size[2]);
      part.size = [curX, curY, curZ];
      this.context.onPartUpdated?.(partId, { size: [curX, curY, curZ] });
    } else if (lowerProp === 'orientation' || lowerProp === 'rotation') {
      const rx = (start.x ?? start[0] ?? 0) + ((target.x ?? target[0] ?? 0) - (start.x ?? start[0] ?? 0)) * t;
      const ry = (start.y ?? start[1] ?? 0) + ((target.y ?? target[1] ?? 0) - (start.y ?? start[1] ?? 0)) * t;
      const rz = (start.z ?? start[2] ?? 0) + ((target.z ?? target[2] ?? 0) - (start.z ?? start[2] ?? 0)) * t;

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
      const val = s + (tg - s) * t;
      part.transparency = val;
      if (mesh.material && !Array.isArray(mesh.material)) {
        mesh.material.opacity = Math.max(0, 1 - val);
        mesh.material.transparent = val > 0;
      }
      this.context.onPartUpdated?.(partId, { transparency: val });
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
    const createPartProxy = (part: StudioPart | null, pId: string) => {
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
          return {
            x: part.position[0],
            y: part.position[1],
            z: part.position[2],
            X: part.position[0],
            Y: part.position[1],
            Z: part.position[2],
          };
        },
        set Position(val: any) {
          const x = val.x ?? val.X ?? val[0] ?? part.position[0];
          const y = val.y ?? val.Y ?? val[1] ?? part.position[1];
          const z = val.z ?? val.Z ?? val[2] ?? part.position[2];
          part.position = [x, y, z];
          const mesh = ctx.meshes.get(pId);
          if (mesh) mesh.position.set(x, y, z);
          ctx.onPartUpdated?.(pId, { position: [x, y, z] });
        },
        get Size() {
          return {
            x: part.size[0],
            y: part.size[1],
            z: part.size[2],
            X: part.size[0],
            Y: part.size[1],
            Z: part.size[2],
          };
        },
        set Size(val: any) {
          const x = val.x ?? val.X ?? val[0] ?? part.size[0];
          const y = val.y ?? val.Y ?? val[1] ?? part.size[1];
          const z = val.z ?? val.Z ?? val[2] ?? part.size[2];
          part.size = [x, y, z];
          const mesh = ctx.meshes.get(pId);
          if (mesh) {
            mesh.scale.set(x, y, z);
          }
          ctx.onPartUpdated?.(pId, { size: [x, y, z] });
        },
        get Orientation() {
          return {
            x: part.rotation[0],
            y: part.rotation[1],
            z: part.rotation[2],
            X: part.rotation[0],
            Y: part.rotation[1],
            Z: part.rotation[2],
          };
        },
        set Orientation(val: any) {
          const x = val.x ?? val.X ?? val[0] ?? part.rotation[0];
          const y = val.y ?? val.Y ?? val[1] ?? part.rotation[1];
          const z = val.z ?? val.Z ?? val[2] ?? part.rotation[2];
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
          return part.color;
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
        get Material() {
          return part.material;
        },
        set Material(val: string) {
          part.material = val as any;
          ctx.onPartUpdated?.(pId, { material: part.material });
        },
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
    };

    // Allow workspace.PartName access
    for (const [id, p] of ctx.parts.entries()) {
      workspaceProxy[p.name] = createPartProxy(p, id);
    }

    const TweenService = {
      Create: (partObj: any, tweenInfo: any, goals: any) => {
        let targetPartId = scriptParentPartId;
        for (const [id, p] of ctx.parts.entries()) {
          if (p.name === partObj?.Name) {
            targetPartId = id;
            break;
          }
        }

        const tween = {
          partId: targetPartId,
          duration: tweenInfo?.time || 1,
          easingStyle: tweenInfo?.easingStyle || 'Quad',
          easingDirection: tweenInfo?.easingDirection || 'InOut',
          repeatCount: tweenInfo?.repeatCount || 0,
          reverses: !!tweenInfo?.reverses,
          isReversing: false,
          goals: { ...goals },
          startVals: {} as any,
          elapsed: 0,
          state: 'ready',
          Play: () => {
            const part = ctx.parts.get(targetPartId);
            if (part) {
              for (const prop of Object.keys(goals)) {
                const lp = prop.toLowerCase();
                if (lp === 'position') tween.startVals[prop] = { x: part.position[0], y: part.position[1], z: part.position[2] };
                else if (lp === 'size') tween.startVals[prop] = { x: part.size[0], y: part.size[1], z: part.size[2] };
                else if (lp === 'orientation' || lp === 'rotation') tween.startVals[prop] = { x: part.rotation[0], y: part.rotation[1], z: part.rotation[2] };
                else if (lp === 'transparency') tween.startVals[prop] = part.transparency;
              }
            }
            tween.state = 'playing';
            if (!this.activeTweens.includes(tween)) {
              this.activeTweens.push(tween);
            }
          },
          Pause: () => {
            tween.state = 'paused';
          },
          Cancel: () => {
            tween.state = 'cancelled';
            const idx = this.activeTweens.indexOf(tween);
            if (idx !== -1) this.activeTweens.splice(idx, 1);
          },
        };
        return tween;
      },
    };

    const TweenInfo = {
      new: (
        time: number = 1,
        easingStyle: string = 'Quad',
        easingDirection: string = 'InOut',
        repeatCount: number = 0,
        reverses: boolean = false
      ) => ({
        time,
        easingStyle,
        easingDirection,
        repeatCount,
        reverses,
      }),
    };

    const Vector3 = {
      new: (x: number = 0, y: number = 0, z: number = 0) => ({ x, y, z, X: x, Y: y, Z: z }),
      zero: { x: 0, y: 0, z: 0 },
      one: { x: 1, y: 1, z: 1 },
    };

    const Color3 = {
      fromRGB: (r: number, g: number, b: number) => ({
        r,
        g,
        b,
        hex: `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`,
      }),
      new: (r: number, g: number, b: number) => ({
        r: r * 255,
        g: g * 255,
        b: b * 255,
        hex: `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`,
      }),
      fromHex: (hex: string) => ({ hex }),
    };

    const gameProxy: any = {
      Workspace: workspaceProxy,
      workspace: workspaceProxy,
      ServerScriptService: { Name: 'ServerScriptService' },
      GetService: (serviceName: string) => {
        if (serviceName.toLowerCase() === 'tweenservice') return TweenService;
        if (serviceName.toLowerCase() === 'workspace') return workspaceProxy;
        return { Name: serviceName };
      },
    };

    const waitHelper = (seconds: number = 0.03): Promise<void> => {
      return new Promise((resolve) => {
        if (abortController.signal.aborted) return;
        const timer = setTimeout(() => {
          resolve();
        }, Math.max(10, seconds * 1000));

        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timer);
        });
      });
    };

    // Safe execution wrapper for transpile/interpreted Lua code
    try {
      const jsCode = this.transpileLuaToJS(script.code);

      const sandboxFunction = new Function(
        'script',
        'workspace',
        'game',
        'Vector3',
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
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
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

      sandboxFunction(
        scriptContext,
        workspaceProxy,
        gameProxy,
        Vector3,
        Color3,
        TweenService,
        TweenInfo,
        enumProxy,
        taskProxy,
        waitHelper,
        logPrint,
        logWarn,
        logError,
        Math,
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
   * Lightweight robust transpiler translating Lua idioms into asynchronous JavaScript
   */
  private transpileLuaToJS(luaCode: string): string {
    let code = luaCode;

    // Strip comments
    code = code.replace(/--\[\[[\s\S]*?\]\]/g, '');
    code = code.replace(/--.*$/gm, '');

    // Replace Lua keywords and idioms
    // nil -> null
    code = code.replace(/\bnil\b/g, 'null');
    // ~= -> !==
    code = code.replace(/~=/g, '!==');
    // == stays ==
    // not -> !
    code = code.replace(/\bnot\b/g, '!');
    // and -> &&
    code = code.replace(/\band\b/g, '&&');
    // or -> ||
    code = code.replace(/\bor\b/g, '||');
    // local -> let
    code = code.replace(/\blocal\b/g, 'let');

    // while <cond> do -> while (<cond>) { if (abortSignal && abortSignal.aborted) return; await task.wait(0.01);
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

    // task.wait(...) -> await task.wait(...)
    code = code.replace(/\b(?<!await\s+)task\.wait\b/g, 'await task.wait');
    // wait(...) -> await wait(...)
    code = code.replace(/\b(?<!await\s+)wait\b/g, 'await wait');

    // Handle string concatenation .. -> +
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
local goal = { Position = part.Position + Vector3.new(0, 14, 0) }

local tween = TweenService:Create(part, tweenInfo, goal)
tween:Play()`,
  },
  {
    name: 'Spinning Obstacle Spinner',
    description: 'Continuously rotates around the Y axis',
    code: `local part = script.Parent

while true do
    part.Orientation = part.Orientation + Vector3.new(0, 4, 0)
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
