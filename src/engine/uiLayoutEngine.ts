import type { DeviceMode, HudCustomizationConfig } from '../types/game';

export type UiTier =
  | 'xs_portrait'
  | 'sm_portrait'
  | 'phone_landscape'
  | 'tablet'
  | 'laptop'
  | 'desktop_wide';

export type TopBarDensity = 'minimal_drawer' | 'compact' | 'full';
export type TouchDeckLayout = 'narrow_portrait' | 'portrait' | 'landscape' | 'tablet';

export interface AdaptiveUiInput {
  rawWidth: number;
  rawHeight: number;
  hasCoarsePointer: boolean;
  deviceMode: DeviceMode;
  landscapeLocked: boolean;
  hudConfig?: HudCustomizationConfig;
}

export interface AdaptiveUiMetrics {
  tier: UiTier;
  rawWidth: number;
  rawHeight: number;
  effectiveWidth: number;
  effectiveHeight: number;
  hasCoarsePointer: boolean;
  isTouchEffective: boolean;
  useCssLandscapeRotation: boolean;
  isPortrait: boolean;
  isShortLandscape: boolean;
  topBarDensity: TopBarDensity;
  touchDeckLayout: TouchDeckLayout;
  showTouchControls: boolean;
  showDesktopShortcutLine: boolean;
  hudAutoScale: number;
  touchDeckAutoScale: number;
  playerCardWidthPx: number;
  radarSizePx: number;
  centerStripMaxPx: number;
  joystickSizePx: number;
  skillTileWidthPx: number;
  skillTileHeightPx: number;
  actionBtnSizePx: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeAdaptiveUiMetrics(input: AdaptiveUiInput): AdaptiveUiMetrics {
  const rawWidth = Math.max(280, Math.round(input.rawWidth || 1280));
  const rawHeight = Math.max(280, Math.round(input.rawHeight || 720));

  const isTouchEffective = input.deviceMode === 'mobile' || input.hasCoarsePointer;
  const useCssLandscapeRotation =
    input.deviceMode === 'mobile' && input.landscapeLocked && rawHeight > rawWidth;

  const effectiveWidth = useCssLandscapeRotation ? rawHeight : rawWidth;
  const effectiveHeight = useCssLandscapeRotation ? rawWidth : rawHeight;
  const isPortrait = effectiveHeight > effectiveWidth;
  const isShortLandscape = !isPortrait && effectiveHeight <= 540;

  let tier: UiTier;
  if (isShortLandscape) {
    tier = 'phone_landscape';
  } else if (effectiveWidth < 390 && isPortrait) {
    tier = 'xs_portrait';
  } else if (effectiveWidth < 640) {
    tier = isPortrait ? 'sm_portrait' : 'phone_landscape';
  } else if (effectiveWidth < 1024) {
    tier = 'tablet';
  } else if (effectiveWidth < 1440) {
    tier = 'laptop';
  } else {
    tier = 'desktop_wide';
  }

  const topBarDensity: TopBarDensity =
    tier === 'xs_portrait' || tier === 'sm_portrait' || tier === 'phone_landscape'
      ? 'minimal_drawer'
      : tier === 'tablet'
        ? 'compact'
        : 'full';

  const touchDeckLayout: TouchDeckLayout =
    tier === 'phone_landscape'
      ? 'landscape'
      : effectiveWidth < 450 && isPortrait
        ? 'narrow_portrait'
        : effectiveWidth < 680
          ? 'portrait'
          : 'tablet';

  const showTouchControls = input.deviceMode === 'mobile';
  const showDesktopShortcutLine = !showTouchControls && (tier === 'laptop' || tier === 'desktop_wide');

  // Preserve crisp 1:1 native pixel rendering by default; apply only user-configured HUD scale
  const userHudScale = input.hudConfig?.hudScale ?? 1;
  const hudAutoScale = Number(clamp(userHudScale, 0.75, 1.25).toFixed(2));

  const radarEnabled = input.hudConfig?.widgets.radar !== false;
  const isCompactLandscapeTop = isShortLandscape || useCssLandscapeRotation;

  const radarSizePx =
    tier === 'xs_portrait'
      ? 46
      : tier === 'sm_portrait'
        ? 54
        : tier === 'phone_landscape'
          ? effectiveHeight <= 380
            ? 44
            : 50
          : tier === 'tablet'
            ? 70
            : 82;

  const reservedLeftPx =
    topBarDensity === 'minimal_drawer' ? 198 : topBarDensity === 'compact' ? 320 : 450;

  let playerCardWidthPx = Math.round(
    tier === 'xs_portrait'
      ? clamp(effectiveWidth * 0.4, 134, 162)
      : tier === 'sm_portrait'
        ? clamp(effectiveWidth * 0.38, 154, 198)
        : tier === 'phone_landscape'
          ? clamp(effectiveWidth * 0.24, 142, 198)
          : tier === 'tablet'
            ? 226
            : 264
  );

  // Side-by-side player card + radar in compact landscape consumes both widths on the right edge
  let reservedRightPx = isCompactLandscapeTop
    ? playerCardWidthPx + (radarEnabled ? radarSizePx + 14 : 0)
    : Math.max(playerCardWidthPx, radarEnabled ? radarSizePx + 8 : 0);

  let centerStripMaxPx: number;
  if (!isCompactLandscapeTop && effectiveWidth < 560) {
    // On narrow portrait phones (<560px), center biome/mission strip sits centered on Row 2 below top corners
    centerStripMaxPx = clamp(effectiveWidth - 20, 220, 440);
  } else {
    centerStripMaxPx = Math.round(effectiveWidth - reservedRightPx - reservedLeftPx - 28);
    if (centerStripMaxPx < 146 && isCompactLandscapeTop) {
      // Trim player card slightly on ultra-narrow landscape widths (e.g. 568px iPhone SE) so center strip never collides
      const deficit = 146 - centerStripMaxPx;
      const shrink = Math.min(deficit, Math.max(0, playerCardWidthPx - 124));
      playerCardWidthPx -= shrink;
      reservedRightPx -= shrink;
      centerStripMaxPx = Math.round(effectiveWidth - reservedRightPx - reservedLeftPx - 28);
    }
    centerStripMaxPx = clamp(centerStripMaxPx, 118, 460);
  }

  // Bottom touch controls sizing: keep 1:1 native pixel crispness by default (no fractional CSS scale blur)
  const userTouchScale = input.hudConfig?.mobileButtonsScale ?? 1;
  const presetDelta =
    input.hudConfig?.mobilePreset === 'compact'
      ? -2
      : input.hudConfig?.mobilePreset === 'spread'
        ? 2
        : 0;
  const touchDeckAutoScale = Number(clamp(userTouchScale, 0.75, 1.3).toFixed(2));

  const joystickSizePx = Math.round(
    (tier === 'xs_portrait'
      ? effectiveWidth < 360
        ? 76
        : 84
      : tier === 'sm_portrait'
        ? 96
        : tier === 'phone_landscape'
          ? clamp(effectiveHeight * 0.23, 74, 98)
          : 114) +
      presetDelta * 2
  );

  const skillTileWidthPx =
    (touchDeckLayout === 'narrow_portrait'
      ? Math.round(clamp(effectiveWidth * 0.155, 50, 62))
      : touchDeckLayout === 'landscape'
        ? Math.round(clamp(effectiveWidth * 0.088, 54, 66))
        : touchDeckLayout === 'portrait'
          ? 58
          : 66) + presetDelta;

  const skillTileHeightPx =
    (touchDeckLayout === 'narrow_portrait'
      ? 40
      : touchDeckLayout === 'landscape'
        ? effectiveHeight <= 380
          ? 36
          : 40
        : 48) + presetDelta;

  const actionBtnSizePx =
    (tier === 'xs_portrait'
      ? effectiveWidth < 360
        ? 34
        : 36
      : tier === 'phone_landscape'
        ? effectiveHeight <= 380
          ? 36
          : 40
        : tier === 'sm_portrait'
          ? 44
          : 50) + presetDelta;

  return {
    tier,
    rawWidth,
    rawHeight,
    effectiveWidth,
    effectiveHeight,
    hasCoarsePointer: input.hasCoarsePointer,
    isTouchEffective,
    useCssLandscapeRotation,
    isPortrait,
    isShortLandscape,
    topBarDensity,
    touchDeckLayout,
    showTouchControls,
    showDesktopShortcutLine,
    hudAutoScale,
    touchDeckAutoScale,
    playerCardWidthPx,
    radarSizePx,
    centerStripMaxPx,
    joystickSizePx,
    skillTileWidthPx,
    skillTileHeightPx,
    actionBtnSizePx,
  };
}
