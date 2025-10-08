import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type FilterPreset = 'none' | 'natural' | 'glam' | 'bright' | 'cool' | 'radiant' | 'porcelain' | 'softfocus' | 'hdclear';

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
  porcelain: { smoothing: 0.75, brightness: 0.08, warmth: 0.05, eyeEnhance: 0, sharpen: 0 },
  softfocus: { smoothing: 0.65, brightness: 0.06, warmth: 0.12, eyeEnhance: 0, sharpen: 0.05 },
  hdclear: { smoothing: 0.2, brightness: 0.02, warmth: 0.03, eyeEnhance: 0, sharpen: 0.3 },
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
  
  // WebGL buffers and locations
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private positionLocation: number = -1;
  private texCoordLocation: number = -1;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { 
      willReadFrequently: false,
      alpha: true
    });
    this.glCanvas = document.createElement('canvas');
    this.gl = this.glCanvas.getContext('webgl', { 
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.sourceVideo = document.createElement('video');
    this.sourceVideo.autoplay = true;
    this.sourceVideo.playsInline = true;
    this.sourceVideo.muted = true;

    // Handle WebGL context loss
    this.glCanvas.addEventListener('webglcontextlost', (e) => {
      console.error('[AdvancedFilter] WebGL context lost');
      e.preventDefault();
    });
    this.glCanvas.addEventListener('webglcontextrestored', () => {
      console.log('[AdvancedFilter] WebGL context restored, reinitializing');
      this.initWebGL();
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[AdvancedFilter] Initializing MediaPipe...');
      
      // Add timeout for loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MediaPipe loading timeout (10s)')), 10000)
      );

      const loadPromise = FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
      ).then(vision => 
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
      );

      this.faceLandmarker = await Promise.race([loadPromise, timeoutPromise]) as FaceLandmarker;
      console.log('[AdvancedFilter] MediaPipe loaded successfully');
    } catch (error) {
      // Detailed error logging
      console.error('[AdvancedFilter] MediaPipe initialization failed:', {
        error,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      console.warn('[AdvancedFilter] Continuing with WebGL-only filters (no face detection)');
      // Continue without MediaPipe - WebGL filters will still work
    }

    // Initialize WebGL (works independently of MediaPipe)
    if (this.gl) {
      try {
        this.initWebGL();
        console.log('[AdvancedFilter] WebGL initialized');
      } catch (glError) {
        console.error('[AdvancedFilter] WebGL initialization failed:', glError);
        throw new Error('WebGL initialization failed - filters unavailable');
      }
    }

    this.isInitialized = true;
    console.log('[AdvancedFilter] Initialized successfully');
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
        
        // Optimized smoothing (reduced kernel size for performance)
        if (u_smoothing > 0.0) {
          vec2 texelSize = vec2(1.0) / u_resolution;
          vec4 sum = vec4(0.0);
          float weightSum = 0.0;
          
          // Reduced from 5x5 to 3x3 kernel for better performance
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              vec2 offset = vec2(float(x), float(y)) * texelSize;
              vec4 sample = texture2D(u_image, v_texCoord + offset);
              float weight = 1.0 - (length(offset) * u_smoothing);
              sum += sample * weight;
              weightSum += weight;
            }
          }
          color = mix(color, sum / weightSum, u_smoothing * 0.8);
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

    // Get attribute/uniform locations
    this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');

    // Set up position buffer
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    // Set up texture coordinate buffer
    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
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
    
    // Use actual stream resolution (no downscaling)
    const width = settings.width || 1280;
    const height = settings.height || 720;
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.glCanvas.width = width;
    this.glCanvas.height = height;

    console.log('[AdvancedFilter] Processing at resolution:', width, 'x', height);

    this.processFrame();

    // Capture from WebGL canvas if available, fallback to 2D canvas
    if (this.gl && this.program) {
      this.outputStream = this.glCanvas.captureStream(60);
      const videoTrack = this.outputStream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState === 'ended') {
        console.warn('[AdvancedFilter] WebGL capture failed, using 2D canvas fallback');
        this.outputStream = this.canvas.captureStream(30);
      }
    } else {
      console.warn('[AdvancedFilter] WebGL not available, using 2D canvas');
      this.outputStream = this.canvas.captureStream(30);
    }
    
    // Copy audio tracks
    inputStream.getAudioTracks().forEach(audioTrack => {
      this.outputStream?.addTrack(audioTrack);
    });

    console.log('[AdvancedFilter] Started processing with', this.outputStream.getVideoTracks()[0]?.label);
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

    // Use the shader program
    this.gl.useProgram(this.program);

    // Set viewport and clear
    this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Create and bind texture
    const texture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.canvas);

    // Set sampler uniform to texture unit 0
    const imageLoc = this.gl.getUniformLocation(this.program, 'u_image');
    this.gl.uniform1i(imageLoc, 0);

    // Set filter uniforms
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

    // Bind and set up position buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Bind and set up texture coordinate buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.enableVertexAttribArray(this.texCoordLocation);
    this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Draw the quad
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
