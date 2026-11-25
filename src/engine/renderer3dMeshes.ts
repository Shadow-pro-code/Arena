import type { GraphicsQuality, WeaponId } from '../types/game';
import { MONSTERS, WEAPONS } from '../data/gameCatalog';
import type { RenderFighter, RenderMonster, Vec3 } from './renderer3d';

export interface RendererMeshHost {
  getSegCount: (quality: GraphicsQuality) => number;
  localToWorld: (origin: Vec3, yaw: number, lx: number, ly: number, lz: number) => Vec3;
  addEllipsoid: (
    center: Vec3,
    rx: number,
    ry: number,
    rz: number,
    rotY: number,
    segs: number,
    rings: number,
    color: string,
    opts?: {
      rotX?: number;
      rotZ?: number;
      flashWhite?: number;
      freezeTint?: number;
      specular?: number;
      unlit?: boolean;
      alpha?: number;
    }
  ) => void;
  addCapsuleLimb: (
    center: Vec3,
    rTop: number,
    rBot: number,
    length: number,
    rotY: number,
    segs: number,
    color: string,
    opts?: {
      rotX?: number;
      rotZ?: number;
      flashWhite?: number;
      freezeTint?: number;
    }
  ) => void;
  addTaperedCylinder: (
    center: Vec3,
    rBot: number,
    rTop: number,
    height: number,
    rotY: number,
    segs: number,
    color: string,
    opts?: {
      rotX?: number;
      rotZ?: number;
      flashWhite?: number;
      freezeTint?: number;
      unlit?: boolean;
      specular?: number;
      capTop?: boolean;
      capBottom?: boolean;
    }
  ) => void;
  addSculptedTorso: (
    center: Vec3,
    chestW: number,
    waistW: number,
    chestD: number,
    height: number,
    rotY: number,
    segs: number,
    color: string,
    opts?: {
      rotX?: number;
      rotZ?: number;
      flashWhite?: number;
      freezeTint?: number;
      specular?: number;
    }
  ) => void;
  addTorusRing: (
    center: Vec3,
    majorR: number,
    minorR: number,
    rotY: number,
    rotX: number,
    segs: number,
    color: string,
    opts?: { unlit?: boolean; alpha?: number }
  ) => void;
  addBox: (
    center: Vec3,
    size: Vec3,
    rotY: number,
    color: string,
    opts?: { rotX?: number; unlit?: boolean }
  ) => void;
}

export function renderUnifiedFighterMesh(
  host: RendererMeshHost,
  fighter: RenderFighter,
  time: number,
  quality: GraphicsQuality = 'balanced'
): void {
  const segs = host.getSegCount(quality);
  const av = fighter.avatar;
  const overdriveScale = fighter.overdriveActive ? 1.2 : 1.0;
  const hScale = av.heightScale * overdriveScale;
  const buildWidth =
    (av.build === 'heavy' ? 1.2 : av.build === 'agile' ? 0.86 : 1.0) * av.shoulderScale * overdriveScale;
  const flash = fighter.hitFlash;
  const freeze = fighter.frozenTimer > 0 ? 1 : 0;

  const isMoving = fighter.animState === 'run';
  const isAttack = fighter.animState === 'attack' || fighter.animState === 'heavy';
  const isBlock = fighter.animState === 'block';
  const isDodge = fighter.animState === 'dodge';
  const isDead = fighter.animState === 'dead';

  const stride = isMoving && !fighter.isAirborne ? Math.sin(fighter.walkPhase * 10) : 0;
  const bob = fighter.isAirborne
    ? 0
    : isMoving
      ? Math.abs(Math.cos(fighter.walkPhase * 10)) * 0.08
      : Math.sin(time * 2.8) * 0.03;

  let rightArmPitch = stride * 0.55;
  let leftArmPitch = -stride * 0.55;
  let torsoTwist = 0;

  if (isAttack) {
    const p = Math.min(1, fighter.animTime / (fighter.animState === 'heavy' ? 0.42 : 0.28));
    const swing = Math.sin(p * Math.PI);
    const dir = fighter.comboStep % 2 === 0 ? 1 : -1;
    rightArmPitch = -1.35 + swing * 2.55;
    torsoTwist = dir * (-0.38 + swing * 0.92);
    leftArmPitch = av.weaponId === 'shadow_daggers' ? -1.05 + Math.cos(p * Math.PI) * 1.95 : -0.35;
  } else if (isBlock) {
    rightArmPitch = -0.95;
    leftArmPitch = -0.95;
  } else if (fighter.animState === 'power') {
    rightArmPitch = -2.25;
    leftArmPitch = -2.25;
  } else if (fighter.isAirborne) {
    rightArmPitch = -0.45;
    leftArmPitch = 0.38;
  }

  const squash = fighter.squash ?? 1;
  const origin: Vec3 = {
    x: fighter.x,
    y: fighter.y + (isDead ? -0.65 : isDodge ? 0.16 : bob),
    z: fighter.z,
  };
  const bodyYaw = fighter.yaw + torsoTwist;
  const tiltX = isDead
    ? 1.45
    : isDodge
      ? 0.65
      : fighter.isAirborne
        ? Math.max(-0.22, Math.min(0.26, -(fighter.vy ?? 0) * 0.03))
        : fighter.animState === 'heavy'
          ? 0.18
          : isMoving
            ? 0.12
            : 0;
  const bankZ = fighter.bankAngle ?? 0;

  const hipY = 0.84 * hScale * squash;
  const legH = 0.78 * hScale * squash;
  const legR = 0.135 * buildWidth;
  const limbSegs = Math.max(6, segs - 2);

  const torsoH = 0.84 * hScale;
  const torsoW = 0.72 * buildWidth;
  const torsoD =
    (av.armorStyle === 'titan_mail' || av.armorStyle === 'paladin_aegis'
      ? 0.48
      : av.armorStyle === 'plate' || av.armorStyle === 'dragon_scale'
        ? 0.42
        : 0.36) * buildWidth;

  // 1. Grounded Pelvis Bridge + Exact FK 2-Segment Legs
  host.addEllipsoid(
    host.localToWorld(origin, bodyYaw, 0, hipY - 0.02 * hScale, 0),
    torsoW * 0.4,
    0.16 * hScale,
    torsoD * 0.45,
    bodyYaw,
    limbSegs,
    3,
    av.primaryColor,
    { flashWhite: flash, freezeTint: freeze }
  );

  const thighLen = legH * 0.52;
  const shinLen = legH * 0.5;
  if (quality === 'eco') {
    for (const side of [-1, 1]) {
      const legSwing = side < 0 ? stride : -stride;
      const hipOffX = side * 0.18 * buildWidth;
      const legPitch = -legSwing * 0.52 + tiltX * 0.35;
      host.addCapsuleLimb(
        host.localToWorld(
          origin,
          fighter.yaw,
          hipOffX,
          hipY - legH * 0.5 * Math.cos(legPitch),
          -legH * 0.5 * Math.sin(legPitch)
        ),
        legR * 1.18,
        legR * 0.86,
        legH * 1.06,
        fighter.yaw,
        limbSegs,
        av.primaryColor,
        { rotX: legPitch, flashWhite: flash, freezeTint: freeze }
      );
      host.addEllipsoid(
        host.localToWorld(
          origin,
          fighter.yaw,
          hipOffX,
          Math.max(0.09 * hScale, hipY - legH * 0.94 * Math.cos(legPitch)),
          -legH * 0.94 * Math.sin(legPitch) + 0.05 * hScale
        ),
        legR * 1.14,
        0.11 * hScale,
        legR * 1.58,
        fighter.yaw,
        6,
        3,
        av.secondaryColor,
        { flashWhite: flash, freezeTint: freeze }
      );
    }
  } else {
    for (const side of [-1, 1]) {
      const legSwing = side < 0 ? stride : -stride;
      const hipOffX = side * 0.18 * buildWidth;
      const thighPitch = -legSwing * 0.52 + tiltX * 0.32;
      const shinPitch = thighPitch + Math.max(0, legSwing * 0.36);

      const kneeY = hipY - thighLen * Math.cos(thighPitch);
      const kneeZ = -thighLen * Math.sin(thighPitch);
      const ankleY = kneeY - shinLen * Math.cos(shinPitch);
      const ankleZ = kneeZ - shinLen * Math.sin(shinPitch);

      host.addCapsuleLimb(
        host.localToWorld(
          origin,
          fighter.yaw,
          hipOffX,
          hipY - 0.5 * thighLen * Math.cos(thighPitch),
          -0.5 * thighLen * Math.sin(thighPitch)
        ),
        legR * 1.2,
        legR * 0.98,
        thighLen * 1.14,
        fighter.yaw,
        limbSegs,
        av.primaryColor,
        { rotX: thighPitch, flashWhite: flash, freezeTint: freeze }
      );
      host.addEllipsoid(
        host.localToWorld(origin, fighter.yaw, hipOffX, kneeY, kneeZ),
        legR * 1.0,
        legR * 0.96,
        legR * 1.06,
        fighter.yaw,
        limbSegs,
        3,
        av.secondaryColor,
        { flashWhite: flash, freezeTint: freeze, specular: 0.4 }
      );
      host.addCapsuleLimb(
        host.localToWorld(
          origin,
          fighter.yaw,
          hipOffX,
          kneeY - 0.5 * shinLen * Math.cos(shinPitch),
          kneeZ - 0.5 * shinLen * Math.sin(shinPitch)
        ),
        legR * 0.96,
        legR * 0.8,
        shinLen * 1.12,
        fighter.yaw,
        limbSegs,
        av.primaryColor,
        { rotX: shinPitch, flashWhite: flash, freezeTint: freeze }
      );
      host.addEllipsoid(
        host.localToWorld(
          origin,
          fighter.yaw,
          hipOffX,
          Math.max(0.09 * hScale, ankleY + 0.04 * hScale),
          ankleZ + 0.05 * hScale
        ),
        legR * 1.16,
        0.115 * hScale,
        legR * 1.62,
        fighter.yaw,
        6,
        3,
        av.secondaryColor,
        { flashWhite: flash, freezeTint: freeze }
      );
    }
  }

  // 2. Anatomical V-Taper Torso Pivoted at hipY + Socketed Collar & Neck
  const sinTilt = Math.sin(tiltX);
  const cosTilt = Math.cos(tiltX);
  const torsoPos = host.localToWorld(
    origin,
    bodyYaw,
    0,
    hipY + torsoH * 0.48 * cosTilt,
    torsoH * 0.48 * sinTilt
  );

  host.addSculptedTorso(
    torsoPos,
    torsoW,
    torsoW * 0.78,
    torsoD,
    torsoH * 1.06,
    bodyYaw,
    segs,
    av.primaryColor,
    { rotX: tiltX, rotZ: bankZ, flashWhite: flash, freezeTint: freeze, specular: 0.35 }
  );

  if (
    av.armorStyle === 'plate' ||
    av.armorStyle === 'titan_mail' ||
    av.armorStyle === 'dragon_scale' ||
    av.armorStyle === 'paladin_aegis'
  ) {
    const chestPos = host.localToWorld(
      origin,
      bodyYaw,
      0,
      hipY + torsoH * 0.58 * cosTilt,
      torsoH * 0.58 * sinTilt + torsoD * 0.22
    );
    host.addEllipsoid(
      chestPos,
      torsoW * 0.42,
      torsoH * 0.28,
      0.16 * buildWidth,
      bodyYaw,
      segs,
      4,
      av.secondaryColor,
      { rotX: tiltX, rotZ: bankZ, flashWhite: flash, freezeTint: freeze, specular: 0.55 }
    );
    const corePos = host.localToWorld(
      origin,
      bodyYaw,
      0,
      hipY + torsoH * 0.58 * cosTilt,
      torsoH * 0.58 * sinTilt + torsoD * 0.42
    );
    host.addEllipsoid(
      corePos,
      0.12 * buildWidth,
      0.15 * hScale,
      0.1 * buildWidth,
      bodyYaw + time,
      6,
      3,
      av.accentColor,
      { unlit: true }
    );
    if (av.armorStyle === 'dragon_scale') {
      host.addTaperedCylinder(
        host.localToWorld(
          origin,
          bodyYaw,
          0,
          hipY + torsoH * 0.74 * cosTilt,
          torsoH * 0.74 * sinTilt - torsoD * 0.44
        ),
        0.12 * buildWidth,
        0,
        0.32 * hScale,
        bodyYaw,
        6,
        av.accentColor
      );
    }
    if (av.armorStyle === 'paladin_aegis') {
      host.addTaperedCylinder(
        host.localToWorld(origin, bodyYaw, 0, hipY - 0.04, 0),
        torsoW * 0.56,
        torsoW * 0.46,
        0.38 * hScale,
        bodyYaw,
        segs,
        av.secondaryColor,
        { flashWhite: flash }
      );
    }
  } else if (av.armorStyle === 'mystic' || av.armorStyle === 'nomad_cloak' || av.armorStyle === 'arcane_robe') {
    const robePos = host.localToWorld(origin, bodyYaw, 0, hipY - 0.06, 0);
    host.addTaperedCylinder(robePos, torsoW * 0.58, torsoW * 0.44, 0.56 * hScale, bodyYaw, segs, av.secondaryColor, {
      flashWhite: flash,
      freezeTint: freeze,
    });
    if (av.armorStyle === 'arcane_robe') {
      host.addTorusRing(
        host.localToWorld(
          origin,
          bodyYaw,
          0,
          hipY + torsoH * 0.9 * cosTilt,
          torsoH * 0.9 * sinTilt - 0.05
        ),
        torsoW * 0.42,
        0.09,
        bodyYaw,
        Math.PI / 2 - 0.25,
        segs,
        av.accentColor,
        { unlit: true }
      );
    }
  }

  // Belt + Deeply Socketed Neck
  host.addTaperedCylinder(
    host.localToWorld(origin, bodyYaw, 0, hipY + 0.05 * hScale, 0),
    torsoW * 0.44,
    torsoW * 0.42,
    0.14 * hScale,
    bodyYaw,
    segs,
    av.secondaryColor,
    { rotX: tiltX, rotZ: bankZ, flashWhite: flash, freezeTint: freeze }
  );
  host.addTaperedCylinder(
    host.localToWorld(
      origin,
      bodyYaw,
      0,
      hipY + (torsoH + 0.04 * hScale) * cosTilt,
      (torsoH + 0.04 * hScale) * sinTilt + 0.01
    ),
    0.16 * buildWidth,
    0.125 * buildWidth,
    0.24 * hScale,
    bodyYaw,
    Math.max(6, limbSegs),
    av.skinTone,
    { rotX: tiltX, flashWhite: flash, freezeTint: freeze }
  );

  // 3. Socketed Shoulder Pauldrons & Exact FK 2-Segment Arms -> Wrist Fist Grip
  const shoulderDist = torsoH * 0.84;
  const shoulderY = hipY + shoulderDist * cosTilt;
  const shoulderZ = shoulderDist * sinTilt;
  const shoulderOffset = torsoW * 0.45;
  const pauldronR =
    (av.armorStyle === 'titan_mail' || av.armorStyle === 'paladin_aegis'
      ? 0.23
      : av.armorStyle === 'plate' || av.armorStyle === 'dragon_scale'
        ? 0.19
        : 0.15) * buildWidth;

  host.addEllipsoid(
    host.localToWorld(origin, bodyYaw, -shoulderOffset, shoulderY, shoulderZ),
    pauldronR * 1.15,
    pauldronR,
    pauldronR * 1.1,
    bodyYaw,
    limbSegs,
    4,
    av.secondaryColor,
    { rotZ: 0.25, flashWhite: flash, freezeTint: freeze, specular: 0.45 }
  );
  host.addEllipsoid(
    host.localToWorld(origin, bodyYaw, shoulderOffset, shoulderY, shoulderZ),
    pauldronR * 1.15,
    pauldronR,
    pauldronR * 1.1,
    bodyYaw,
    limbSegs,
    4,
    av.secondaryColor,
    { rotZ: -0.25, flashWhite: flash, freezeTint: freeze, specular: 0.45 }
  );

  const armH = 0.68 * hScale;
  const armR = 0.105 * buildWidth;
  const upperArmLen = armH * 0.5;
  const foreArmLen = armH * 0.48;
  let rightWristLocal: Vec3 = { x: shoulderOffset, y: shoulderY - armH * 0.9, z: shoulderZ + 0.14 };
  let leftWristLocal: Vec3 = { x: -shoulderOffset, y: shoulderY - armH * 0.9, z: shoulderZ + 0.14 };
  let rightForePitch = rightArmPitch;
  let leftForePitch = leftArmPitch;

  if (quality === 'eco') {
    for (const side of [-1, 1]) {
      const pitch = side < 0 ? leftArmPitch : rightArmPitch;
      const armX = side * shoulderOffset;
      const wristY = shoulderY - armH * 0.92 * Math.cos(pitch);
      const wristZ = shoulderZ - armH * 0.92 * Math.sin(pitch);
      host.addCapsuleLimb(
        host.localToWorld(
          origin,
          bodyYaw,
          armX,
          shoulderY - 0.5 * armH * Math.cos(pitch),
          shoulderZ - 0.5 * armH * Math.sin(pitch)
        ),
        armR * 1.08,
        armR * 0.85,
        armH * 1.08,
        bodyYaw,
        6,
        av.skinTone,
        { rotX: pitch, flashWhite: flash, freezeTint: freeze }
      );
      host.addEllipsoid(
        host.localToWorld(origin, bodyYaw, armX, wristY, wristZ),
        armR * 1.02,
        armR * 0.95,
        armR * 1.02,
        bodyYaw,
        5,
        3,
        av.skinTone,
        { flashWhite: flash, freezeTint: freeze }
      );
      if (side > 0) {
        rightWristLocal = { x: armX, y: wristY, z: wristZ };
        rightForePitch = pitch;
      } else {
        leftWristLocal = { x: armX, y: wristY, z: wristZ };
        leftForePitch = pitch;
      }
    }
  } else {
    for (const side of [-1, 1]) {
      const basePitch = side < 0 ? leftArmPitch : rightArmPitch;
      const upperPitch = basePitch * 0.82;
      const forePitch = basePitch * 1.05 - 0.24;
      const armX = side * shoulderOffset;

      const elbowY = shoulderY - upperArmLen * Math.cos(upperPitch);
      const elbowZ = shoulderZ - upperArmLen * Math.sin(upperPitch);
      const wristY = elbowY - foreArmLen * Math.cos(forePitch);
      const wristZ = elbowZ - foreArmLen * Math.sin(forePitch);

      host.addCapsuleLimb(
        host.localToWorld(
          origin,
          bodyYaw,
          armX,
          shoulderY - 0.5 * upperArmLen * Math.cos(upperPitch),
          shoulderZ - 0.5 * upperArmLen * Math.sin(upperPitch)
        ),
        armR * 1.12,
        armR * 0.92,
        upperArmLen * 1.16,
        bodyYaw,
        limbSegs,
        av.primaryColor,
        { rotX: upperPitch, flashWhite: flash, freezeTint: freeze }
      );
      host.addEllipsoid(
        host.localToWorld(origin, bodyYaw, armX, elbowY, elbowZ),
        armR * 0.92,
        armR * 0.9,
        armR * 0.92,
        bodyYaw,
        6,
        3,
        av.secondaryColor,
        { flashWhite: flash, freezeTint: freeze }
      );
      host.addCapsuleLimb(
        host.localToWorld(
          origin,
          bodyYaw,
          armX,
          elbowY - 0.5 * foreArmLen * Math.cos(forePitch),
          elbowZ - 0.5 * foreArmLen * Math.sin(forePitch)
        ),
        armR * 0.92,
        armR * 0.8,
        foreArmLen * 1.14,
        bodyYaw,
        limbSegs,
        av.skinTone,
        { rotX: forePitch, flashWhite: flash, freezeTint: freeze }
      );
      host.addEllipsoid(
        host.localToWorld(origin, bodyYaw, armX, wristY, wristZ),
        armR * 1.05,
        armR * 0.92,
        armR * 1.08,
        bodyYaw,
        6,
        3,
        av.secondaryColor,
        { flashWhite: flash, freezeTint: freeze }
      );

      if (side > 0) {
        rightWristLocal = { x: armX, y: wristY, z: wristZ };
        rightForePitch = forePitch;
      } else {
        leftWristLocal = { x: armX, y: wristY, z: wristZ };
        leftForePitch = forePitch;
      }
    }
  }

  // 4. Head + All 9 Helm/Hair Styles Anchored to Spine
  const headDist = torsoH + 0.27 * hScale;
  const headY = hipY + headDist * cosTilt;
  const headZ = headDist * sinTilt + 0.015;
  const headR = 0.24 * hScale;
  const headPos = host.localToWorld(origin, bodyYaw, 0, headY, headZ);
  const headColor = av.headStyle === 'spiky_hair' || av.headStyle === 'war_crown' ? av.skinTone : av.helmetColor;

  host.addEllipsoid(headPos, headR, headR * 1.12, headR * 1.04, bodyYaw, segs, 4, headColor, {
    flashWhite: flash,
    freezeTint: freeze,
    specular: 0.25,
  });

  if (av.headStyle === 'tech_visor' || av.headStyle === 'void_mask') {
    const visorPos = host.localToWorld(origin, bodyYaw, 0, headY + 0.02 * hScale, headZ + headR * 0.92);
    host.addEllipsoid(visorPos, headR * 0.85, headR * 0.24, 0.06, bodyYaw, 6, 3, av.eyeGlow, { unlit: true });
  } else {
    const eyeL = host.localToWorld(origin, bodyYaw, -0.09 * hScale, headY + 0.03 * hScale, headZ + headR * 0.93);
    const eyeR = host.localToWorld(origin, bodyYaw, 0.09 * hScale, headY + 0.03 * hScale, headZ + headR * 0.93);
    host.addEllipsoid(eyeL, 0.045 * hScale, 0.032 * hScale, 0.04, bodyYaw, 6, 2, av.eyeGlow, { unlit: true });
    host.addEllipsoid(eyeR, 0.045 * hScale, 0.032 * hScale, 0.04, bodyYaw, 6, 2, av.eyeGlow, { unlit: true });
  }

  if (av.headStyle === 'spiky_hair') {
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, 0, headY + headR * 0.82, headZ - 0.05),
      headR * 1.05,
      0,
      0.38 * hScale,
      bodyYaw,
      6,
      av.helmetColor,
      { rotX: -0.22, flashWhite: flash }
    );
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, -0.14 * hScale, headY + headR * 0.65, headZ - 0.06),
      headR * 0.62,
      0,
      0.3 * hScale,
      bodyYaw,
      5,
      av.helmetColor,
      { rotZ: 0.38, flashWhite: flash }
    );
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, 0.14 * hScale, headY + headR * 0.65, headZ - 0.06),
      headR * 0.62,
      0,
      0.3 * hScale,
      bodyYaw,
      5,
      av.helmetColor,
      { rotZ: -0.38, flashWhite: flash }
    );
  } else if (av.headStyle === 'knight_helm') {
    host.addEllipsoid(
      host.localToWorld(origin, bodyYaw, 0, headY + headR * 1.08, headZ - 0.04),
      0.07 * hScale,
      0.14 * hScale,
      headR * 1.15,
      bodyYaw,
      6,
      3,
      av.secondaryColor,
      { flashWhite: flash }
    );
  } else if (av.headStyle === 'shadow_hood') {
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, 0, headY + 0.08 * hScale, headZ - 0.05),
      headR * 1.32,
      headR * 0.72,
      headR * 2.1,
      bodyYaw,
      segs,
      av.helmetColor,
      { rotX: -0.16, flashWhite: flash }
    );
  } else if (av.headStyle === 'war_crown' || av.headStyle === 'royal_crown_helm') {
    host.addTorusRing(
      host.localToWorld(origin, bodyYaw, 0, headY + headR * 0.85, headZ),
      headR * 1.05,
      0.05 * hScale,
      bodyYaw,
      Math.PI / 2,
      segs,
      av.secondaryColor
    );
    for (let k = -1; k <= 1; k++) {
      host.addTaperedCylinder(
        host.localToWorld(origin, bodyYaw, k * 0.13 * hScale, headY + headR * 1.15, headZ + headR * 0.82),
        0.055 * hScale,
        0,
        0.2 * hScale,
        bodyYaw,
        5,
        av.accentColor,
        { unlit: true }
      );
    }
  } else if (av.headStyle === 'horned_helm') {
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, -headR * 1.0, headY + headR * 0.65, headZ),
      0.08 * hScale,
      0,
      0.46 * hScale,
      bodyYaw,
      6,
      av.secondaryColor,
      { rotZ: 0.42 }
    );
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, headR * 1.0, headY + headR * 0.65, headZ),
      0.08 * hScale,
      0,
      0.46 * hScale,
      bodyYaw,
      6,
      av.secondaryColor,
      { rotZ: -0.42 }
    );
  } else if (av.headStyle === 'phoenix_crest') {
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, 0, headY + headR * 1.05, headZ - 0.06),
      0.08 * hScale,
      0,
      0.42 * hScale,
      bodyYaw,
      6,
      av.accentColor,
      { rotX: -0.35, unlit: true }
    );
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, -headR * 0.9, headY + headR * 0.72, headZ - 0.08),
      0.07 * hScale,
      0,
      0.38 * hScale,
      bodyYaw,
      5,
      av.secondaryColor,
      { rotZ: 0.45 }
    );
    host.addTaperedCylinder(
      host.localToWorld(origin, bodyYaw, headR * 0.9, headY + headR * 0.72, headZ - 0.08),
      0.07 * hScale,
      0,
      0.38 * hScale,
      bodyYaw,
      5,
      av.secondaryColor,
      { rotZ: -0.45 }
    );
  } else if (av.headStyle === 'void_mask') {
    host.addEllipsoid(
      host.localToWorld(origin, bodyYaw, 0, headY + headR * 1.4, headZ),
      0.1 * hScale,
      0.14 * hScale,
      0.1 * hScale,
      bodyYaw + time * 2,
      6,
      3,
      av.accentColor,
      { unlit: true }
    );
  }

  // 5. Tightly Attached Back Gear
  if (av.backGear === 'battle_cape') {
    const capeSway = 0.24 + (isMoving ? 0.35 + Math.sin(fighter.walkPhase * 8) * 0.1 : Math.sin(time * 2) * 0.05);
    const capePos = host.localToWorld(
      origin,
      bodyYaw,
      0,
      hipY + torsoH * 0.32,
      shoulderZ - torsoD * 0.52 - capeSway * 0.16
    );
    host.addTaperedCylinder(capePos, torsoW * 0.56, torsoW * 0.38, torsoH * 1.38, bodyYaw, 6, av.secondaryColor, {
      rotX: capeSway,
      flashWhite: flash,
    });
  } else if (av.backGear === 'energy_wings' || av.backGear === 'frost_wings') {
    const wingColor = av.backGear === 'frost_wings' ? '#7DD3FC' : av.accentColor;
    const wingFlap = Math.sin(time * 4.5) * 0.16;
    for (const side of [-1, 1]) {
      const wPos = host.localToWorld(origin, bodyYaw, side * 0.54 * buildWidth, shoulderY + 0.14, shoulderZ - torsoD * 0.48);
      host.addEllipsoid(wPos, 0.58 * hScale, 0.2 * hScale, 0.06, bodyYaw, 6, 3, wingColor, {
        rotZ: side * (-0.42 - wingFlap),
        unlit: true,
        alpha: 0.86,
      });
      const wSub = host.localToWorld(origin, bodyYaw, side * 0.38 * buildWidth, shoulderY - 0.08, shoulderZ - torsoD * 0.48);
      host.addEllipsoid(wSub, 0.42 * hScale, 0.14 * hScale, 0.05, bodyYaw, 6, 2, wingColor, {
        rotZ: side * (-0.65 - wingFlap),
        unlit: true,
        alpha: 0.72,
      });
    }
  } else if (av.backGear === 'back_scabbard') {
    const scab = host.localToWorld(origin, bodyYaw, 0, hipY + torsoH * 0.55, shoulderZ - torsoD * 0.48);
    host.addTaperedCylinder(scab, 0.06, 0.08, 1.35 * hScale, bodyYaw, 6, av.secondaryColor, { rotZ: 0.52 });
  } else if (av.backGear === 'flame_halo' || av.backGear === 'arcane_orbit') {
    const count = quality === 'eco' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const a = time * 2.4 + (i * Math.PI * 2) / count;
      const hp = host.localToWorld(
        origin,
        bodyYaw,
        Math.cos(a) * 0.54 * buildWidth,
        shoulderY + 0.2 + Math.sin(a) * 0.4 * hScale,
        shoulderZ - torsoD * 0.56
      );
      host.addEllipsoid(
        hp,
        0.11 * hScale,
        0.13 * hScale,
        0.11 * hScale,
        time * 3,
        6,
        3,
        av.backGear === 'arcane_orbit' ? '#A78BFA' : av.accentColor,
        { unlit: true }
      );
    }
  } else if (av.backGear === 'war_banner') {
    const pole = host.localToWorld(origin, bodyYaw, -0.18 * buildWidth, shoulderY + 0.42 * hScale, shoulderZ - torsoD * 0.48);
    host.addTaperedCylinder(pole, 0.045, 0.04, 1.8 * hScale, bodyYaw, 6, av.secondaryColor);
    const cloth = host.localToWorld(origin, bodyYaw, -0.18 * buildWidth, shoulderY + 0.78 * hScale, shoulderZ - torsoD * 0.62);
    host.addBox(cloth, { x: 0.52 * hScale, y: 0.82 * hScale, z: 0.06 }, bodyYaw, av.accentColor, { unlit: true });
  }

  if (av.auraStyle && av.auraStyle !== 'none' && quality !== 'eco' && !isDead) {
    const auraColor =
      av.auraStyle === 'ember_sparks'
        ? '#F97316'
        : av.auraStyle === 'frost_mist'
          ? '#38BDF8'
          : av.auraStyle === 'royal_gold'
            ? '#F59E0B'
            : '#A855F7';
    const moteCount = quality === 'high' ? 3 : 2;
    for (let i = 0; i < moteCount; i++) {
      const a = time * 2.8 + (i * Math.PI * 2) / moteCount;
      const my = origin.y + 0.4 + ((time * 0.9 + i * 0.6) % 1.45) * hScale;
      host.addEllipsoid(
        {
          x: fighter.x + Math.cos(a) * 0.85 * buildWidth,
          y: my,
          z: fighter.z + Math.sin(a) * 0.85 * buildWidth,
        },
        0.08,
        0.11,
        0.08,
        a * 2,
        6,
        2,
        auraColor,
        { unlit: true, alpha: 0.85 }
      );
    }
  }

  // 6. Sculpted 3D Weapon Mesh Gripped Directly at Kinematic Wrists
  renderUnifiedWeaponMesh(
    host,
    av.weaponId,
    origin,
    bodyYaw,
    rightWristLocal,
    leftWristLocal,
    rightForePitch,
    leftForePitch,
    hScale,
    time,
    fighter.weaponLevel ?? 1
  );

  if (fighter.shieldActive) {
    host.addTorusRing(
      { x: fighter.x, y: fighter.y + 1.15 * hScale, z: fighter.z },
      1.15,
      0.09,
      time * 2.5,
      Math.PI / 2,
      10,
      '#10B981',
      { unlit: true }
    );
  }

  if (fighter.overdriveActive) {
    for (let i = 0; i < 3; i++) {
      const a = time * 4 + (i * Math.PI * 2) / 3;
      host.addEllipsoid(
        {
          x: fighter.x + Math.cos(a) * 1.1,
          y: fighter.y + 0.7 + ((time * 1.6 + i) % 1.4),
          z: fighter.z + Math.sin(a) * 1.1,
        },
        0.12,
        0.22,
        0.12,
        a,
        6,
        3,
        '#F59E0B',
        { unlit: true, alpha: 0.8 }
      );
    }
  }
}

export function renderUnifiedWeaponMesh(
  host: RendererMeshHost,
  weaponId: WeaponId,
  origin: Vec3,
  yaw: number,
  rightWrist: Vec3,
  leftWrist: Vec3,
  rightPitch: number,
  leftPitch: number,
  scale: number,
  time: number,
  weaponLevel: number
): void {
  const w = WEAPONS[weaponId] || WEAPONS.vanguard_sword;
  const glowBoost = weaponLevel >= 3;
  const weaponTilt = rightPitch + 1.35;
  const axisY = Math.cos(weaponTilt);
  const axisZ = Math.sin(weaponTilt);

  const pointAlongRight = (dist: number) =>
    host.localToWorld(
      origin,
      yaw,
      rightWrist.x,
      rightWrist.y + axisY * dist * scale,
      rightWrist.z + axisZ * dist * scale
    );

  if (weaponId === 'vanguard_sword') {
    const hilt = pointAlongRight(0.06);
    host.addTaperedCylinder(hilt, 0.16 * scale, 0.14 * scale, 0.12 * scale, yaw, 6, w.hiltColor, { rotX: weaponTilt });
    const blade = pointAlongRight(0.74);
    host.addTaperedCylinder(blade, 0.08 * scale, 0.02 * scale, 1.48 * scale, yaw, 6, w.bladeColor, {
      rotX: weaponTilt,
      unlit: glowBoost,
      specular: 0.7,
    });
    if (weaponLevel >= 2) {
      host.addTaperedCylinder(blade, 0.04 * scale, 0.01 * scale, 1.3 * scale, yaw, 4, w.energyColor, {
        rotX: weaponTilt,
        unlit: true,
      });
    }
  } else if (weaponId === 'shadow_daggers') {
    const rTilt = rightPitch + 1.45;
    const rPos = host.localToWorld(
      origin,
      yaw,
      rightWrist.x,
      rightWrist.y + Math.cos(rTilt) * 0.34 * scale,
      rightWrist.z + Math.sin(rTilt) * 0.34 * scale
    );
    host.addTaperedCylinder(rPos, 0.065 * scale, 0, 0.78 * scale, yaw, 5, w.bladeColor, {
      rotX: rTilt,
      unlit: glowBoost,
    });
    const lTilt = leftPitch + 1.45;
    const lPos = host.localToWorld(
      origin,
      yaw,
      leftWrist.x,
      leftWrist.y + Math.cos(lTilt) * 0.34 * scale,
      leftWrist.z + Math.sin(lTilt) * 0.34 * scale
    );
    host.addTaperedCylinder(lPos, 0.065 * scale, 0, 0.78 * scale, yaw, 5, w.bladeColor, {
      rotX: lTilt,
      unlit: glowBoost,
    });
  } else if (weaponId === 'storm_hammer') {
    const shaft = pointAlongRight(0.55);
    host.addTaperedCylinder(shaft, 0.06 * scale, 0.05 * scale, 1.45 * scale, yaw, 6, w.hiltColor, { rotX: weaponTilt });
    const head = pointAlongRight(1.22);
    host.addEllipsoid(head, 0.32 * scale, 0.22 * scale, 0.24 * scale, yaw, 6, 4, w.bladeColor, { rotX: weaponTilt, specular: 0.6 });
    host.addTorusRing(head, 0.26 * scale, 0.05 * scale, yaw, weaponTilt, 8, w.energyColor, { unlit: true });
  } else if (weaponId === 'dragon_spear') {
    const pole = pointAlongRight(0.58);
    host.addTaperedCylinder(pole, 0.05 * scale, 0.04 * scale, 2.15 * scale, yaw, 6, w.hiltColor, { rotX: weaponTilt });
    const tip = pointAlongRight(1.68);
    host.addTaperedCylinder(tip, 0.14 * scale, 0, 0.62 * scale, yaw, 6, w.energyColor, { rotX: weaponTilt, unlit: true });
  } else if (weaponId === 'solar_bow') {
    const bowTilt = leftPitch + 0.15;
    const bowCenter = host.localToWorld(origin, yaw, leftWrist.x, leftWrist.y + 0.08 * scale, leftWrist.z + 0.08 * scale);
    host.addTaperedCylinder(bowCenter, 0.055 * scale, 0.055 * scale, 1.2 * scale, yaw, 6, w.bladeColor, { rotX: bowTilt });
    const topLimb = host.localToWorld(
      origin,
      yaw,
      leftWrist.x,
      leftWrist.y + 0.65 * Math.cos(bowTilt) * scale,
      leftWrist.z + 0.65 * Math.sin(bowTilt) * scale - 0.12 * scale
    );
    const botLimb = host.localToWorld(
      origin,
      yaw,
      leftWrist.x,
      leftWrist.y - 0.5 * Math.cos(bowTilt) * scale,
      leftWrist.z - 0.5 * Math.sin(bowTilt) * scale - 0.12 * scale
    );
    host.addTaperedCylinder(topLimb, 0.06 * scale, 0.02 * scale, 0.36 * scale, yaw, 5, w.energyColor, { rotX: -0.55, unlit: true });
    host.addTaperedCylinder(botLimb, 0.06 * scale, 0.02 * scale, 0.36 * scale, yaw, 5, w.energyColor, { rotX: 0.55, unlit: true });
  } else if (weaponId === 'void_staff' || weaponId === 'crimson_wand' || weaponId === 'radiant_scepter') {
    const staffTilt = rightPitch * 0.6 + 0.35;
    const staffH = weaponId === 'crimson_wand' ? 1.32 * scale : 1.85 * scale;
    const centerDist = weaponId === 'crimson_wand' ? 0.45 : 0.62;
    const orbDist = weaponId === 'crimson_wand' ? 1.15 : 1.54;
    const staff = host.localToWorld(
      origin,
      yaw,
      rightWrist.x,
      rightWrist.y + Math.cos(staffTilt) * centerDist * scale,
      rightWrist.z + Math.sin(staffTilt) * centerDist * scale
    );
    host.addTaperedCylinder(staff, 0.055 * scale, 0.045 * scale, staffH, yaw, 6, w.hiltColor, { rotX: staffTilt });
    const orbPos = host.localToWorld(
      origin,
      yaw,
      rightWrist.x,
      rightWrist.y + Math.cos(staffTilt) * orbDist * scale + Math.sin(time * 5) * 0.05,
      rightWrist.z + Math.sin(staffTilt) * orbDist * scale
    );
    host.addEllipsoid(orbPos, 0.2 * scale, 0.24 * scale, 0.2 * scale, time * 2.8, 6, 4, w.energyColor, { unlit: true });
    if (weaponId === 'radiant_scepter') {
      host.addTorusRing(orbPos, 0.3 * scale, 0.045 * scale, yaw + time, 0.3, 8, w.bladeColor, { unlit: true });
    }
  } else if (weaponId === 'arcane_tome') {
    const tomePos = host.localToWorld(
      origin,
      yaw,
      rightWrist.x,
      rightWrist.y + 0.22 * scale + Math.sin(time * 4) * 0.06,
      rightWrist.z + 0.18 * scale
    );
    host.addBox(tomePos, { x: 0.46 * scale, y: 0.14 * scale, z: 0.56 * scale }, yaw + 0.3, w.bladeColor, { rotX: -0.35 });
    host.addEllipsoid(
      { x: tomePos.x, y: tomePos.y + 0.3 * scale, z: tomePos.z },
      0.15 * scale,
      0.18 * scale,
      0.15 * scale,
      time * 3.5,
      6,
      3,
      w.energyColor,
      { unlit: true }
    );
  } else if (weaponId === 'astral_censer') {
    const orbPos = host.localToWorld(
      origin,
      yaw,
      rightWrist.x,
      rightWrist.y + 0.36 * scale + Math.sin(time * 3.6) * 0.08,
      rightWrist.z + 0.16 * scale
    );
    host.addEllipsoid(orbPos, 0.22 * scale, 0.25 * scale, 0.22 * scale, time * 2.4, 6, 4, w.energyColor, { unlit: true });
    host.addTorusRing(orbPos, 0.38 * scale, 0.045 * scale, time * 2, 0.6, 8, w.bladeColor, {
      unlit: true,
      alpha: 0.84,
    });
  } else if (weaponId === 'bastion_mace' || weaponId === 'aegis_greatshield') {
    const maceShaft = pointAlongRight(0.42);
    host.addTaperedCylinder(maceShaft, 0.05 * scale, 0.045 * scale, 1.05 * scale, yaw, 6, w.hiltColor, { rotX: weaponTilt });
    const maceHead = pointAlongRight(0.92);
    host.addEllipsoid(maceHead, 0.2 * scale, 0.22 * scale, 0.2 * scale, yaw, 6, 4, w.energyColor, { unlit: glowBoost });

    const shSize = weaponId === 'aegis_greatshield' ? 1.25 : 0.92;
    const shPos = host.localToWorld(origin, yaw, leftWrist.x * 1.05, leftWrist.y + 0.1 * scale, leftWrist.z + 0.12 * scale);
    host.addEllipsoid(shPos, 0.38 * shSize * scale, 0.52 * shSize * scale, 0.1 * scale, yaw + 0.25, 8, 4, w.bladeColor, {
      specular: 0.5,
    });
    host.addEllipsoid(
      host.localToWorld(origin, yaw, leftWrist.x * 1.08, leftWrist.y + 0.1 * scale, leftWrist.z + 0.2 * scale),
      0.16 * shSize * scale,
      0.24 * shSize * scale,
      0.06 * scale,
      yaw + 0.25,
      6,
      3,
      w.energyColor,
      { unlit: true }
    );
  }
}

export function renderUnifiedMonsterMesh(
  host: RendererMeshHost,
  m: RenderMonster,
  time: number,
  quality: GraphicsQuality = 'balanced'
): void {
  const segs = Math.max(6, host.getSegCount(quality) - 2);
  const def = MONSTERS[m.archetype] || MONSTERS.ash_stalker;
  const s = def.scale;
  const flash = m.hitFlash;
  const freeze = m.frozenTimer > 0 ? 1 : 0;
  const stride = Math.sin(m.walkPhase * 9);
  const bob = Math.abs(Math.cos(m.walkPhase * 9)) * 0.08 * s;
  const origin: Vec3 = { x: m.x, y: m.y + bob, z: m.z };
  const atkLift = m.attackTimer > 0 ? Math.sin(Math.min(1, m.attackTimer * 4) * Math.PI) * 1.1 : 0;

  if (m.archetype === 'ash_stalker') {
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 0.62 * s, 0), 0.34 * s, 0.28 * s, 0.64 * s, m.yaw, segs, 4, def.bodyColor, {
      flashWhite: flash,
      freezeTint: freeze,
    });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 0.72 * s, 0.42 * s), 0.28 * s, 0.25 * s, 0.32 * s, m.yaw, segs, 3, def.bodyColor, {
      flashWhite: flash,
      freezeTint: freeze,
    });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 0.82 * s, 0.66 * s), 0.24 * s, 0.22 * s, 0.3 * s, m.yaw, segs, 4, def.bodyColor, {
      flashWhite: flash,
      freezeTint: freeze,
    });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, -0.12 * s, 0.88 * s, 0.88 * s), 0.05 * s, 0.04 * s, 0.04 * s, m.yaw, 5, 2, def.eyeColor, { unlit: true });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0.12 * s, 0.88 * s, 0.88 * s), 0.05 * s, 0.04 * s, 0.04 * s, m.yaw, 5, 2, def.eyeColor, { unlit: true });
    host.addTaperedCylinder(host.localToWorld(origin, m.yaw, 0, 0.92 * s, -0.08 * s), 0.16 * s, 0, 0.42 * s, m.yaw, 6, def.accentColor, { rotX: -0.35 });
    const legs: [number, number][] = [[-0.22, 0.34], [0.22, 0.34], [-0.22, -0.34], [0.22, -0.34]];
    legs.forEach(([lx, lz], idx) => {
      const sw = idx % 2 === 0 ? stride : -stride;
      const legPitch = -sw * 0.38;
      host.addCapsuleLimb(
        host.localToWorld(origin, m.yaw, lx * s, 0.34 * s, lz * s - 0.25 * s * Math.sin(legPitch)),
        0.11 * s,
        0.075 * s,
        0.62 * s,
        m.yaw,
        5,
        def.bodyColor,
        { rotX: legPitch, flashWhite: flash, freezeTint: freeze }
      );
    });
  } else if (m.archetype === 'venom_crawler') {
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 0.42 * s, 0), 0.52 * s, 0.24 * s, 0.58 * s, m.yaw, segs, 4, def.bodyColor, {
      flashWhite: flash,
      freezeTint: freeze,
    });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 0.64 * s, -0.24 * s), 0.26 * s, 0.24 * s, 0.28 * s, time * 2, 6, 3, def.accentColor, { unlit: true });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 0.48 * s, 0.54 * s), 0.26 * s, 0.18 * s, 0.24 * s, m.yaw, 6, 3, def.bodyColor, {
      flashWhite: flash,
      freezeTint: freeze,
    });
    for (const side of [-1, 1]) {
      for (let l = -1; l <= 1; l++) {
        const sw = (l + (side > 0 ? 1 : 0)) % 2 === 0 ? stride : -stride;
        host.addCapsuleLimb(
          host.localToWorld(origin, m.yaw, side * 0.48 * s, 0.26 * s, (l * 0.32 + sw * 0.12) * s),
          0.08 * s,
          0.055 * s,
          0.5 * s,
          m.yaw,
          5,
          def.bodyColor,
          { rotZ: side * 0.85, flashWhite: flash }
        );
      }
    }
  } else if (m.archetype === 'ember_imp' || m.archetype === 'frost_specter') {
    const hoverY = 0.45 + Math.sin(time * 5 + m.x) * 0.16;
    const ho: Vec3 = { x: m.x, y: m.y + hoverY, z: m.z };
    host.addTaperedCylinder(host.localToWorld(ho, m.yaw, 0, 0.68 * s, 0), 0.2 * s, 0.34 * s, 0.78 * s, m.yaw, segs, def.bodyColor, {
      flashWhite: flash,
      freezeTint: freeze,
    });
    host.addEllipsoid(host.localToWorld(ho, m.yaw, 0, 1.18 * s, 0.04 * s), 0.24 * s, 0.26 * s, 0.24 * s, m.yaw, segs, 4, def.bodyColor, {
      flashWhite: flash,
      freezeTint: freeze,
    });
    host.addEllipsoid(host.localToWorld(ho, m.yaw, 0, 1.2 * s, 0.26 * s), 0.14 * s, 0.06 * s, 0.05 * s, m.yaw, 6, 2, def.eyeColor, { unlit: true });
    host.addTaperedCylinder(host.localToWorld(ho, m.yaw, -0.16 * s, 1.42 * s, 0), 0.08 * s, 0, 0.35 * s, m.yaw, 5, def.accentColor, { rotZ: 0.3 });
    host.addTaperedCylinder(host.localToWorld(ho, m.yaw, 0.16 * s, 1.42 * s, 0), 0.08 * s, 0, 0.35 * s, m.yaw, 5, def.accentColor, { rotZ: -0.3 });
    const flap = Math.sin(time * 12) * 0.3;
    host.addEllipsoid(host.localToWorld(ho, m.yaw, -0.44 * s, 0.9 * s, -0.14 * s), 0.36 * s, 0.14 * s, 0.06 * s, m.yaw, 6, 2, def.accentColor, {
      rotZ: 0.32 + flap,
      unlit: m.archetype === 'frost_specter',
    });
    host.addEllipsoid(host.localToWorld(ho, m.yaw, 0.44 * s, 0.9 * s, -0.14 * s), 0.36 * s, 0.14 * s, 0.06 * s, m.yaw, 6, 2, def.accentColor, {
      rotZ: -0.32 - flap,
      unlit: m.archetype === 'frost_specter',
    });
  } else if (m.archetype === 'obsidian_golem') {
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 0.82 * s, 0), 0.48 * s, 0.22 * s, 0.38 * s, m.yaw, segs, 3, def.bodyColor, { flashWhite: flash, freezeTint: freeze });
    for (const side of [-1, 1]) {
      const legPitch = side < 0 ? -stride * 0.38 : stride * 0.38;
      host.addCapsuleLimb(
        host.localToWorld(origin, m.yaw, side * 0.28 * s, 0.42 * s, -0.4 * s * Math.sin(legPitch)),
        0.24 * s,
        0.19 * s,
        0.9 * s,
        m.yaw,
        6,
        def.bodyColor,
        { rotX: legPitch, flashWhite: flash, freezeTint: freeze }
      );
    }
    host.addSculptedTorso(host.localToWorld(origin, m.yaw, 0, 1.28 * s, 0), 1.2 * s, 0.84 * s, 0.78 * s, 1.08 * s, m.yaw, segs, def.bodyColor, { flashWhite: flash, freezeTint: freeze });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 1.3 * s, 0.4 * s), 0.22 * s, 0.26 * s, 0.16 * s, time * 2, 6, 3, def.accentColor, { unlit: true });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 1.88 * s, 0.06 * s), 0.27 * s, 0.25 * s, 0.27 * s, m.yaw, segs, 4, def.bodyColor, { flashWhite: flash, freezeTint: freeze });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 1.89 * s, 0.3 * s), 0.16 * s, 0.06 * s, 0.05 * s, m.yaw, 6, 2, def.eyeColor, { unlit: true });

    const armPitch = -atkLift - 0.18;
    const gShY = 1.54 * s;
    const gArmLen = 0.96 * s;
    for (const side of [-1, 1]) {
      const sx = side * 0.56 * s;
      host.addEllipsoid(host.localToWorld(origin, m.yaw, sx, gShY, 0), 0.27 * s, 0.25 * s, 0.27 * s, m.yaw, 6, 3, def.bodyColor, { flashWhite: flash, freezeTint: freeze });
      host.addCapsuleLimb(
        host.localToWorld(origin, m.yaw, sx, gShY - 0.5 * gArmLen * Math.cos(armPitch), -0.5 * gArmLen * Math.sin(armPitch)),
        0.25 * s,
        0.2 * s,
        gArmLen * 1.12,
        m.yaw,
        6,
        def.bodyColor,
        { rotX: armPitch, flashWhite: flash, freezeTint: freeze }
      );
    }
  } else if (m.archetype === 'wraith_knight' || m.archetype === 'shadow_reaper') {
    const hover = 0.26 + Math.sin(time * 4 + m.z) * 0.1;
    const wo: Vec3 = { x: m.x, y: m.y + hover, z: m.z };
    host.addTaperedCylinder(host.localToWorld(wo, m.yaw, 0, 0.6 * s, 0), 0.52 * s, 0.26 * s, 1.2 * s, m.yaw, segs, def.bodyColor, { flashWhite: flash, freezeTint: freeze });
    host.addSculptedTorso(host.localToWorld(wo, m.yaw, 0, 1.3 * s, 0), 0.78 * s, 0.54 * s, 0.46 * s, 0.72 * s, m.yaw, segs, def.bodyColor, { flashWhite: flash, freezeTint: freeze });
    host.addEllipsoid(host.localToWorld(wo, m.yaw, 0, 1.76 * s, 0), 0.24 * s, 0.26 * s, 0.24 * s, m.yaw, segs, 4, '#181E2C', { flashWhite: flash, freezeTint: freeze });
    host.addEllipsoid(host.localToWorld(wo, m.yaw, 0, 1.78 * s, 0.22 * s), 0.16 * s, 0.05 * s, 0.04 * s, m.yaw, 6, 2, def.eyeColor, { unlit: true });

    const wArmPitch = -0.55 - atkLift * 0.9;
    const wShX = 0.38 * s;
    const wShY = 1.56 * s;
    const wArmLen = 0.56 * s;
    host.addEllipsoid(host.localToWorld(wo, m.yaw, wShX, wShY, 0), 0.15 * s, 0.15 * s, 0.15 * s, m.yaw, 6, 3, def.bodyColor, { flashWhite: flash });
    host.addCapsuleLimb(
      host.localToWorld(wo, m.yaw, wShX, wShY - 0.5 * wArmLen * Math.cos(wArmPitch), -0.5 * wArmLen * Math.sin(wArmPitch)),
      0.11 * s,
      0.09 * s,
      wArmLen * 1.12,
      m.yaw,
      5,
      def.bodyColor,
      { rotX: wArmPitch, flashWhite: flash, freezeTint: freeze }
    );
    const wHandY = wShY - wArmLen * Math.cos(wArmPitch);
    const wHandZ = -wArmLen * Math.sin(wArmPitch);
    const wBladeTilt = wArmPitch + 1.35;
    host.addTaperedCylinder(
      host.localToWorld(wo, m.yaw, wShX, wHandY + Math.cos(wBladeTilt) * 0.72 * s, wHandZ + Math.sin(wBladeTilt) * 0.72 * s),
      0.08 * s,
      0.01 * s,
      1.65 * s,
      m.yaw,
      5,
      def.accentColor,
      { rotX: wBladeTilt, unlit: true }
    );
    if (m.archetype === 'shadow_reaper') {
      host.addTaperedCylinder(
        host.localToWorld(wo, m.yaw, wShX, wHandY + Math.cos(wBladeTilt) * 1.48 * s, wHandZ + Math.sin(wBladeTilt) * 1.48 * s),
        0.14 * s,
        0,
        0.72 * s,
        m.yaw,
        5,
        def.accentColor,
        { rotZ: 1.4, unlit: true }
      );
    }
  } else {
    // Epic Bosses: Magma Behemoth & Void Colossus
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 0.88 * s, 0), 0.52 * s, 0.24 * s, 0.42 * s, m.yaw, segs, 3, def.bodyColor, { flashWhite: flash, freezeTint: freeze });
    for (const side of [-1, 1]) {
      const legPitch = side < 0 ? -stride * 0.32 : stride * 0.32;
      host.addCapsuleLimb(
        host.localToWorld(origin, m.yaw, side * 0.3 * s, 0.46 * s, -0.44 * s * Math.sin(legPitch)),
        0.24 * s,
        0.19 * s,
        0.98 * s,
        m.yaw,
        6,
        def.bodyColor,
        { rotX: legPitch, flashWhite: flash, freezeTint: freeze }
      );
    }
    host.addSculptedTorso(host.localToWorld(origin, m.yaw, 0, 1.38 * s, 0), 1.25 * s, 0.88 * s, 0.82 * s, 1.16 * s, m.yaw, segs, def.bodyColor, { flashWhite: flash, freezeTint: freeze });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 1.44 * s, 0.42 * s), 0.26 * s, 0.32 * s, 0.18 * s, time * 2.5, 6, 4, def.accentColor, { unlit: true });

    const bShX = 0.58 * s;
    const bShY = 1.76 * s;
    host.addEllipsoid(host.localToWorld(origin, m.yaw, -bShX, bShY, 0), 0.3 * s, 0.28 * s, 0.3 * s, m.yaw, 6, 4, '#302030', { flashWhite: flash });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, bShX, bShY, 0), 0.3 * s, 0.28 * s, 0.3 * s, m.yaw, 6, 4, '#302030', { flashWhite: flash });
    host.addTaperedCylinder(host.localToWorld(origin, m.yaw, -bShX, 2.08 * s, 0), 0.14 * s, 0, 0.5 * s, m.yaw, 6, def.accentColor, { unlit: true });
    host.addTaperedCylinder(host.localToWorld(origin, m.yaw, bShX, 2.08 * s, 0), 0.14 * s, 0, 0.5 * s, m.yaw, 6, def.accentColor, { unlit: true });

    const bArmLen = 0.96 * s;
    host.addCapsuleLimb(
      host.localToWorld(origin, m.yaw, -bShX, bShY - 0.5 * bArmLen, 0.08 * s),
      0.22 * s,
      0.18 * s,
      bArmLen * 1.12,
      m.yaw,
      6,
      def.bodyColor,
      { rotX: -0.18, flashWhite: flash, freezeTint: freeze }
    );
    const rBossPitch = -0.35 - atkLift * 0.95;
    host.addCapsuleLimb(
      host.localToWorld(origin, m.yaw, bShX, bShY - 0.5 * bArmLen * Math.cos(rBossPitch), -0.5 * bArmLen * Math.sin(rBossPitch)),
      0.22 * s,
      0.18 * s,
      bArmLen * 1.12,
      m.yaw,
      6,
      def.bodyColor,
      { rotX: rBossPitch, flashWhite: flash, freezeTint: freeze }
    );
    const rBossHandY = bShY - bArmLen * Math.cos(rBossPitch);
    const rBossHandZ = -bArmLen * Math.sin(rBossPitch);

    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 2.1 * s, 0.05 * s), 0.28 * s, 0.28 * s, 0.28 * s, m.yaw, segs, 4, def.bodyColor, { flashWhite: flash });
    host.addEllipsoid(host.localToWorld(origin, m.yaw, 0, 2.12 * s, 0.31 * s), 0.18 * s, 0.07 * s, 0.05 * s, m.yaw, 6, 2, def.eyeColor, { unlit: true });
    host.addTaperedCylinder(host.localToWorld(origin, m.yaw, -0.32 * s, 2.5 * s, 0), 0.11 * s, 0, 0.65 * s, m.yaw, 5, def.accentColor, { rotZ: 0.3 });
    host.addTaperedCylinder(host.localToWorld(origin, m.yaw, 0.32 * s, 2.5 * s, 0), 0.11 * s, 0, 0.65 * s, m.yaw, 5, def.accentColor, { rotZ: -0.3 });
    if (m.archetype === 'void_colossus') {
      host.addTorusRing(
        host.localToWorld(origin, m.yaw, 0, 2.82 * s, 0),
        0.46 * s,
        0.08 * s,
        time * 2.5,
        Math.PI / 2,
        10,
        '#38BDF8',
        { unlit: true }
      );
    }
    const cleaverTilt = rBossPitch + 1.35;
    const cleaver = host.localToWorld(
      origin,
      m.yaw,
      bShX,
      rBossHandY + Math.cos(cleaverTilt) * 0.88 * s,
      rBossHandZ + Math.sin(cleaverTilt) * 0.88 * s
    );
    host.addTaperedCylinder(cleaver, 0.16 * s, 0.02 * s, 2.0 * s, m.yaw, 5, def.accentColor, {
      rotX: cleaverTilt,
      unlit: true,
    });
  }
}
