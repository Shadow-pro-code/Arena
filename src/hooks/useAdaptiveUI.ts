import { useEffect, useMemo, useState } from 'react';
import type { DeviceMode, HudCustomizationConfig } from '../types/game';
import { computeAdaptiveUiMetrics, type AdaptiveUiMetrics } from '../engine/uiLayoutEngine';

interface UseAdaptiveUiOptions {
  deviceMode: DeviceMode;
  landscapeLocked: boolean;
  hudConfig?: HudCustomizationConfig;
}

function readViewportState() {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720, coarse: false };
  }
  const vv = window.visualViewport;
  const width = Math.round(vv ? vv.width : window.innerWidth);
  const height = Math.round(vv ? vv.height : window.innerHeight);
  const coarse = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  return { width, height, coarse };
}

export function useAdaptiveUI({
  deviceMode,
  landscapeLocked,
  hudConfig,
}: UseAdaptiveUiOptions): AdaptiveUiMetrics {
  const [vp, setVp] = useState(readViewportState);

  useEffect(() => {
    const sync = () => setVp(readViewportState());
    sync();

    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);

    const mq = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    if (mq && typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
    }

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      vv?.removeEventListener('resize', sync);
      if (mq && typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', sync);
      }
    };
  }, []);

  const metrics = useMemo(
    () =>
      computeAdaptiveUiMetrics({
        rawWidth: vp.width,
        rawHeight: vp.height,
        hasCoarsePointer: vp.coarse,
        deviceMode,
        landscapeLocked,
        hudConfig,
      }),
    [vp.width, vp.height, vp.coarse, deviceMode, landscapeLocked, hudConfig]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-ui-tier', metrics.tier);
    if (metrics.isShortLandscape || metrics.useCssLandscapeRotation) {
      root.setAttribute('data-ui-compact-landscape', 'true');
    } else {
      root.removeAttribute('data-ui-compact-landscape');
    }
    root.style.setProperty('--ui-vw', `${metrics.effectiveWidth}px`);
    root.style.setProperty('--ui-vh', `${metrics.effectiveHeight}px`);
  }, [metrics.tier, metrics.effectiveWidth, metrics.effectiveHeight, metrics.isShortLandscape, metrics.useCssLandscapeRotation]);

  return metrics;
}
