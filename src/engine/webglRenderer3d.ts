import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import type {
  ArenaDef,
  AvatarConfig,
  GraphicsQuality,
  MonsterArchetype,
  WeaponId,
} from '../types/game';
import { MONSTERS, WEAPONS } from '../data/gameCatalog';
import type {
  Camera3D,
  RenderFighter,
  RenderMonster,
  RenderScenePayload,
} from './renderer3d';
import { detectWebGLCapability } from './webglCapability';

const _v3 = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _c3 = new THREE.Color();
const _dummy = new THREE.Object3D();

interface LightingPreset {
  keyColor: string;
  keyIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  rimColor: string;
  rimIntensity: number;
  sunDir: [number, number, number];
  exposure: number;
}

const ARENA_LIGHTING: Record<string, LightingPreset> = {
  obsidian_citadel: {
    keyColor: '#FFE0B5',
    keyIntensity: 2.35,
    hemiSky: '#6D8EC5',
    hemiGround: '#1E2436',
    hemiIntensity: 1.05,
    rimColor: '#38BDF8',
    rimIntensity: 0.9,
    sunDir: [26, 38, 18],
    exposure: 1.08,
  },
  magma_caldera: {
    keyColor: '#FF9E5E',
    keyIntensity: 2.45,
    hemiSky: '#7C3E38',
    hemiGround: '#3A140C',
    hemiIntensity: 1.0,
    rimColor: '#F97316',
    rimIntensity: 1.15,
    sunDir: [-22, 34, 24],
    exposure: 1.05,
  },
  glacier_spire: {
    keyColor: '#E8F7FF',
    keyIntensity: 2.25,
    hemiSky: '#A5E3FF',
    hemiGround: '#243B55',
    hemiIntensity: 1.15,
    rimColor: '#67E8F9',
    rimIntensity: 0.95,
    sunDir: [28, 42, -16],
    exposure: 1.04,
  },
  sunstone_dunes: {
    keyColor: '#FFF0C2',
    keyIntensity: 2.65,
    hemiSky: '#FCD34D',
    hemiGround: '#5C3A21',
    hemiIntensity: 1.12,
    rimColor: '#FB923C',
    rimIntensity: 0.85,
    sunDir: [30, 44, 20],
    exposure: 1.06,
  },
  celestial_sanctuary: {
    keyColor: '#FFF5DB',
    keyIntensity: 2.35,
    hemiSky: '#A5B4FC',
    hemiGround: '#2E1E4A',
    hemiIntensity: 1.1,
    rimColor: '#C084FC',
    rimIntensity: 1.05,
    sunDir: [-18, 40, 26],
    exposure: 1.08,
  },
  abyssal_colosseum: {
    keyColor: '#E0C3FC',
    keyIntensity: 2.2,
    hemiSky: '#6366F1',
    hemiGround: '#141225',
    hemiIntensity: 1.0,
    rimColor: '#F43F5E',
    rimIntensity: 1.1,
    sunDir: [20, 32, -22],
    exposure: 1.05,
  },
  etheria_overworld: {
    keyColor: '#FFE7BD',
    keyIntensity: 2.45,
    hemiSky: '#8AD0FF',
    hemiGround: '#2F4636',
    hemiIntensity: 1.18,
    rimColor: '#FDA4AF',
    rimIntensity: 0.8,
    sunDir: [34, 46, 26],
    exposure: 1.1,
  },
};

function createProceduralSurfaceTexture(
  kind: 'stone' | 'meadow' | 'sand' | 'lava' | 'ice' | 'wood',
  baseHex: string,
  altHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, size, size);

    // Smooth GTA-Vice stylized brushwork: clean large tonal patches + soft bevel lines (never harsh noisy grit)
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.02)');
    grad.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    if (kind === 'stone') {
      const tile = 64;
      for (let y = 0; y < size; y += tile) {
        for (let x = 0; x < size; x += tile) {
          ctx.fillStyle = ((x / tile + y / tile) & 1) === 0 ? baseHex : altHex;
          ctx.globalAlpha = 0.28;
          ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = 0.08;
          ctx.strokeRect(x + 3, y + 3, tile - 6, tile - 6);
        }
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'meadow') {
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 42; i++) {
        const rx = ((i * 53) % 230) + 12;
        const ry = ((i * 97) % 230) + 12;
        ctx.fillStyle = i % 2 === 0 ? altHex : '#4ADE80';
        ctx.beginPath();
        ctx.ellipse(rx, ry, 18, 9, (i % 5) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'sand') {
      ctx.strokeStyle = altHex;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.24;
      for (let y = 16; y < size; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * 0.33, y - 10, size * 0.66, y + 10, size, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'lava') {
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 10; i++) {
        const sy = i * 26;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.quadraticCurveTo(size * 0.5, sy + ((i & 1) === 0 ? 18 : -18), size, sy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'ice') {
      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.28;
      for (let i = 0; i < 14; i++) {
        const sx = (i * 37) % size;
        const sy = (i * 61) % size;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 48, sy + 28);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = altHex;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.22;
      for (let y = 10; y < size; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(3, 6, 16, 0.65)');
    g.addColorStop(0.55, 'rgba(3, 6, 16, 0.28)');
    g.addColorStop(1, 'rgba(3, 6, 16, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface FighterVisualRig {
  signature: string;
  root: THREE.Group;
  squashGroup: THREE.Group;
  tiltGroup: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  backAnchor: THREE.Group;
  shadowDisc: THREE.Mesh;
  auraRing: THREE.Mesh;
  shieldSphere: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
}

interface MonsterVisualRig {
  signature: string;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg?: THREE.Group;
  rightLeg?: THREE.Group;
  leftArm?: THREE.Group;
  rightArm?: THREE.Group;
  shadowDisc: THREE.Mesh;
  telegraphDisc: THREE.Mesh;
  primaryMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
}

export class WebGLRenderer3D {
  public readonly isSoftwareGl: boolean;
  public readonly webglVersion: 1 | 2;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private envTexture: THREE.Texture | null = null;

  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  private worldGroup = new THREE.Group();
  private chunkGroup = new THREE.Group();
  private entitiesGroup = new THREE.Group();
  private vfxGroup = new THREE.Group();

  private staticWorldSignature = '';
  private streamedSignature = '';
  private activeQuality: GraphicsQuality = 'impossible';

  private sharedShadowTex: THREE.CanvasTexture;
  private surfaceTextures = new Map<string, THREE.CanvasTexture>();
  private reusableGeos: THREE.BufferGeometry[] = [];
  private disposableStaticMats: THREE.Material[] = [];
  private disposableChunkMats: THREE.Material[] = [];

  private fighterRigs = new Map<string, FighterVisualRig>();
  private monsterRigs = new Map<string, MonsterVisualRig>();
  private projectilePool: THREE.Mesh[] = [];
  private ringPool: THREE.Mesh[] = [];
  private slashPool: THREE.Mesh[] = [];
  private lightningPool: THREE.Mesh[] = [];
  private dashTrailPool: THREE.Group[] = [];
  private pickupPool: THREE.Group[] = [];
  private particleInstanced: THREE.InstancedMesh;
  private maxParticles = 320;

  private sharedParticleGeo = new THREE.IcosahedronGeometry(0.14, 0);
  private sharedParticleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  private sharedProjGeo = new THREE.SphereGeometry(1, 10, 10);
  private sharedRingGeo = new THREE.RingGeometry(0.84, 1.0, 32);
  private sharedSlashGeo = new THREE.RingGeometry(0.42, 1.0, 24, 1, -Math.PI * 0.42, Math.PI * 0.84);
  private sharedBoltGeo = new THREE.CylinderGeometry(0.14, 0.24, 14, 6);
  private sharedPickupGeo = new THREE.OctahedronGeometry(0.42, 0);
  private sharedShadowGeo = new THREE.PlaneGeometry(2.1, 2.1);

  private currentWidth = 1280;
  private currentHeight = 720;
  private lastRenderTime = performance.now();
  private contextLost = false;
  private disposed = false;

  private onContextLostCb?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    initialQuality: GraphicsQuality,
    onContextLost?: () => void
  ) {
    const cap = detectWebGLCapability();
    this.isSoftwareGl = cap.isSoftwareGl;
    this.webglVersion = cap.version === 1 ? 1 : 2;
    this.onContextLostCb = onContextLost;
    this.activeQuality = initialQuality;

    canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    const rendererOpts: THREE.WebGLRendererParameters = {
      canvas,
      antialias: !this.isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    };

    if (this.webglVersion === 1) {
      this.renderer = new THREE.WebGL1Renderer(rendererOpts) as unknown as THREE.WebGLRenderer;
    } else {
      this.renderer = new THREE.WebGLRenderer(rendererOpts);
    }

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0C1324');
    this.scene.fog = new THREE.FogExp2('#0C1324', 0.0085);

    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.45, 520);

    // Mandatory procedural studio environment reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    // Three-point + Hemisphere lighting rig
    this.hemiLight = new THREE.HemisphereLight('#8AB4F8', '#1E293B', 1.1);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#FFE7BD', 2.4);
    this.keyLight.position.set(28, 42, 22);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 120;
    const sBounds = 34;
    this.keyLight.shadow.camera.left = -sBounds;
    this.keyLight.shadow.camera.right = sBounds;
    this.keyLight.shadow.camera.top = sBounds;
    this.keyLight.shadow.camera.bottom = -sBounds;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight('#38BDF8', 0.9);
    this.rimLight.position.set(-24, 18, -26);
    this.scene.add(this.rimLight);

    this.scene.add(this.worldGroup);
    this.scene.add(this.chunkGroup);
    this.scene.add(this.entitiesGroup);
    this.scene.add(this.vfxGroup);

    this.sharedShadowTex = createContactShadowTexture();

    this.particleInstanced = new THREE.InstancedMesh(
      this.sharedParticleGeo,
      this.sharedParticleMat,
      this.maxParticles
    );
    this.particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleInstanced.frustumCulled = false;
    this.particleInstanced.count = 0;
    this.vfxGroup.add(this.particleInstanced);

    this.applyQualityRenderSettings(initialQuality);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.onContextLostCb?.();
  };

  private handleContextRestored = () => {
    this.contextLost = false;
  };

  private setupPostProcessing(quality: GraphicsQuality) {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bloomPass = null;
      this.fxaaPass = null;
    }

    const useComposer =
      !this.isSoftwareGl &&
      (quality === 'ultra' || quality === 'mythic' || quality === 'impossible');
    if (!useComposer) return;

    const composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    const bloomStrength = quality === 'impossible' ? 0.42 : quality === 'mythic' ? 0.34 : 0.24;
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(16, Math.floor(this.currentWidth / 2)), Math.max(16, Math.floor(this.currentHeight / 2))),
      bloomStrength,
      0.42,
      0.85
    );
    composer.addPass(bloomPass);
    this.bloomPass = bloomPass;

    if (quality === 'impossible') {
      const vignettePass = new ShaderPass(VignetteShader);
      vignettePass.uniforms['offset'].value = 0.96;
      vignettePass.uniforms['darkness'].value = 0.38;
      composer.addPass(vignettePass);
    }

    const fxaaPass = new ShaderPass(FXAAShader);
    const pr = this.renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.set(
      1 / Math.max(1, this.currentWidth * pr),
      1 / Math.max(1, this.currentHeight * pr)
    );
    composer.addPass(fxaaPass);
    this.fxaaPass = fxaaPass;

    this.composer = composer;
  }

  public setSize(width: number, height: number, force = false) {
    const w = Math.max(160, Math.floor(width));
    const h = Math.max(120, Math.floor(height));
    if (!force && w === this.currentWidth && h === this.currentHeight) return;
    this.currentWidth = w;
    this.currentHeight = h;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);

    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
      const pr = this.renderer.getPixelRatio();
      if (this.fxaaPass) {
        this.fxaaPass.material.uniforms['resolution'].value.set(1 / Math.max(1, w * pr), 1 / Math.max(1, h * pr));
      }
      if (this.bloomPass) {
        this.bloomPass.resolution.set(Math.max(16, Math.floor(w / 2)), Math.max(16, Math.floor(h / 2)));
      }
    }
  }

  private getSurfaceTexture(
    kind: 'stone' | 'meadow' | 'sand' | 'lava' | 'ice' | 'wood',
    baseHex: string,
    altHex: string
  ): THREE.CanvasTexture {
    const key = `${kind}:${baseHex}:${altHex}`;
    const existing = this.surfaceTextures.get(key);
    if (existing) return existing;
    const tex = createProceduralSurfaceTexture(
      kind,
      baseHex,
      altHex,
      this.renderer.capabilities.getMaxAnisotropy()
    );
    this.surfaceTextures.set(key, tex);
    return tex;
  }

  private clearGroupDisposables(group: THREE.Group, matsList: THREE.Material[]) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
    for (const m of matsList) m.dispose();
    matsList.length = 0;
  }

  private applyQualityRenderSettings(quality: GraphicsQuality) {
    const devDpr = window.devicePixelRatio || 1;
    const targetPr = this.isSoftwareGl
      ? quality === 'eco'
        ? 0.85
        : 1.0
      : quality === 'eco'
        ? 0.78
        : quality === 'balanced'
          ? 1.0
          : quality === 'high'
            ? Math.min(devDpr, 1.35)
            : quality === 'ultra'
              ? Math.min(devDpr, 1.6)
              : quality === 'mythic'
                ? Math.min(devDpr, 1.85)
                : Math.min(devDpr, 2.0);

    this.renderer.setPixelRatio(targetPr);
    this.renderer.toneMappingExposure =
      quality === 'impossible' ? 1.14 : quality === 'mythic' ? 1.1 : 1.06;

    const shadowsOn = !this.isSoftwareGl && quality !== 'eco';
    this.renderer.shadowMap.enabled = shadowsOn;
    this.keyLight.castShadow = shadowsOn;

    const mapDim =
      quality === 'impossible' || quality === 'mythic'
        ? 2048
        : quality === 'ultra'
          ? 1536
          : quality === 'high' || quality === 'balanced'
            ? 1024
            : 512;
    if (this.keyLight.shadow.mapSize.x !== mapDim) {
      this.keyLight.shadow.mapSize.set(mapDim, mapDim);
      if (this.keyLight.shadow.map) {
        this.keyLight.shadow.map.dispose();
        this.keyLight.shadow.map = null;
      }
    }

    this.setupPostProcessing(quality);
    this.setSize(this.currentWidth, this.currentHeight, true);
  }

  private ensureQualityMode(quality: GraphicsQuality) {
    if (this.activeQuality === quality) return;
    this.activeQuality = quality;
    this.applyQualityRenderSettings(quality);
  }

  private syncStaticWorld(payload: RenderScenePayload) {
    const arena = payload.arena;
    const sig = `${arena.id}|${payload.quality}|${arena.platforms.length}|${arena.pillars.length}|${arena.shrines.length}`;
    if (this.staticWorldSignature === sig) return;
    this.staticWorldSignature = sig;

    this.clearGroupDisposables(this.worldGroup, this.disposableStaticMats);

    const floorKind: 'stone' | 'meadow' | 'sand' | 'lava' | 'ice' =
      arena.isOverworld
        ? 'meadow'
        : arena.id === 'magma_caldera'
          ? 'lava'
          : arena.id === 'glacier_spire'
            ? 'ice'
            : arena.id === 'sunstone_dunes'
              ? 'sand'
              : 'stone';

    const floorTex = this.getSurfaceTexture(floorKind, arena.floorMain, arena.floorAlt);
    floorTex.repeat.set(arena.isOverworld ? 64 : 10, arena.isOverworld ? 64 : 10);

    const isStylizedMax = payload.quality === 'impossible' || payload.quality === 'mythic';
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: isStylizedMax ? 0.72 : 0.85,
      metalness: 0.08,
      envMapIntensity: isStylizedMax ? 0.38 : 0.25,
    });
    this.disposableStaticMats.push(floorMat);

    // Main arena ground cylinder (extends smoothly into fog on overworld!)
    const groundGeo = new THREE.CylinderGeometry(arena.radius, arena.radius * 1.04, 1.4, 48);
    this.reusableGeos.push(groundGeo);
    const groundMesh = new THREE.Mesh(groundGeo, floorMat);
    groundMesh.position.y = -0.7;
    groundMesh.receiveShadow = true;
    this.worldGroup.add(groundMesh);

    // Outer natural skirt beyond playable radius so horizon blends into fog cleanly
    const skirtGeo = new THREE.RingGeometry(arena.radius * 0.98, arena.radius + (arena.isOverworld ? 260 : 80), 48);
    this.reusableGeos.push(skirtGeo);
    const skirtMat = new THREE.MeshStandardMaterial({
      color: arena.floorAlt,
      roughness: 0.92,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    this.disposableStaticMats.push(skirtMat);
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.rotation.x = -Math.PI / 2;
    skirtMesh.position.y = -0.05;
    skirtMesh.receiveShadow = true;
    this.worldGroup.add(skirtMesh);

    // Perimeter rim ring
    if (!arena.isOverworld) {
      const trimGeo = new THREE.TorusGeometry(arena.radius, 0.35, 10, 64);
      this.reusableGeos.push(trimGeo);
      const trimMat = new THREE.MeshStandardMaterial({
        color: arena.floorTrim,
        roughness: 0.32,
        metalness: 0.65,
        emissive: arena.floorTrim,
        emissiveIntensity: 0.22,
      });
      this.disposableStaticMats.push(trimMat);
      const trimMesh = new THREE.Mesh(trimGeo, trimMat);
      trimMesh.rotation.x = Math.PI / 2;
      trimMesh.position.y = 0.05;
      this.worldGroup.add(trimMesh);
    }

    // Terrain Zones (water lakes, lava pools, meadows, ice patches, rune pads)
    for (const tz of arena.terrainZones) {
      const tzGeo = new THREE.CircleGeometry(tz.radius, 28);
      this.reusableGeos.push(tzGeo);
      const isLiquid = tz.kind === 'magma_pool' || tz.kind === 'water_lake' || tz.kind === 'healing_spring';
      const tzMat = new THREE.MeshStandardMaterial({
        color: tz.color,
        roughness: isLiquid ? 0.16 : 0.78,
        metalness: isLiquid ? 0.35 : 0.08,
        emissive: tz.kind === 'magma_pool' || tz.kind === 'rune_pad' ? tz.color : '#000000',
        emissiveIntensity: tz.kind === 'magma_pool' ? 0.55 : tz.kind === 'rune_pad' ? 0.42 : 0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      this.disposableStaticMats.push(tzMat);
      const tzMesh = new THREE.Mesh(tzGeo, tzMat);
      tzMesh.rotation.x = -Math.PI / 2;
      tzMesh.position.set(tz.x, 0.03, tz.z);
      tzMesh.receiveShadow = true;
      this.worldGroup.add(tzMesh);
    }

    // Elevated Platforms
    const platMat = new THREE.MeshStandardMaterial({
      map: this.getSurfaceTexture('stone', arena.platformWall, arena.floorTrim),
      roughness: 0.62,
      metalness: 0.22,
    });
    const platCapMat = new THREE.MeshStandardMaterial({
      color: arena.floorAlt,
      roughness: 0.52,
      metalness: 0.25,
    });
    this.disposableStaticMats.push(platMat, platCapMat);

    for (const plat of arena.platforms) {
      const bodyGeo = new THREE.CylinderGeometry(plat.radius * 0.98, plat.radius * 1.05, plat.height, 24);
      const capGeo = new THREE.CylinderGeometry(plat.radius, plat.radius, 0.16, 24);
      this.reusableGeos.push(bodyGeo, capGeo);
      const body = new THREE.Mesh(bodyGeo, platMat);
      body.position.set(plat.x, plat.height * 0.5, plat.z);
      body.castShadow = true;
      body.receiveShadow = true;
      this.worldGroup.add(body);

      const cap = new THREE.Mesh(capGeo, platCapMat);
      cap.position.set(plat.x, plat.height - 0.06, plat.z);
      cap.receiveShadow = true;
      this.worldGroup.add(cap);
    }

    // Sculpted Pillars (composite base + shaft + glowing crystal cap)
    const pilMat = new THREE.MeshStandardMaterial({
      color: arena.pillarColor,
      roughness: 0.48,
      metalness: 0.35,
    });
    const pilAccMat = new THREE.MeshStandardMaterial({
      color: arena.pillarAccent,
      emissive: arena.pillarAccent,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.6,
    });
    this.disposableStaticMats.push(pilMat, pilAccMat);

    for (const p of arena.pillars) {
      const grp = new THREE.Group();
      grp.position.set(p.x, 0, p.z);

      const baseGeo = new THREE.CylinderGeometry(p.radius * 1.18, p.radius * 1.3, 0.7, 8);
      const shaftGeo = new THREE.CylinderGeometry(p.radius * 0.88, p.radius * 1.02, p.height, 8);
      const capGeo = new THREE.OctahedronGeometry(p.radius * 0.85, 0);
      this.reusableGeos.push(baseGeo, shaftGeo, capGeo);

      const bMesh = new THREE.Mesh(baseGeo, pilMat);
      bMesh.position.y = 0.35;
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      grp.add(bMesh);

      const sMesh = new THREE.Mesh(shaftGeo, pilMat);
      sMesh.position.y = p.height * 0.5;
      sMesh.castShadow = true;
      sMesh.receiveShadow = true;
      grp.add(sMesh);

      const cMesh = new THREE.Mesh(capGeo, pilAccMat);
      cMesh.position.y = p.height + p.radius * 0.75;
      grp.add(cMesh);

      this.worldGroup.add(grp);
    }

    // Grand Arches
    for (const arch of arena.arches) {
      const grp = new THREE.Group();
      grp.position.set(arch.x, 0, arch.z);
      grp.rotation.y = arch.rotY;
      const colGeo = new THREE.BoxGeometry(0.95, arch.height, 0.95);
      const lintelGeo = new THREE.BoxGeometry(arch.width + 1.4, 0.9, 1.15);
      this.reusableGeos.push(colGeo, lintelGeo);

      const leftCol = new THREE.Mesh(colGeo, pilMat);
      leftCol.position.set(-arch.width * 0.5, arch.height * 0.5, 0);
      leftCol.castShadow = true;
      grp.add(leftCol);

      const rightCol = new THREE.Mesh(colGeo, pilMat);
      rightCol.position.set(arch.width * 0.5, arch.height * 0.5, 0);
      rightCol.castShadow = true;
      grp.add(rightCol);

      const lintel = new THREE.Mesh(lintelGeo, pilAccMat);
      lintel.position.set(0, arch.height + 0.35, 0);
      lintel.castShadow = true;
      grp.add(lintel);

      this.worldGroup.add(grp);
    }

    // Shrines (pedestal + floating rotating rune crystal)
    for (const sh of arena.shrines) {
      const baseH = this.samplePlatformHeight(arena, sh.x, sh.z);
      const grp = new THREE.Group();
      grp.position.set(sh.x, baseH, sh.z);

      const pedGeo = new THREE.CylinderGeometry(0.95, 1.2, 0.45, 12);
      const orbGeo = new THREE.OctahedronGeometry(0.55, 0);
      this.reusableGeos.push(pedGeo, orbGeo);

      const shMat = new THREE.MeshStandardMaterial({
        color: sh.color,
        emissive: sh.color,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.5,
      });
      this.disposableStaticMats.push(shMat);

      const ped = new THREE.Mesh(pedGeo, pilMat);
      ped.position.y = 0.22;
      ped.castShadow = true;
      grp.add(ped);

      const orb = new THREE.Mesh(orbGeo, shMat);
      orb.position.y = 1.65;
      grp.add(orb);

      this.worldGroup.add(grp);
    }

    // Overworld Fixed Landmarks (Portals + NPCs + Secret Boss Shrines + Event Zones)
    if (arena.worldPortals) {
      for (const wp of arena.worldPortals) {
        const grp = new THREE.Group();
        grp.position.set(wp.x, 0, wp.z);
        const torusGeo = new THREE.TorusGeometry(1.75, 0.22, 10, 28);
        const pedGeo = new THREE.CylinderGeometry(2.1, 2.3, 0.35, 16);
        this.reusableGeos.push(torusGeo, pedGeo);
        const portMat = new THREE.MeshStandardMaterial({
          color: wp.color,
          emissive: wp.color,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.65,
        });
        this.disposableStaticMats.push(portMat);
        const ped = new THREE.Mesh(pedGeo, pilMat);
        ped.position.y = 0.17;
        grp.add(ped);
        const ring = new THREE.Mesh(torusGeo, portMat);
        ring.position.y = 2.15;
        grp.add(ring);
        this.worldGroup.add(grp);
      }
    }

    if (arena.worldNpcs) {
      for (const npc of arena.worldNpcs) {
        const grp = new THREE.Group();
        grp.position.set(npc.x, 0, npc.z);
        const bodyGeo = new THREE.CylinderGeometry(0.36, 0.48, 1.35, 10);
        const headGeo = new THREE.SphereGeometry(0.28, 12, 10);
        const haloGeo = new THREE.TorusGeometry(0.45, 0.05, 8, 18);
        this.reusableGeos.push(bodyGeo, headGeo, haloGeo);
        const npcMat = new THREE.MeshStandardMaterial({
          color: npc.robeColor,
          roughness: 0.5,
          metalness: 0.2,
        });
        const skinMat = new THREE.MeshStandardMaterial({ color: '#F1C27D', roughness: 0.6 });
        const haloMat = new THREE.MeshBasicMaterial({ color: npc.accentColor || '#38BDF8' });
        this.disposableStaticMats.push(npcMat, skinMat, haloMat);

        const body = new THREE.Mesh(bodyGeo, npcMat);
        body.position.y = 0.68;
        body.castShadow = true;
        grp.add(body);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.6;
        grp.add(head);
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 2.05;
        grp.add(halo);
        this.worldGroup.add(grp);
      }
    }
  }

  private syncStreamedChunks(payload: RenderScenePayload) {
    const arena = payload.arena;
    const props = arena.sceneryProps || [];
    const nodes = arena.worldNodes || [];
    const chests = arena.worldChests || [];
    const waystones = arena.worldWaystones || [];
    const openedSet = new Set(payload.openedChests || []);
    const gatheredSet = new Set(payload.gatheredNodeIds || []);
    const bossShrines = payload.secretBossShrines || [];
    const defeatedBosses = new Set(payload.defeatedSecretBossIds || []);
    const eventZones = payload.worldEventZones || [];
    const completedEvents = new Set(payload.completedWorldEventIds || []);

    const sig = `${props.length}|${nodes.length}|${chests.length}|${waystones.length}|${openedSet.size}|${gatheredSet.size}|${defeatedBosses.size}|${completedEvents.size}|${props[0]?.x ?? 0}`;
    if (this.streamedSignature === sig) return;
    this.streamedSignature = sig;

    this.clearGroupDisposables(this.chunkGroup, this.disposableChunkMats);

    const woodMat = new THREE.MeshStandardMaterial({ color: '#6B4423', roughness: 0.82 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.62 });
    const rockMat = new THREE.MeshStandardMaterial({ color: '#64748B', roughness: 0.85, metalness: 0.1 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 0.65,
      roughness: 0.18,
      metalness: 0.5,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#F59E0B',
      emissive: '#D97706',
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.82,
    });
    this.disposableChunkMats.push(woodMat, leafMat, rockMat, crystalMat, goldMat);

    // Scenery Props
    for (const sp of props) {
      const s = sp.scale || 1;
      const grp = new THREE.Group();
      grp.position.set(sp.x, 0, sp.z);
      if (sp.rotY) grp.rotation.y = sp.rotY;

      if (sp.kind === 'pine_tree') {
        const trunkGeo = new THREE.CylinderGeometry(0.22 * s, 0.36 * s, 2.6 * s, 7);
        const coneGeo = new THREE.ConeGeometry(1.55 * s, 3.4 * s, 8);
        this.reusableGeos.push(trunkGeo, coneGeo);
        const trunk = new THREE.Mesh(trunkGeo, woodMat);
        trunk.position.y = 1.3 * s;
        trunk.castShadow = true;
        grp.add(trunk);
        const treeMat = sp.color
          ? (() => {
              const m = new THREE.MeshStandardMaterial({ color: sp.color, roughness: 0.6 });
              this.disposableChunkMats.push(m);
              return m;
            })()
          : leafMat;
        const crown = new THREE.Mesh(coneGeo, treeMat);
        crown.position.y = 3.5 * s;
        crown.castShadow = true;
        grp.add(crown);
      } else if (sp.kind === 'crystal_cluster') {
        const crysGeo = new THREE.OctahedronGeometry(0.85 * s, 0);
        this.reusableGeos.push(crysGeo);
        const cMesh = new THREE.Mesh(crysGeo, crystalMat);
        cMesh.scale.set(0.75, 1.9, 0.75);
        cMesh.position.y = 1.1 * s;
        grp.add(cMesh);
      } else if (sp.kind === 'cottage') {
        const h = 3.2 * s;
        const w = 3.8 * s;
        const wallGeo = new THREE.BoxGeometry(w, h, w);
        const roofGeo = new THREE.ConeGeometry(w * 0.85, 1.8 * s, 4);
        this.reusableGeos.push(wallGeo, roofGeo);
        const houseMat = new THREE.MeshStandardMaterial({
          color: sp.color || '#CBD5E1',
          roughness: 0.72,
        });
        this.disposableChunkMats.push(houseMat);
        const wall = new THREE.Mesh(wallGeo, houseMat);
        wall.position.y = h * 0.5;
        wall.castShadow = true;
        wall.receiveShadow = true;
        grp.add(wall);
        const roof = new THREE.Mesh(roofGeo, woodMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = h + 0.9 * s;
        roof.castShadow = true;
        grp.add(roof);
      } else if (sp.kind === 'fountain') {
        const basinGeo = new THREE.CylinderGeometry(1.7 * s, 1.9 * s, 0.55 * s, 14);
        const colGeo = new THREE.CylinderGeometry(0.32 * s, 0.44 * s, 1.6 * s, 10);
        this.reusableGeos.push(basinGeo, colGeo);
        const basin = new THREE.Mesh(basinGeo, rockMat);
        basin.position.y = 0.28 * s;
        basin.receiveShadow = true;
        const col = new THREE.Mesh(colGeo, crystalMat);
        col.position.y = 1.0 * s;
        grp.add(basin, col);
      } else if (sp.kind === 'ruin_pillar') {
        const pGeo = new THREE.CylinderGeometry(0.45 * s, 0.58 * s, 3.6 * s, 8);
        this.reusableGeos.push(pGeo);
        const pil = new THREE.Mesh(pGeo, rockMat);
        pil.position.y = 1.8 * s;
        pil.castShadow = true;
        grp.add(pil);
      } else if (sp.kind === 'campfire') {
        const logGeo = new THREE.CylinderGeometry(0.14 * s, 0.14 * s, 1.2 * s, 6);
        const emberGeo = new THREE.ConeGeometry(0.38 * s, 0.85 * s, 7);
        this.reusableGeos.push(logGeo, emberGeo);
        const emberMat = new THREE.MeshBasicMaterial({ color: '#FB923C' });
        this.disposableChunkMats.push(emberMat);
        const log1 = new THREE.Mesh(logGeo, woodMat);
        log1.rotation.z = Math.PI / 2;
        log1.position.y = 0.14 * s;
        const flame = new THREE.Mesh(emberGeo, emberMat);
        flame.position.y = 0.55 * s;
        grp.add(log1, flame);
      } else {
        const bGeo = new THREE.DodecahedronGeometry(1.1 * s, 0);
        this.reusableGeos.push(bGeo);
        const rock = new THREE.Mesh(bGeo, rockMat);
        rock.position.y = 0.65 * s;
        rock.castShadow = true;
        rock.receiveShadow = true;
        grp.add(rock);
      }
      this.chunkGroup.add(grp);
    }

    // Gatherable Nodes
    for (const nd of nodes) {
      if (gatheredSet.has(nd.id)) continue;
      const geo = new THREE.OctahedronGeometry(0.55, 0);
      this.reusableGeos.push(geo);
      const color =
        nd.color ||
        (nd.kind === 'crystal' ? '#38BDF8' : nd.kind === 'ore' ? '#94A3B8' : '#22C55E');
      const nMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.45,
      });
      this.disposableChunkMats.push(nMat);
      const mesh = new THREE.Mesh(geo, nMat);
      mesh.position.set(nd.x, 0.7, nd.z);
      this.chunkGroup.add(mesh);
    }

    // World Chests
    for (const ch of chests) {
      const opened = openedSet.has(ch.id);
      const grp = new THREE.Group();
      grp.position.set(ch.x, 0, ch.z);
      const boxGeo = new THREE.BoxGeometry(1.15, 0.75, 0.85);
      this.reusableGeos.push(boxGeo);
      const chMat = opened ? rockMat : goldMat;
      const box = new THREE.Mesh(boxGeo, chMat);
      box.position.y = 0.38;
      box.castShadow = true;
      grp.add(box);
      this.chunkGroup.add(grp);
    }

    // Waystones
    for (const ws of waystones) {
      const obGeo = new THREE.CylinderGeometry(0.35, 0.6, 2.8, 6);
      this.reusableGeos.push(obGeo);
      const mesh = new THREE.Mesh(obGeo, crystalMat);
      mesh.position.set(ws.x, 1.4, ws.z);
      mesh.castShadow = true;
      this.chunkGroup.add(mesh);
    }

    // Secret Boss Shrines
    for (const sb of bossShrines) {
      if (defeatedBosses.has(sb.id)) continue;
      const grp = new THREE.Group();
      grp.position.set(sb.x, 0, sb.z);
      const ringGeo = new THREE.TorusGeometry(2.6, 0.14, 8, 28);
      const spireGeo = new THREE.ConeGeometry(0.65, 3.2, 6);
      this.reusableGeos.push(ringGeo, spireGeo);
      const sbMat = new THREE.MeshStandardMaterial({
        color: sb.accentColor,
        emissive: sb.accentColor,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });
      this.disposableChunkMats.push(sbMat);
      const ring = new THREE.Mesh(ringGeo, sbMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12;
      grp.add(ring);
      const spire = new THREE.Mesh(spireGeo, sbMat);
      spire.position.y = 1.6;
      grp.add(spire);
      this.chunkGroup.add(grp);
    }

    // World Event Zones
    for (const ez of eventZones) {
      if (completedEvents.has(ez.id)) continue;
      const ringGeo = new THREE.TorusGeometry(ez.radius * 0.45, 0.16, 8, 36);
      this.reusableGeos.push(ringGeo);
      const ezMat = new THREE.MeshStandardMaterial({
        color: ez.color,
        emissive: ez.color,
        emissiveIntensity: 0.75,
      });
      this.disposableChunkMats.push(ezMat);
      const mesh = new THREE.Mesh(ringGeo, ezMat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(ez.x, 0.15, ez.z);
      this.chunkGroup.add(mesh);
    }
  }

  private samplePlatformHeight(arena: ArenaDef, x: number, z: number): number {
    let h = 0;
    for (const plat of arena.platforms) {
      if (Math.hypot(x - plat.x, z - plat.z) <= plat.radius && plat.height > h) {
        h = plat.height;
      }
    }
    return h;
  }

  private createSculptedTorsoGeometry(widthScale: number, depthScale: number, height: number): THREE.LatheGeometry {
    return buildSculptedTorsoGeometry(widthScale, depthScale, height);
  }

  private createFighterRig(f: RenderFighter): FighterVisualRig {
    const rig = buildUnifiedFighterRig(
      f.avatar,
      this.sharedShadowGeo,
      this.sharedShadowTex,
      f.weaponLevel || 1
    );
    this.entitiesGroup.add(rig.root);
    return rig;
  }

  private createMonsterRig(m: RenderMonster): MonsterVisualRig {
    const def = MONSTERS[m.archetype] || MONSTERS.ash_stalker;
    const s = def.scale;
    const root = new THREE.Group();
    const bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.sharedShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const shadowDisc = new THREE.Mesh(this.sharedShadowGeo, shadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.03;
    shadowDisc.scale.setScalar(s * 0.95);
    root.add(shadowDisc);

    const teleMat = new THREE.MeshBasicMaterial({
      color: '#EF4444',
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const telegraphDisc = new THREE.Mesh(this.sharedRingGeo, teleMat);
    telegraphDisc.rotation.x = -Math.PI / 2;
    telegraphDisc.position.y = 0.06;
    telegraphDisc.visible = false;
    root.add(telegraphDisc);

    const primaryMat = new THREE.MeshStandardMaterial({
      color: def.bodyColor,
      roughness: 0.52,
      metalness: m.isBoss ? 0.55 : 0.24,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: def.accentColor,
      emissive: def.accentColor,
      emissiveIntensity: m.isBoss ? 0.72 : 0.38,
      roughness: 0.25,
      metalness: 0.45,
    });

    let leftLeg: THREE.Group | undefined;
    let rightLeg: THREE.Group | undefined;
    let leftArm: THREE.Group | undefined;
    let rightArm: THREE.Group | undefined;

    if (m.archetype === 'ash_stalker') {
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3 * s, 0.78 * s, 4, 10), primaryMat);
      torso.rotation.x = Math.PI / 2;
      torso.position.y = 0.62 * s;
      torso.castShadow = true;
      bodyGroup.add(torso);

      const neckChest = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 10, 8), primaryMat);
      neckChest.position.set(0, 0.74 * s, 0.44 * s);
      neckChest.castShadow = true;
      bodyGroup.add(neckChest);

      const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * s, 0.22 * s, 4, 8), primaryMat);
      head.rotation.x = Math.PI * 0.42;
      head.position.set(0, 0.84 * s, 0.68 * s);
      head.castShadow = true;
      bodyGroup.add(head);

      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14 * s, 0.42 * s, 6), accentMat);
      spike.position.set(0, 0.96 * s, -0.06 * s);
      spike.rotation.x = -0.35;
      bodyGroup.add(spike);

      for (const [lx, lz] of [[-0.22, 0.34], [0.22, 0.34], [-0.22, -0.34], [0.22, -0.34]]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.095 * s, 0.42 * s, 4, 8), primaryMat);
        leg.position.set(lx * s, 0.32 * s, lz * s);
        leg.castShadow = true;
        bodyGroup.add(leg);
      }
    } else if (m.archetype === 'venom_crawler') {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 12, 10), primaryMat);
      shell.scale.set(1.2, 0.68, 1.4);
      shell.position.y = 0.45 * s;
      shell.castShadow = true;
      bodyGroup.add(shell);
      const venomSac = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 10, 8), accentMat);
      venomSac.position.set(0, 0.66 * s, -0.26 * s);
      bodyGroup.add(venomSac);
      for (const sSide of [-1, 1]) {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.11 * s, 0.44 * s, 6), accentMat);
        tusk.position.set(sSide * 0.24 * s, 0.48 * s, 0.68 * s);
        tusk.rotation.x = Math.PI * 0.45;
        bodyGroup.add(tusk);
        for (let l = -1; l <= 1; l++) {
          const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065 * s, 0.38 * s, 4, 8), primaryMat);
          leg.position.set(sSide * 0.52 * s, 0.28 * s, l * 0.32 * s);
          leg.rotation.z = sSide * 0.72;
          leg.castShadow = true;
          bodyGroup.add(leg);
        }
      }
    } else if (m.archetype === 'frost_specter' || m.archetype === 'ember_imp' || m.archetype === 'wraith_knight' || m.archetype === 'shadow_reaper') {
      const cloakGeo = this.createSculptedTorsoGeometry(1.1 * s, 0.9 * s, 1.45 * s);
      const cloak = new THREE.Mesh(cloakGeo, primaryMat);
      cloak.position.y = 0.32 * s;
      cloak.castShadow = true;
      bodyGroup.add(cloak);

      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25 * s, 12, 10), primaryMat);
      skull.position.y = 1.78 * s;
      skull.castShadow = true;
      bodyGroup.add(skull);

      const eyeVisor = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.07 * s, 0.08 * s), accentMat);
      eyeVisor.position.set(0, 1.8 * s, 0.22 * s);
      bodyGroup.add(eyeVisor);

      rightArm = new THREE.Group();
      rightArm.position.set(0.38 * s, 1.46 * s, 0);
      const rShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 8, 8), primaryMat);
      rightArm.add(rShoulder);
      const rLimb = new THREE.Mesh(new THREE.CapsuleGeometry(0.095 * s, 0.42 * s, 4, 8), primaryMat);
      rLimb.position.y = -0.26 * s;
      rightArm.add(rLimb);

      if (m.archetype === 'wraith_knight' || m.archetype === 'shadow_reaper') {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 1.45 * s, 5), accentMat);
        blade.position.set(0, 0.16 * s, 0.38 * s);
        blade.rotation.x = Math.PI * 0.38;
        rightArm.add(blade);
      }
      bodyGroup.add(rightArm);
    } else {
      // Unified Sculpted Golem / Titan / Epic Boss
      const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 12, 10), primaryMat);
      pelvis.scale.set(1.12, 0.52, 0.88);
      pelvis.position.y = 0.86 * s;
      pelvis.castShadow = true;
      bodyGroup.add(pelvis);

      leftLeg = new THREE.Group();
      leftLeg.position.set(-0.28 * s, 0.84 * s, 0);
      const lLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.21 * s, 0.62 * s, 4, 10), primaryMat);
      lLegMesh.position.y = -0.4 * s;
      lLegMesh.castShadow = true;
      leftLeg.add(lLegMesh);

      rightLeg = new THREE.Group();
      rightLeg.position.set(0.28 * s, 0.84 * s, 0);
      const rLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.21 * s, 0.62 * s, 4, 10), primaryMat);
      rLegMesh.position.y = -0.4 * s;
      rLegMesh.castShadow = true;
      rightLeg.add(rLegMesh);
      bodyGroup.add(leftLeg, rightLeg);

      const torsoGeo = this.createSculptedTorsoGeometry(1.48 * s, 1.15 * s, 1.15 * s);
      const torso = new THREE.Mesh(torsoGeo, primaryMat);
      torso.position.y = 0.84 * s;
      torso.castShadow = true;
      bodyGroup.add(torso);

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 * s, 0), accentMat);
      core.position.set(0, 1.48 * s, 0.42 * s);
      bodyGroup.add(core);

      const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 * s, 1), primaryMat);
      head.position.y = 2.02 * s;
      head.castShadow = true;
      bodyGroup.add(head);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32 * s, 0.08 * s, 0.1 * s), accentMat);
      visor.position.set(0, 2.04 * s, 0.24 * s);
      bodyGroup.add(visor);

      const buildMonsterArm = (side: -1 | 1) => {
        const arm = new THREE.Group();
        arm.position.set(side * 0.54 * s, 1.66 * s, 0);
        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.26 * s, 10, 8), primaryMat);
        arm.add(pauldron);
        const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * s, 0.66 * s, 4, 10), primaryMat);
        limb.position.y = -0.44 * s;
        limb.castShadow = true;
        arm.add(limb);
        if (m.isBoss) {
          const spire = new THREE.Mesh(new THREE.ConeGeometry(0.14 * s, 0.48 * s, 6), accentMat);
          spire.position.y = 0.34 * s;
          arm.add(spire);
        }
        return arm;
      };
      leftArm = buildMonsterArm(-1);
      rightArm = buildMonsterArm(1);

      if (m.isBoss) {
        const cleaver = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 1.85 * s, 5), accentMat);
        cleaver.position.set(0, -0.42 * s, 0.55 * s);
        cleaver.rotation.x = Math.PI * 0.38;
        rightArm.add(cleaver);

        const crown = new THREE.Mesh(new THREE.TorusGeometry(0.45 * s, 0.075 * s, 8, 16), accentMat);
        crown.rotation.x = Math.PI / 2;
        crown.position.y = 2.48 * s;
        bodyGroup.add(crown);
      }
      bodyGroup.add(leftArm, rightArm);
    }

    this.entitiesGroup.add(root);
    return {
      signature: `${m.archetype}|${m.isBoss}`,
      root,
      bodyGroup,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      shadowDisc,
      telegraphDisc,
      primaryMat,
      accentMat,
    };
  }

  private disposeObjectTree(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
  }

  private updateDynamicLighting(payload: RenderScenePayload, dt: number) {
    const preset = ARENA_LIGHTING[payload.arena.id] || ARENA_LIGHTING.obsidian_citadel;
    const damp = 1 - Math.exp(-3.2 * dt);

    // Horizon Fog & Sky Color (responds smoothly to Overworld biome changes)
    const skyTargetHex =
      payload.isOverworld && payload.biomeSkyTint ? payload.biomeSkyTint : payload.arena.skyHorizon;
    const fogTargetHex =
      payload.isOverworld && payload.biomeSkyTint ? payload.biomeSkyTint : payload.arena.fogColor;

    _c1.set(skyTargetHex);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(_c1, damp);
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      _c2.set(fogTargetHex);
      this.scene.fog.color.lerp(_c2, damp);
      const targetDensity =
        payload.quality === 'impossible'
          ? payload.isOverworld
            ? 0.0052
            : 0.0095
          : payload.isOverworld
            ? 0.0068
            : 0.011;
      this.scene.fog.density += (targetDensity - this.scene.fog.density) * damp;
    }

    // Key Sun Light + Tight Moving Shadow Frustum centered near focus target
    _c1.set(preset.keyColor);
    if (payload.isOverworld && payload.biomeSkyTint) {
      _c3.set(payload.biomeSkyTint);
      _c1.lerp(_c3, 0.22);
    }
    this.keyLight.color.lerp(_c1, damp);
    const qualBoost = payload.quality === 'impossible' ? 1.12 : payload.quality === 'mythic' ? 1.06 : 1.0;
    this.keyLight.intensity += (preset.keyIntensity * qualBoost - this.keyLight.intensity) * damp;

    // Hemisphere Light
    _c1.set(preset.hemiSky);
    if (payload.isOverworld && payload.biomeSkyTint) {
      _c3.set(payload.biomeSkyTint);
      _c1.lerp(_c3, 0.35);
    }
    this.hemiLight.color.lerp(_c1, damp);
    _c2.set(preset.hemiGround);
    this.hemiLight.groundColor.lerp(_c2, damp);
    this.hemiLight.intensity += (preset.hemiIntensity * qualBoost - this.hemiLight.intensity) * damp;

    // Rim Light
    _c1.set(preset.rimColor);
    this.rimLight.color.lerp(_c1, damp);
    this.rimLight.intensity += (preset.rimIntensity - this.rimLight.intensity) * damp;

    const exposureBoost = payload.quality === 'impossible' ? 1.06 : payload.quality === 'mythic' ? 1.02 : 0.98;
    this.renderer.toneMappingExposure +=
      (preset.exposure * exposureBoost - this.renderer.toneMappingExposure) * damp;

    const p1 = payload.fighters.find((f) => f.team === 'player1');
    const fx = p1 ? p1.x : 0;
    const fz = p1 ? p1.z : 0;
    this.keyLight.target.position.set(fx, 0, fz);
    this.keyLight.position.set(fx + preset.sunDir[0], preset.sunDir[1], fz + preset.sunDir[2]);
    this.rimLight.position.set(fx - preset.sunDir[0] * 0.8, 18, fz - preset.sunDir[2] * 0.8);
  }

  public renderScene(payload: RenderScenePayload, cam: Camera3D, overlayCtx?: CanvasRenderingContext2D | null) {
    if (this.disposed || this.contextLost) return;

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastRenderTime) / 1000));
    this.lastRenderTime = now;

    this.ensureQualityMode(payload.quality);
    this.syncStaticWorld(payload);
    this.syncStreamedChunks(payload);
    this.updateDynamicLighting(payload, dt);

    // Sync Camera3D -> THREE.PerspectiveCamera
    if (Math.abs(this.camera.fov - cam.fov) > 0.1) {
      this.camera.fov = cam.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.set(cam.pos.x, cam.pos.y, cam.pos.z);
    this.camera.lookAt(cam.target.x, cam.target.y, cam.target.z);

    // 1. Fighters
    const activeFighters = new Set<string>();
    for (const f of payload.fighters) {
      activeFighters.add(f.id);
      let rig = this.fighterRigs.get(f.id);
      const expectedSig = `${f.avatar.weaponId}|${f.avatar.headStyle}|${f.avatar.armorStyle}|${f.avatar.backGear}|${f.avatar.primaryColor}|${f.avatar.secondaryColor}|${f.avatar.accentColor}|${f.avatar.skinTone}|${f.avatar.heightScale}|${f.avatar.shoulderScale}|${f.avatar.build}`;
      if (!rig || rig.signature !== expectedSig) {
        if (rig) {
          this.entitiesGroup.remove(rig.root);
          this.disposeObjectTree(rig.root);
        }
        rig = this.createFighterRig(f);
        this.fighterRigs.set(f.id, rig);
      }

      rig.root.position.set(f.x, f.y, f.z);
      rig.root.rotation.y = f.yaw;

      const sq = f.squash ?? 1;
      const invSq = 1 / Math.sqrt(Math.max(0.45, sq));
      rig.squashGroup.scale.set(invSq, sq, invSq);

      const bank = f.bankAngle ?? 0;
      rig.tiltGroup.rotation.z = -bank;
      rig.tiltGroup.rotation.x =
        f.animState === 'dodge' ? 0.52 : f.animState === 'run' ? 0.12 : f.isAirborne ? -0.08 : 0;

      // Ground contact shadow stays anchored near terrain beneath fighter even while jumping!
      const gy = this.samplePlatformHeight(payload.arena, f.x, f.z);
      const heightAbove = Math.max(0, f.y - gy);
      rig.shadowDisc.position.y = -heightAbove + 0.03;
      rig.shadowDisc.scale.setScalar(Math.max(0.48, 1 - heightAbove * 0.14));
      rig.auraRing.position.y = -heightAbove + 0.04;
      rig.auraRing.rotation.z = payload.time * 0.8;

      // Procedural 2-Segment Articulated Limb Animation
      const stride = f.animState === 'run' ? Math.sin(f.walkPhase * 10) * (f.isAirborne ? 0.32 : 0.66) : 0;
      rig.leftLeg.rotation.x = stride;
      rig.rightLeg.rotation.x = -stride;
      rig.leftKnee.rotation.x = f.animState === 'run' ? Math.max(0, -stride) * 0.65 : 0.06;
      rig.rightKnee.rotation.x = f.animState === 'run' ? Math.max(0, stride) * 0.65 : 0.06;

      if (f.animState === 'attack' || f.animState === 'heavy') {
        const swing = Math.sin(Math.min(1, f.animTime * 6.5) * Math.PI);
        rig.rightArm.rotation.x = -1.45 * swing;
        rig.rightArm.rotation.y = (f.comboStep % 2 === 0 ? -0.85 : 0.85) * swing;
        rig.rightElbow.rotation.x = -0.35 - swing * 0.4;
        rig.leftArm.rotation.x = 0.42 * swing;
        rig.leftElbow.rotation.x = -0.35;
      } else if (f.animState === 'power') {
        rig.rightArm.rotation.x = -2.25;
        rig.leftArm.rotation.x = -2.25;
        rig.rightArm.rotation.y = 0;
        rig.rightElbow.rotation.x = -0.25;
        rig.leftElbow.rotation.x = -0.25;
      } else if (f.animState === 'block') {
        rig.rightArm.rotation.x = -0.9;
        rig.leftArm.rotation.x = -1.05;
        rig.rightElbow.rotation.x = -0.65;
        rig.leftElbow.rotation.x = -0.75;
      } else if (f.isAirborne) {
        rig.rightArm.rotation.x = -0.65;
        rig.leftArm.rotation.x = -0.65;
        rig.rightElbow.rotation.x = -0.45;
        rig.leftElbow.rotation.x = -0.45;
      } else {
        rig.rightArm.rotation.x = -stride * 0.55;
        rig.leftArm.rotation.x = stride * 0.55;
        rig.rightArm.rotation.y = 0;
        rig.rightElbow.rotation.x = -0.28;
        rig.leftElbow.rotation.x = -0.28;
      }

      rig.backAnchor.rotation.x = Math.sin(payload.time * 4.5) * 0.08 + (f.animState === 'run' ? 0.25 : 0);
      rig.shieldSphere.visible = f.shieldActive;
      if (f.shieldActive) rig.shieldSphere.rotation.y = payload.time * 1.4;

      // Hit flash / Overdrive emissive
      if (f.hitFlash > 0) {
        rig.bodyMat.emissive.setHex(0xffffff);
        rig.bodyMat.emissiveIntensity = f.hitFlash * 0.8;
      } else if (f.overdriveActive) {
        rig.bodyMat.emissive.set('#F59E0B');
        rig.bodyMat.emissiveIntensity = 0.32;
      } else if (f.frozenTimer > 0) {
        rig.bodyMat.emissive.set('#38BDF8');
        rig.bodyMat.emissiveIntensity = 0.35;
      } else {
        rig.bodyMat.emissive.setHex(0x000000);
        rig.bodyMat.emissiveIntensity = 0;
      }

      rig.root.visible = f.hp > 0;
    }

    for (const [id, rig] of this.fighterRigs.entries()) {
      if (!activeFighters.has(id)) {
        this.entitiesGroup.remove(rig.root);
        this.disposeObjectTree(rig.root);
        this.fighterRigs.delete(id);
      }
    }

    // 2. Monsters
    const activeMonsters = new Set<string>();
    for (const m of payload.monsters) {
      if (m.hp <= 0) continue;
      activeMonsters.add(m.id);
      let rig = this.monsterRigs.get(m.id);
      const sig = `${m.archetype}|${m.isBoss}`;
      if (!rig || rig.signature !== sig) {
        if (rig) {
          this.entitiesGroup.remove(rig.root);
          this.disposeObjectTree(rig.root);
        }
        rig = this.createMonsterRig(m);
        this.monsterRigs.set(m.id, rig);
      }
      rig.root.position.set(m.x, m.y, m.z);
      rig.root.rotation.y = m.yaw;
      rig.bodyGroup.position.y = Math.abs(Math.sin(m.walkPhase * 9)) * 0.08;
      rig.bodyGroup.rotation.x = m.attackTimer > 0 ? 0.14 : 0;

      const mStride = Math.sin(m.walkPhase * 9) * 0.42;
      if (rig.leftLeg) rig.leftLeg.rotation.x = mStride;
      if (rig.rightLeg) rig.rightLeg.rotation.x = -mStride;
      const mAtk = m.attackTimer > 0 ? Math.sin(Math.min(1, m.attackTimer * 4) * Math.PI) * 1.2 : 0;
      if (rig.rightArm) rig.rightArm.rotation.x = -0.25 - mAtk;
      if (rig.leftArm) rig.leftArm.rotation.x = -0.2 - mAtk * 0.6;

      if (m.telegraphTimer > 0) {
        rig.telegraphDisc.visible = true;
        rig.telegraphDisc.scale.setScalar(m.telegraphRadius);
      } else {
        rig.telegraphDisc.visible = false;
      }

      if (m.hitFlash > 0) {
        rig.primaryMat.emissive.setHex(0xffffff);
        rig.primaryMat.emissiveIntensity = m.hitFlash * 0.85;
      } else if (m.frozenTimer > 0) {
        rig.primaryMat.emissive.set('#38BDF8');
        rig.primaryMat.emissiveIntensity = 0.45;
      } else {
        rig.primaryMat.emissive.setHex(0x000000);
        rig.primaryMat.emissiveIntensity = 0;
      }
    }

    for (const [id, rig] of this.monsterRigs.entries()) {
      if (!activeMonsters.has(id)) {
        this.entitiesGroup.remove(rig.root);
        this.disposeObjectTree(rig.root);
        this.monsterRigs.delete(id);
      }
    }

    // 3. Pooled VFX: Projectiles
    this.syncPooledMeshes(
      payload.projectiles.length,
      this.projectilePool,
      () => {
        const m = new THREE.Mesh(
          this.sharedProjGeo,
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        this.vfxGroup.add(m);
        return m;
      },
      (mesh, idx) => {
        const p = payload.projectiles[idx];
        mesh.position.set(p.x, p.y, p.z);
        mesh.scale.setScalar(p.radius);
        (mesh.material as THREE.MeshBasicMaterial).color.set(p.color);
      }
    );

    // 4. Pooled VFX: Ground Rings
    this.syncPooledMeshes(
      payload.rings.length,
      this.ringPool,
      () => {
        const m = new THREE.Mesh(
          this.sharedRingGeo,
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        m.rotation.x = -Math.PI / 2;
        this.vfxGroup.add(m);
        return m;
      },
      (mesh, idx) => {
        const r = payload.rings[idx];
        mesh.position.set(r.x, r.y + 0.05, r.z);
        mesh.scale.setScalar(Math.max(0.1, r.radius));
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(r.color);
        mat.opacity = Math.max(0, Math.min(1, r.alpha));
      }
    );

    // 5. Pooled VFX: Slashes
    this.syncPooledMeshes(
      payload.slashes.length,
      this.slashPool,
      () => {
        const m = new THREE.Mesh(
          this.sharedSlashGeo,
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        this.vfxGroup.add(m);
        return m;
      },
      (mesh, idx) => {
        const s = payload.slashes[idx];
        mesh.position.set(s.x, s.y, s.z);
        mesh.rotation.set(Math.PI / 2 + s.tilt, 0, -s.yaw + Math.PI / 2);
        mesh.scale.setScalar(s.radius);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(s.critical ? '#FDE047' : s.color);
        mat.opacity = Math.max(0, Math.min(1, s.alpha));
      }
    );

    // 6. Pooled VFX: Lightning Strikes
    this.syncPooledMeshes(
      payload.lightnings.length,
      this.lightningPool,
      () => {
        const m = new THREE.Mesh(
          this.sharedBoltGeo,
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false })
        );
        this.vfxGroup.add(m);
        return m;
      },
      (mesh, idx) => {
        const l = payload.lightnings[idx];
        mesh.position.set(l.x, 7, l.z);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(l.color);
        mat.opacity = Math.max(0, Math.min(1, l.alpha));
      }
    );

    // 7. Pooled VFX: Pickups
    while (this.pickupPool.length < payload.pickups.length) {
      const grp = new THREE.Group();
      const mesh = new THREE.Mesh(
        this.sharedPickupGeo,
        new THREE.MeshStandardMaterial({
          color: '#10B981',
          emissive: '#10B981',
          emissiveIntensity: 0.75,
          roughness: 0.15,
        })
      );
      grp.add(mesh);
      this.vfxGroup.add(grp);
      this.pickupPool.push(grp);
    }
    for (let i = 0; i < this.pickupPool.length; i++) {
      const grp = this.pickupPool[i];
      if (i >= payload.pickups.length) {
        grp.visible = false;
        continue;
      }
      const pk = payload.pickups[i];
      const gy = this.samplePlatformHeight(payload.arena, pk.x, pk.z);
      grp.visible = true;
      grp.position.set(pk.x, gy + 0.85 + Math.sin(payload.time * 3.5 + pk.bobPhase) * 0.22, pk.z);
      grp.rotation.y = payload.time * 2.2;
      const col = pk.kind === 'heal' ? '#10B981' : pk.kind === 'energy' ? '#38BDF8' : '#F59E0B';
      const mat = (grp.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.color.set(col);
      mat.emissive.set(col);
    }

    // 8. Pooled VFX: Dash Afterimages
    const dashList = payload.dashTrails || [];
    while (this.dashTrailPool.length < dashList.length) {
      const grp = new THREE.Group();
      const ghost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.22, 1.35, 8),
        new THREE.MeshBasicMaterial({ color: '#38BDF8', transparent: true, opacity: 0.5, depthWrite: false })
      );
      ghost.position.y = 0.8;
      grp.add(ghost);
      this.vfxGroup.add(grp);
      this.dashTrailPool.push(grp);
    }
    for (let i = 0; i < this.dashTrailPool.length; i++) {
      const grp = this.dashTrailPool[i];
      if (i >= dashList.length) {
        grp.visible = false;
        continue;
      }
      const d = dashList[i];
      grp.visible = true;
      grp.position.set(d.x, d.y, d.z);
      grp.rotation.y = d.yaw;
      grp.scale.set(1, d.hScale, 1);
      const mat = (grp.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.color.set(d.color);
      mat.opacity = Math.max(0, d.alpha * 0.55);
    }

    // 9. Instanced Particles (zero allocations!)
    const pCount = Math.min(this.maxParticles, payload.particles.length);
    this.particleInstanced.count = pCount;
    for (let i = 0; i < pCount; i++) {
      const pt = payload.particles[i];
      _dummy.position.set(pt.x, pt.y, pt.z);
      const s = Math.max(0.35, pt.size * 0.25) * Math.max(0.2, pt.alpha);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, _dummy.matrix);
      _c1.set(pt.color);
      this.particleInstanced.setColorAt(i, _c1);
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }

    // Render frame
    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // Optional projected 2D HUD Canvas Overlay (Nameplates, Boss Bars, Floating Damage)
    if (overlayCtx) {
      this.renderOverlay2D(overlayCtx, this.currentWidth, this.currentHeight, payload);
    }
  }

  public scheduleNextFrame(cb: () => void): { cancel: () => void } {
    if (!this.isSoftwareGl) {
      const rafId = requestAnimationFrame(cb);
      return { cancel: () => cancelAnimationFrame(rafId) };
    }
    let timerId = 0;
    let cancelled = false;
    const gl = this.renderer.getContext();
    if ('fenceSync' in gl && typeof (gl as WebGL2RenderingContext).fenceSync === 'function') {
      const gl2 = gl as WebGL2RenderingContext;
      const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl2.flush();
      const poll = () => {
        if (cancelled) {
          if (sync) gl2.deleteSync(sync);
          return;
        }
        const status = sync ? gl2.getSyncParameter(sync, gl2.SYNC_STATUS) : gl2.SIGNALED;
        if (status === gl2.UNSIGNALED) {
          timerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl2.deleteSync(sync);
          timerId = window.setTimeout(() => {
            if (!cancelled) cb();
          }, 80);
        }
      };
      timerId = window.setTimeout(poll, 5);
    } else {
      timerId = window.setTimeout(() => {
        if (!cancelled) cb();
      }, 80);
    }
    return {
      cancel: () => {
        cancelled = true;
        clearTimeout(timerId);
      },
    };
  }

  private syncPooledMeshes(
    needed: number,
    pool: THREE.Mesh[],
    factory: () => THREE.Mesh,
    updater: (m: THREE.Mesh, idx: number) => void
  ) {
    while (pool.length < needed) {
      pool.push(factory());
    }
    for (let i = 0; i < pool.length; i++) {
      const mesh = pool[i];
      if (i < needed) {
        mesh.visible = true;
        updater(mesh, i);
      } else {
        mesh.visible = false;
      }
    }
  }

  private projectToScreen(x: number, y: number, z: number, w: number, h: number): [number, number] | null {
    _v3.set(x, y, z);
    // Check in front of camera
    _v3b.copy(_v3).sub(this.camera.position);
    const camDir = _v3b;
    // Project using camera matrix
    _v3.project(this.camera);
    if (_v3.z < -1 || _v3.z > 1) return null;
    if (camDir.lengthSq() > 140 * 140) return null;
    const sx = (_v3.x * 0.5 + 0.5) * w;
    const sy = (-_v3.y * 0.5 + 0.5) * h;
    if (sx < -80 || sx > w + 80 || sy < -60 || sy > h + 60) return null;
    return [sx, sy];
  }

  private renderOverlay2D(ctx: CanvasRenderingContext2D, w: number, h: number, payload: RenderScenePayload) {
    const scaleX = ctx.canvas.width / Math.max(1, w);
    const scaleY = ctx.canvas.height / Math.max(1, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    }

    // Fighter HP bars & names
    for (const f of payload.fighters) {
      if (f.hp <= 0) continue;
      const pt = this.projectToScreen(f.x, f.y + 2.3 * f.avatar.heightScale, f.z, w, h);
      if (!pt) continue;
      const [sx, sy] = pt;
      const bw = 64;
      ctx.fillStyle = 'rgba(8, 12, 22, 0.82)';
      ctx.fillRect(sx - bw / 2, sy - 6, bw, 7);
      const ratio = Math.max(0, Math.min(1, f.hp / Math.max(1, f.maxHp)));
      ctx.fillStyle = f.team === 'player1' ? '#22C55E' : f.team === 'player2' ? '#38BDF8' : '#EF4444';
      ctx.fillRect(sx - bw / 2 + 1, sy - 5, (bw - 2) * ratio, 5);
      ctx.font = 'bold 11px Tajawal, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(f.name, sx, sy - 11);
    }

    // Monster & Boss HP bars
    for (const m of payload.monsters) {
      if (m.hp <= 0) continue;
      const scale = MONSTERS[m.archetype]?.scale || 1;
      const pt = this.projectToScreen(m.x, m.y + 2.25 * scale, m.z, w, h);
      if (!pt) continue;
      const [sx, sy] = pt;
      const bw = m.isBoss ? 86 : 48;
      ctx.fillStyle = 'rgba(8, 12, 22, 0.84)';
      ctx.fillRect(sx - bw / 2, sy - 5, bw, 6);
      const ratio = Math.max(0, Math.min(1, m.hp / Math.max(1, m.maxHp)));
      ctx.fillStyle = m.isBoss ? '#F59E0B' : '#F43F5E';
      ctx.fillRect(sx - bw / 2 + 1, sy - 4, (bw - 2) * ratio, 4);
      if (m.isBoss) {
        ctx.font = 'bold 12px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FDE047';
        ctx.fillText(`★ ${m.name}`, sx, sy - 10);
      }
    }

    // World NPC & Portal Labels
    if (payload.showFloorLabels && payload.arena.worldNpcs) {
      for (const npc of payload.arena.worldNpcs) {
        const pt = this.projectToScreen(npc.x, 2.35, npc.z, w, h);
        if (!pt) continue;
        ctx.font = 'bold 11px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#38BDF8';
        ctx.fillText(npc.name, pt[0], pt[1]);
      }
    }

    if (payload.showFloorLabels && payload.arena.worldPortals) {
      for (const wp of payload.arena.worldPortals) {
        const pt = this.projectToScreen(wp.x, 3.6, wp.z, w, h);
        if (!pt) continue;
        ctx.font = 'bold 12px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = wp.color;
        ctx.fillText(wp.label, pt[0], pt[1]);
      }
    }

    // Floating Damage / Crit / Status Texts
    if (payload.showFloatingDamage !== false) {
      ctx.textAlign = 'center';
      for (const ft of payload.floatingTexts) {
        const pt = this.projectToScreen(ft.x, ft.y, ft.z, w, h);
        if (!pt) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));
        const pxSize = Math.round(14 * (ft.scale || 1));
        ctx.font = `900 ${pxSize}px Changa, Tajawal, sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(4, 7, 15, 0.9)';
        ctx.strokeText(ft.text, pt[0], pt[1]);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, pt[0], pt[1]);
        ctx.restore();
      }
    }
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;

    const dom = this.renderer.domElement;
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.clearGroupDisposables(this.worldGroup, this.disposableStaticMats);
    this.clearGroupDisposables(this.chunkGroup, this.disposableChunkMats);

    for (const rig of this.fighterRigs.values()) this.disposeObjectTree(rig.root);
    this.fighterRigs.clear();
    for (const rig of this.monsterRigs.values()) this.disposeObjectTree(rig.root);
    this.monsterRigs.clear();

    for (const m of this.projectilePool) this.disposeObjectTree(m);
    for (const m of this.ringPool) this.disposeObjectTree(m);
    for (const m of this.slashPool) this.disposeObjectTree(m);
    for (const m of this.lightningPool) this.disposeObjectTree(m);
    for (const g of this.dashTrailPool) this.disposeObjectTree(g);
    for (const g of this.pickupPool) this.disposeObjectTree(g);

    for (const g of this.reusableGeos) g.dispose();
    this.reusableGeos = [];

    this.sharedParticleGeo.dispose();
    this.sharedParticleMat.dispose();
    this.sharedProjGeo.dispose();
    this.sharedRingGeo.dispose();
    this.sharedSlashGeo.dispose();
    this.sharedBoltGeo.dispose();
    this.sharedPickupGeo.dispose();
    this.sharedShadowGeo.dispose();
    this.sharedShadowTex.dispose();

    for (const tex of this.surfaceTextures.values()) tex.dispose();
    this.surfaceTextures.clear();

    this.envTexture?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}

function buildSculptedTorsoGeometry(widthScale: number, depthScale: number, height: number): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.24 * widthScale, 0.0),
    new THREE.Vector2(0.21 * widthScale, 0.14 * height),
    new THREE.Vector2(0.23 * widthScale, 0.34 * height),
    new THREE.Vector2(0.32 * widthScale, 0.62 * height),
    new THREE.Vector2(0.34 * widthScale, 0.78 * height),
    new THREE.Vector2(0.24 * widthScale, 0.89 * height),
    new THREE.Vector2(0.125 * widthScale, 0.94 * height),
    new THREE.Vector2(0.115 * widthScale, 1.06 * height),
    new THREE.Vector2(0.0, 1.08 * height),
  ];
  const geo = new THREE.LatheGeometry(pts, 14);
  geo.scale(1, 1, depthScale / Math.max(0.4, widthScale));
  geo.computeVertexNormals();
  return geo;
}

function buildWeaponGroupShared(
  weaponId: WeaponId,
  accentColor: string,
  offhandOnly = false,
  weaponLevel = 1
): THREE.Group {
  const w = WEAPONS[weaponId] || WEAPONS.vanguard_sword;
  const lvlBoost = Math.max(0, weaponLevel - 1) * 0.12;
  const grp = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: w.bladeColor,
    metalness: 0.85,
    roughness: Math.max(0.1, 0.22 - lvlBoost * 0.03),
    emissive: w.energyColor,
    emissiveIntensity: 0.25 + lvlBoost,
  });
  const hiltMat = new THREE.MeshStandardMaterial({
    color: w.hiltColor,
    metalness: 0.6,
    roughness: 0.35,
  });
  const gemMat = new THREE.MeshStandardMaterial({
    color: accentColor || w.energyColor,
    emissive: w.energyColor,
    emissiveIntensity: 0.9 + lvlBoost * 0.35,
    roughness: 0.12,
  });

  if (offhandOnly) {
    if (weaponId === 'bastion_mace' || weaponId === 'aegis_greatshield') {
      const shScale = weaponId === 'aegis_greatshield' ? 1.2 : 0.92;
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.46 * shScale, 0.42 * shScale, 0.1, 8), metalMat);
      shield.rotation.x = Math.PI / 2;
      shield.scale.set(0.85, 1, 1.25);
      shield.position.set(-0.08, 0.06, 0.14);
      grp.add(shield);
      const boss = new THREE.Mesh(new THREE.OctahedronGeometry(0.15 * shScale, 0), gemMat);
      boss.position.set(-0.08, 0.06, 0.21);
      grp.add(boss);
    } else if (weaponId === 'shadow_daggers') {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.22, 8), hiltMat);
      grip.position.y = 0.04;
      grp.add(grip);
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.68, 4), metalMat);
      blade.position.y = 0.46;
      grp.add(blade);
    }
    grp.rotation.x = Math.PI * 0.32;
    return grp;
  }

  if (weaponId === 'solar_bow') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 8, 18, Math.PI), metalMat);
    arc.rotation.z = -Math.PI / 2;
    grp.add(arc);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.24, 8), hiltMat);
    grp.add(grip);
  } else if (weaponId === 'storm_hammer' || weaponId === 'bastion_mace' || weaponId === 'aegis_greatshield') {
    const len = weaponId === 'storm_hammer' ? 1.18 : 0.88;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, len, 8), hiltMat);
    shaft.position.y = len * 0.42;
    grp.add(shaft);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), gemMat);
    pommel.position.y = -0.06;
    grp.add(pommel);
    if (weaponId === 'storm_hammer') {
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.46, 8), metalMat);
      head.rotation.z = Math.PI / 2;
      head.position.y = 0.96;
      grp.add(head);
    } else {
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), gemMat);
      head.position.y = 0.86;
      grp.add(head);
    }
  } else if (weaponId === 'void_staff' || weaponId === 'crimson_wand' || weaponId === 'radiant_scepter' || weaponId === 'astral_censer') {
    const staffLen = weaponId === 'crimson_wand' ? 1.05 : 1.48;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, staffLen, 8), hiltMat);
    shaft.position.y = staffLen * 0.42;
    grp.add(shaft);
    const socket = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 12), hiltMat);
    socket.position.y = staffLen * 0.86;
    grp.add(socket);
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), gemMat);
    orb.position.y = staffLen * 0.92;
    grp.add(orb);
  } else if (weaponId === 'arcane_tome') {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.12), metalMat);
    book.position.set(0, 0.14, 0.14);
    grp.add(book);
    const seal = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), gemMat);
    seal.position.set(0, 0.14, 0.22);
    grp.add(seal);
  } else {
    const len = weaponId === 'dragon_spear' ? 1.75 : weaponId === 'shadow_daggers' ? 0.68 : 1.22;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), gemMat);
    pommel.position.y = -0.07;
    grp.add(pommel);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.26, 8), hiltMat);
    grip.position.y = 0.06;
    grp.add(grip);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.095), hiltMat);
    guard.position.y = 0.21;
    grp.add(guard);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.075, len, 4), metalMat);
    blade.scale.set(1.15, 1, 0.36);
    blade.position.y = 0.22 + len * 0.5;
    grp.add(blade);
  }

  grp.rotation.x = Math.PI * 0.35;
  return grp;
}

function buildUnifiedFighterRig(
  av: AvatarConfig,
  shadowGeo: THREE.BufferGeometry,
  shadowTex: THREE.Texture,
  weaponLevel = 1
): FighterVisualRig {
  const h = av.heightScale;
  const wScale = (av.build === 'heavy' ? 1.22 : av.build === 'agile' ? 0.88 : 1.0) * av.shoulderScale;
  const dScale = av.armorStyle === 'titan_mail' || av.armorStyle === 'paladin_aegis' ? wScale * 0.82 : wScale * 0.7;

  const root = new THREE.Group();
  const squashGroup = new THREE.Group();
  const tiltGroup = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(squashGroup);
  squashGroup.add(tiltGroup);
  tiltGroup.add(bodyGroup);

  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.58,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  root.add(shadowDisc);

  const auraGeo = new THREE.RingGeometry(0.75, 0.92, 24);
  const auraMat = new THREE.MeshBasicMaterial({
    color: av.accentColor,
    transparent: true,
    opacity: av.auraStyle === 'none' ? 0.18 : 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const auraRing = new THREE.Mesh(auraGeo, auraMat);
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.04;
  root.add(auraRing);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: av.primaryColor,
    roughness: 0.42,
    metalness: av.armorStyle === 'plate' || av.armorStyle === 'paladin_aegis' ? 0.65 : 0.25,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: av.secondaryColor,
    roughness: 0.3,
    metalness: 0.6,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: av.accentColor,
    emissive: av.accentColor,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.55,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: av.skinTone,
    roughness: 0.65,
    metalness: 0.05,
  });

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bodyMat);
  pelvis.scale.set(wScale * 1.02, 0.56 * h, dScale * 0.92);
  pelvis.position.y = 0.68 * h;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  if (av.armorStyle === 'mystic' || av.armorStyle === 'nomad_cloak' || av.armorStyle === 'arcane_robe' || av.armorStyle === 'paladin_aegis') {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * wScale, 0.38 * wScale, 0.44 * h, 12), trimMat);
    skirt.position.y = 0.52 * h;
    skirt.castShadow = true;
    bodyGroup.add(skirt);
  }

  const makeLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, 0.68 * h, 0);

    const hipSocket = new THREE.Mesh(new THREE.SphereGeometry(0.135 * wScale, 10, 8), bodyMat);
    hipSocket.castShadow = true;
    leg.add(hipSocket);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115 * wScale, 0.24 * h, 4, 10), bodyMat);
    thigh.position.y = -0.17 * h;
    thigh.castShadow = true;
    leg.add(thigh);

    const kneeGrp = new THREE.Group();
    kneeGrp.position.set(0, -0.34 * h, 0);
    const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.108 * wScale, 10, 8), trimMat);
    kneeJoint.castShadow = true;
    kneeGrp.add(kneeJoint);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.095 * wScale, 0.23 * h, 4, 10), bodyMat);
    shin.position.y = -0.15 * h;
    shin.castShadow = true;
    kneeGrp.add(shin);

    const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * wScale, 0.14 * wScale, 4, 8), trimMat);
    boot.rotation.x = Math.PI * 0.48;
    boot.position.set(0, -0.29 * h, 0.05);
    boot.castShadow = true;
    kneeGrp.add(boot);

    leg.add(kneeGrp);
    return { leg, kneeGrp };
  };
  const leftLegBuilt = makeLeg(-0.17 * wScale);
  const rightLegBuilt = makeLeg(0.17 * wScale);
  bodyGroup.add(leftLegBuilt.leg, rightLegBuilt.leg);

  const torsoHeight = 0.78 * h;
  const torsoGeo = buildSculptedTorsoGeometry(wScale, dScale, torsoHeight);
  const sculptedTorso = new THREE.Mesh(torsoGeo, bodyMat);
  sculptedTorso.position.y = 0.68 * h;
  sculptedTorso.castShadow = true;
  bodyGroup.add(sculptedTorso);

  if (av.armorStyle === 'plate' || av.armorStyle === 'titan_mail' || av.armorStyle === 'dragon_scale' || av.armorStyle === 'paladin_aegis') {
    const chestPlate = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), trimMat);
    chestPlate.scale.set(wScale * 1.02, 0.68 * h, dScale * 0.96);
    chestPlate.position.set(0, 1.15 * h, 0.04);
    chestPlate.castShadow = true;
    bodyGroup.add(chestPlate);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.095 * wScale, 0), accentMat);
    core.position.set(0, 1.16 * h, dScale * 0.34);
    bodyGroup.add(core);
  }

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * wScale, 0.25 * wScale, 0.11 * h, 12), accentMat);
  belt.scale.set(1, 1, dScale / Math.max(0.4, wScale));
  belt.position.y = 0.73 * h;
  bodyGroup.add(belt);

  const headGrp = new THREE.Group();
  headGrp.position.y = 1.54 * h;
  const headSkin =
    av.headStyle === 'spiky_hair' || av.headStyle === 'war_crown'
      ? skinMat
      : new THREE.MeshStandardMaterial({
          color: av.helmetColor,
          roughness: 0.32,
          metalness: 0.52,
        });
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.225 * h, 14, 12), headSkin);
  headMesh.scale.set(1, 1.08, 1.02);
  headMesh.castShadow = true;
  headGrp.add(headMesh);

  const helmMat = new THREE.MeshStandardMaterial({
    color: av.helmetColor,
    roughness: 0.28,
    metalness: 0.62,
  });
  if (av.headStyle === 'knight_helm' || av.headStyle === 'shadow_hood' || av.headStyle === 'tech_visor') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.248 * h, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.66), helmMat);
    headGrp.add(dome);
  } else if (av.headStyle === 'war_crown' || av.headStyle === 'royal_crown_helm') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.235 * h, 0.205 * h, 0.16 * h, 7), accentMat);
    crown.position.y = 0.21 * h;
    headGrp.add(crown);
  } else if (av.headStyle === 'horned_helm' || av.headStyle === 'phoenix_crest') {
    for (const sSide of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075 * h, 0.36 * h, 7), trimMat);
      horn.position.set(sSide * 0.21 * h, 0.18 * h, 0);
      horn.rotation.z = -sSide * 0.42;
      headGrp.add(horn);
    }
    if (av.headStyle === 'phoenix_crest') {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.1 * h, 0.34 * h, 6), accentMat);
      crest.position.set(0, 0.27 * h, -0.04 * h);
      crest.rotation.x = -0.3;
      headGrp.add(crest);
    }
  } else if (av.headStyle === 'void_mask') {
    const haloOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 * h, 0), accentMat);
    haloOrb.position.y = 0.32 * h;
    headGrp.add(haloOrb);
  } else {
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.25 * h, 0.3 * h, 7), helmMat);
    hair.position.set(0, 0.2 * h, -0.03 * h);
    hair.rotation.x = -0.18;
    headGrp.add(hair);
  }

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.25 * h, 0.055 * h, 0.08 * h),
    new THREE.MeshBasicMaterial({ color: av.eyeGlow })
  );
  visor.position.set(0, 0.02 * h, 0.205 * h);
  headGrp.add(visor);
  bodyGroup.add(headGrp);

  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.35 * wScale, 1.3 * h, 0);

    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.155 * wScale, 12, 10), trimMat);
    pauldron.scale.set(1.12, 0.94, 1.06);
    pauldron.castShadow = true;
    arm.add(pauldron);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.086 * wScale, 0.2 * h, 4, 10), bodyMat);
    upperArm.position.y = -0.14 * h;
    upperArm.castShadow = true;
    arm.add(upperArm);

    const elbowGrp = new THREE.Group();
    elbowGrp.position.set(0, -0.27 * h, 0);

    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.08 * wScale, 10, 8), trimMat);
    elbowJoint.castShadow = true;
    elbowGrp.add(elbowJoint);

    const foreArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.076 * wScale, 0.19 * h, 4, 10), skinMat);
    foreArm.position.y = -0.125 * h;
    foreArm.castShadow = true;
    elbowGrp.add(foreArm);

    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.088 * wScale, 10, 8), trimMat);
    fist.position.y = -0.24 * h;
    fist.castShadow = true;
    elbowGrp.add(fist);

    arm.add(elbowGrp);
    return { arm, elbowGrp };
  };

  const leftArmBuilt = makeArm(-1);
  const rightArmBuilt = makeArm(1);

  const weaponGroup = buildWeaponGroupShared(av.weaponId, av.accentColor, false, weaponLevel);
  weaponGroup.position.set(0, -0.24 * h, 0.02);
  rightArmBuilt.elbowGrp.add(weaponGroup);

  if (av.weaponId === 'bastion_mace' || av.weaponId === 'aegis_greatshield' || av.weaponId === 'shadow_daggers') {
    const offhandGroup = buildWeaponGroupShared(av.weaponId, av.accentColor, true, weaponLevel);
    offhandGroup.position.set(0, -0.24 * h, 0.02);
    leftArmBuilt.elbowGrp.add(offhandGroup);
  }

  bodyGroup.add(leftArmBuilt.arm, rightArmBuilt.arm);

  const backAnchor = new THREE.Group();
  backAnchor.position.set(0, 1.18 * h, -dScale * 0.28);
  if (av.backGear === 'battle_cape' || av.backGear === 'war_banner') {
    const cape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24 * wScale, 0.38 * wScale, 0.92 * h, 8, 1, true, Math.PI * 0.65, Math.PI * 0.7),
      accentMat
    );
    cape.position.y = -0.32 * h;
    cape.rotation.x = 0.18;
    backAnchor.add(cape);
  } else if (av.backGear === 'energy_wings' || av.backGear === 'frost_wings') {
    for (const sSide of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * h, 0.56 * h, 4, 8), accentMat);
      wing.position.set(sSide * 0.42 * wScale, 0.14 * h, -0.05);
      wing.rotation.z = sSide * 1.12;
      backAnchor.add(wing);
    }
  } else if (av.backGear === 'flame_halo' || av.backGear === 'arcane_orbit') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45 * h, 0.045, 8, 22), accentMat);
    halo.position.y = 0.24 * h;
    backAnchor.add(halo);
  } else if (av.backGear === 'back_scabbard') {
    const scab = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.96 * h, 8), trimMat);
    scab.rotation.z = 0.52;
    backAnchor.add(scab);
  }
  bodyGroup.add(backAnchor);

  const shieldSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.18 * h, 16, 12),
    new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.24,
      wireframe: true,
      depthWrite: false,
    })
  );
  shieldSphere.position.y = 1.0 * h;
  shieldSphere.visible = false;
  tiltGroup.add(shieldSphere);

  const sig = `${av.weaponId}|${weaponLevel}|${av.headStyle}|${av.armorStyle}|${av.backGear}|${av.primaryColor}|${av.secondaryColor}|${av.accentColor}|${av.skinTone}|${av.heightScale}|${av.shoulderScale}|${av.build}|${av.eyeGlow}|${av.helmetColor}`;
  return {
    signature: sig,
    root,
    squashGroup,
    tiltGroup,
    bodyGroup,
    leftLeg: leftLegBuilt.leg,
    rightLeg: rightLegBuilt.leg,
    leftKnee: leftLegBuilt.kneeGrp,
    rightKnee: rightLegBuilt.kneeGrp,
    leftArm: leftArmBuilt.arm,
    rightArm: rightArmBuilt.arm,
    leftElbow: leftArmBuilt.elbowGrp,
    rightElbow: rightArmBuilt.elbowGrp,
    backAnchor,
    shadowDisc,
    auraRing,
    shieldSphere,
    bodyMat,
    trimMat,
  };
}

export class WebGLAvatarShowcase {
  public readonly isSoftwareGl: boolean;
  public readonly webglVersion: 1 | 2;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private envTexture: THREE.Texture | null = null;

  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private pedestalMesh: THREE.Mesh;
  private pedestalMat: THREE.MeshStandardMaterial;
  private pedestalRing: THREE.Mesh;
  private pedestalRingMat: THREE.MeshBasicMaterial;
  private slashMesh: THREE.Mesh;
  private slashMat: THREE.MeshBasicMaterial;
  private powerRing: THREE.Mesh;
  private powerRingMat: THREE.MeshBasicMaterial;
  private auraInstanced: THREE.InstancedMesh;
  private auraMoteGeo = new THREE.OctahedronGeometry(0.05, 0);
  private auraMoteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

  private sharedShadowGeo = new THREE.PlaneGeometry(2.1, 2.1);
  private sharedShadowTex: THREE.CanvasTexture;
  private rig: FighterVisualRig | null = null;

  private activeQuality: GraphicsQuality;
  private currentWidth = 360;
  private currentHeight = 320;
  private disposed = false;
  private contextLost = false;
  private onContextLostCb?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    initialQuality: GraphicsQuality,
    onContextLost?: () => void
  ) {
    const cap = detectWebGLCapability();
    this.isSoftwareGl = cap.isSoftwareGl;
    this.webglVersion = cap.version === 1 ? 1 : 2;
    this.activeQuality = initialQuality;
    this.onContextLostCb = onContextLost;

    canvas.addEventListener('webglcontextlost', this.handleContextLost, false);

    const opts: THREE.WebGLRendererParameters = {
      canvas,
      antialias: !this.isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    };

    this.renderer =
      this.webglVersion === 1
        ? (new THREE.WebGL1Renderer(opts) as unknown as THREE.WebGLRenderer)
        : new THREE.WebGLRenderer(opts);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0E1629');

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.25, 60);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    this.hemiLight = new THREE.HemisphereLight('#93C5FD', '#182032', 1.15);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#FFE7BD', 2.4);
    this.keyLight.position.set(3.5, 6.2, 4.5);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 20;
    this.keyLight.shadow.camera.left = -2.8;
    this.keyLight.shadow.camera.right = 2.8;
    this.keyLight.shadow.camera.top = 2.8;
    this.keyLight.shadow.camera.bottom = -2.8;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight('#38BDF8', 1.15);
    this.rimLight.position.set(-3.2, 3.6, -4.0);
    this.scene.add(this.rimLight);

    this.sharedShadowTex = createContactShadowTexture();

    this.pedestalMat = new THREE.MeshStandardMaterial({
      color: '#17233B',
      roughness: 0.34,
      metalness: 0.65,
    });
    this.pedestalMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.82, 0.28, 32), this.pedestalMat);
    this.pedestalMesh.position.y = -0.14;
    this.pedestalMesh.receiveShadow = true;
    this.scene.add(this.pedestalMesh);

    this.pedestalRingMat = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    this.pedestalRing = new THREE.Mesh(new THREE.RingGeometry(1.52, 1.62, 40), this.pedestalRingMat);
    this.pedestalRing.rotation.x = -Math.PI / 2;
    this.pedestalRing.position.y = 0.01;
    this.scene.add(this.pedestalRing);

    this.slashMat = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.slashMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.85, 28, 1, -Math.PI * 0.45, Math.PI * 0.9),
      this.slashMat
    );
    this.slashMesh.rotation.x = -Math.PI / 2;
    this.slashMesh.visible = false;
    this.scene.add(this.slashMesh);

    this.powerRingMat = new THREE.MeshBasicMaterial({
      color: '#E6B85C',
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.powerRing = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.0, 32), this.powerRingMat);
    this.powerRing.rotation.x = -Math.PI / 2;
    this.powerRing.position.y = 0.03;
    this.powerRing.visible = false;
    this.scene.add(this.powerRing);

    this.auraInstanced = new THREE.InstancedMesh(this.auraMoteGeo, this.auraMoteMat, 20);
    this.auraInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.auraInstanced.count = 0;
    this.scene.add(this.auraInstanced);

    this.applyQualitySettings(initialQuality);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.onContextLostCb?.();
  };

  public setQuality(quality: GraphicsQuality) {
    if (this.activeQuality === quality) return;
    this.activeQuality = quality;
    this.applyQualitySettings(quality);
  }

  private applyQualitySettings(quality: GraphicsQuality) {
    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const dpr = this.isSoftwareGl
      ? 1
      : quality === 'eco'
        ? 0.85
        : quality === 'balanced'
          ? Math.min(rawDpr, 1.2)
          : quality === 'high'
            ? Math.min(rawDpr, 1.5)
            : quality === 'ultra'
              ? Math.min(rawDpr, 1.75)
              : Math.min(rawDpr, 2);
    this.renderer.setPixelRatio(dpr);

    const shadowsOn = !this.isSoftwareGl && quality !== 'eco';
    this.renderer.shadowMap.enabled = shadowsOn;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.keyLight.castShadow = shadowsOn;

    const shadowDim = quality === 'impossible' || quality === 'mythic' ? 2048 : quality === 'high' || quality === 'ultra' ? 1024 : 512;
    if (this.keyLight.shadow.mapSize.width !== shadowDim) {
      this.keyLight.shadow.mapSize.set(shadowDim, shadowDim);
      if (this.keyLight.shadow.map) {
        this.keyLight.shadow.map.dispose();
        this.keyLight.shadow.map = null;
      }
    }

    if (quality === 'impossible') {
      this.scene.background = new THREE.Color('#13112A');
      this.renderer.toneMappingExposure = 1.16;
      this.keyLight.intensity = 2.65;
      this.rimLight.intensity = 1.55;
      this.pedestalMat.roughness = 0.22;
    } else if (quality === 'mythic' || quality === 'ultra') {
      this.scene.background = new THREE.Color('#0E162B');
      this.renderer.toneMappingExposure = 1.1;
      this.keyLight.intensity = 2.45;
      this.rimLight.intensity = 1.3;
      this.pedestalMat.roughness = 0.28;
    } else if (quality === 'eco') {
      this.scene.background = new THREE.Color('#0B101D');
      this.renderer.toneMappingExposure = 0.98;
      this.keyLight.intensity = 2.0;
      this.rimLight.intensity = 0.6;
      this.pedestalMat.roughness = 0.58;
    } else {
      this.scene.background = new THREE.Color('#0C1426');
      this.renderer.toneMappingExposure = 1.04;
      this.keyLight.intensity = 2.25;
      this.rimLight.intensity = 1.0;
      this.pedestalMat.roughness = 0.38;
    }

    this.setupComposer(quality);
    if (this.currentWidth > 0 && this.currentHeight > 0) {
      this.renderer.setSize(this.currentWidth, this.currentHeight, false);
      this.composer?.setSize(this.currentWidth, this.currentHeight);
    }
  }

  private setupComposer(quality: GraphicsQuality) {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bloomPass = null;
      this.fxaaPass = null;
    }
    const useComposer =
      !this.isSoftwareGl &&
      (quality === 'high' || quality === 'ultra' || quality === 'mythic' || quality === 'impossible');
    if (!useComposer) return;

    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomStrength =
      quality === 'impossible' ? 0.52 : quality === 'mythic' ? 0.42 : quality === 'ultra' ? 0.3 : 0.16;
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(16, Math.floor(this.currentWidth / 2)), Math.max(16, Math.floor(this.currentHeight / 2))),
      bloomStrength,
      0.45,
      0.8
    );
    composer.addPass(bloomPass);
    this.bloomPass = bloomPass;

    if (quality === 'impossible') {
      const vig = new ShaderPass(VignetteShader);
      vig.uniforms['offset'].value = 0.94;
      vig.uniforms['darkness'].value = 0.38;
      composer.addPass(vig);
    }

    const fxaa = new ShaderPass(FXAAShader);
    const pr = this.renderer.getPixelRatio();
    fxaa.material.uniforms['resolution'].value.set(
      1 / Math.max(1, this.currentWidth * pr),
      1 / Math.max(1, this.currentHeight * pr)
    );
    composer.addPass(fxaa);
    this.fxaaPass = fxaa;

    this.composer = composer;
  }

  public setSize(width: number, height: number) {
    const w = Math.max(160, Math.floor(width));
    const h = Math.max(120, Math.floor(height));
    if (w === this.currentWidth && h === this.currentHeight) return;
    this.currentWidth = w;
    this.currentHeight = h;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);

    if (this.composer) {
      this.composer.setSize(w, h);
      const pr = this.renderer.getPixelRatio();
      if (this.fxaaPass) {
        this.fxaaPass.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
      }
      if (this.bloomPass) {
        this.bloomPass.resolution.set(Math.max(16, Math.floor(w / 2)), Math.max(16, Math.floor(h / 2)));
      }
    }
  }

  public render(
    avatar: AvatarConfig,
    orbitYaw: number,
    time: number,
    previewAction: 'idle' | 'attack' | 'power',
    weaponLevel = 1
  ) {
    if (this.disposed || this.contextLost) return;

    const sig = `${avatar.weaponId}|${weaponLevel}|${avatar.headStyle}|${avatar.armorStyle}|${avatar.backGear}|${avatar.primaryColor}|${avatar.secondaryColor}|${avatar.accentColor}|${avatar.skinTone}|${avatar.heightScale}|${avatar.shoulderScale}|${avatar.build}|${avatar.eyeGlow}|${avatar.helmetColor}`;
    if (!this.rig || this.rig.signature !== sig) {
      if (this.rig) {
        this.scene.remove(this.rig.root);
        this.disposeTree(this.rig.root);
      }
      this.rig = buildUnifiedFighterRig(avatar, this.sharedShadowGeo, this.sharedShadowTex, weaponLevel);
      this.scene.add(this.rig.root);
    }

    const rig = this.rig;
    const h = avatar.heightScale;

    this.camera.position.set(Math.sin(orbitYaw) * 4.85, 1.95 * h, Math.cos(orbitYaw) * 4.85);
    this.camera.lookAt(0, 1.18 * h, 0);

    this.rimLight.color.set(avatar.accentColor || '#38BDF8');
    this.pedestalRingMat.color.set(avatar.accentColor || '#38BDF8');
    this.pedestalRingMat.opacity = this.activeQuality === 'eco' ? 0.38 : this.activeQuality === 'impossible' ? 0.92 : 0.68;

    const animTime = previewAction === 'attack' ? (time * 1.4) % 0.34 : time;
    rig.bodyGroup.position.y = Math.sin(time * 2.5) * 0.025;
    rig.auraRing.rotation.z = time * 0.85;
    rig.backAnchor.rotation.x = Math.sin(time * 4) * 0.07;

    if (previewAction === 'attack') {
      const swing = Math.sin(Math.min(1, animTime * 6.5) * Math.PI);
      rig.rightArm.rotation.x = -1.45 * swing;
      rig.rightArm.rotation.y = -0.8 * swing;
      rig.rightElbow.rotation.x = -0.35 - swing * 0.4;
      rig.leftArm.rotation.x = 0.4 * swing;
      rig.leftElbow.rotation.x = -0.35;
      rig.tiltGroup.rotation.x = 0.1;

      const alpha = Math.max(0, 0.75 - animTime * 2.1);
      this.slashMesh.visible = alpha > 0.05;
      this.slashMesh.position.y = 1.18 * h;
      this.slashMesh.rotation.z = Math.sin(animTime * 12) * 0.2;
      this.slashMat.color.set((WEAPONS[avatar.weaponId] || WEAPONS.vanguard_sword).energyColor);
      this.slashMat.opacity = alpha;
      this.powerRing.visible = false;
      rig.shieldSphere.visible = false;
    } else if (previewAction === 'power') {
      rig.rightArm.rotation.x = -2.2;
      rig.leftArm.rotation.x = -2.2;
      rig.rightArm.rotation.y = 0;
      rig.rightElbow.rotation.x = -0.25;
      rig.leftElbow.rotation.x = -0.25;
      rig.tiltGroup.rotation.x = 0;

      this.slashMesh.visible = false;
      const ringR = 0.65 + ((time * 2.1) % 1.65);
      this.powerRing.visible = true;
      this.powerRing.scale.setScalar(ringR);
      this.powerRingMat.color.set(avatar.accentColor || '#E6B85C');
      this.powerRingMat.opacity = Math.max(0.08, 0.9 - ringR / 2.4);
      rig.shieldSphere.visible = avatar.powerId === 'crystal_aegis' || avatar.powerId === 'iron_fortress';
      if (rig.shieldSphere.visible) rig.shieldSphere.rotation.y = time * 1.4;
    } else {
      rig.rightArm.rotation.x = Math.sin(time * 1.8) * 0.08;
      rig.leftArm.rotation.x = -Math.sin(time * 1.8) * 0.08;
      rig.rightArm.rotation.y = 0;
      rig.rightElbow.rotation.x = -0.26;
      rig.leftElbow.rotation.x = -0.26;
      rig.tiltGroup.rotation.x = 0;
      this.slashMesh.visible = false;
      this.powerRing.visible = false;
      rig.shieldSphere.visible = false;
    }

    // Orbiting Aura Motes on High+ when Aura enabled
    if (
      avatar.auraStyle !== 'none' &&
      (this.activeQuality === 'high' ||
        this.activeQuality === 'ultra' ||
        this.activeQuality === 'mythic' ||
        this.activeQuality === 'impossible')
    ) {
      const moteCount =
        this.activeQuality === 'impossible'
          ? 20
          : this.activeQuality === 'mythic'
            ? 14
            : this.activeQuality === 'ultra'
              ? 10
              : 6;
      const auraCol =
        avatar.auraStyle === 'ember_sparks'
          ? '#F97316'
          : avatar.auraStyle === 'frost_mist'
            ? '#38BDF8'
            : avatar.auraStyle === 'royal_gold'
              ? '#F59E0B'
              : '#A855F7';
      this.auraMoteMat.color.set(auraCol);
      this.auraInstanced.count = moteCount;
      for (let i = 0; i < moteCount; i++) {
        const ang = time * 1.65 + (i / moteCount) * Math.PI * 2;
        const py = (((time * 0.65 + i * 0.27) % 1.9) + 0.14) * h;
        const rad = 0.85 + Math.sin(time * 2.1 + i) * 0.24;
        _dummy.position.set(Math.cos(ang) * rad, py, Math.sin(ang) * rad);
        _dummy.rotation.set(time * 2, ang, 0);
        _dummy.scale.setScalar(this.activeQuality === 'impossible' ? 1.25 : 0.9);
        _dummy.updateMatrix();
        this.auraInstanced.setMatrixAt(i, _dummy.matrix);
      }
      this.auraInstanced.instanceMatrix.needsUpdate = true;
    } else {
      this.auraInstanced.count = 0;
    }

    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private disposeTree(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    if (this.rig) {
      this.disposeTree(this.rig.root);
      this.rig = null;
    }
    this.pedestalMesh.geometry.dispose();
    this.pedestalMat.dispose();
    this.pedestalRing.geometry.dispose();
    this.pedestalRingMat.dispose();
    this.slashMesh.geometry.dispose();
    this.slashMat.dispose();
    this.powerRing.geometry.dispose();
    this.powerRingMat.dispose();
    this.auraMoteGeo.dispose();
    this.auraMoteMat.dispose();
    this.sharedShadowGeo.dispose();
    this.sharedShadowTex.dispose();
    this.envTexture?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
