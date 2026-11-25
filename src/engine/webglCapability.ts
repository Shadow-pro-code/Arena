import type { ResolvedRenderEngine } from '../types/game';

export interface WebGLCapabilityReport {
  supported: boolean;
  version: 0 | 1 | 2;
  isSoftwareGl: boolean;
  rendererName: string;
  maxTextureSize: number;
  recommendedEngine: ResolvedRenderEngine;
}

const SOFTWARE_GL_REGEX = /SwiftShader|llvmpipe|softpipe|Software|Microsoft Basic Render|Google SwiftShader/i;

let cachedReport: WebGLCapabilityReport | null = null;

export function detectWebGLCapability(forceRefresh = false): WebGLCapabilityReport {
  if (cachedReport && !forceRefresh) return cachedReport;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    cachedReport = {
      supported: false,
      version: 0,
      isSoftwareGl: false,
      rendererName: 'headless',
      maxTextureSize: 0,
      recommendedEngine: 'canvas2d',
    };
    return cachedReport;
  }

  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement('canvas');
    let version: 0 | 1 | 2 = 0;
    let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;

    try {
      const gl2 = canvas.getContext('webgl2', {
        failIfMajorPerformanceCaveat: false,
        antialias: false,
        powerPreference: 'high-performance',
      }) as WebGL2RenderingContext | null;
      if (gl2) {
        gl = gl2;
        version = 2;
      }
    } catch {
      // Fall back to WebGL 1 probe
    }

    if (!gl) {
      try {
        const gl1 =
          (canvas.getContext('webgl', {
            failIfMajorPerformanceCaveat: false,
            antialias: false,
          }) as WebGLRenderingContext | null) ||
          (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
        if (gl1) {
          gl = gl1;
          version = 1;
        }
      } catch {
        // Ignore
      }
    }

    if (!gl || version === 0) {
      cachedReport = {
        supported: false,
        version: 0,
        isSoftwareGl: false,
        rendererName: 'unavailable',
        maxTextureSize: 0,
        recommendedEngine: 'canvas2d',
      };
      return cachedReport;
    }

    let rendererName = 'WebGL GPU';
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        const unmasked = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
        if (typeof unmasked === 'string' && unmasked.trim()) {
          rendererName = unmasked.trim();
        }
      } else {
        const basic = gl.getParameter(gl.RENDERER);
        if (typeof basic === 'string' && basic.trim()) {
          rendererName = basic.trim();
        }
      }
    } catch {
      // Privacy browsers may block debug extension
    }

    let maxTextureSize = 2048;
    try {
      const rawMax = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (typeof rawMax === 'number' && Number.isFinite(rawMax) && rawMax > 0) {
        maxTextureSize = rawMax;
      }
    } catch {
      // Ignore
    }

    const isSoftwareGl = SOFTWARE_GL_REGEX.test(rendererName);
    try {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // Ignore cleanup
    }

    cachedReport = {
      supported: true,
      version,
      isSoftwareGl,
      rendererName,
      maxTextureSize,
      recommendedEngine: isSoftwareGl ? 'canvas2d' : 'webgl',
    };
    return cachedReport;
  } catch {
    cachedReport = {
      supported: false,
      version: 0,
      isSoftwareGl: false,
      rendererName: 'unavailable',
      maxTextureSize: 0,
      recommendedEngine: 'canvas2d',
    };
    return cachedReport;
  } finally {
    canvas = null;
  }
}

export function resolveRenderEngine(mode: 'auto' | 'canvas2d' | 'webgl'): ResolvedRenderEngine {
  const cap = detectWebGLCapability();
  if (mode === 'canvas2d') return 'canvas2d';
  if (mode === 'webgl') return cap.supported ? 'webgl' : 'canvas2d';
  return cap.recommendedEngine;
}
