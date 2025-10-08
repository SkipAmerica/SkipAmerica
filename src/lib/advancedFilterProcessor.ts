import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type FilterPreset = 'none' | 'natural' | 'glam' | 'bright' | 'cool' | 'radiant';

interface FilterSettings {
  smoothing: number;
  brightness: number;
  warmth: number;
  eyeEnhance: number;
  sharpen: number;
}

const FILTER_PRESETS: Record<FilterPreset, FilterSettings> = {
  none: { smoothing: 0, brightness: 0, warmth: 0, eyeEnhance: 0, sharpen: 0 },
  natural: { smoothing: 0.3, brightness: 0.05, warmth: 0.1, eyeEnhance: 0, sharpen: 0.1 },
  glam: { smoothing: 0.5, brightness: 0.1, warmth: 0.15, eyeEnhance: 0.15, sharpen: 0.2 },
  bright: { smoothing: 0.4, brightness: 0.2, warmth: 0.2, eyeEnhance: 0.1, sharpen: 0.15 },
  cool: { smoothing: 0.3, brightness: 0.05, warmth: -0.15, eyeEnhance: 0, sharpen: 0.25 },
  radiant: { smoothing: 0.6, brightness: 0.15, warmth: 0.25, eyeEnhance: 0.2, sharpen: 0.2 },
};

export class AdvancedFilterProcessor {
  private faceLandmarker: FaceLandmarker | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private glCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null;
  private sourceVideo: HTMLVideoElement;
  private outputStream: MediaStream | null = null;
  private animationId: number | null = null;
  private currentFilter: FilterPreset = 'none';
  private isInitialized = false;
  private program: WebGLProgram | null = null;
  private textureCache: Map<string, WebGLTexture> = new Map();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.glCanvas = document.createElement('canvas');
    this.gl = this.glCanvas.getContext('webgl', { 
      premultipliedAlpha: false,
      preserveDrawingBuffer: true 
    });
    this.sourceVideo = document.createElement('video');
    this.sourceVideo.autoplay = true;
    this.sourceVideo.playsInline = true;
    this.sourceVideo.muted = true;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[AdvancedFilter] Initializing MediaPipe...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      if (this.gl) {
        this.initWebGL();
      }

      this.isInitialized = true;
      console.log('[AdvancedFilter] Initialized successfully');
    } catch (error) {
      console.error('[AdvancedFilter] Initialization failed:', error);
      throw error;
    }
  }

  private initWebGL(): void {
    if (!this.gl) return;

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_smoothing;
      uniform float u_brightness;
      uniform float u_warmth;
      uniform float u_sharpen;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        
        // Brightness adjustment
        color.rgb += u_brightness;
        
        // Warmth adjustment (add warmth to reds/yellows, reduce blues)
        color.r += u_warmth * 0.1;
        color.g += u_warmth * 0.05;
        color.b -= u_warmth * 0.05;
        
        // Simple smoothing (bilateral approximation)
        if (u_smoothing > 0.0) {
          vec2 texelSize = vec2(1.0) / u_resolution;
          vec4 sum = vec4(0.0);
          float weightSum = 0.0;
          
          for (int x = -2; x <= 2; x++) {
            for (int y = -2; y <= 2; y++) {
              vec2 offset = vec2(float(x), float(y)) * texelSize;
              vec4 sample = texture2D(u_image, v_texCoord + offset);
              float weight = 1.0 - (length(offset) * u_smoothing);
              sum += sample * weight;
              weightSum += weight;
            }
          }
          color = mix(color, sum / weightSum, u_smoothing);
        }
        
        // Sharpen
        if (u_sharpen > 0.0) {
          vec2 texelSize = vec2(1.0) / u_resolution;
          vec4 sharp = color * (1.0 + 4.0 * u_sharpen);
          sharp -= texture2D(u_image, v_texCoord + vec2(texelSize.x, 0.0)) * u_sharpen;
          sharp -= texture2D(u_image, v_texCoord - vec2(texelSize.x, 0.0)) * u_sharpen;
          sharp -= texture2D(u_image, v_texCoord + vec2(0.0, texelSize.y)) * u_sharpen;
          sharp -= texture2D(u_image, v_texCoord - vec2(0.0, texelSize.y)) * u_sharpen;
          color = sharp;
        }
        
        gl_FragColor = clamp(color, 0.0, 1.0);
      }
    `;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      console.error('[AdvancedFilter] Failed to compile shaders');
      return;
    }

    this.program = this.gl.createProgram()!;
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('[AdvancedFilter] Program link error:', this.gl.getProgramInfoLog(this.program));
      return;
    }

    // Set up vertex buffer
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
      this.gl.STATIC_DRAW
    );

    console.log('[AdvancedFilter] WebGL initialized');
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('[AdvancedFilter] Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  async start(inputStream: MediaStream): Promise<MediaStream> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.sourceVideo.srcObject = inputStream;
    await this.sourceVideo.play();

    const track = inputStream.getVideoTracks()[0];
    const settings = track.getSettings();
    
    this.canvas.width = settings.width || 640;
    this.canvas.height = settings.height || 480;
    this.glCanvas.width = this.canvas.width;
    this.glCanvas.height = this.canvas.height;

    this.processFrame();

    this.outputStream = this.glCanvas.captureStream(30);
    
    // Copy audio tracks
    inputStream.getAudioTracks().forEach(audioTrack => {
      this.outputStream?.addTrack(audioTrack);
    });

    console.log('[AdvancedFilter] Started processing');
    return this.outputStream;
  }

  private processFrame = (): void => {
    if (!this.sourceVideo.paused && !this.sourceVideo.ended) {
      try {
        // Draw current frame to 2D canvas
        if (this.ctx) {
          this.ctx.drawImage(this.sourceVideo, 0, 0, this.canvas.width, this.canvas.height);
        }

        // Apply WebGL filters
        this.applyWebGLFilters();

        this.animationId = requestAnimationFrame(this.processFrame);
      } catch (error) {
        console.error('[AdvancedFilter] Frame processing error:', error);
      }
    }
  };

  private applyWebGLFilters(): void {
    if (!this.gl || !this.program || !this.ctx) return;

    const settings = FILTER_PRESETS[this.currentFilter];
    if (settings.smoothing === 0 && settings.brightness === 0 && settings.warmth === 0 && settings.sharpen === 0) {
      // No filter, just copy canvas to glCanvas
      const glCtx = this.glCanvas.getContext('2d');
      if (glCtx) {
        glCtx.drawImage(this.canvas, 0, 0);
      }
      return;
    }

    this.gl.useProgram(this.program);

    // Create/update texture
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.canvas);

    // Set uniforms
    const resolutionLoc = this.gl.getUniformLocation(this.program, 'u_resolution');
    const smoothingLoc = this.gl.getUniformLocation(this.program, 'u_smoothing');
    const brightnessLoc = this.gl.getUniformLocation(this.program, 'u_brightness');
    const warmthLoc = this.gl.getUniformLocation(this.program, 'u_warmth');
    const sharpenLoc = this.gl.getUniformLocation(this.program, 'u_sharpen');

    this.gl.uniform2f(resolutionLoc, this.glCanvas.width, this.glCanvas.height);
    this.gl.uniform1f(smoothingLoc, settings.smoothing);
    this.gl.uniform1f(brightnessLoc, settings.brightness);
    this.gl.uniform1f(warmthLoc, settings.warmth);
    this.gl.uniform1f(sharpenLoc, settings.sharpen);

    // Set up vertex attributes
    const positionLoc = this.gl.getAttribLocation(this.program, 'a_position');
    const texCoordLoc = this.gl.getAttribLocation(this.program, 'a_texCoord');

    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.enableVertexAttribArray(texCoordLoc);

    // Draw
    this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Cleanup
    this.gl.deleteTexture(texture);
  }

  setFilter(filter: FilterPreset): void {
    console.log('[AdvancedFilter] Setting filter:', filter);
    this.currentFilter = filter;
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.sourceVideo.srcObject) {
      this.sourceVideo.srcObject = null;
    }

    if (this.outputStream) {
      this.outputStream.getTracks().forEach(track => track.stop());
      this.outputStream = null;
    }

    console.log('[AdvancedFilter] Stopped');
  }

  dispose(): void {
    this.stop();
    
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }

    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }

    this.textureCache.clear();
    this.isInitialized = false;
    console.log('[AdvancedFilter] Disposed');
  }
}

// Singleton instance
let filterProcessor: AdvancedFilterProcessor | null = null;

export const getFilterProcessor = (): AdvancedFilterProcessor => {
  if (!filterProcessor) {
    filterProcessor = new AdvancedFilterProcessor();
  }
  return filterProcessor;
};

export const disposeFilterProcessor = (): void => {
  if (filterProcessor) {
    filterProcessor.dispose();
    filterProcessor = null;
  }
};
