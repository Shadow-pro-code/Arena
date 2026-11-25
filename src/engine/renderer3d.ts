import type {
  ArenaDef,
  AvatarConfig,
  GraphicsQuality,
  MonsterArchetype,
  OverworldNodeDef,
  SceneryPropDef,
  SecretBossDef,
  WorldChestDef,
  WorldEventZoneDef,
  WorldFastTravelDef,
  WorldNpcDef,
  WorldPortalDef,
} from '../types/game';
import { MONSTERS, WEAPONS } from '../data/gameCatalog';
import {
  renderUnifiedFighterMesh,
  renderUnifiedMonsterMesh,
  type RendererMeshHost,
} from './renderer3dMeshes';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Camera3D {
  pos: Vec3;
  target: Vec3;
  fov: number;
  near: number;
}

export interface RenderFighter {
  id: string;
  name: string;
  avatar: AvatarConfig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  animState: 'idle' | 'run' | 'attack' | 'heavy' | 'power' | 'dodge' | 'block' | 'hurt' | 'dead';
  animTime: number;
  walkPhase: number;
  comboStep: number;
  hitFlash: number;
  shieldActive: boolean;
  overdriveActive: boolean;
  frozenTimer: number;
  team: 'player1' | 'player2' | 'enemy';
  weaponLevel?: number;
  bankAngle?: number;
  vy?: number;
  squash?: number;
  isAirborne?: boolean;
}

export interface RenderMonster {
  id: string;
  archetype: MonsterArchetype;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  walkPhase: number;
  attackTimer: number;
  telegraphTimer: number;
  telegraphRadius: number;
  hitFlash: number;
  frozenTimer: number;
  isBoss: boolean;
}

export interface RenderProjectile {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  color: string;
  coreColor: string;
  radius: number;
  kind: 'arrow' | 'orb' | 'fireball';
}

export interface RenderRingVfx {
  x: number;
  y: number;
  z: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  filled?: boolean;
  isFusion?: boolean;
  secondaryColor?: string;
}

export interface RenderSlashVfx {
  x: number;
  y: number;
  z: number;
  yaw: number;
  radius: number;
  arcSpread: number;
  color: string;
  alpha: number;
  tilt: number;
  critical?: boolean;
}

export interface RenderLightningVfx {
  x: number;
  z: number;
  color: string;
  alpha: number;
  seed: number;
}

export interface RenderDashTrail {
  x: number;
  y: number;
  z: number;
  yaw: number;
  color: string;
  alpha: number;
  hScale: number;
}

export interface RenderPickup {
  id: string;
  x: number;
  z: number;
  kind: 'heal' | 'energy' | 'gold';
  bobPhase: number;
}

export interface RenderParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  alpha: number;
}

export interface RenderFloatingText {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

export interface RenderScenePayload {
  arena: ArenaDef;
  time: number;
  quality: GraphicsQuality;
  fighters: RenderFighter[];
  monsters: RenderMonster[];
  projectiles: RenderProjectile[];
  rings: RenderRingVfx[];
  slashes: RenderSlashVfx[];
  lightnings: RenderLightningVfx[];
  dashTrails?: RenderDashTrail[];
  pickups: RenderPickup[];
  particles: RenderParticle[];
  floatingTexts: RenderFloatingText[];
  shrineCooldowns?: Record<string, number>;
  showFloorLabels?: boolean;
  openedChests?: string[];
  gatheredNodeIds?: string[];
  discoveredWaystoneIds?: string[];
  nearbyInteractable?: { label: string; kind: string } | null;
  isOverworld?: boolean;
  biomeSkyTint?: string;
  secretBossShrines?: SecretBossDef[];
  defeatedSecretBossIds?: string[];
  worldEventZones?: WorldEventZoneDef[];
  completedWorldEventIds?: string[];
  activeEventZoneId?: string;
  showFloatingDamage?: boolean;
}

interface PolyOpts {
  unlit?: boolean;
  doubleSided?: boolean;
  stroke?: string;
  lineWidth?: number;
  alpha?: number;
  flashWhite?: number;
  freezeTint?: number;
  depthBias?: number;
  specular?: number;
  rotX?: number;
  rotZ?: number;
}

interface PooledFace {
  // Up to 8 vertices after near-plane clipping (16 floats: x0,y0,...)
  pts: Float32Array;
  vCount: number;
  depth: number;
  fill: string;
  stroke: string | undefined;
  lineWidth: number;
  alpha: number;
}

// Fast hex RGB lookup cache
const hexCache = new Map<string, readonly [number, number, number]>();
const rgbaTintCache = new Map<string, string>();
const shadedColorLut = new Map<string, string>();

function parseHex(hex: string): readonly [number, number, number] {
  let cached = hexCache.get(hex);
  if (cached) return cached;

  let clean = hex;
  if (clean.charCodeAt(0) === 35) clean = clean.slice(1);
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const num = parseInt(clean, 16);
  cached = isNaN(num)
    ? ([120, 130, 145] as const)
    : ([(num >> 16) & 255, (num >> 8) & 255, num & 255] as const);
  if (hexCache.size > 512) hexCache.clear();
  hexCache.set(hex, cached);
  return cached;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const aQ = Math.max(0, Math.min(20, Math.round(alpha * 20)));
  const key = `${hex}|${aQ}`;
  let cached = rgbaTintCache.get(key);
  if (cached) return cached;
  const rgb = parseHex(hex);
  cached = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(aQ / 20).toFixed(2)})`;
  if (rgbaTintCache.size > 1024) rgbaTintCache.clear();
  rgbaTintCache.set(key, cached);
  return cached;
}

function shadeColorFast(
  baseHex: string,
  intensity: number,
  fogHex: string,
  fogFactor: number,
  flashWhite: number,
  freezeTint: number,
  rimBoost: number,
  specularBoost: number,
  rimTintR: number,
  rimTintG: number,
  rimTintB: number
): string {
  // Fast quantized LUT hit for standard opaque/non-flashed geometry (covers ~92% of scene faces)
  const useLut = flashWhite <= 0.005 && freezeTint <= 0.005;
  let lutKey = '';
  if (useLut) {
    const iQ = Math.max(0, Math.min(48, (intensity * 32) | 0));
    const fQ = Math.max(0, Math.min(16, (fogFactor * 24) | 0));
    const rQ = Math.max(0, Math.min(12, (rimBoost * 24) | 0));
    const sQ = Math.max(0, Math.min(12, (specularBoost * 16) | 0));
    lutKey = `${baseHex}|${fogHex}|${iQ}|${fQ}|${rQ}|${sQ}|${rimTintR >> 4}`;
    const hit = shadedColorLut.get(lutKey);
    if (hit) return hit;
  }

  const base = parseHex(baseHex);
  let r = base[0] * intensity + rimBoost * rimTintR * 0.28 + specularBoost * 88;
  let g = base[1] * intensity + rimBoost * rimTintG * 0.34 + specularBoost * 84;
  let b = base[2] * intensity + rimBoost * rimTintB * 0.42 + specularBoost * 78;

  if (freezeTint > 0.005) {
    const fz = freezeTint * 0.45;
    r = r * (1 - fz) + 96 * fz;
    g = g * (1 - fz) + 195 * fz;
    b = b * (1 - fz) + 255 * fz;
  }

  if (flashWhite > 0.005) {
    r += (255 - r) * flashWhite;
    g += (255 - g) * flashWhite;
    b += (255 - b) * flashWhite;
  }

  if (fogFactor > 0.01) {
    const fog = parseHex(fogHex);
    r += (fog[0] - r) * fogFactor;
    g += (fog[1] - g) * fogFactor;
    b += (fog[2] - b) * fogFactor;
  }

  const out = `rgb(${r < 0 ? 0 : r > 255 ? 255 : r | 0},${g < 0 ? 0 : g > 255 ? 255 : g | 0},${b < 0 ? 0 : b > 255 ? 255 : b | 0})`;
  if (useLut) {
    if (shadedColorLut.size > 8192) shadedColorLut.clear();
    shadedColorLut.set(lutKey, out);
  }
  return out;
}

const SHADOW_RGBA_LUT: string[] = Array.from({ length: 21 }, (_, i) =>
  `rgba(4,6,12,${(i / 20).toFixed(2)})`
);

interface CircleTrigTable {
  cos: Float64Array;
  sin: Float64Array;
}

const circleTrigCache = new Map<number, CircleTrigTable>();
function getCircleTrig(segs: number): CircleTrigTable {
  let entry = circleTrigCache.get(segs);
  if (entry) return entry;
  const cos = new Float64Array(segs);
  const sin = new Float64Array(segs);
  const step = (Math.PI * 2) / segs;
  for (let i = 0; i < segs; i++) {
    const a = i * step;
    cos[i] = Math.cos(a);
    sin[i] = Math.sin(a);
  }
  entry = { cos, sin };
  circleTrigCache.set(segs, entry);
  return entry;
}

// Primary sunlit directional key light
const LIGHT_LEN = Math.hypot(0.55, 0.78, 0.42);
const LIGHT_X = 0.55 / LIGHT_LEN;
const LIGHT_Y = 0.78 / LIGHT_LEN;
const LIGHT_Z = 0.42 / LIGHT_LEN;

// Half-vector approximation for crisp specular highlights on armor & steel
const HALF_LEN = Math.hypot(LIGHT_X + 0.15, LIGHT_Y + 0.35, LIGHT_Z + 0.85);
const HALF_X = (LIGHT_X + 0.15) / HALF_LEN;
const HALF_Y = (LIGHT_Y + 0.35) / HALF_LEN;
const HALF_Z = (LIGHT_Z + 0.85) / HALF_LEN;

const BOX_CORNERS: readonly [number, number, number][] = [
  [-0.5, -0.5, -0.5],
  [0.5, -0.5, -0.5],
  [0.5, 0.5, -0.5],
  [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5],
  [0.5, -0.5, 0.5],
  [0.5, 0.5, 0.5],
  [-0.5, 0.5, 0.5],
];

const BOX_FACES: readonly [number, number, number, number][] = [
  [4, 5, 6, 7],
  [1, 0, 3, 2],
  [5, 1, 2, 6],
  [0, 4, 7, 3],
  [7, 6, 2, 3],
  [0, 1, 5, 4],
];

const SHOWCASE_CAMERA: Camera3D = {
  pos: { x: 0, y: 2.35, z: 5.2 },
  target: { x: 0, y: 1.25, z: 0 },
  fov: 42,
  near: 0.4,
};

export class SoftwareRenderer3D {
  private width = 800;
  private height = 500;
  private cx = 400;
  private cy = 250;
  private focal = 520;

  private camPosX = 0;
  private camPosY = 8;
  private camPosZ = 14;
  private camTargetX = 0;
  private camTargetY = 0;
  private camTargetZ = 0;

  private rightX = 1;
  private rightY = 0;
  private rightZ = 0;
  private upX = 0;
  private upY = 1;
  private upZ = 0;
  private fwdX = 0;
  private fwdY = 0;
  private fwdZ = -1;

  private near = 0.45;
  private fogColor = '#1C2230';
  private isOverworld = false;
  private activeQuality: GraphicsQuality = 'balanced';
  private rimTintR = 90;
  private rimTintG = 165;
  private rimTintB = 230;

  // Pooled geometry & face buffers (eliminates per-frame GC spikes)
  private facePool: PooledFace[] = [];
  private faceCount = 0;
  private faceDepths = new Float32Array(2048);
  private sortOrder = new Int32Array(2048);
  private qsStackLo = new Int32Array(64);
  private qsStackHi = new Int32Array(64);

  // Reusable O(1) lookup sets for Overworld entities
  private tmpGatheredSet = new Set<string>();
  private tmpWaystoneSet = new Set<string>();
  private tmpOpenedChestSet = new Set<string>();
  private tmpDefeatedBossSet = new Set<string>();
  private tmpCompletedEventSet = new Set<string>();

  private vecPool: Vec3[] = [];
  private vecCursor = 0;
  private vecFrameWaterMark = 0;

  // Pre-allocated near-plane polygon clip scratch buffers (max 8 verts * 3 coords)
  private clipInX = new Float64Array(12);
  private clipInY = new Float64Array(12);
  private clipInZ = new Float64Array(12);
  private clipOutX = new Float64Array(12);
  private clipOutY = new Float64Array(12);
  private clipOutZ = new Float64Array(12);

  // Reusable projection point pairs for 2D rings/ground disks
  private tmpPtsX = new Float64Array(40);
  private tmpPtsY = new Float64Array(40);

  // Offscreen cached sky & horizon panorama (re-baked only when arena/tint/size/quality/yaw-bucket changes)
  private skyCanvas: HTMLCanvasElement | null = null;
  private skyCtx: CanvasRenderingContext2D | null = null;
  private skyCacheKey = '';

  // Precomputed fighter showcase object to avoid per-frame object literal churn
  private showcaseFighter: RenderFighter | null = null;

  private allocVec(x: number, y: number, z: number): Vec3 {
    const idx = this.vecCursor++;
    if (idx >= this.vecPool.length) {
      const v = { x, y, z };
      this.vecPool.push(v);
      return v;
    }
    const v = this.vecPool[idx];
    v.x = x;
    v.y = y;
    v.z = z;
    return v;
  }

  private allocFace(): PooledFace {
    const idx = this.faceCount++;
    if (idx >= this.facePool.length) {
      const f: PooledFace = {
        pts: new Float32Array(16),
        vCount: 0,
        depth: 0,
        fill: '#888',
        stroke: undefined,
        lineWidth: 1,
        alpha: 1,
      };
      this.facePool.push(f);
      return f;
    }
    return this.facePool[idx];
  }

  public beginFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    camera: Camera3D,
    fogColor: string,
    isOverworld = false
  ) {
    this.width = width;
    this.height = height;
    this.cx = width * 0.5;
    this.cy = height * 0.5;
    this.focal = (height * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
    this.near = camera.near;

    this.camPosX = camera.pos.x;
    this.camPosY = camera.pos.y;
    this.camPosZ = camera.pos.z;
    this.camTargetX = camera.target.x;
    this.camTargetY = camera.target.y;
    this.camTargetZ = camera.target.z;

    this.fogColor = fogColor;
    this.isOverworld = isOverworld;
    this.faceCount = 0;
    this.vecCursor = 0;

    let fx = camera.target.x - camera.pos.x;
    let fy = camera.target.y - camera.pos.y;
    let fz = camera.target.z - camera.pos.z;
    const fLen = Math.hypot(fx, fy, fz) || 1;
    fx /= fLen;
    fy /= fLen;
    fz /= fLen;
    this.fwdX = fx;
    this.fwdY = fy;
    this.fwdZ = fz;

    let rx = -fz;
    const ry = 0;
    let rz = fx;
    const rLen = Math.hypot(rx, rz) || 1;
    rx /= rLen;
    rz /= rLen;
    this.rightX = rx;
    this.rightY = ry;
    this.rightZ = rz;

    this.upX = ry * fz - rz * fy;
    this.upY = rz * fx - rx * fz;
    this.upZ = rx * fy - ry * fx;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  public toCam(p: Vec3): Vec3 {
    const dx = p.x - this.camPosX;
    const dy = p.y - this.camPosY;
    const dz = p.z - this.camPosZ;
    return {
      x: dx * this.rightX + dy * this.rightY + dz * this.rightZ,
      y: dx * this.upX + dy * this.upY + dz * this.upZ,
      z: dx * this.fwdX + dy * this.fwdY + dz * this.fwdZ,
    };
  }

  public project(p: Vec3): { sx: number; sy: number; z: number; scale: number } | null {
    const dx = p.x - this.camPosX;
    const dy = p.y - this.camPosY;
    const dz = p.z - this.camPosZ;
    const cz = dx * this.fwdX + dy * this.fwdY + dz * this.fwdZ;
    if (cz <= this.near) return null;
    const cx = dx * this.rightX + dy * this.rightY + dz * this.rightZ;
    const cy = dx * this.upX + dy * this.upY + dz * this.upZ;
    const scale = this.focal / cz;
    return {
      sx: this.cx + cx * scale,
      sy: this.cy - cy * scale,
      z: cz,
      scale,
    };
  }

  private projectIntoTmp(x: number, y: number, z: number, idx: number): boolean {
    const dx = x - this.camPosX;
    const dy = y - this.camPosY;
    const dz = z - this.camPosZ;
    const cz = dx * this.fwdX + dy * this.fwdY + dz * this.fwdZ;
    if (cz <= this.near) return false;
    const cx = dx * this.rightX + dy * this.rightY + dz * this.rightZ;
    const cy = dx * this.upX + dy * this.upY + dz * this.upZ;
    const sc = this.focal / cz;
    this.tmpPtsX[idx] = this.cx + cx * sc;
    this.tmpPtsY[idx] = this.cy - cy * sc;
    return true;
  }

  // Hoisted rotation transform allocating from frame vector pool
  private allocTransformed(
    center: Vec3,
    lx: number,
    ly: number,
    lz: number,
    cosY: number,
    sinY: number,
    hasX: boolean,
    cosX: number,
    sinX: number,
    hasZ: boolean,
    cosZ: number,
    sinZ: number
  ): Vec3 {
    let x = lx;
    let y = ly;
    let z = lz;
    if (hasZ) {
      const x1 = x * cosZ - y * sinZ;
      const y1 = x * sinZ + y * cosZ;
      x = x1;
      y = y1;
    }
    if (hasX) {
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;
      y = y1;
      z = z1;
    }
    const x2 = x * cosY + z * sinY;
    const z2 = -x * sinY + z * cosY;
    return this.allocVec(center.x + x2, center.y + y, center.z + z2);
  }

  public addPolygon(worldVerts: Vec3[], color: string, opts?: PolyOpts) {
    const n = worldVerts.length;
    if (n < 3 || n > 8) return;

    const a = worldVerts[0];
    const b = worldVerts[1];
    const c = worldVerts[2];

    const ux = b.x - a.x;
    const uy = b.y - a.y;
    const uz = b.z - a.z;
    const vx = c.x - a.x;
    const vy = c.y - a.y;
    const vz = c.z - a.z;

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nLenSq = nx * nx + ny * ny + nz * nz;
    if (nLenSq < 1e-12) return;
    const invNLen = 1 / Math.sqrt(nLenSq);
    nx *= invNLen;
    ny *= invNLen;
    nz *= invNLen;

    const vxCam = this.camPosX - a.x;
    const vyCam = this.camPosY - a.y;
    const vzCam = this.camPosZ - a.z;
    const vLenSq = vxCam * vxCam + vyCam * vyCam + vzCam * vzCam;
    const invVLen = vLenSq > 1e-8 ? 1 / Math.sqrt(vLenSq) : 1;
    const ndotv = (nx * vxCam + ny * vyCam + nz * vzCam) * invVLen;

    if (!opts?.doubleSided && ndotv <= 0) return;

    // Transform vertices to camera space and check near plane
    let allFront = true;
    let allBehind = true;
    const nearZ = this.near;
    for (let i = 0; i < n; i++) {
      const w = worldVerts[i];
      const dx = w.x - this.camPosX;
      const dy = w.y - this.camPosY;
      const dz = w.z - this.camPosZ;
      const cx = dx * this.rightX + dy * this.rightY + dz * this.rightZ;
      const cy = dx * this.upX + dy * this.upY + dz * this.upZ;
      const cz = dx * this.fwdX + dy * this.fwdY + dz * this.fwdZ;
      this.clipInX[i] = cx;
      this.clipInY[i] = cy;
      this.clipInZ[i] = cz;
      if (cz <= nearZ) allFront = false;
      else allBehind = false;
    }
    if (allBehind) return;

    let outCount = n;
    let srcX = this.clipInX;
    let srcY = this.clipInY;
    let srcZ = this.clipInZ;

    // Sutherland-Hodgman clip against near plane z = nearZ only when needed
    if (!allFront) {
      outCount = 0;
      let prevX = this.clipInX[n - 1];
      let prevY = this.clipInY[n - 1];
      let prevZ = this.clipInZ[n - 1];
      let prevIn = prevZ > nearZ;

      for (let i = 0; i < n; i++) {
        const curX = this.clipInX[i];
        const curY = this.clipInY[i];
        const curZ = this.clipInZ[i];
        const curIn = curZ > nearZ;

        if (curIn !== prevIn) {
          const t = (nearZ - prevZ) / (curZ - prevZ || 1e-6);
          this.clipOutX[outCount] = prevX + (curX - prevX) * t;
          this.clipOutY[outCount] = prevY + (curY - prevY) * t;
          this.clipOutZ[outCount] = nearZ + 0.001;
          outCount++;
        }
        if (curIn && outCount < 8) {
          this.clipOutX[outCount] = curX;
          this.clipOutY[outCount] = curY;
          this.clipOutZ[outCount] = curZ;
          outCount++;
        }
        prevX = curX;
        prevY = curY;
        prevZ = curZ;
        prevIn = curIn;
      }
      if (outCount < 3) return;
      srcX = this.clipOutX;
      srcY = this.clipOutY;
      srcZ = this.clipOutZ;
    }

    const face = this.allocFace();
    const pts = face.pts;
    let minX = 1e9;
    let maxX = -1e9;
    let minY = 1e9;
    let maxY = -1e9;
    let sumZ = 0;

    for (let i = 0; i < outCount; i++) {
      const cz = srcZ[i];
      const sc = this.focal / cz;
      const sx = this.cx + srcX[i] * sc;
      const sy = this.cy - srcY[i] * sc;
      pts[i * 2] = sx;
      pts[i * 2 + 1] = sy;
      sumZ += cz;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }

    if (maxX < -40 || minX > this.width + 40 || maxY < -40 || minY > this.height + 40) {
      this.faceCount--;
      return;
    }

    const avgZ = sumZ / outCount + (opts?.depthBias ?? 0);
    const fogFactor = this.isOverworld
      ? Math.max(0, Math.min(0.64, (avgZ - 36) / 60))
      : Math.max(0, Math.min(0.58, (avgZ - 26) / 54));

    const flash = opts?.flashWhite ?? 0;
    const freeze = opts?.freezeTint ?? 0;
    let fill: string;

    if (opts?.unlit) {
      fill = shadeColorFast(
        color,
        1.04,
        this.fogColor,
        fogFactor * 0.4,
        flash,
        freeze,
        0,
        0,
        this.rimTintR,
        this.rimTintG,
        this.rimTintB
      );
    } else {
      const effNdotV = ndotv < 0 ? -ndotv : ndotv;
      const ndotl = Math.max(0, nx * LIGHT_X + ny * LIGHT_Y + nz * LIGHT_Z);
      const hemi = 0.5 + 0.5 * ny;
      const invRim = 1 - effNdotV;
      const rim = this.activeQuality === 'eco' ? 0 : invRim * invRim * (this.activeQuality === 'impossible' ? 0.42 : 0.3);
      const ndoth = Math.max(0, nx * HALF_X + ny * HALF_Y + nz * HALF_Z);
      const specPow = ndoth * ndoth * ndoth * ndoth;
      const specAmt = opts?.specular ? specPow * opts.specular : this.activeQuality === 'impossible' ? specPow * 0.14 : 0;
      const intensity = 0.45 + ndotl * 0.64 + hemi * 0.18;
      fill = shadeColorFast(
        color,
        intensity,
        this.fogColor,
        fogFactor,
        flash,
        freeze,
        rim,
        specAmt,
        this.rimTintR,
        this.rimTintG,
        this.rimTintB
      );
    }

    face.vCount = outCount;
    face.depth = avgZ;
    face.fill = fill;
    face.stroke =
      opts?.stroke ??
      (this.activeQuality === 'impossible' && !opts?.unlit && (opts?.alpha ?? 1) >= 0.99 && avgZ < 24 && (opts?.specular ?? 0) > 0.3
        ? 'rgba(255,255,255,0.08)'
        : undefined);
    face.lineWidth = opts?.lineWidth ?? 0.75;
    face.alpha = opts?.alpha ?? 1;
    const faceIdx = this.faceCount - 1;
    if (faceIdx >= this.faceDepths.length) {
      const nextCap = this.faceDepths.length * 2;
      const grown = new Float32Array(nextCap);
      grown.set(this.faceDepths);
      this.faceDepths = grown;
    }
    this.faceDepths[faceIdx] = avgZ;
  }

  public addTaperedCylinder(
    center: Vec3,
    rBottom: number,
    rTop: number,
    height: number,
    rotY: number,
    segs: number,
    color: string,
    opts?: PolyOpts & { capTop?: boolean; capBottom?: boolean }
  ) {
    const halfH = height * 0.5;
    const rotX = opts?.rotX ?? 0;
    const rotZ = opts?.rotZ ?? 0;
    const hasX = rotX !== 0;
    const hasZ = rotZ !== 0;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = hasX ? Math.cos(rotX) : 1;
    const sinX = hasX ? Math.sin(rotX) : 0;
    const cosZ = hasZ ? Math.cos(rotZ) : 1;
    const sinZ = hasZ ? Math.sin(rotZ) : 0;

    const mark = this.vecCursor;
    const botRing: Vec3[] = new Array(segs);
    const topRing: Vec3[] = new Array(segs);
    const hasTopRadius = rTop > 0.002;
    const tipVec = hasTopRadius
      ? null
      : this.allocTransformed(center, 0, halfH, 0, cosY, sinY, hasX, cosX, sinX, hasZ, cosZ, sinZ);

    const { cos: cosRing, sin: sinRing } = getCircleTrig(segs);
    for (let i = 0; i < segs; i++) {
      const ca = cosRing[i];
      const sa = sinRing[i];
      botRing[i] = this.allocTransformed(
        center,
        ca * rBottom,
        -halfH,
        sa * rBottom,
        cosY,
        sinY,
        hasX,
        cosX,
        sinX,
        hasZ,
        cosZ,
        sinZ
      );
      topRing[i] = hasTopRadius
        ? this.allocTransformed(
            center,
            ca * rTop,
            halfH,
            sa * rTop,
            cosY,
            sinY,
            hasX,
            cosX,
            sinX,
            hasZ,
            cosZ,
            sinZ
          )
        : tipVec!;
    }

    const tri: Vec3[] = [botRing[0], botRing[0], topRing[0]];
    const quad: Vec3[] = [botRing[0], botRing[0], topRing[0], topRing[0]];

    for (let i = 0; i < segs; i++) {
      const next = (i + 1) % segs;
      if (hasTopRadius) {
        quad[0] = botRing[next];
        quad[1] = botRing[i];
        quad[2] = topRing[i];
        quad[3] = topRing[next];
        this.addPolygon(quad, color, opts);
      } else {
        tri[0] = botRing[next];
        tri[1] = botRing[i];
        tri[2] = topRing[i];
        this.addPolygon(tri, color, opts);
      }
    }

    if (opts?.capTop !== false && hasTopRadius && segs <= 8) {
      this.addPolygon(topRing, color, opts);
    } else if (opts?.capTop !== false && hasTopRadius) {
      // Fan-cap high segment rings cleanly (supports >8 segments since addPolygon takes up to 8 verts)
      const capCenter = this.allocTransformed(center, 0, halfH, 0, cosY, sinY, hasX, cosX, sinX, hasZ, cosZ, sinZ);
      for (let i = 0; i < segs; i++) {
        const next = (i + 1) % segs;
        tri[0] = topRing[i];
        tri[1] = topRing[next];
        tri[2] = capCenter;
        this.addPolygon(tri, color, opts);
      }
    }
    if (opts?.capBottom && rBottom > 0.002) {
      const botCenter = this.allocTransformed(center, 0, -halfH, 0, cosY, sinY, hasX, cosX, sinX, hasZ, cosZ, sinZ);
      for (let i = 0; i < segs; i++) {
        const next = (i + 1) % segs;
        tri[0] = botRing[next];
        tri[1] = botRing[i];
        tri[2] = botCenter;
        this.addPolygon(tri, color, opts);
      }
    }
    this.vecCursor = mark;
  }

  public addEllipsoid(
    center: Vec3,
    rx: number,
    ry: number,
    rz: number,
    rotY: number,
    segs: number,
    rings: number,
    color: string,
    opts?: PolyOpts
  ) {
    const rotX = opts?.rotX ?? 0;
    const rotZ = opts?.rotZ ?? 0;
    const hasX = rotX !== 0;
    const hasZ = rotZ !== 0;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = hasX ? Math.cos(rotX) : 1;
    const sinX = hasX ? Math.sin(rotX) : 0;
    const cosZ = hasZ ? Math.cos(rotZ) : 1;
    const sinZ = hasZ ? Math.sin(rotZ) : 0;

    const mark = this.vecCursor;
    const ringCount = Math.max(2, rings);
    const ringPts: Vec3[][] = [];
    const { cos: cosTheta, sin: sinTheta } = getCircleTrig(segs);

    for (let r = 1; r < ringCount; r++) {
      const phi = (r / ringCount) * Math.PI - Math.PI * 0.5;
      const cPhi = Math.cos(phi);
      const sPhi = Math.sin(phi);
      const row: Vec3[] = new Array(segs);
      const ly = sPhi * ry;
      const rxc = cPhi * rx;
      const rzc = cPhi * rz;
      for (let i = 0; i < segs; i++) {
        row[i] = this.allocTransformed(
          center,
          cosTheta[i] * rxc,
          ly,
          sinTheta[i] * rzc,
          cosY,
          sinY,
          hasX,
          cosX,
          sinX,
          hasZ,
          cosZ,
          sinZ
        );
      }
      ringPts.push(row);
    }

    const botPole = this.allocTransformed(center, 0, -ry, 0, cosY, sinY, hasX, cosX, sinX, hasZ, cosZ, sinZ);
    const topPole = this.allocTransformed(center, 0, ry, 0, cosY, sinY, hasX, cosX, sinX, hasZ, cosZ, sinZ);

    const firstRow = ringPts[0];
    const lastRow = ringPts[ringPts.length - 1];
    const tri: Vec3[] = [firstRow[0], firstRow[0], botPole];
    for (let i = 0; i < segs; i++) {
      const next = (i + 1) % segs;
      tri[0] = firstRow[i];
      tri[1] = firstRow[next];
      tri[2] = botPole;
      this.addPolygon(tri, color, opts);

      tri[0] = lastRow[next];
      tri[1] = lastRow[i];
      tri[2] = topPole;
      this.addPolygon(tri, color, opts);
    }

    const quad: Vec3[] = [firstRow[0], firstRow[0], firstRow[0], firstRow[0]];
    for (let r = 0; r < ringPts.length - 1; r++) {
      const rA = ringPts[r];
      const rB = ringPts[r + 1];
      for (let i = 0; i < segs; i++) {
        const next = (i + 1) % segs;
        quad[0] = rA[next];
        quad[1] = rA[i];
        quad[2] = rB[i];
        quad[3] = rB[next];
        this.addPolygon(quad, color, opts);
      }
    }
    this.vecCursor = mark;
  }

  public addCapsuleLimb(
    center: Vec3,
    rTop: number,
    rBot: number,
    length: number,
    rotY: number,
    segs: number,
    color: string,
    opts?: PolyOpts
  ) {
    this.addTaperedCylinder(center, rBot, rTop, length, rotY, segs, color, {
      ...opts,
      capTop: true,
      capBottom: true,
    });
    const rotX = opts?.rotX ?? 0;
    const rotZ = opts?.rotZ ?? 0;
    const topCapCenter = this.transformLocal(center, 0, length * 0.45, 0, rotY, rotX, rotZ);
    this.addEllipsoid(topCapCenter, rTop * 1.06, rTop * 0.92, rTop * 1.06, rotY, Math.max(6, segs), 3, color, opts);
  }

  public addSculptedTorso(
    center: Vec3,
    chestW: number,
    waistW: number,
    chestD: number,
    height: number,
    rotY: number,
    segs: number,
    color: string,
    opts?: PolyOpts
  ) {
    const rotX = opts?.rotX ?? 0;
    const rotZ = opts?.rotZ ?? 0;
    const hasX = rotX !== 0;
    const hasZ = rotZ !== 0;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = hasX ? Math.cos(rotX) : 1;
    const sinX = hasX ? Math.sin(rotX) : 0;
    const cosZ = hasZ ? Math.cos(rotZ) : 1;
    const sinZ = hasZ ? Math.sin(rotZ) : 0;

    const mark = this.vecCursor;
    const hHalf = height * 0.5;
    const lvY = [-hHalf, 0, hHalf * 0.82, hHalf];
    const lvRx = [waistW * 0.52, (chestW + waistW) * 0.27, chestW * 0.54, chestW * 0.38];
    const lvRz = [chestD * 0.44, chestD * 0.52, chestD * 0.54, chestD * 0.4];

    const { cos: cosRing, sin: sinRing } = getCircleTrig(segs);
    const rings: Vec3[][] = new Array(4);
    for (let r = 0; r < 4; r++) {
      const row: Vec3[] = new Array(segs);
      const y = lvY[r];
      const rx = lvRx[r];
      const rz = lvRz[r];
      for (let i = 0; i < segs; i++) {
        row[i] = this.allocTransformed(
          center,
          cosRing[i] * rx,
          y,
          sinRing[i] * rz,
          cosY,
          sinY,
          hasX,
          cosX,
          sinX,
          hasZ,
          cosZ,
          sinZ
        );
      }
      rings[r] = row;
    }

    const quad: Vec3[] = [rings[0][0], rings[0][0], rings[1][0], rings[1][0]];
    for (let r = 0; r < 3; r++) {
      const rA = rings[r];
      const rB = rings[r + 1];
      for (let i = 0; i < segs; i++) {
        const next = (i + 1) % segs;
        quad[0] = rA[next];
        quad[1] = rA[i];
        quad[2] = rB[i];
        quad[3] = rB[next];
        this.addPolygon(quad, color, opts);
      }
    }
    const topRing = rings[3];
    if (segs <= 8) {
      this.addPolygon(topRing, color, opts);
    } else {
      const topCenter = this.allocTransformed(center, 0, hHalf, 0, cosY, sinY, hasX, cosX, sinX, hasZ, cosZ, sinZ);
      const tri: Vec3[] = [topRing[0], topRing[0], topCenter];
      for (let i = 0; i < segs; i++) {
        const next = (i + 1) % segs;
        tri[0] = topRing[i];
        tri[1] = topRing[next];
        tri[2] = topCenter;
        this.addPolygon(tri, color, opts);
      }
    }
    this.vecCursor = mark;
  }

  public addTorusRing(
    center: Vec3,
    majorR: number,
    minorR: number,
    rotY: number,
    rotX: number,
    segs: number,
    color: string,
    opts?: PolyOpts
  ) {
    const tubeSegs = 4;
    const hasX = rotX !== 0;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = hasX ? Math.cos(rotX) : 1;
    const sinX = hasX ? Math.sin(rotX) : 0;

    const mark = this.vecCursor;
    const rings: Vec3[][] = new Array(segs);
    const uStep = (Math.PI * 2) / segs;
    const vStep = (Math.PI * 2) / tubeSegs;

    for (let i = 0; i < segs; i++) {
      const u = i * uStep;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      const ring: Vec3[] = new Array(tubeSegs);
      for (let j = 0; j < tubeSegs; j++) {
        const v = j * vStep;
        const rOff = majorR + Math.cos(v) * minorR;
        ring[j] = this.allocTransformed(
          center,
          cu * rOff,
          su * rOff,
          Math.sin(v) * minorR,
          cosY,
          sinY,
          hasX,
          cosX,
          sinX,
          false,
          1,
          0
        );
      }
      rings[i] = ring;
    }

    const quad: Vec3[] = [rings[0][0], rings[0][0], rings[0][0], rings[0][0]];
    for (let i = 0; i < segs; i++) {
      const ni = (i + 1) % segs;
      for (let j = 0; j < tubeSegs; j++) {
        const nj = (j + 1) % tubeSegs;
        quad[0] = rings[i][j];
        quad[1] = rings[ni][j];
        quad[2] = rings[ni][nj];
        quad[3] = rings[i][nj];
        this.addPolygon(quad, color, opts);
      }
    }
    this.vecCursor = mark;
  }

  public addBox(center: Vec3, size: Vec3, rotY: number, color: string, opts?: PolyOpts) {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const rotX = opts?.rotX ?? 0;
    const rotZ = opts?.rotZ ?? 0;
    const hasX = rotX !== 0;
    const hasZ = rotZ !== 0;
    const cosX = hasX ? Math.cos(rotX) : 1;
    const sinX = hasX ? Math.sin(rotX) : 0;
    const cosZ = hasZ ? Math.cos(rotZ) : 1;
    const sinZ = hasZ ? Math.sin(rotZ) : 0;

    const mark = this.vecCursor;
    const verts: Vec3[] = new Array(8);
    for (let i = 0; i < 8; i++) {
      verts[i] = this.allocTransformed(
        center,
        BOX_CORNERS[i][0] * size.x,
        BOX_CORNERS[i][1] * size.y,
        BOX_CORNERS[i][2] * size.z,
        cosY,
        sinY,
        hasX,
        cosX,
        sinX,
        hasZ,
        cosZ,
        sinZ
      );
    }
    const quad: Vec3[] = [verts[0], verts[0], verts[0], verts[0]];
    for (let f = 0; f < 6; f++) {
      const bf = BOX_FACES[f];
      quad[0] = verts[bf[0]];
      quad[1] = verts[bf[1]];
      quad[2] = verts[bf[2]];
      quad[3] = verts[bf[3]];
      this.addPolygon(quad, color, opts);
    }
    this.vecCursor = mark;
  }

  public addPyramid(
    baseCenter: Vec3,
    radius: number,
    height: number,
    rotY: number,
    color: string,
    opts?: PolyOpts
  ) {
    const mark = this.vecCursor;
    const tip = this.allocVec(baseCenter.x, baseCenter.y + height, baseCenter.z);
    const ring: Vec3[] = new Array(4);
    for (let i = 0; i < 4; i++) {
      const a = rotY + (i * Math.PI) / 2 + Math.PI / 4;
      ring[i] = this.allocVec(
        baseCenter.x + Math.cos(a) * radius,
        baseCenter.y,
        baseCenter.z + Math.sin(a) * radius
      );
    }
    const tri: Vec3[] = [ring[0], ring[0], tip];
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      tri[0] = ring[next];
      tri[1] = ring[i];
      tri[2] = tip;
      this.addPolygon(tri, color, opts);
    }
    this.vecCursor = mark;
  }

  public addOctahedron(
    center: Vec3,
    radius: number,
    height: number,
    rotY: number,
    color: string,
    opts?: PolyOpts
  ) {
    const mark = this.vecCursor;
    const top = this.allocVec(center.x, center.y + height * 0.5, center.z);
    const bot = this.allocVec(center.x, center.y - height * 0.5, center.z);
    const mid: Vec3[] = new Array(4);
    for (let i = 0; i < 4; i++) {
      const a = rotY + (i * Math.PI) / 2;
      mid[i] = this.allocVec(
        center.x + Math.cos(a) * radius,
        center.y,
        center.z + Math.sin(a) * radius
      );
    }
    const tri: Vec3[] = [mid[0], mid[0], top];
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      tri[0] = mid[next];
      tri[1] = mid[i];
      tri[2] = top;
      this.addPolygon(tri, color, opts);

      tri[0] = mid[i];
      tri[1] = mid[next];
      tri[2] = bot;
      this.addPolygon(tri, color, opts);
    }
    this.vecCursor = mark;
  }

  public flushFaces(ctx: CanvasRenderingContext2D) {
    const count = this.faceCount;
    if (count === 0) return;

    if (count > this.vecFrameWaterMark) this.vecFrameWaterMark = count;

    if (this.sortOrder.length < count) {
      let nextCap = this.sortOrder.length;
      while (nextCap < count) nextCap *= 2;
      this.sortOrder = new Int32Array(nextCap);
    }
    const order = this.sortOrder;
    const depths = this.faceDepths;
    for (let i = 0; i < count; i++) order[i] = i;

    // Inline iterative QuickSort + insertion sort cutoff (descending back-to-front, zero closure allocations)
    if (count > 1) {
      let sp = 0;
      this.qsStackLo[0] = 0;
      this.qsStackHi[0] = count - 1;
      while (sp >= 0) {
        const lo = this.qsStackLo[sp];
        const hi = this.qsStackHi[sp];
        sp--;
        if (hi - lo <= 16) {
          for (let i = lo + 1; i <= hi; i++) {
            const key = order[i];
            const kd = depths[key];
            let j = i - 1;
            while (j >= lo && depths[order[j]] < kd) {
              order[j + 1] = order[j];
              j--;
            }
            order[j + 1] = key;
          }
          continue;
        }
        const mid = (lo + hi) >> 1;
        const pivotDepth = depths[order[mid]];
        let i = lo;
        let j = hi;
        while (i <= j) {
          while (depths[order[i]] > pivotDepth) i++;
          while (depths[order[j]] < pivotDepth) j--;
          if (i <= j) {
            const tmp = order[i];
            order[i] = order[j];
            order[j] = tmp;
            i++;
            j--;
          }
        }
        if (lo < j) {
          sp++;
          this.qsStackLo[sp] = lo;
          this.qsStackHi[sp] = j;
        }
        if (i < hi) {
          sp++;
          this.qsStackLo[sp] = i;
          this.qsStackHi[sp] = hi;
        }
      }
    }

    const pool = this.facePool;

    let lastAlpha = 1;
    let lastFill = '';
    let lastStroke = '';
    let lastLW = -1;
    ctx.globalAlpha = 1;

    for (let i = 0; i < count; i++) {
      const f = pool[order[i]];
      const pts = f.pts;
      const vc = f.vCount;

      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let j = 1; j < vc; j++) {
        ctx.lineTo(pts[j * 2], pts[j * 2 + 1]);
      }
      ctx.closePath();

      if (f.alpha !== lastAlpha) {
        lastAlpha = f.alpha;
        ctx.globalAlpha = lastAlpha;
      }
      if (f.fill !== lastFill) {
        lastFill = f.fill;
        ctx.fillStyle = lastFill;
      }
      ctx.fill();

      if (f.stroke) {
        if (f.stroke !== lastStroke) {
          lastStroke = f.stroke;
          ctx.strokeStyle = lastStroke;
        }
        if (f.lineWidth !== lastLW) {
          lastLW = f.lineWidth;
          ctx.lineWidth = lastLW;
        }
        ctx.stroke();
      }
    }

    if (lastAlpha !== 1) {
      ctx.globalAlpha = 1;
    }
  }

  private transformLocal(
    center: Vec3,
    lx: number,
    ly: number,
    lz: number,
    rotY: number,
    rotX = 0,
    rotZ = 0
  ): Vec3 {
    let x = lx;
    let y = ly;
    let z = lz;
    if (rotZ !== 0) {
      const cosZ = Math.cos(rotZ);
      const sinZ = Math.sin(rotZ);
      const x1 = x * cosZ - y * sinZ;
      const y1 = x * sinZ + y * cosZ;
      x = x1;
      y = y1;
    }
    if (rotX !== 0) {
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;
      y = y1;
      z = z1;
    }
    if (rotY !== 0) {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x2 = x * cosY + z * sinY;
      const z2 = -x * sinY + z * cosY;
      x = x2;
      z = z2;
    }
    return { x: center.x + x, y: center.y + y, z: center.z + z };
  }

  private localToWorld(origin: Vec3, yaw: number, lx: number, ly: number, lz: number): Vec3 {
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    return {
      x: origin.x + lx * cos + lz * sin,
      y: origin.y + ly,
      z: origin.z - lx * sin + lz * cos,
    };
  }

  private getSegCount(quality: GraphicsQuality): number {
    if (quality === 'eco') return 6;
    if (quality === 'balanced') return 8;
    if (quality === 'high') return 10;
    if (quality === 'ultra') return 12;
    if (quality === 'impossible') return 16;
    return 14;
  }

  private getCullDist(quality: GraphicsQuality): number {
    if (quality === 'eco') return 48;
    if (quality === 'balanced') return 66;
    if (quality === 'high') return 90;
    if (quality === 'ultra') return 116;
    if (quality === 'impossible') return 172;
    return 142;
  }

  private ensureSkyCanvas(w: number, h: number): CanvasRenderingContext2D | null {
    if (!this.skyCanvas && typeof document !== 'undefined') {
      this.skyCanvas = document.createElement('canvas');
      this.skyCtx = this.skyCanvas.getContext('2d');
    }
    if (!this.skyCanvas || !this.skyCtx) return null;
    if (this.skyCanvas.width !== w || this.skyCanvas.height !== h) {
      this.skyCanvas.width = w;
      this.skyCanvas.height = h;
      this.skyCacheKey = '';
    }
    return this.skyCtx;
  }

  public drawSkyAndBackdrop(
    ctx: CanvasRenderingContext2D,
    arena: ArenaDef,
    camYaw: number,
    quality: GraphicsQuality = 'balanced',
    time = 0,
    biomeSkyTint?: string
  ) {
    // Quantize camera yaw gently (~2 deg steps) so offscreen mountain/sky layer caches across ~90% of frames!
    const yawQuant = Math.round(camYaw * 28);
    const key = `${this.width}x${this.height}|${arena.id}|${biomeSkyTint || ''}|${quality}|${yawQuant}`;
    const sCtx = this.ensureSkyCanvas(this.width, this.height);

    if (sCtx && this.skyCanvas) {
      if (this.skyCacheKey !== key) {
        this.skyCacheKey = key;
        const w = this.width;
        const h = this.height;
        const grad = sCtx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, arena.skyTop);
        grad.addColorStop(0.44, biomeSkyTint || arena.skyMid);
        grad.addColorStop(0.75, arena.skyHorizon);
        grad.addColorStop(1, arena.skyTop);
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, w, h);

        if (quality !== 'eco') {
          const sunX = w * (0.72 - ((camYaw * 0.08) % 0.4));
          const sunY = h * 0.21;
          const orbR = Math.min(w, h) * 0.095;
          const haloR = orbR * (quality === 'impossible' ? 4.8 : 3.8);
          const halo = sCtx.createRadialGradient(sunX, sunY, orbR * 0.18, sunX, sunY, haloR);
          halo.addColorStop(0, hexWithAlpha(arena.floorTrim, 0.65));
          halo.addColorStop(0.45, hexWithAlpha(arena.floorTrim, 0.18));
          halo.addColorStop(1, 'rgba(0,0,0,0)');
          sCtx.fillStyle = halo;
          sCtx.beginPath();
          sCtx.arc(sunX, sunY, haloR, 0, Math.PI * 2);
          sCtx.fill();

          sCtx.fillStyle = hexWithAlpha(arena.pillarAccent, 0.88);
          sCtx.beginPath();
          sCtx.arc(sunX, sunY, orbR * 0.54, 0, Math.PI * 2);
          sCtx.fill();

          if (quality === 'mythic' || quality === 'impossible') {
            const moonX = w * (0.24 + ((camYaw * 0.06) % 0.25));
            const moonY = h * 0.16;
            sCtx.globalAlpha = 0.72;
            sCtx.fillStyle = '#BAE6FD';
            sCtx.beginPath();
            sCtx.arc(moonX, moonY, orbR * 0.34, 0, Math.PI * 2);
            sCtx.fill();
            sCtx.globalAlpha = 1;
          }
        }

        const horizonY = h * 0.45;
        const parallax = ((camYaw % (Math.PI * 2)) / (Math.PI * 2)) * w;
        const peaks = 14;
        sCtx.fillStyle = 'rgba(8, 12, 20, 0.34)';
        sCtx.beginPath();
        sCtx.moveTo(0, h);
        for (let i = -2; i <= peaks + 2; i++) {
          const x = (i / peaks) * w - ((parallax * 0.6) % (w / peaks));
          const mh = 34 + Math.abs(Math.sin(i * 1.9 + arena.radius)) * 78;
          sCtx.lineTo(x, horizonY - mh);
        }
        sCtx.lineTo(w, h);
        sCtx.closePath();
        sCtx.fill();

        if (quality !== 'eco') {
          sCtx.fillStyle = 'rgba(12, 16, 26, 0.48)';
          sCtx.beginPath();
          sCtx.moveTo(0, h);
          for (let i = -2; i <= peaks + 2; i++) {
            const x = (i / peaks) * w - (parallax % (w / peaks));
            const mh = 16 + Math.abs(Math.cos(i * 2.4 + arena.radius * 0.5)) * 44;
            sCtx.lineTo(x, horizonY - mh + 14);
          }
          sCtx.lineTo(w, h);
          sCtx.closePath();
          sCtx.fill();
        }
      }
      ctx.drawImage(this.skyCanvas, 0, 0);
    } else {
      ctx.fillStyle = arena.skyMid;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Dynamic lightweight star shimmer & aurora ribbons on High+
    if (quality === 'high' || quality === 'ultra' || quality === 'mythic' || quality === 'impossible') {
      ctx.fillStyle = '#E2E8F0';
      const starCount = quality === 'impossible' ? 54 : quality === 'mythic' ? 40 : quality === 'ultra' ? 26 : 16;
      for (let i = 0; i < starCount; i++) {
        const sx = ((i * 173 + camYaw * 90) % this.width + this.width) % this.width;
        const sy = (i * 67) % (this.height * 0.34);
        ctx.globalAlpha = 0.22 + 0.3 * Math.sin(time * 2.2 + i);
        const sz = i % 5 === 0 ? 2.4 : 1.7;
        ctx.fillRect(sx, sy, sz, sz);
      }

      if (quality === 'ultra' || quality === 'mythic' || quality === 'impossible') {
        const auroraY = this.height * 0.22;
        ctx.globalAlpha = quality === 'impossible' ? 0.24 : 0.16;
        ctx.fillStyle = arena.pillarAccent;
        ctx.beginPath();
        ctx.moveTo(0, auroraY);
        const stepX = Math.max(48, Math.floor(this.width / 10));
        for (let x = 0; x <= this.width + stepX; x += stepX) {
          ctx.lineTo(x, auroraY + Math.sin(x * 0.008 + time * 0.6 + camYaw) * 24);
        }
        ctx.lineTo(this.width, auroraY + 58);
        ctx.lineTo(0, auroraY + 58);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  public drawArenaGround(
    ctx: CanvasRenderingContext2D,
    arena: ArenaDef,
    quality: GraphicsQuality,
    time: number
  ) {
    const R = arena.radius;
    const sides = quality === 'eco' ? 16 : arena.isOverworld ? 26 : 22;
    const focusX = this.camTargetX;
    const focusZ = this.camTargetZ;

    if (arena.isOverworld || R > 120) {
      const localR = 135;
      let count = 0;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const wx = focusX + Math.cos(a) * localR;
        const wz = focusZ + Math.sin(a) * localR;
        const distFromOrigin = Math.hypot(wx, wz);
        const clampedScale = distFromOrigin > R ? R / distFromOrigin : 1;
        if (this.projectIntoTmp(wx * clampedScale, 0, wz * clampedScale, count)) count++;
      }
      if (count >= 3) {
        ctx.beginPath();
        ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
        for (let i = 1; i < count; i++) ctx.lineTo(this.tmpPtsX[i], this.tmpPtsY[i]);
        ctx.closePath();
        ctx.fillStyle = arena.floorMain;
        ctx.fill();
      }

      if (Math.hypot(focusX, focusZ) > R - 145) {
        const edgeSegs = 64;
        for (let i = 0; i < edgeSegs; i++) {
          const a0 = (i / edgeSegs) * Math.PI * 2;
          const a1 = ((i + 1) / edgeSegs) * Math.PI * 2;
          const midX = Math.cos((a0 + a1) * 0.5) * R;
          const midZ = Math.sin((a0 + a1) * 0.5) * R;
          if (Math.hypot(midX - focusX, midZ - focusZ) > 140) continue;
          if (
            this.projectIntoTmp(Math.cos(a0) * R, 0, Math.sin(a0) * R, 0) &&
            this.projectIntoTmp(Math.cos(a1) * R, 0, Math.sin(a1) * R, 1) &&
            this.projectIntoTmp(Math.cos(a1) * R * 0.99, -3.2, Math.sin(a1) * R * 0.99, 2) &&
            this.projectIntoTmp(Math.cos(a0) * R * 0.99, -3.2, Math.sin(a0) * R * 0.99, 3)
          ) {
            ctx.beginPath();
            ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
            ctx.lineTo(this.tmpPtsX[1], this.tmpPtsY[1]);
            ctx.lineTo(this.tmpPtsX[2], this.tmpPtsY[2]);
            ctx.lineTo(this.tmpPtsX[3], this.tmpPtsY[3]);
            ctx.closePath();
            ctx.fillStyle = arena.platformWall;
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
            ctx.lineTo(this.tmpPtsX[1], this.tmpPtsY[1]);
            ctx.strokeStyle = arena.floorTrim;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
      }

      const highways: readonly [number, number][] = [
        [0, -560],
        [390, -390],
        [560, 0],
        [390, 390],
        [0, 560],
        [-390, 390],
        [-560, 0],
        [-390, -390],
      ];
      ctx.strokeStyle = 'rgba(214, 191, 148, 0.25)';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      for (let h = 0; h < highways.length; h++) {
        const [tx, tz] = highways[h];
        const len = Math.hypot(tx, tz) || 1;
        const step = 22;
        const segCount = Math.ceil(len / step);
        for (let s = 0; s < segCount; s++) {
          const t0 = s / segCount;
          const t1 = (s + 1) / segCount;
          const x0 = tx * t0;
          const z0 = tz * t0;
          const x1 = tx * t1;
          const z1 = tz * t1;
          if (Math.hypot((x0 + x1) * 0.5 - focusX, (z0 + z1) * 0.5 - focusZ) > 135) continue;
          if (this.projectIntoTmp(x0, 0.02, z0, 0) && this.projectIntoTmp(x1, 0.02, z1, 1)) {
            ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
            ctx.lineTo(this.tmpPtsX[1], this.tmpPtsY[1]);
          }
        }
      }
      ctx.stroke();
    } else {
      if (arena.hazardType === 'lava_vents' && quality !== 'eco') {
        let count = 0;
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2;
          if (this.projectIntoTmp(Math.cos(a) * (R + 8.5), -2.5, Math.sin(a) * (R + 8.5), count)) count++;
        }
        if (count >= 3) {
          ctx.beginPath();
          ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
          for (let i = 1; i < count; i++) ctx.lineTo(this.tmpPtsX[i], this.tmpPtsY[i]);
          ctx.closePath();
          ctx.fillStyle = `rgba(234, 88, 12, ${(0.34 + 0.1 * Math.sin(time * 2.5)).toFixed(2)})`;
          ctx.fill();
        }
      }

      // Elevated side bevel wall
      ctx.fillStyle = arena.platformWall;
      for (let i = 0; i < sides; i++) {
        const a0 = (i / sides) * Math.PI * 2;
        const a1 = ((i + 1) / sides) * Math.PI * 2;
        if (
          this.projectIntoTmp(Math.cos(a0) * R, 0, Math.sin(a0) * R, 0) &&
          this.projectIntoTmp(Math.cos(a1) * R, 0, Math.sin(a1) * R, 1) &&
          this.projectIntoTmp(Math.cos(a1) * (R * 0.96), -2.8, Math.sin(a1) * (R * 0.96), 2) &&
          this.projectIntoTmp(Math.cos(a0) * (R * 0.96), -2.8, Math.sin(a0) * (R * 0.96), 3)
        ) {
          ctx.beginPath();
          ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
          ctx.lineTo(this.tmpPtsX[1], this.tmpPtsY[1]);
          ctx.lineTo(this.tmpPtsX[2], this.tmpPtsY[2]);
          ctx.lineTo(this.tmpPtsX[3], this.tmpPtsY[3]);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Main floor disk
      let floorCount = 0;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        if (this.projectIntoTmp(Math.cos(a) * R, 0, Math.sin(a) * R, floorCount)) floorCount++;
      }
      if (floorCount >= 3) {
        ctx.beginPath();
        ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
        for (let i = 1; i < floorCount; i++) ctx.lineTo(this.tmpPtsX[i], this.tmpPtsY[i]);
        ctx.closePath();
        ctx.fillStyle = arena.floorMain;
        ctx.fill();
        ctx.strokeStyle = arena.floorTrim;
        ctx.lineWidth = 3.0;
        ctx.stroke();
      }

      if (quality !== 'eco') {
        const midR = R * 0.72;
        const innerR = R * 0.34;
        ctx.fillStyle = arena.floorAlt;
        ctx.beginPath();
        for (let i = 0; i < sides; i += 2) {
          const a0 = (i / sides) * Math.PI * 2;
          const a1 = ((i + 1) / sides) * Math.PI * 2;
          if (
            this.projectIntoTmp(Math.cos(a0) * innerR, 0.01, Math.sin(a0) * innerR, 0) &&
            this.projectIntoTmp(Math.cos(a0) * midR, 0.01, Math.sin(a0) * midR, 1) &&
            this.projectIntoTmp(Math.cos(a1) * midR, 0.01, Math.sin(a1) * midR, 2) &&
            this.projectIntoTmp(Math.cos(a1) * innerR, 0.01, Math.sin(a1) * innerR, 3)
          ) {
            ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
            ctx.lineTo(this.tmpPtsX[1], this.tmpPtsY[1]);
            ctx.lineTo(this.tmpPtsX[2], this.tmpPtsY[2]);
            ctx.lineTo(this.tmpPtsX[3], this.tmpPtsY[3]);
            ctx.closePath();
          }
        }
        ctx.fill();
      }

      const ringScales = quality === 'eco' ? [0.55] : [0.28, 0.56, 0.84, 0.96];
      for (let rIdx = 0; rIdx < ringScales.length; rIdx++) {
        const rad = R * ringScales[rIdx];
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= sides; i++) {
          const a = (i / sides) * Math.PI * 2;
          if (!this.projectIntoTmp(Math.cos(a) * rad, 0.02, Math.sin(a) * rad, 0)) continue;
          if (!started) {
            ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
            started = true;
          } else {
            ctx.lineTo(this.tmpPtsX[0], this.tmpPtsY[0]);
          }
        }
        if (rIdx === 0 && quality !== 'eco') {
          ctx.fillStyle = arena.floorAlt;
          ctx.fill();
        }
        ctx.strokeStyle =
          rIdx === 0 || rIdx === ringScales.length - 1 ? hexWithAlpha(arena.floorTrim, 0.55) : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = rIdx === 0 ? 1.8 : 1;
        ctx.stroke();
      }
    }

    // Special Terrain & Biome Zones
    for (const tz of arena.terrainZones) {
      if ((arena.isOverworld || R > 120) && Math.hypot(tz.x - focusX, tz.z - focusZ) > tz.radius + 135) continue;
      const segs = quality === 'eco' ? 12 : 20;
      let count = 0;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        if (this.projectIntoTmp(tz.x + Math.cos(a) * tz.radius, 0.03, tz.z + Math.sin(a) * tz.radius, count)) {
          count++;
        }
      }
      if (count >= 3) {
        ctx.beginPath();
        ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
        for (let i = 1; i < count; i++) ctx.lineTo(this.tmpPtsX[i], this.tmpPtsY[i]);
        ctx.closePath();
        const pulse = 0.25 + 0.08 * Math.sin(time * 3.2 + tz.x);
        ctx.fillStyle = tz.color;
        ctx.globalAlpha =
          tz.kind === 'water_lake'
            ? 0.48
            : tz.kind === 'meadow'
              ? 0.22
              : tz.kind === 'ash_land'
                ? 0.26
                : tz.kind === 'magma_pool'
                  ? pulse + 0.16
                  : pulse;
        ctx.fill();
        ctx.globalAlpha = tz.kind === 'meadow' || tz.kind === 'ash_land' ? 0.35 : 0.78;
        ctx.strokeStyle = tz.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    if (arena.hazardType === 'lava_vents' && quality !== 'eco') {
      const pulse = 0.25 + 0.16 * Math.sin(time * 3);
      ctx.strokeStyle = `rgba(249, 115, 22, ${pulse.toFixed(2)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        if (
          this.projectIntoTmp(Math.cos(a) * 4.5, 0.03, Math.sin(a) * 4.5, 0) &&
          this.projectIntoTmp(Math.cos(a) * (R * 0.88), 0.03, Math.sin(a) * (R * 0.88), 1)
        ) {
          ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
          ctx.lineTo(this.tmpPtsX[1], this.tmpPtsY[1]);
        }
      }
      ctx.stroke();
    }
  }

  public addArenaPillars(
    arena: ArenaDef,
    time: number,
    quality: GraphicsQuality,
    shrineCooldowns?: Record<string, number>,
    playerPos?: Vec3
  ) {
    const segs = this.getSegCount(quality);
    const cullDist = this.getCullDist(quality);

    for (const plat of arena.platforms) {
      if (playerPos && Math.hypot(plat.x - playerPos.x, plat.z - playerPos.z) > cullDist + 18) continue;
      this.addTaperedCylinder(
        { x: plat.x, y: plat.height * 0.45, z: plat.z },
        plat.radius * 1.04,
        plat.radius * 0.98,
        plat.height * 0.9,
        0.39,
        8,
        plat.color
      );
      this.addTaperedCylinder(
        { x: plat.x, y: plat.height - 0.06, z: plat.z },
        plat.radius,
        plat.radius * 0.97,
        0.12,
        0.39,
        8,
        plat.trimColor,
        { unlit: quality === 'high' || quality === 'ultra' || quality === 'mythic' || quality === 'impossible' }
      );
    }

    for (const pillar of arena.pillars) {
      if (playerPos && Math.hypot(pillar.x - playerPos.x, pillar.z - playerPos.z) > cullDist) continue;
      const base: Vec3 = { x: pillar.x, y: 0, z: pillar.z };
      const r = pillar.radius;
      const h = pillar.height;

      if (pillar.style === 'column') {
        this.addTaperedCylinder({ x: base.x, y: 0.3, z: base.z }, r * 1.25, r * 1.05, 0.6, 0, segs, arena.pillarColor);
        this.addTaperedCylinder({ x: base.x, y: h * 0.5, z: base.z }, r * 0.85, r * 0.72, h, 0, segs, arena.pillarColor);
        this.addTaperedCylinder({ x: base.x, y: h + 0.25, z: base.z }, r * 0.8, r * 1.15, 0.45, 0, segs, arena.pillarColor);
        this.addEllipsoid(
          { x: base.x, y: h + 0.95 + Math.sin(time * 5 + pillar.x) * 0.1, z: base.z },
          r * 0.48,
          r * 0.65,
          r * 0.48,
          time * 1.8,
          segs,
          4,
          arena.pillarAccent,
          { unlit: true }
        );
      } else if (pillar.style === 'obsidian') {
        this.addTaperedCylinder({ x: base.x, y: h * 0.38, z: base.z }, r * 1.12, r * 0.82, h * 0.76, 0.4, 6, arena.pillarColor);
        this.addTaperedCylinder({ x: base.x, y: h * 0.95, z: base.z }, r * 0.82, 0, h * 0.44, 0.4, 6, arena.pillarColor);
        this.addTorusRing({ x: base.x, y: h * 0.52, z: base.z }, r * 0.98, 0.12, 0, Math.PI / 2, 8, arena.pillarAccent, {
          unlit: true,
        });
      } else if (pillar.style === 'ice') {
        this.addTaperedCylinder({ x: base.x, y: h * 0.35, z: base.z }, r * 0.96, r * 0.78, h * 0.7, 0.5, 6, arena.pillarColor, {
          alpha: 0.92,
          specular: 0.55,
        });
        this.addTaperedCylinder({ x: base.x, y: h * 0.95, z: base.z }, r * 0.78, 0, h * 0.54, 0.5, 6, arena.pillarAccent, {
          alpha: 0.9,
          specular: 0.65,
        });
      } else {
        this.addTaperedCylinder({ x: base.x, y: 0.35, z: base.z }, r * 1.2, r * 1.0, 0.7, 0, 6, arena.pillarColor);
        this.addTaperedCylinder({ x: base.x, y: h * 0.5, z: base.z }, r * 0.86, r * 0.58, h * 0.85, 0, 6, arena.pillarColor);
        this.addTaperedCylinder({ x: base.x, y: h * 1.04, z: base.z }, r * 0.58, 0, h * 0.32, 0, 6, arena.pillarAccent, {
          unlit: true,
        });
      }
    }

    for (const arch of arena.arches) {
      if (playerPos && Math.hypot(arch.x - playerPos.x, arch.z - playerPos.z) > cullDist) continue;
      const cos = Math.cos(arch.rotY);
      const sin = Math.sin(arch.rotY);
      const halfW = arch.width * 0.5;
      this.addTaperedCylinder({ x: arch.x - cos * halfW, y: arch.height * 0.5, z: arch.z + sin * halfW }, 0.65, 0.52, arch.height, arch.rotY, segs, arena.pillarColor);
      this.addTaperedCylinder({ x: arch.x + cos * halfW, y: arch.height * 0.5, z: arch.z - sin * halfW }, 0.65, 0.52, arch.height, arch.rotY, segs, arena.pillarColor);
      this.addBox({ x: arch.x, y: arch.height + 0.4, z: arch.z }, { x: arch.width + 1.5, y: 0.75, z: 1.1 }, arch.rotY, arena.pillarColor);
      this.addEllipsoid(
        { x: arch.x, y: arch.height + 0.52, z: arch.z },
        arch.width * 0.25,
        0.38,
        0.42,
        arch.rotY,
        6,
        3,
        arena.pillarAccent,
        { unlit: true }
      );
    }

    if (quality !== 'eco' && !arena.isOverworld) {
      const rimCount = quality === 'impossible' ? 16 : quality === 'mythic' ? 14 : quality === 'ultra' ? 12 : quality === 'high' ? 10 : 8;
      const rimR = arena.radius - 0.9;
      for (let i = 0; i < rimCount; i++) {
        const a = (i / rimCount) * Math.PI * 2 + 0.38;
        const bx = Math.cos(a) * rimR;
        const bz = Math.sin(a) * rimR;
        if (playerPos && Math.hypot(bx - playerPos.x, bz - playerPos.z) > cullDist) continue;
        this.addTaperedCylinder({ x: bx, y: 0.6, z: bz }, 0.38, 0.28, 1.2, a, 6, arena.pillarColor);
        this.addEllipsoid({ x: bx, y: 1.32, z: bz }, 0.24, 0.28, 0.24, a, 6, 3, arena.pillarAccent, { unlit: true });
      }
    }

    for (const sh of arena.shrines) {
      if (playerPos && Math.hypot(sh.x - playerPos.x, sh.z - playerPos.z) > cullDist) continue;
      let baseH = 0;
      for (const plat of arena.platforms) {
        if (Math.hypot(sh.x - plat.x, sh.z - plat.z) <= plat.radius) {
          baseH = Math.max(baseH, plat.height);
        }
      }
      const cd = shrineCooldowns?.[sh.id] ?? 0;
      const active = cd <= 0;
      this.addTaperedCylinder({ x: sh.x, y: baseH + 0.16, z: sh.z }, 0.95, 0.78, 0.3, 0, 8, arena.pillarColor);
      if (active) {
        const bob = baseH + 1.15 + Math.sin(time * 3.8 + sh.x) * 0.22;
        this.addEllipsoid({ x: sh.x, y: bob, z: sh.z }, 0.38, 0.52, 0.38, time * 2.2, 6, 4, sh.color, {
          unlit: true,
        });
      } else {
        this.addEllipsoid({ x: sh.x, y: baseH + 0.65, z: sh.z }, 0.24, 0.32, 0.24, time, 6, 3, '#475569', {
          alpha: 0.5,
        });
      }
    }
  }

  private addSceneryProp(prop: SceneryPropDef, time: number, quality: GraphicsQuality) {
    const s = prop.scale ?? 1;
    const segs = this.getSegCount(quality);
    const yaw = prop.rotY ?? 0;

    if (prop.kind === 'pine_tree') {
      this.addTaperedCylinder({ x: prop.x, y: 1.1 * s, z: prop.z }, 0.34 * s, 0.2 * s, 2.2 * s, yaw, segs, '#5C402B');
      this.addTaperedCylinder({ x: prop.x, y: 2.35 * s, z: prop.z }, 1.65 * s, 0.25 * s, 2.1 * s, yaw, segs, '#1E6B47');
      this.addTaperedCylinder({ x: prop.x, y: 3.45 * s, z: prop.z }, 1.25 * s, 0.15 * s, 1.85 * s, yaw, segs, '#248255');
      this.addTaperedCylinder({ x: prop.x, y: 4.45 * s, z: prop.z }, 0.82 * s, 0, 1.45 * s, yaw, segs, '#34A86E');
    } else if (prop.kind === 'cottage') {
      const wall = prop.color || '#D8CFC2';
      const roof = prop.accentColor || '#991B1B';
      this.addBox({ x: prop.x, y: 1.45 * s, z: prop.z }, { x: 3.4 * s, y: 2.9 * s, z: 3.2 * s }, yaw, wall);
      this.addBox(
        this.localToWorld({ x: prop.x, y: 0.9 * s, z: prop.z }, yaw, 0, 0, 1.63 * s),
        { x: 0.85 * s, y: 1.75 * s, z: 0.1 },
        yaw,
        '#4A3324'
      );
      this.addBox(
        this.localToWorld({ x: prop.x, y: 1.65 * s, z: prop.z }, yaw, 1.05 * s, 0, 1.63 * s),
        { x: 0.62 * s, y: 0.62 * s, z: 0.08 },
        yaw,
        '#FDE68A',
        { unlit: true }
      );
      this.addPyramid({ x: prop.x, y: 2.9 * s, z: prop.z }, 2.75 * s, 2.1 * s, yaw, roof);
    } else if (prop.kind === 'fountain') {
      this.addTaperedCylinder({ x: prop.x, y: 0.55 * s, z: prop.z }, 2.55 * s, 2.75 * s, 0.7 * s, 0, segs + 2, '#64748B');
      this.addTaperedCylinder({ x: prop.x, y: 0.82 * s, z: prop.z }, 2.25 * s, 2.25 * s, 0.12 * s, 0, segs + 2, '#38BDF8', {
        unlit: true,
        alpha: 0.78,
      });
      this.addTaperedCylinder({ x: prop.x, y: 1.75 * s, z: prop.z }, 0.65 * s, 0.36 * s, 2.2 * s, 0, segs, '#94A3B8');
      this.addTaperedCylinder({ x: prop.x, y: 2.1 * s, z: prop.z }, 1.25 * s, 1.35 * s, 0.28 * s, 0, segs, '#CBD5E1');
      const pulse = 3.25 * s + Math.sin(time * 4) * 0.12;
      this.addEllipsoid({ x: prop.x, y: pulse, z: prop.z }, 0.45 * s, 0.65 * s, 0.45 * s, time * 2, segs, 4, '#38BDF8', {
        unlit: true,
      });
    } else if (prop.kind === 'crystal_cluster') {
      const col = prop.color || '#38BDF8';
      this.addTaperedCylinder({ x: prop.x, y: 1.05 * s, z: prop.z }, 0.52 * s, 0, 2.3 * s, yaw, 6, col, {
        unlit: true,
        alpha: 0.88,
      });
      this.addTaperedCylinder(
        { x: prop.x - 0.5 * s, y: 0.7 * s, z: prop.z + 0.3 * s },
        0.35 * s,
        0,
        1.55 * s,
        yaw,
        6,
        col,
        { rotZ: 0.32, unlit: true, alpha: 0.84 }
      );
      this.addTaperedCylinder(
        { x: prop.x + 0.48 * s, y: 0.65 * s, z: prop.z - 0.25 * s },
        0.34 * s,
        0,
        1.45 * s,
        yaw,
        6,
        col,
        { rotZ: -0.28, unlit: true, alpha: 0.84 }
      );
    } else if (prop.kind === 'boulder') {
      const col = prop.color || '#475569';
      this.addEllipsoid({ x: prop.x, y: 0.65 * s, z: prop.z }, 1.45 * s, 1.05 * s, 1.25 * s, yaw, segs, 4, col);
      this.addEllipsoid({ x: prop.x + 0.8 * s, y: 0.45 * s, z: prop.z + 0.5 * s }, 0.85 * s, 0.65 * s, 0.8 * s, yaw, 6, 3, col);
    } else if (prop.kind === 'ruin_pillar') {
      this.addTaperedCylinder({ x: prop.x, y: 1.5 * s, z: prop.z }, 0.72 * s, 0.58 * s, 3.0 * s, yaw, segs, '#5E6C80');
      this.addTaperedCylinder({ x: prop.x, y: 0.22 * s, z: prop.z }, 0.98 * s, 0.88 * s, 0.44 * s, yaw, segs, '#475569');
    } else if (prop.kind === 'campfire') {
      this.addTorusRing({ x: prop.x, y: 0.16 * s, z: prop.z }, 0.8 * s, 0.18 * s, 0, Math.PI / 2, 8, '#52525B');
      this.addTaperedCylinder(
        { x: prop.x, y: 0.55 * s + Math.sin(time * 9) * 0.06, z: prop.z },
        0.36 * s,
        0,
        1.1 * s,
        time * 3,
        6,
        '#F97316',
        { unlit: true }
      );
    }
  }

  private addWorldChestMesh(chest: WorldChestDef, opened: boolean, time: number, groundY: number) {
    const isMythic = chest.tier === 'mythic';
    const baseCol = opened ? '#374151' : isMythic ? '#3B256B' : '#6B4226';
    const trimCol = opened ? '#6B7280' : isMythic ? '#38BDF8' : '#E6B85C';
    const y = groundY + (opened ? 0 : Math.sin(time * 3.2 + chest.x) * 0.08);
    this.addBox({ x: chest.x, y: y + 0.36, z: chest.z }, { x: 1.15, y: 0.68, z: 0.82 }, 0.3, baseCol);
    this.addTaperedCylinder(
      { x: chest.x, y: y + (opened ? 0.85 : 0.76), z: chest.z },
      0.56,
      0.42,
      0.32,
      0.3,
      6,
      trimCol,
      { unlit: !opened }
    );
    if (!opened) {
      this.addEllipsoid(
        { x: chest.x, y: y + 1.45 + Math.sin(time * 4 + chest.z) * 0.14, z: chest.z },
        0.22,
        0.34,
        0.22,
        time * 2,
        6,
        3,
        trimCol,
        { unlit: true }
      );
    }
  }

  private addWorldPortalMesh(portal: WorldPortalDef, time: number, quality: GraphicsQuality) {
    const segs = quality === 'eco' ? 10 : 14;
    this.addTaperedCylinder({ x: portal.x, y: 0.18, z: portal.z }, 1.9, 1.65, 0.32, 0, 8, '#334155');
    this.addTorusRing({ x: portal.x, y: 2.05, z: portal.z }, 1.5, 0.18, time * 0.7, 0, segs, portal.color, {
      unlit: true,
    });
    this.addEllipsoid({ x: portal.x, y: 2.05, z: portal.z }, 1.15, 1.35, 0.18, time * 0.7, 8, 4, portal.color, {
      unlit: true,
      alpha: 0.42,
    });
  }

  private addWorldNodeMesh(node: OverworldNodeDef, gathered: boolean, time: number, groundY: number) {
    if (gathered) return;
    const o: Vec3 = { x: node.x, y: groundY, z: node.z };
    if (node.kind === 'herb') {
      this.addEllipsoid({ x: o.x, y: o.y + 0.14, z: o.z }, 0.55, 0.1, 0.55, 0, 6, 3, '#15803D');
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + time * 0.4;
        this.addTaperedCylinder(
          { x: o.x + Math.cos(a) * 0.24, y: o.y + 0.38, z: o.z + Math.sin(a) * 0.24 },
          0.16,
          0.02,
          0.55,
          a,
          5,
          '#22C55E',
          { rotZ: 0.35 }
        );
      }
      this.addEllipsoid(
        { x: o.x, y: o.y + 0.68 + Math.sin(time * 3.8 + node.x) * 0.08, z: o.z },
        0.18,
        0.2,
        0.18,
        time * 2,
        6,
        3,
        '#FDE047',
        { unlit: true }
      );
    } else if (node.kind === 'ore') {
      this.addEllipsoid({ x: o.x, y: o.y + 0.42, z: o.z }, 0.72, 0.52, 0.62, node.x, 6, 3, '#475569');
      this.addOctahedron({ x: o.x - 0.18, y: o.y + 0.85, z: o.z + 0.1 }, 0.26, 0.48, 0.4, '#F59E0B', {
        unlit: true,
      });
      this.addOctahedron({ x: o.x + 0.22, y: o.y + 0.76, z: o.z - 0.15 }, 0.2, 0.4, 1.1, '#FBBF24', {
        unlit: true,
      });
    } else {
      const bob = o.y + 1.05 + Math.sin(time * 3.4 + node.z) * 0.14;
      this.addTaperedCylinder({ x: o.x, y: o.y + 0.14, z: o.z }, 0.65, 0.5, 0.28, 0, 6, '#334155');
      this.addOctahedron({ x: o.x, y: bob, z: o.z }, 0.38, 1.05, time * 1.8, '#38BDF8', {
        unlit: true,
        alpha: 0.92,
      });
      this.addTorusRing({ x: o.x, y: bob, z: o.z }, 0.56, 0.06, time * 2.2, Math.PI / 2 - 0.3, 8, '#A855F7', {
        unlit: true,
      });
    }
  }

  private addWorldWaystoneMesh(ws: WorldFastTravelDef, discovered: boolean, time: number, groundY: number) {
    const col = discovered ? '#38BDF8' : '#64748B';
    this.addTaperedCylinder({ x: ws.x, y: groundY + 0.18, z: ws.z }, 1.25, 1.0, 0.36, 0, 8, '#1E293B');
    this.addTaperedCylinder({ x: ws.x, y: groundY + 1.45, z: ws.z }, 0.48, 0.24, 2.3, 0.4, 6, '#334155');
    this.addOctahedron(
      { x: ws.x, y: groundY + 2.95 + Math.sin(time * 2.8) * 0.1, z: ws.z },
      0.34,
      0.72,
      time * 1.4,
      col,
      { unlit: discovered }
    );
    if (discovered) {
      this.addTorusRing({ x: ws.x, y: groundY + 1.9, z: ws.z }, 0.85, 0.06, time * 1.6, Math.PI / 2, 10, '#38BDF8', {
        unlit: true,
      });
    }
  }

  private addWorldNpcMesh(npc: WorldNpcDef, time: number, quality: GraphicsQuality) {
    const segs = this.getSegCount(quality);
    const bob = Math.sin(time * 2.2 + npc.x) * 0.04;
    const o: Vec3 = { x: npc.x, y: bob, z: npc.z };
    const robe = npc.robeColor || '#1E3A5F';
    const accent = npc.accentColor || '#E6B85C';

    this.addTaperedCylinder(this.localToWorld(o, npc.yaw, 0, 0.78, 0), 0.54, 0.34, 1.5, npc.yaw, segs, robe);
    this.addTaperedCylinder(this.localToWorld(o, npc.yaw, 0, 1.38, 0), 0.4, 0.26, 0.38, npc.yaw, segs, accent);
    this.addTaperedCylinder(this.localToWorld(o, npc.yaw, 0, 1.56, 0), 0.14, 0.12, 0.18, npc.yaw, 6, '#E8BA97');
    this.addEllipsoid(this.localToWorld(o, npc.yaw, 0, 1.84, 0), 0.24, 0.26, 0.24, npc.yaw, segs, 4, '#F1C6A3');
    this.addTaperedCylinder(this.localToWorld(o, npc.yaw, 0, 2.04, -0.02), 0.35, 0.06, 0.46, npc.yaw, segs, robe);

    if (npc.role === 'blacksmith') {
      const hammer = this.localToWorld(o, npc.yaw, 0.48, 1.05, 0.22);
      this.addTaperedCylinder(hammer, 0.06, 0.05, 1.15, npc.yaw, 6, '#7C4F2B');
      this.addBox(this.localToWorld(o, npc.yaw, 0.48, 1.65, 0.22), { x: 0.38, y: 0.22, z: 0.24 }, npc.yaw, '#94A3B8');
    } else if (npc.role === 'alchemist') {
      this.addEllipsoid(
        this.localToWorld(o, npc.yaw, 0.44, 1.25 + Math.sin(time * 4) * 0.06, 0.26),
        0.18,
        0.22,
        0.18,
        time,
        6,
        3,
        '#34D399',
        { unlit: true }
      );
    } else if (npc.role === 'merchant') {
      this.addBox(this.localToWorld(o, npc.yaw, 0, 1.12, -0.38), { x: 0.65, y: 0.72, z: 0.36 }, npc.yaw, '#92400E');
      this.addEllipsoid(this.localToWorld(o, npc.yaw, 0, 1.56, -0.38), 0.22, 0.16, 0.22, 0, 6, 3, '#FBBF24', {
        unlit: true,
      });
    } else {
      const staffPos = this.localToWorld(o, npc.yaw, 0.46, 1.1, 0.2);
      this.addTaperedCylinder(staffPos, 0.06, 0.05, 2.1, npc.yaw, 6, '#7C4F2B');
      this.addEllipsoid(
        this.localToWorld(o, npc.yaw, 0.46, 2.25 + Math.sin(time * 4) * 0.06, 0.2),
        0.16,
        0.2,
        0.16,
        time * 2,
        6,
        3,
        accent,
        { unlit: true }
      );
    }
  }

  public drawGroundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, radius: number, alpha = 0.38) {
    const c = this.project({ x, y: Math.max(0.04, y * 0.15 + 0.04), z });
    if (!c) return;
    const heightScale = Math.max(0.55, 1 - y * 0.12);
    const rx = Math.max(4, radius * c.scale * 0.96 * heightScale);
    const ry = Math.max(2, rx * 0.42);
    const aIdx = Math.max(0, Math.min(20, (alpha * heightScale * 20 + 0.5) | 0));
    ctx.fillStyle = SHADOW_RGBA_LUT[aIdx];
    ctx.beginPath();
    ctx.ellipse(c.sx, c.sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Directional cast shadow lobe on High+ qualities for grounded GTA-Vice depth
    if (this.activeQuality !== 'eco' && this.activeQuality !== 'balanced') {
      const cast = this.project({ x: x - 0.35 - y * 0.15, y: 0.03, z: z - 0.25 - y * 0.1 });
      if (cast) {
        const castIdx = Math.max(0, Math.min(20, (alpha * 0.42 * heightScale * 20 + 0.5) | 0));
        ctx.fillStyle = SHADOW_RGBA_LUT[castIdx];
        ctx.beginPath();
        ctx.ellipse(cast.sx, cast.sy, rx * 1.12, ry * 0.85, -0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private addSecretBossShrineMesh(boss: SecretBossDef, defeated: boolean, time: number) {
    const col = defeated ? '#475569' : boss.accentColor;
    const aura = defeated ? '#64748B' : boss.auraColor;
    this.addTaperedCylinder({ x: boss.x, y: 0.45, z: boss.z }, 2.4, 2.0, 0.9, 0, 8, '#1E293B');
    this.addBox({ x: boss.x, y: 2.1, z: boss.z }, { x: 1.05, y: 2.8, z: 1.05 }, time * 0.18, '#0F172A');
    if (!defeated) {
      const hoverY = 4.35 + Math.sin(time * 3.4) * 0.25;
      this.addEllipsoid({ x: boss.x, y: hoverY, z: boss.z }, 0.55, 0.95, 0.55, time * 2.4, 6, 4, col, {
        unlit: true,
      });
      this.addTorusRing({ x: boss.x, y: hoverY, z: boss.z }, 1.25, 0.14, time * 1.9, Math.PI / 2, 10, aura, {
        unlit: true,
      });
      this.addTaperedCylinder({ x: boss.x, y: 5.5, z: boss.z }, 0.28, 0.04, 8.5, time, 6, aura, {
        unlit: true,
        alpha: 0.34,
      });
    }
  }

  public drawGroundRing(ctx: CanvasRenderingContext2D, ring: RenderRingVfx) {
    const segs = 22;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      if (!this.projectIntoTmp(ring.x + Math.cos(a) * ring.radius, ring.y + 0.06, ring.z + Math.sin(a) * ring.radius, 0)) {
        continue;
      }
      if (!started) {
        ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
        started = true;
      } else {
        ctx.lineTo(this.tmpPtsX[0], this.tmpPtsY[0]);
      }
    }
    if (!started) return;

    ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha));
    if (ring.filled) {
      ctx.fillStyle = ring.color;
      ctx.fill();
    }
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.isFusion ? 4.2 : 3;
    ctx.stroke();

    if (ring.isFusion && ring.radius > 0.6) {
      ctx.beginPath();
      let startedInner = false;
      const innerR = ring.radius * 0.72;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        if (!this.projectIntoTmp(ring.x + Math.cos(a) * innerR, ring.y + 0.08, ring.z + Math.sin(a) * innerR, 0)) {
          continue;
        }
        if (!startedInner) {
          ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
          startedInner = true;
        } else {
          ctx.lineTo(this.tmpPtsX[0], this.tmpPtsY[0]);
        }
      }
      ctx.strokeStyle = ring.secondaryColor || '#FEF08A';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  private meshHost: RendererMeshHost = {
    getSegCount: (quality) => this.getSegCount(quality),
    localToWorld: (origin, yaw, lx, ly, lz) => this.localToWorld(origin, yaw, lx, ly, lz),
    addEllipsoid: (center, rx, ry, rz, rotY, segs, rings, color, opts) =>
      this.addEllipsoid(center, rx, ry, rz, rotY, segs, rings, color, opts),
    addCapsuleLimb: (center, rTop, rBot, length, rotY, segs, color, opts) =>
      this.addCapsuleLimb(center, rTop, rBot, length, rotY, segs, color, opts),
    addTaperedCylinder: (center, rBot, rTop, height, rotY, segs, color, opts) =>
      this.addTaperedCylinder(center, rBot, rTop, height, rotY, segs, color, opts),
    addSculptedTorso: (center, chestW, waistW, chestD, height, rotY, segs, color, opts) =>
      this.addSculptedTorso(center, chestW, waistW, chestD, height, rotY, segs, color, opts),
    addTorusRing: (center, majorR, minorR, rotY, rotX, segs, color, opts) =>
      this.addTorusRing(center, majorR, minorR, rotY, rotX, segs, color, opts),
    addBox: (center, size, rotY, color, opts) =>
      this.addBox(center, size, rotY, color, opts),
  };

  public addFighterMesh(fighter: RenderFighter, time: number, quality: GraphicsQuality = 'balanced') {
    renderUnifiedFighterMesh(this.meshHost, fighter, time, quality);
  }

  public addMonsterMesh(m: RenderMonster, time: number, quality: GraphicsQuality = 'balanced') {
    renderUnifiedMonsterMesh(this.meshHost, m, time, quality);
  }

  public renderScene(ctx: CanvasRenderingContext2D, width: number, height: number, camera: Camera3D, scene: RenderScenePayload) {
    this.activeQuality = scene.quality;
    const rimRgb = parseHex(scene.arena.pillarAccent || '#38BDF8');
    this.rimTintR = rimRgb[0];
    this.rimTintG = rimRgb[1];
    this.rimTintB = rimRgb[2];

    const camYaw = Math.atan2(camera.pos.x - camera.target.x, camera.pos.z - camera.target.z);
    const isOverworld = Boolean(scene.isOverworld || scene.arena.isOverworld);
    this.beginFrame(ctx, width, height, camera, scene.arena.fogColor, isOverworld);

    const p1 = scene.fighters.find((f) => f.team === 'player1');
    const playerPos = p1 ? { x: p1.x, y: p1.y, z: p1.z } : undefined;
    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;

    // Populate reusable O(1) lookup sets once per frame
    this.tmpGatheredSet.clear();
    if (scene.gatheredNodeIds) for (const id of scene.gatheredNodeIds) this.tmpGatheredSet.add(id);
    this.tmpWaystoneSet.clear();
    if (scene.discoveredWaystoneIds) for (const id of scene.discoveredWaystoneIds) this.tmpWaystoneSet.add(id);
    this.tmpOpenedChestSet.clear();
    if (scene.openedChests) for (const id of scene.openedChests) this.tmpOpenedChestSet.add(id);
    this.tmpDefeatedBossSet.clear();
    if (scene.defeatedSecretBossIds) for (const id of scene.defeatedSecretBossIds) this.tmpDefeatedBossSet.add(id);
    this.tmpCompletedEventSet.clear();
    if (scene.completedWorldEventIds) for (const id of scene.completedWorldEventIds) this.tmpCompletedEventSet.add(id);

    // 1. Sky & Horizon Mountains (offscreen cached)
    this.drawSkyAndBackdrop(ctx, scene.arena, camYaw, scene.quality, scene.time, scene.biomeSkyTint);

    // 2. Floor, Biome Regions & Terrain Patches
    this.drawArenaGround(ctx, scene.arena, scene.quality, scene.time);

    // 3. Ground Shadows, Telegraph Rings & Manhwa Runic Casting Circles
    const shadowCull = scene.quality === 'eco' || scene.quality === 'balanced' ? 36 : 56;
    const shadowCullSq = shadowCull * shadowCull;
    if (scene.quality !== 'eco') {
      for (const p of scene.arena.pillars) {
        if (playerPos) {
          const dx = p.x - px;
          const dz = p.z - pz;
          if (dx * dx + dz * dz > shadowCullSq) continue;
        }
        this.drawGroundShadow(ctx, p.x, 0, p.z, p.radius * 1.35, 0.3);
      }
    }
    for (const f of scene.fighters) {
      if (f.animState !== 'dead') {
        this.drawGroundShadow(ctx, f.x, f.y, f.z, 0.88 * f.avatar.shoulderScale, 0.42);
        if (f.animState === 'power' || f.overdriveActive || f.shieldActive) {
          const runeCol = f.overdriveActive ? '#F59E0B' : f.shieldActive ? '#10B981' : f.avatar.accentColor || '#38BDF8';
          const pulse = 1.45 + Math.sin(scene.time * 9) * 0.14;
          this.drawGroundRing(ctx, {
            x: f.x,
            y: f.y + 0.04,
            z: f.z,
            radius: pulse,
            maxRadius: pulse,
            color: runeCol,
            alpha: f.animState === 'power' ? 0.88 : 0.48,
          });
          if (scene.quality !== 'eco') {
            this.drawGroundRing(ctx, {
              x: f.x,
              y: f.y + 0.05,
              z: f.z,
              radius: pulse * 0.72,
              maxRadius: pulse * 0.72,
              color: f.avatar.primaryColor || runeCol,
              alpha: 0.45,
            });
          }
        }
      }
    }
    for (const m of scene.monsters) {
      if (playerPos && isOverworld) {
        const dx = m.x - px;
        const dz = m.z - pz;
        if (dx * dx + dz * dz > shadowCullSq) continue;
      }
      const def = MONSTERS[m.archetype] || MONSTERS.ash_stalker;
      this.drawGroundShadow(ctx, m.x, m.y, m.z, 0.9 * def.scale, 0.42);
      if (m.telegraphTimer > 0) {
        this.drawGroundRing(ctx, {
          x: m.x,
          y: m.y + 0.04,
          z: m.z,
          radius: m.telegraphRadius,
          maxRadius: m.telegraphRadius,
          color: 'rgba(239, 68, 68, 0.48)',
          alpha: 0.85,
          filled: true,
        });
      }
    }
    const shrineCullSq = 48 * 48;
    for (const sh of scene.arena.shrines) {
      if (playerPos && isOverworld) {
        const dx = sh.x - px;
        const dz = sh.z - pz;
        if (dx * dx + dz * dz > shrineCullSq) continue;
      }
      let baseH = 0;
      for (const plat of scene.arena.platforms) {
        const dx = sh.x - plat.x;
        const dz = sh.z - plat.z;
        if (dx * dx + dz * dz <= plat.radius * plat.radius) {
          baseH = Math.max(baseH, plat.height);
        }
      }
      const cd = scene.shrineCooldowns?.[sh.id] ?? 0;
      this.drawGroundRing(ctx, {
        x: sh.x,
        y: baseH + 0.04,
        z: sh.z,
        radius: 1.75,
        maxRadius: 1.75,
        color: cd <= 0 ? sh.color : 'rgba(148,163,184,0.35)',
        alpha: cd <= 0 ? 0.75 : 0.35,
      });
    }
    for (const ring of scene.rings) {
      this.drawGroundRing(ctx, ring);
    }

    // 4. Add 3D Solid Meshes
    this.addArenaPillars(scene.arena, scene.time, scene.quality, scene.shrineCooldowns, playerPos);

    const objCull = this.getCullDist(scene.quality);
    const objCullSq = objCull * objCull;
    const bossCullSq = (objCull + 20) * (objCull + 20);
    const evtCullSq = (objCull + 24) * (objCull + 24);
    if (isOverworld) {
      if (scene.arena.sceneryProps) {
        for (const prop of scene.arena.sceneryProps) {
          if (playerPos) {
            const dx = prop.x - px;
            const dz = prop.z - pz;
            if (dx * dx + dz * dz > objCullSq) continue;
          }
          this.addSceneryProp(prop, scene.time, scene.quality);
        }
      }
      if (scene.arena.worldNpcs) {
        for (const npc of scene.arena.worldNpcs) {
          if (playerPos) {
            const dx = npc.x - px;
            const dz = npc.z - pz;
            if (dx * dx + dz * dz > objCullSq) continue;
          }
          this.addWorldNpcMesh(npc, scene.time, scene.quality);
        }
      }
      if (scene.arena.worldNodes) {
        for (const node of scene.arena.worldNodes) {
          if (playerPos) {
            const dx = node.x - px;
            const dz = node.z - pz;
            if (dx * dx + dz * dz > objCullSq) continue;
          }
          const gathered = this.tmpGatheredSet.has(node.id);
          this.addWorldNodeMesh(node, gathered, scene.time, 0);
        }
      }
      if (scene.arena.worldWaystones) {
        for (const ws of scene.arena.worldWaystones) {
          if (playerPos) {
            const dx = ws.x - px;
            const dz = ws.z - pz;
            if (dx * dx + dz * dz > objCullSq) continue;
          }
          const discovered = this.tmpWaystoneSet.has(ws.id);
          this.addWorldWaystoneMesh(ws, discovered, scene.time, 0);
        }
      }
      if (scene.arena.worldChests) {
        for (const chest of scene.arena.worldChests) {
          if (playerPos) {
            const dx = chest.x - px;
            const dz = chest.z - pz;
            if (dx * dx + dz * dz > objCullSq) continue;
          }
          const opened = this.tmpOpenedChestSet.has(chest.id);
          let gy = 0;
          for (const plat of scene.arena.platforms) {
            const dx = chest.x - plat.x;
            const dz = chest.z - plat.z;
            if (dx * dx + dz * dz <= plat.radius * plat.radius) {
              gy = Math.max(gy, plat.height);
            }
          }
          this.addWorldChestMesh(chest, opened, scene.time, gy);
        }
      }
      if (scene.arena.worldPortals) {
        for (const portal of scene.arena.worldPortals) {
          if (playerPos) {
            const dx = portal.x - px;
            const dz = portal.z - pz;
            if (dx * dx + dz * dz > objCullSq) continue;
          }
          this.addWorldPortalMesh(portal, scene.time, scene.quality);
        }
      }
      if (scene.secretBossShrines) {
        for (const boss of scene.secretBossShrines) {
          if (playerPos) {
            const dx = boss.x - px;
            const dz = boss.z - pz;
            if (dx * dx + dz * dz > bossCullSq) continue;
          }
          const defeated = this.tmpDefeatedBossSet.has(boss.id);
          this.addSecretBossShrineMesh(boss, defeated, scene.time);
          if (!defeated) {
            this.drawGroundRing(ctx, {
              x: boss.x,
              y: 0.05,
              z: boss.z,
              radius: 4.5 + Math.sin(scene.time * 3.5) * 0.25,
              maxRadius: 4.8,
              color: boss.accentColor,
              alpha: 0.72,
              isFusion: true,
              secondaryColor: '#FEF08A',
            });
          }
        }
      }
      if (scene.worldEventZones) {
        for (const evt of scene.worldEventZones) {
          if (playerPos) {
            const dx = evt.x - px;
            const dz = evt.z - pz;
            if (dx * dx + dz * dz > evtCullSq) continue;
          }
          const completed = this.tmpCompletedEventSet.has(evt.id);
          if (completed) continue;
          const isActive = scene.activeEventZoneId === evt.id;
          this.drawGroundRing(ctx, {
            x: evt.x,
            y: 0.05,
            z: evt.z,
            radius: isActive ? evt.radius * 0.75 : 5.2 + Math.sin(scene.time * 4) * 0.35,
            maxRadius: evt.radius,
            color: evt.color,
            alpha: isActive ? 0.85 : 0.65,
            isFusion: true,
            secondaryColor: '#FFFFFF',
          });
          this.addTaperedCylinder({ x: evt.x, y: 2.2, z: evt.z }, 0.45, 0.08, 4.4, scene.time * 1.5, 6, evt.color, {
            unlit: true,
            alpha: 0.45,
          });
        }
      }
    }

    if (scene.dashTrails && scene.quality !== 'eco') {
      for (const dt of scene.dashTrails) {
        this.addCapsuleLimb(
          { x: dt.x, y: dt.y + 1.0 * dt.hScale, z: dt.z },
          0.26,
          0.22,
          1.45 * dt.hScale,
          dt.yaw,
          6,
          dt.color,
          { rotX: 0 }
        );
      }
    }

    for (const pk of scene.pickups) {
      const py = 0.72 + Math.sin(scene.time * 4.2 + pk.bobPhase) * 0.22;
      const col = pk.kind === 'heal' ? '#10B981' : pk.kind === 'energy' ? '#38BDF8' : '#F59E0B';
      this.addEllipsoid({ x: pk.x, y: py, z: pk.z }, 0.26, 0.34, 0.26, scene.time * 2.8 + pk.bobPhase, 6, 4, col, {
        unlit: true,
      });
    }

    for (const f of scene.fighters) {
      this.addFighterMesh(f, scene.time, scene.quality);
    }

    for (const m of scene.monsters) {
      if (playerPos && isOverworld) {
        const dx = m.x - px;
        const dz = m.z - pz;
        if (dx * dx + dz * dz > objCullSq) continue;
      }
      this.addMonsterMesh(m, scene.time, scene.quality);
    }

    for (const proj of scene.projectiles) {
      const yaw = Math.atan2(proj.vx, proj.vz);
      if (proj.kind === 'arrow') {
        this.addTaperedCylinder({ x: proj.x, y: proj.y, z: proj.z }, 0.05, 0.01, 1.05, yaw, 5, proj.color, {
          rotX: Math.PI / 2,
          unlit: true,
        });
      } else {
        this.addEllipsoid({ x: proj.x, y: proj.y, z: proj.z }, proj.radius, proj.radius, proj.radius, scene.time * 8, 6, 3, proj.color, {
          unlit: true,
        });
      }
    }

    // 5. Sort & Rasterize all 3D Polygons (zero per-face save/restore!)
    this.flushFaces(ctx);

    // 6. Overlay VFX Ribbons, Lightning & Particles + Ultra/Impossible Soft Bloom Halos
    for (const s of scene.slashes) {
      this.drawSlashVfx(ctx, s, scene.quality);
    }
    for (const l of scene.lightnings) {
      this.drawLightningVfx(ctx, l);
    }

    const useGlowSprites = scene.quality === 'ultra' || scene.quality === 'mythic' || scene.quality === 'impossible';
    if (useGlowSprites && scene.projectiles.length > 0) {
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      for (const proj of scene.projectiles) {
        const pr = this.project({ x: proj.x, y: proj.y, z: proj.z });
        if (!pr) continue;
        const rad = Math.max(8, proj.radius * pr.scale * 2.2);
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = prevComp;
      ctx.globalAlpha = 1;
    }

    for (const pt of scene.particles) {
      const pr = this.project({ x: pt.x, y: pt.y, z: pt.z });
      if (!pr) continue;
      const rad = Math.max(1.5, pt.size * pr.scale * 0.08);
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pr.sx, pr.sy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Subtle GTA-Vice Twilight Warm/Cyan Edge Grade in Impossible Quality
    if (scene.quality === 'impossible') {
      ctx.fillStyle = hexWithAlpha(scene.arena.floorTrim || '#E6B85C', 0.045);
      ctx.fillRect(0, 0, width, height);
    }

    // 7. 3D-Projected HP Bars
    const monsterHpCullSq = 40 * 40;
    for (const m of scene.monsters) {
      if (playerPos && isOverworld) {
        const dx = m.x - px;
        const dz = m.z - pz;
        if (dx * dx + dz * dz > monsterHpCullSq) continue;
      }
      const def = MONSTERS[m.archetype] || MONSTERS.ash_stalker;
      const top = this.project({ x: m.x, y: m.y + (def.isBoss ? 3.2 : 2.35) * def.scale, z: m.z });
      if (!top) continue;
      const barW = def.isBoss ? 98 : 54;
      const barH = def.isBoss ? 7 : 5;
      const pct = Math.max(0, Math.min(1, m.hp / m.maxHp));
      ctx.fillStyle = 'rgba(10, 13, 18, 0.82)';
      ctx.fillRect(top.sx - barW / 2 - 1, top.sy - barH / 2 - 1, barW + 2, barH + 2);
      ctx.fillStyle = def.isBoss ? '#F97316' : '#EF4444';
      ctx.fillRect(top.sx - barW / 2, top.sy - barH / 2, barW * pct, barH);
      if (def.isBoss) {
        ctx.font = '700 12px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FEF3C7';
        ctx.fillText(m.name, top.sx, top.sy - 9);
      }
    }

    for (const f of scene.fighters) {
      if (f.team === 'player1' || f.animState === 'dead') continue;
      const top = this.project({ x: f.x, y: f.y + 2.55 * f.avatar.heightScale, z: f.z });
      if (!top) continue;
      const barW = 68;
      const barH = 6;
      const pct = Math.max(0, Math.min(1, f.hp / f.maxHp));
      ctx.fillStyle = 'rgba(10, 13, 18, 0.85)';
      ctx.fillRect(top.sx - barW / 2 - 1, top.sy - barH / 2 - 1, barW + 2, barH + 2);
      ctx.fillStyle = f.team === 'player2' ? '#38BDF8' : '#EF4444';
      ctx.fillRect(top.sx - barW / 2, top.sy - barH / 2, barW * pct, barH);
      ctx.font = '700 12px Tajawal, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(f.name, top.sx, top.sy - 8);
    }

    // 7b. Shrines, Overworld NPCs & Portals Floating Labels
    ctx.textAlign = 'center';
    const labelShrineSq = 26 * 26;
    for (const sh of scene.arena.shrines) {
      if (playerPos && isOverworld) {
        const dx = sh.x - px;
        const dz = sh.z - pz;
        if (dx * dx + dz * dz > labelShrineSq) continue;
      }
      let baseH = 0;
      for (const plat of scene.arena.platforms) {
        const dx = sh.x - plat.x;
        const dz = sh.z - plat.z;
        if (dx * dx + dz * dz <= plat.radius * plat.radius) {
          baseH = Math.max(baseH, plat.height);
        }
      }
      const cd = scene.shrineCooldowns?.[sh.id] ?? 0;
      const p = this.project({ x: sh.x, y: baseH + 2.05, z: sh.z });
      if (!p) continue;
      ctx.font = '600 11px Tajawal, sans-serif';
      ctx.fillStyle = cd <= 0 ? sh.color : '#94A3B8';
      ctx.fillText(cd <= 0 ? sh.label : `${Math.ceil(cd)}ث`, p.sx, p.sy);
    }

    if (isOverworld) {
      if (scene.arena.worldNpcs) {
        ctx.font = '700 12px Tajawal, sans-serif';
        const npcSq = 34 * 34;
        for (const npc of scene.arena.worldNpcs) {
          if (playerPos) {
            const dx = npc.x - px;
            const dz = npc.z - pz;
            if (dx * dx + dz * dz > npcSq) continue;
          }
          const p = this.project({ x: npc.x, y: 2.75, z: npc.z });
          if (!p) continue;
          ctx.fillStyle = npc.accentColor || '#E6B85C';
          ctx.fillText(`${npc.name} · ${npc.serviceLabel} [G]`, p.sx, p.sy);
        }
      }
      if (scene.arena.worldNodes) {
        ctx.font = '700 11px Tajawal, sans-serif';
        const nodeSq = 22 * 22;
        for (const node of scene.arena.worldNodes) {
          if (this.tmpGatheredSet.has(node.id)) continue;
          if (playerPos) {
            const dx = node.x - px;
            const dz = node.z - pz;
            if (dx * dx + dz * dz > nodeSq) continue;
          }
          const p = this.project({ x: node.x, y: 1.75, z: node.z });
          if (!p) continue;
          ctx.fillStyle = node.kind === 'crystal' ? '#38BDF8' : node.kind === 'ore' ? '#FBBF24' : '#34D399';
          ctx.fillText(`${node.label} [G]`, p.sx, p.sy);
        }
      }
      if (scene.arena.worldWaystones) {
        ctx.font = '700 11px Tajawal, sans-serif';
        ctx.fillStyle = '#38BDF8';
        const wsSq = 32 * 32;
        for (const ws of scene.arena.worldWaystones) {
          if (playerPos) {
            const dx = ws.x - px;
            const dz = ws.z - pz;
            if (dx * dx + dz * dz > wsSq) continue;
          }
          const p = this.project({ x: ws.x, y: 3.6, z: ws.z });
          if (!p) continue;
          ctx.fillText(ws.name, p.sx, p.sy);
        }
      }
      if (scene.arena.worldPortals) {
        ctx.font = '700 12px Tajawal, sans-serif';
        const portSq = 34 * 34;
        for (const portal of scene.arena.worldPortals) {
          if (playerPos) {
            const dx = portal.x - px;
            const dz = portal.z - pz;
            if (dx * dx + dz * dz > portSq) continue;
          }
          const p = this.project({ x: portal.x, y: 3.9, z: portal.z });
          if (!p) continue;
          ctx.fillStyle = portal.color;
          ctx.fillText(portal.label, p.sx, p.sy);
        }
      }
      if (scene.secretBossShrines) {
        ctx.font = '700 12px Tajawal, sans-serif';
        const bossLabelSq = 38 * 38;
        for (const boss of scene.secretBossShrines) {
          if (this.tmpDefeatedBossSet.has(boss.id)) continue;
          if (playerPos) {
            const dx = boss.x - px;
            const dz = boss.z - pz;
            if (dx * dx + dz * dz > bossLabelSq) continue;
          }
          const p = this.project({ x: boss.x, y: 5.2, z: boss.z });
          if (!p) continue;
          ctx.fillStyle = boss.accentColor;
          ctx.fillText(`مزار سري: ${boss.name} [G]`, p.sx, p.sy);
        }
      }
      if (scene.worldEventZones) {
        ctx.font = '700 12px Tajawal, sans-serif';
        const evtLabelSq = 40 * 40;
        for (const evt of scene.worldEventZones) {
          if (this.tmpCompletedEventSet.has(evt.id)) continue;
          if (playerPos) {
            const dx = evt.x - px;
            const dz = evt.z - pz;
            if (dx * dx + dz * dz > evtLabelSq) continue;
          }
          const p = this.project({ x: evt.x, y: 4.5, z: evt.z });
          if (!p) continue;
          ctx.fillStyle = evt.color;
          ctx.fillText(`منطقة حدث: ${evt.name} [G]`, p.sx, p.sy);
        }
      }
    }

    // 8. Floating Combat Numbers
    if (scene.showFloatingDamage !== false) {
      for (const ft of scene.floatingTexts) {
        const p = this.project({ x: ft.x, y: ft.y, z: ft.z });
        if (!p) continue;
        ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));
        ctx.font = `700 ${Math.round(15 * ft.scale)}px Changa, Tajawal, sans-serif`;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillText(ft.text, p.sx + 1.5, p.sy + 1.5);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, p.sx, p.sy);
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawSlashVfx(ctx: CanvasRenderingContext2D, s: RenderSlashVfx, quality: GraphicsQuality = 'balanced') {
    const steps = quality === 'eco' ? 7 : 11;
    const outerX: number[] = [];
    const outerY: number[] = [];
    const innerX: number[] = [];
    const innerY: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps - 0.5;
      const a = s.yaw + t * s.arcSpread;
      const yOff = t * s.tilt;
      const pOut = this.project({
        x: s.x + Math.sin(a) * s.radius,
        y: s.y + yOff,
        z: s.z + Math.cos(a) * s.radius,
      });
      const pIn = this.project({
        x: s.x + Math.sin(a) * (s.radius * 0.52),
        y: s.y + yOff * 0.58,
        z: s.z + Math.cos(a) * (s.radius * 0.52),
      });
      if (pOut && pIn) {
        outerX.push(pOut.sx);
        outerY.push(pOut.sy);
        innerX.push(pIn.sx);
        innerY.push(pIn.sy);
      }
    }
    if (outerX.length < 3) return;
    ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
    ctx.beginPath();
    ctx.moveTo(outerX[0], outerY[0]);
    for (let i = 1; i < outerX.length; i++) ctx.lineTo(outerX[i], outerY[i]);
    for (let i = innerX.length - 1; i >= 0; i--) ctx.lineTo(innerX[i], innerY[i]);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();

    if (quality !== 'eco' || s.critical) {
      ctx.beginPath();
      ctx.moveTo(outerX[0], outerY[0]);
      for (let i = 1; i < outerX.length; i++) ctx.lineTo(outerX[i], outerY[i]);
      ctx.strokeStyle = s.critical ? '#FEF08A' : '#FFFFFF';
      ctx.lineWidth = s.critical ? 3.4 : 2;
      ctx.stroke();

      if (s.critical) {
        ctx.beginPath();
        ctx.moveTo(innerX[0], innerY[0]);
        for (let i = 1; i < innerX.length; i++) ctx.lineTo(innerX[i], innerY[i]);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawLightningVfx(ctx: CanvasRenderingContext2D, l: RenderLightningVfx) {
    ctx.globalAlpha = Math.max(0, Math.min(1, l.alpha));
    ctx.strokeStyle = l.color;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 7; i++) {
      const y = (1 - i / 7) * 9.5;
      const jitterX = i === 7 ? 0 : Math.sin(l.seed + i * 3.7) * 0.65;
      const jitterZ = i === 7 ? 0 : Math.cos(l.seed + i * 2.9) * 0.65;
      const p = this.project({ x: l.x + jitterX, y, z: l.z + jitterZ });
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p.sx, p.sy);
        started = true;
      } else {
        ctx.lineTo(p.sx, p.sy);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  public renderAvatarShowcase(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    avatar: AvatarConfig,
    orbitYaw: number,
    time: number,
    previewAction: 'idle' | 'attack' | 'power',
    weaponLevel = 1,
    quality: GraphicsQuality = 'high'
  ) {
    this.activeQuality = quality;
    const rimRgb = parseHex(avatar.accentColor || '#38BDF8');
    this.rimTintR = rimRgb[0];
    this.rimTintG = rimRgb[1];
    this.rimTintB = rimRgb[2];

    SHOWCASE_CAMERA.pos.x = Math.sin(orbitYaw) * 5.2;
    SHOWCASE_CAMERA.pos.y = 2.35;
    SHOWCASE_CAMERA.pos.z = Math.cos(orbitYaw) * 5.2;
    SHOWCASE_CAMERA.target.y = 1.25 * avatar.heightScale;

    this.beginFrame(ctx, width, height, SHOWCASE_CAMERA, '#10182B', false);

    // Quality-responsive studio atmosphere
    const bg = ctx.createRadialGradient(
      width * 0.5,
      height * 0.4,
      18,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.74
    );
    if (quality === 'impossible') {
      bg.addColorStop(0, '#2B2246');
      bg.addColorStop(0.5, '#131D36');
      bg.addColorStop(1, '#080C17');
    } else if (quality === 'mythic' || quality === 'ultra') {
      bg.addColorStop(0, '#203256');
      bg.addColorStop(0.55, '#111A2E');
      bg.addColorStop(1, '#080C16');
    } else if (quality === 'eco') {
      bg.addColorStop(0, '#162033');
      bg.addColorStop(1, '#0B101C');
    } else {
      bg.addColorStop(0, '#1C2A45');
      bg.addColorStop(0.6, '#111A2B');
      bg.addColorStop(1, '#090E19');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle rim glow spotlight behind hero on High+ qualities
    if (quality === 'high' || quality === 'ultra' || quality === 'mythic' || quality === 'impossible') {
      const spotR = Math.min(width, height) * (quality === 'impossible' ? 0.44 : 0.36);
      const spot = ctx.createRadialGradient(width * 0.5, height * 0.46, 8, width * 0.5, height * 0.46, spotR);
      spot.addColorStop(0, hexWithAlpha(avatar.accentColor || '#38BDF8', quality === 'impossible' ? 0.25 : 0.14));
      spot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, width, height);
    }

    // Sculpted 3D Pedestal + Quality-scaled Runic Ring
    const pedSegs = quality === 'eco' ? 12 : quality === 'balanced' ? 16 : 22;
    if (quality !== 'eco') {
      this.addTaperedCylinder({ x: 0, y: -0.16, z: 0 }, 1.85, 1.68, 0.28, orbitYaw * 0.2, pedSegs, '#172339', {
        specular: quality === 'impossible' || quality === 'mythic' ? 0.55 : 0.25,
      });
    } else {
      let count = 0;
      for (let i = 0; i < pedSegs; i++) {
        const a = (i / pedSegs) * Math.PI * 2;
        if (this.projectIntoTmp(Math.cos(a) * 1.65, 0, Math.sin(a) * 1.65, count)) count++;
      }
      if (count >= 3) {
        ctx.beginPath();
        ctx.moveTo(this.tmpPtsX[0], this.tmpPtsY[0]);
        for (let i = 1; i < count; i++) ctx.lineTo(this.tmpPtsX[i], this.tmpPtsY[i]);
        ctx.closePath();
        ctx.fillStyle = '#18243A';
        ctx.fill();
      }
    }

    this.drawGroundRing(ctx, {
      x: 0,
      y: 0.02,
      z: 0,
      radius: 1.68,
      maxRadius: 1.68,
      color: avatar.accentColor || '#38BDF8',
      alpha: quality === 'eco' ? 0.45 : quality === 'impossible' ? 0.92 : 0.7,
      isFusion: quality === 'mythic' || quality === 'impossible',
      secondaryColor: '#FDE68A',
    });

    this.drawGroundShadow(ctx, 0, 0, 0, 0.95 * avatar.shoulderScale, 0.45);

    const animTime = previewAction === 'attack' ? (time * 1.4) % 0.34 : time;
    if (!this.showcaseFighter) {
      this.showcaseFighter = {
        id: 'preview',
        name: avatar.name,
        avatar,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        hp: 100,
        maxHp: 100,
        animState: previewAction,
        animTime,
        walkPhase: 0,
        comboStep: 0,
        hitFlash: 0,
        shieldActive: false,
        overdriveActive: false,
        frozenTimer: 0,
        team: 'player1',
        weaponLevel,
      };
    }
    const sf = this.showcaseFighter;
    sf.name = avatar.name;
    sf.avatar = avatar;
    sf.animState = previewAction;
    sf.animTime = animTime;
    sf.comboStep = Math.floor(time * 2) % 3;
    sf.shieldActive = previewAction === 'power' && (avatar.powerId === 'crystal_aegis' || avatar.powerId === 'iron_fortress');
    sf.overdriveActive = previewAction === 'power' && avatar.powerId === 'titan_overdrive';
    sf.weaponLevel = weaponLevel;

    this.addFighterMesh(sf, time, quality);
    this.flushFaces(ctx);

    // Floating Aura Sparks when Aura active and Quality >= High
    if (avatar.auraStyle !== 'none' && (quality === 'high' || quality === 'ultra' || quality === 'mythic' || quality === 'impossible')) {
      const auraCol =
        avatar.auraStyle === 'ember_sparks'
          ? '#F97316'
          : avatar.auraStyle === 'frost_mist'
            ? '#38BDF8'
            : avatar.auraStyle === 'royal_gold'
              ? '#F59E0B'
              : '#A855F7';
      const moteCount = quality === 'impossible' ? 16 : quality === 'mythic' ? 12 : 8;
      ctx.fillStyle = auraCol;
      for (let i = 0; i < moteCount; i++) {
        const ang = time * 1.6 + (i / moteCount) * Math.PI * 2;
        const h = ((time * 0.7 + i * 0.29) % 1.9) + 0.15;
        const rad = 0.85 + Math.sin(time * 2 + i) * 0.25;
        const p = this.project({ x: Math.cos(ang) * rad, y: h * avatar.heightScale, z: Math.sin(ang) * rad });
        if (!p) continue;
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(time * 4 + i);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, quality === 'impossible' ? 3.2 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (previewAction === 'attack') {
      const alpha = Math.max(0, 0.72 - animTime * 2);
      if (alpha > 0.05) {
        this.drawSlashVfx(
          ctx,
          {
            x: 0,
            y: 1.25 * avatar.heightScale,
            z: 0.3,
            yaw: 0,
            radius: 1.9,
            arcSpread: 1.9,
            color: (WEAPONS[avatar.weaponId] || WEAPONS.vanguard_sword).energyColor,
            alpha,
            tilt: 0.35,
          },
          quality
        );
      }
    } else if (previewAction === 'power') {
      const ringR = 0.6 + ((time * 2.2) % 1.8);
      this.drawGroundRing(ctx, {
        x: 0,
        y: 0.05,
        z: 0,
        radius: ringR,
        maxRadius: 2.4,
        color: avatar.accentColor,
        alpha: Math.max(0.1, 1 - ringR / 2.5),
      });
    }
  }

  public dispose() {
    this.skyCanvas = null;
    this.skyCtx = null;
    this.facePool = [];
    this.vecPool = [];
  }
}
