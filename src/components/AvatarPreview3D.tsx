import React, { useEffect, useRef, useState } from 'react';
import type { AvatarConfig, GraphicsQuality, RenderEngineMode } from '../types/game';
import { QUALITY_LEVELS } from '../data/controlDefaults';
import { SoftwareRenderer3D } from '../engine/renderer3d';
import { WebGLAvatarShowcase } from '../engine/webglRenderer3d';
import { resolveRenderEngine } from '../engine/webglCapability';

interface AvatarPreview3DProps {
  avatar: AvatarConfig;
  quality?: GraphicsQuality;
  renderEngine?: RenderEngineMode;
  weaponLevel?: number;
  previewAction?: 'idle' | 'attack' | 'power';
  className?: string;
  autoRotate?: boolean;
  caption?: string;
}

const QUALITY_LABEL_MAP: Record<GraphicsQuality, string> = Object.fromEntries(
  QUALITY_LEVELS.map((q) => [q.id, q.label])
) as Record<GraphicsQuality, string>;

export const AvatarPreview3D: React.FC<AvatarPreview3DProps> = ({
  avatar,
  quality = 'high',
  renderEngine = 'auto',
  weaponLevel = 1,
  previewAction = 'idle',
  className = '',
  autoRotate = true,
  caption,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const swRendererRef = useRef<SoftwareRenderer3D | null>(null);
  const glShowcaseRef = useRef<WebGLAvatarShowcase | null>(null);

  const yawRef = useRef(0.35);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [webglLostFallback, setWebglLostFallback] = useState(false);
  const [glVersionLabel, setGlVersionLabel] = useState<1 | 2>(2);

  // Reset fallback flag whenever user explicitly switches render engine mode
  useEffect(() => {
    setWebglLostFallback(false);
  }, [renderEngine]);

  const resolved = resolveRenderEngine(renderEngine);
  const effectiveEngine: 'webgl' | 'canvas2d' =
    resolved === 'webgl' && !webglLostFallback ? 'webgl' : 'canvas2d';

  const avatarRef = useRef(avatar);
  avatarRef.current = avatar;
  const actionRef = useRef(previewAction);
  actionRef.current = previewAction;
  const weaponLevelRef = useRef(weaponLevel);
  weaponLevelRef.current = weaponLevel;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  // Sync live quality updates into active WebGL showcase
  useEffect(() => {
    if (effectiveEngine === 'webgl' && glShowcaseRef.current) {
      glShowcaseRef.current.setQuality(quality);
    }
  }, [quality, effectiveEngine]);

  // Main preview render loop (re-mounts cleanly when switching between WebGL & Canvas2D)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let rafId = 0;
    let timerId = 0;
    let cancelled = false;
    let lastTs = performance.now();
    let elapsed = 0;

    if (effectiveEngine === 'webgl') {
      let showcase: WebGLAvatarShowcase;
      try {
        showcase = new WebGLAvatarShowcase(canvas, qualityRef.current, () => {
          setWebglLostFallback(true);
        });
      } catch {
        setWebglLostFallback(true);
        return;
      }

      glShowcaseRef.current = showcase;
      setGlVersionLabel(showcase.webglVersion);

      const resizeGl = () => {
        const rect = container.getBoundingClientRect();
        const w = Math.max(180, Math.floor(rect.width || canvas.clientWidth || 320));
        const h = Math.max(160, Math.floor(rect.height || canvas.clientHeight || 260));
        showcase.setSize(w, h);
      };

      let resizeRafId = 0;
      const scheduleResizeGl = () => {
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
        resizeRafId = requestAnimationFrame(() => {
          resizeRafId = 0;
          if (!cancelled) resizeGl();
        });
      };

      const observer = new ResizeObserver(scheduleResizeGl);
      observer.observe(container);
      resizeGl();

      const tickGl = (now: number) => {
        if (cancelled) return;
        const dt = Math.min(0.08, Math.max(0.001, (now - lastTs) / 1000));
        lastTs = now;
        elapsed += dt;

        if (autoRotateRef.current && !dragRef.current.active) {
          yawRef.current += dt * 0.44;
        }

        showcase.render(
          avatarRef.current,
          yawRef.current,
          elapsed,
          actionRef.current,
          weaponLevelRef.current
        );

        if (showcase.isSoftwareGl) {
          timerId = window.setTimeout(() => tickGl(performance.now()), 90);
        } else {
          rafId = requestAnimationFrame(tickGl);
        }
      };

      if (showcase.isSoftwareGl) {
        timerId = window.setTimeout(() => tickGl(performance.now()), 40);
      } else {
        rafId = requestAnimationFrame(tickGl);
      }

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
        window.clearTimeout(timerId);
        observer.disconnect();
        showcase.dispose();
        if (glShowcaseRef.current === showcase) {
          glShowcaseRef.current = null;
        }
      };
    }

    // Canvas2D SoftwareRenderer3D mode
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const sw = new SoftwareRenderer3D();
    swRendererRef.current = sw;

    const getQualityScale = (q: GraphicsQuality) => {
      const rawDpr = window.devicePixelRatio || 1;
      if (q === 'eco') return 0.72;
      if (q === 'balanced') return 1.0;
      if (q === 'high') return Math.min(rawDpr, 1.35);
      if (q === 'ultra') return Math.min(rawDpr, 1.6);
      if (q === 'mythic') return Math.min(rawDpr, 1.85);
      return Math.min(rawDpr, 2.0);
    };

    const resizeSw = () => {
      const rect = container.getBoundingClientRect();
      const scale = getQualityScale(qualityRef.current);
      const baseW = Math.max(180, Math.floor(rect.width || canvas.clientWidth || 320));
      const baseH = Math.max(160, Math.floor(rect.height || canvas.clientHeight || 260));
      const w = Math.max(220, Math.floor(baseW * scale));
      const h = Math.max(180, Math.floor(baseH * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    let resizeRafId = 0;
    const scheduleResizeSw = () => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = 0;
        if (!cancelled) resizeSw();
      });
    };

    const observer = new ResizeObserver(scheduleResizeSw);
    observer.observe(container);
    resizeSw();

    let lastResizedQuality = qualityRef.current;

    const tickSw = (now: number) => {
      if (cancelled) return;
      if (lastResizedQuality !== qualityRef.current) {
        lastResizedQuality = qualityRef.current;
        resizeSw();
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      elapsed += dt;

      if (autoRotateRef.current && !dragRef.current.active) {
        yawRef.current += dt * 0.44;
      }

      sw.renderAvatarShowcase(
        ctx,
        canvas.width,
        canvas.height,
        avatarRef.current,
        yawRef.current,
        elapsed,
        actionRef.current,
        weaponLevelRef.current,
        qualityRef.current
      );

      rafId = requestAnimationFrame(tickSw);
    };

    rafId = requestAnimationFrame(tickSw);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      observer.disconnect();
      sw.dispose();
      if (swRendererRef.current === sw) {
        swRendererRef.current = null;
      }
    };
  }, [effectiveEngine]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = { active: true, lastX: e.clientX };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    dragRef.current.lastX = e.clientX;
    yawRef.current -= dx * 0.012;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current.active = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const qualityLabel = QUALITY_LABEL_MAP[quality] || quality;
  const engineLabel = effectiveEngine === 'webgl' ? `WebGL ${glVersionLabel}` : 'خفيف 2D';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#0D1422] select-none min-h-[160px] ${className}`}
    >
      <canvas
        key={`preview_${effectiveEngine}`}
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute inset-0 w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />
      <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded bg-[#080E1A]/80 border border-white/10 text-[10px] font-medium text-[#CBD5E1]">
        {engineLabel} · {qualityLabel}
      </div>
      {caption && (
        <div className="pointer-events-none absolute bottom-2.5 inset-x-2 flex justify-center">
          <span className="text-[11px] text-[#CBD5E1] bg-[#0B101D]/85 px-2.5 py-1 rounded border border-[#E6B85C]/25 text-center truncate max-w-full">
            {caption}
          </span>
        </div>
      )}
    </div>
  );
};
