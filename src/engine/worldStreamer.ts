import type {
  ArenaDef,
  GraphicsQuality,
  MonsterArchetype,
  OverworldNodeDef,
  OverworldNodeKind,
  SceneryPropDef,
  WorldChestDef,
  WorldFastTravelDef,
} from '../types/game';

export const CHUNK_SIZE = 240;
export const OVERWORLD_STREAM_RADIUS_M = 7000;

export interface StreamedChunk {
  key: string;
  cx: number;
  cz: number;
  biomeId: string;
  biomeName: string;
  biomeColor: string;
  skyTint: string;
  monsterPool: MonsterArchetype[];
  props: SceneryPropDef[];
  nodes: OverworldNodeDef[];
  chests: WorldChestDef[];
  waystones: WorldFastTravelDef[];
  patrolSpots: Array<{ archetype: MonsterArchetype; x: number; z: number }>;
}

export interface StreamUpdateResult {
  changed: boolean;
  currentChunkKey: string;
  currentChunkCoord: { cx: number; cz: number };
  currentBiomeName: string;
  currentBiomeColor: string;
  activeChunksCount: number;
  streamRadiusChunks: number;
  newlyEnteredKeys: string[];
  activeProps: SceneryPropDef[];
  activeNodes: OverworldNodeDef[];
  activeChests: WorldChestDef[];
  activeWaystones: WorldFastTravelDef[];
  pendingPatrols: Array<{ chunkKey: string; archetype: MonsterArchetype; x: number; z: number }>;
}

function hashSeed(cx: number, cz: number, salt: number): number {
  let h = Math.imul(cx + 4096, 374761393) ^ Math.imul(cz + 4096, 668265263) ^ Math.imul(salt, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function worldToChunkCoord(x: number, z: number): { cx: number; cz: number } {
  return {
    cx: Math.round(x / CHUNK_SIZE),
    cz: Math.round(z / CHUNK_SIZE),
  };
}

interface BiomeSpec {
  id: string;
  name: string;
  color: string;
  skyTint: string;
  props: SceneryPropDef['kind'][];
  nodeKinds: OverworldNodeKind[];
  monsters: MonsterArchetype[];
}

const BIOME_SPECS: Record<string, BiomeSpec> = {
  haven_sanctuary: {
    id: 'haven_sanctuary',
    name: 'قرية الملاذ الآمنة',
    color: '#E6B85C',
    skyTint: '#18365C',
    props: ['pine_tree', 'boulder'],
    nodeKinds: ['herb'],
    monsters: [],
  },
  whispering_meadow: {
    id: 'whispering_meadow',
    name: 'السهول الهامسة',
    color: '#22C55E',
    skyTint: '#1D4258',
    props: ['pine_tree', 'boulder', 'campfire'],
    nodeKinds: ['herb', 'ore'],
    monsters: ['ash_stalker', 'ember_imp'],
  },
  emerald_forest: {
    id: 'emerald_forest',
    name: 'غابات الزمرد العتيقة',
    color: '#10B981',
    skyTint: '#133A3E',
    props: ['pine_tree', 'ruin_pillar', 'boulder'],
    nodeKinds: ['herb', 'crystal'],
    monsters: ['venom_crawler', 'ash_stalker', 'wraith_knight'],
  },
  silver_mines: {
    id: 'silver_mines',
    name: 'أودية المناجم الفضية',
    color: '#F59E0B',
    skyTint: '#2E2A42',
    props: ['boulder', 'campfire', 'ruin_pillar'],
    nodeKinds: ['ore'],
    monsters: ['obsidian_golem', 'ember_imp'],
  },
  crystal_lake: {
    id: 'crystal_lake',
    name: 'حوض البلورات المتلألئة',
    color: '#38BDF8',
    skyTint: '#11335C',
    props: ['crystal_cluster', 'pine_tree', 'boulder'],
    nodeKinds: ['crystal', 'herb'],
    monsters: ['frost_specter', 'wraith_knight'],
  },
  forgotten_ruins: {
    id: 'forgotten_ruins',
    name: 'الأطلال المنسية العريقة',
    color: '#60A5FA',
    skyTint: '#1C2545',
    props: ['ruin_pillar', 'crystal_cluster', 'boulder'],
    nodeKinds: ['crystal', 'ore'],
    monsters: ['wraith_knight', 'shadow_reaper', 'obsidian_golem'],
  },
  dragon_ridge: {
    id: 'dragon_ridge',
    name: 'تلال التنين البركانية',
    color: '#F97316',
    skyTint: '#3B1E2A',
    props: ['boulder', 'ruin_pillar', 'campfire'],
    nodeKinds: ['ore', 'crystal'],
    monsters: ['ember_imp', 'obsidian_golem', 'magma_boss'],
  },
  frost_peaks: {
    id: 'frost_peaks',
    name: 'قمم الصقيع الشمالية',
    color: '#7DD3FC',
    skyTint: '#142A4A',
    props: ['crystal_cluster', 'pine_tree', 'boulder'],
    nodeKinds: ['crystal', 'ore'],
    monsters: ['frost_specter', 'shadow_reaper'],
  },
  abyssal_frontiers: {
    id: 'abyssal_frontiers',
    name: 'تخوم الهاوية الخارجية',
    color: '#A855F7',
    skyTint: '#22133B',
    props: ['crystal_cluster', 'ruin_pillar', 'boulder'],
    nodeKinds: ['crystal', 'ore', 'herb'],
    monsters: ['shadow_reaper', 'wraith_knight', 'void_colossus'],
  },
};

export function classifyChunkBiome(cx: number, cz: number): BiomeSpec {
  if (cx === 0 && cz === 0) return BIOME_SPECS.haven_sanctuary;
  const wx = cx * CHUNK_SIZE;
  const wz = cz * CHUNK_SIZE;
  const dist = Math.hypot(wx, wz);

  if (dist > 3600) {
    return BIOME_SPECS.abyssal_frontiers;
  }
  const angle = Math.atan2(wz, wx); // -PI..PI
  if (dist < 620) {
    return BIOME_SPECS.whispering_meadow;
  }
  if (angle >= -2.5 && angle < -1.4) return BIOME_SPECS.frost_peaks;
  if (angle >= -1.4 && angle < -0.5) return BIOME_SPECS.silver_mines;
  if (angle >= -0.5 && angle < 0.5) return BIOME_SPECS.forgotten_ruins;
  if (angle >= 0.5 && angle < 1.7) return BIOME_SPECS.crystal_lake;
  if (angle >= 1.7 && angle < 2.6) return BIOME_SPECS.dragon_ridge;
  return BIOME_SPECS.emerald_forest;
}

function createProceduralChunk(cx: number, cz: number, baseArena: ArenaDef): StreamedChunk {
  const key = getChunkKey(cx, cz);
  const spec = classifyChunkBiome(cx, cz);
  const centerX = cx * CHUNK_SIZE;
  const centerZ = cz * CHUNK_SIZE;
  const isCenterChunk = cx === 0 && cz === 0;
  const distCenter = Math.hypot(centerX, centerZ);

  const props: SceneryPropDef[] = [];
  const nodes: OverworldNodeDef[] = [];
  const chests: WorldChestDef[] = [];
  const waystones: WorldFastTravelDef[] = [];
  const patrolSpots: Array<{ archetype: MonsterArchetype; x: number; z: number }> = [];

  // Handcrafted central village props stay inside (0,0); outer chunks receive deterministic procedural terrain
  if (isCenterChunk) {
    for (const p of baseArena.sceneryProps || []) {
      if (Math.abs(p.x) <= CHUNK_SIZE * 0.65 && Math.abs(p.z) <= CHUNK_SIZE * 0.65) {
        props.push(p);
      }
    }
  } else {
    // Filter any handcrafted landmarks falling inside this chunk
    for (const p of baseArena.sceneryProps || []) {
      const pc = worldToChunkCoord(p.x, p.z);
      if (pc.cx === cx && pc.cz === cz) props.push(p);
    }

    // Add deterministic procedural props inside chunk boundaries
    const propCount = 7 + Math.floor(hashSeed(cx, cz, 11) * 5);
    for (let i = 0; i < propCount; i++) {
      const rx = (hashSeed(cx, cz, 100 + i * 3) - 0.5) * (CHUNK_SIZE - 26);
      const rz = (hashSeed(cx, cz, 101 + i * 3) - 0.5) * (CHUNK_SIZE - 26);
      const px = centerX + rx;
      const pz = centerZ + rz;
      if (Math.hypot(px, pz) < 34 || Math.hypot(px, pz) > OVERWORLD_STREAM_RADIUS_M - 15) continue;

      const kindIdx = Math.floor(hashSeed(cx, cz, 102 + i * 3) * spec.props.length);
      const kind = spec.props[kindIdx];
      props.push({
        id: `chk_${key}_p_${i}`,
        kind,
        x: Math.round(px),
        z: Math.round(pz),
        scale: 0.95 + hashSeed(cx, cz, 200 + i) * 0.65,
        rotY: hashSeed(cx, cz, 300 + i) * Math.PI * 2,
        color: spec.color,
        accentColor: spec.color,
      });
    }

    // Resource nodes (1-2 per chunk)
    const nodeCount = 1 + (hashSeed(cx, cz, 401) > 0.42 ? 1 : 0);
    for (let i = 0; i < nodeCount; i++) {
      const rx = (hashSeed(cx, cz, 420 + i * 5) - 0.5) * (CHUNK_SIZE - 45);
      const rz = (hashSeed(cx, cz, 421 + i * 5) - 0.5) * (CHUNK_SIZE - 45);
      const nx = Math.round(centerX + rx);
      const nz = Math.round(centerZ + rz);
      if (Math.hypot(nx, nz) < 42 || Math.hypot(nx, nz) > OVERWORLD_STREAM_RADIUS_M - 20) continue;

      const nKind = spec.nodeKinds[Math.floor(hashSeed(cx, cz, 422 + i * 5) * spec.nodeKinds.length)];
      nodes.push({
        id: `chk_${key}_node_${i}`,
        kind: nKind,
        label: nKind === 'herb' ? 'عشبة برية نادرة' : nKind === 'ore' ? 'خام معدني نادر' : 'بلورة أثير متدفقة',
        x: nx,
        z: nz,
        regionId: spec.id,
        color: nKind === 'herb' ? '#10B981' : nKind === 'ore' ? '#F59E0B' : '#38BDF8',
      });
    }

    // Procedural Treasure Chest every ~3rd chunk outside village
    if (hashSeed(cx, cz, 701) > 0.62 && distCenter < OVERWORLD_STREAM_RADIUS_M - 30) {
      const tx = Math.round(centerX + (hashSeed(cx, cz, 702) - 0.5) * 90);
      const tz = Math.round(centerZ + (hashSeed(cx, cz, 703) - 0.5) * 90);
      const isMythic = distCenter > 1600 || hashSeed(cx, cz, 704) > 0.78;
      chests.push({
        id: `chk_${key}_chest`,
        x: tx,
        z: tz,
        tier: isMythic ? 'mythic' : 'standard',
        regionId: spec.id,
        gold: isMythic ? 320 : 155,
        gems: isMythic ? 11 : 4,
        xp: isMythic ? 195 : 95,
      });
    }

    // Monster patrol spots (2-3 per chunk)
    if (spec.monsters.length > 0) {
      const mCount = distCenter > 2200 ? 3 : 2;
      for (let i = 0; i < mCount; i++) {
        const mx = Math.round(centerX + (hashSeed(cx, cz, 800 + i * 4) - 0.5) * (CHUNK_SIZE - 55));
        const mz = Math.round(centerZ + (hashSeed(cx, cz, 801 + i * 4) - 0.5) * (CHUNK_SIZE - 55));
        if (Math.hypot(mx, mz) < 38 || Math.hypot(mx, mz) > OVERWORLD_STREAM_RADIUS_M - 20) continue;
        const mPoolIdx = Math.floor(hashSeed(cx, cz, 802 + i * 4) * spec.monsters.length);
        patrolSpots.push({
          archetype: spec.monsters[mPoolIdx],
          x: mx,
          z: mz,
        });
      }
    }
  }

  // Merge handcrafted nodes, chests & waystones located inside this chunk
  for (const hn of baseArena.worldNodes || []) {
    const nc = worldToChunkCoord(hn.x, hn.z);
    if (nc.cx === cx && nc.cz === cz && !nodes.some((n) => n.id === hn.id)) {
      nodes.push(hn);
    }
  }
  for (const hc of baseArena.worldChests || []) {
    const cc = worldToChunkCoord(hc.x, hc.z);
    if (cc.cx === cx && cc.cz === cz && !chests.some((c) => c.id === hc.id)) {
      chests.push(hc);
    }
  }
  for (const ws of baseArena.worldWaystones || []) {
    const wc = worldToChunkCoord(ws.x, ws.z);
    if (wc.cx === cx && wc.cz === cz) {
      waystones.push(ws);
    }
  }

  return {
    key,
    cx,
    cz,
    biomeId: spec.id,
    biomeName: spec.name,
    biomeColor: spec.color,
    skyTint: spec.skyTint,
    monsterPool: spec.monsters,
    props,
    nodes,
    chests,
    waystones,
    patrolSpots,
  };
}

export class ChunkWorldStreamer {
  private baseArena: ArenaDef;
  private activeChunks = new Map<string, StreamedChunk>();
  private visitedKeys = new Set<string>(['0,0']);
  private spawnedChunkMonsters = new Set<string>();
  private lastCenterKey = '';
  private lastQuality: GraphicsQuality = 'balanced';

  constructor(baseArena: ArenaDef, initialExploredChunks: string[] = ['0,0']) {
    this.baseArena = baseArena;
    for (const k of initialExploredChunks) {
      this.visitedKeys.add(k);
    }
  }

  public getExploredCount(): number {
    return this.visitedKeys.size;
  }

  public isChunkLoaded(x: number, z: number): boolean {
    const { cx, cz } = worldToChunkCoord(x, z);
    return this.activeChunks.has(getChunkKey(cx, cz));
  }

  public update(playerX: number, playerZ: number, quality: GraphicsQuality): StreamUpdateResult {
    const coord = worldToChunkCoord(playerX, playerZ);
    const centerKey = getChunkKey(coord.cx, coord.cz);
    const streamRadius = quality === 'eco' || quality === 'balanced' ? 1 : quality === 'impossible' ? 3 : 2; // 3x3 on weak devices, 5x5 on high-mythic, 7x7 on impossible

    const changed = centerKey !== this.lastCenterKey || quality !== this.lastQuality || this.activeChunks.size === 0;
    const newlyEnteredKeys: string[] = [];

    if (changed) {
      this.lastCenterKey = centerKey;
      this.lastQuality = quality;

      const wanted = new Set<string>();
      for (let dx = -streamRadius; dx <= streamRadius; dx++) {
        for (let dz = -streamRadius; dz <= streamRadius; dz++) {
          const ncx = coord.cx + dx;
          const ncz = coord.cz + dz;
          const dist = Math.hypot(ncx * CHUNK_SIZE, ncz * CHUNK_SIZE);
          if (dist > OVERWORLD_STREAM_RADIUS_M + CHUNK_SIZE) continue;
          const k = getChunkKey(ncx, ncz);
          wanted.add(k);
          if (!this.activeChunks.has(k)) {
            this.activeChunks.set(k, createProceduralChunk(ncx, ncz, this.baseArena));
          }
        }
      }

      // Unload distant chunks cleanly to protect weak-device RAM and frame pacing
      for (const existingKey of Array.from(this.activeChunks.keys())) {
        if (!wanted.has(existingKey)) {
          this.activeChunks.delete(existingKey);
          this.spawnedChunkMonsters.delete(existingKey);
        }
      }

      if (!this.visitedKeys.has(centerKey)) {
        this.visitedKeys.add(centerKey);
        newlyEnteredKeys.push(centerKey);
      }
    }

    const activeProps: SceneryPropDef[] = [];
    const activeNodes: OverworldNodeDef[] = [];
    const activeChests: WorldChestDef[] = [];
    const activeWaystones: WorldFastTravelDef[] = [];
    const pendingPatrols: Array<{ chunkKey: string; archetype: MonsterArchetype; x: number; z: number }> = [];

    for (const chunk of this.activeChunks.values()) {
      for (const p of chunk.props) activeProps.push(p);
      for (const n of chunk.nodes) activeNodes.push(n);
      for (const c of chunk.chests) activeChests.push(c);
      for (const w of chunk.waystones) activeWaystones.push(w);
      if (!this.spawnedChunkMonsters.has(chunk.key)) {
        this.spawnedChunkMonsters.add(chunk.key);
        for (const spot of chunk.patrolSpots) {
          pendingPatrols.push({ chunkKey: chunk.key, ...spot });
        }
      }
    }

    const currentChunk = this.activeChunks.get(centerKey) || createProceduralChunk(coord.cx, coord.cz, this.baseArena);

    return {
      changed,
      currentChunkKey: centerKey,
      currentChunkCoord: coord,
      currentBiomeName: currentChunk.biomeName,
      currentBiomeColor: currentChunk.biomeColor,
      activeChunksCount: this.activeChunks.size,
      streamRadiusChunks: streamRadius,
      newlyEnteredKeys,
      activeProps,
      activeNodes,
      activeChests,
      activeWaystones,
      pendingPatrols,
    };
  }
}
