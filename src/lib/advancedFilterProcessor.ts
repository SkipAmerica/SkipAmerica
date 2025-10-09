// import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type FilterPreset = 
  | 'none'
  | 'cool'
  | 'hdclear';

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  clarity: number;
  smoothing: number;
  // eyeEnhance: number;
  // teethWhiten: number;
}

const FILTER_PRESETS: Record<FilterPreset, FilterSettings> = {
  none: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    clarity: 0,
    smoothing: 0,
    // eyeEnhance: 0,
    // teethWhiten: 0,
  },
  cool: {
    brightness: 0.08,
    contrast: 0.12,
    saturation: 0.1,
    warmth: -0.12,
    clarity: 0.15,
    smoothing: 0.2,
    // eyeEnhance: 0,
    // teethWhiten: 0,
  },
  hdclear: {
    brightness: 0.05,
    contrast: 0.25,
    saturation: 0.15,
    warmth: 0,
    clarity: 0.4,
    smoothing: 0.05,
    // eyeEnhance: 0,
    // teethWhiten: 0,
  },
};

export class AdvancedFilterProcessor {
  // private faceLandmarker: FaceLandmarker | null = null;
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
  // private lastLandmarks: { x: number; y: number }[] | null = null;
  // private eyeEnhanceEnabled = true;
  // private teethWhitenEnabled = true;
  // private frameCount = 0;
  
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

    // MediaPipe face detection disabled
    /*
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
    */

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
      uniform float u_eyeEnhance;
      uniform float u_teethWhiten;
      uniform vec2 u_leftEyeCenter;
      uniform vec2 u_rightEyeCenter;
      uniform vec2 u_mouthCenter;
      uniform float u_eyeRadius;
      uniform float u_mouthWidth;
      uniform float u_mouthHeight;
      
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
        
        // Eye enhancement (if landmarks detected)
        if (u_eyeEnhance > 0.0 && u_eyeRadius > 0.0) {
          vec2 pixelCoord = v_texCoord * u_resolution;
          
          // Check distance to left eye
          float distLeft = length(pixelCoord - u_leftEyeCenter);
          float leftMask = smoothstep(u_eyeRadius * 1.2, u_eyeRadius * 0.5, distLeft);
          
          // Check distance to right eye
          float distRight = length(pixelCoord - u_rightEyeCenter);
          float rightMask = smoothstep(u_eyeRadius * 1.2, u_eyeRadius * 0.5, distRight);
          
          float eyeMask = max(leftMask, rightMask);
          
          if (eyeMask > 0.0) {
            // Brighten eyes
            color.rgb += vec3(0.15, 0.15, 0.18) * eyeMask * u_eyeEnhance;
            // Add contrast to iris
            color.rgb = mix(color.rgb, (color.rgb - 0.5) * 1.3 + 0.5, eyeMask * u_eyeEnhance * 0.4);
          }
        }
        
        // Teeth whitening (if landmarks detected)
        if (u_teethWhiten > 0.0 && u_mouthWidth > 0.0) {
          vec2 pixelCoord = v_texCoord * u_resolution;
          vec2 mouthOffset = pixelCoord - u_mouthCenter;
          
          // Elliptical mask for mouth region
          float mouthDist = length(mouthOffset / vec2(u_mouthWidth, u_mouthHeight));
          float mouthMask = smoothstep(1.0, 0.5, mouthDist);
          
          if (mouthMask > 0.0) {
            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            // Only whiten bright pixels (teeth, not dark mouth interior)
            float brightnessMask = smoothstep(0.35, 0.65, luminance);
            float finalMask = mouthMask * brightnessMask;
            
            // Whiten teeth
            color.rgb += vec3(0.08, 0.08, 0.12) * finalMask * u_teethWhiten;
            // Reduce yellowness
            color.b += 0.05 * finalMask * u_teethWhiten;
          }
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
        // Face landmarks detection disabled
        /*
        // Detect face landmarks (throttled - run every 2 frames for performance)
        this.frameCount++;
        if (this.faceLandmarker && this.frameCount % 2 === 0) {
          const results = this.faceLandmarker.detectForVideo(
            this.sourceVideo,
            performance.now()
          );
          
          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            // Convert normalized landmarks to pixel coordinates
            this.lastLandmarks = results.faceLandmarks[0].map(lm => ({
              x: lm.x * this.canvas.width,
              y: lm.y * this.canvas.height
            }));
          }
        }
        */

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
    if (settings.smoothing === 0 && settings.brightness === 0 && settings.warmth === 0 && settings.clarity === 0) {
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
    this.gl.uniform1f(sharpenLoc, settings.clarity); // Using clarity as sharpen

    // Eye/teeth enhancement disabled
    /*
    // Calculate and pass landmark-based parameters for eye/teeth enhancement
    const params = this.calculateLandmarkParams();
    
    if (params && (settings.eyeEnhance > 0 || settings.teethWhiten > 0)) {
      // Pass eye enhancement data
      const leftEyeLoc = this.gl.getUniformLocation(this.program, 'u_leftEyeCenter');
      const rightEyeLoc = this.gl.getUniformLocation(this.program, 'u_rightEyeCenter');
      const eyeRadiusLoc = this.gl.getUniformLocation(this.program, 'u_eyeRadius');
      
      this.gl.uniform2f(leftEyeLoc, params.leftEyeCenter[0], params.leftEyeCenter[1]);
      this.gl.uniform2f(rightEyeLoc, params.rightEyeCenter[0], params.rightEyeCenter[1]);
      this.gl.uniform1f(eyeRadiusLoc, params.eyeRadius);
      
      // Pass teeth whitening data
      const mouthCenterLoc = this.gl.getUniformLocation(this.program, 'u_mouthCenter');
      const mouthWidthLoc = this.gl.getUniformLocation(this.program, 'u_mouthWidth');
      const mouthHeightLoc = this.gl.getUniformLocation(this.program, 'u_mouthHeight');
      
      this.gl.uniform2f(mouthCenterLoc, params.mouthCenter[0], params.mouthCenter[1]);
      this.gl.uniform1f(mouthWidthLoc, params.mouthWidth);
      this.gl.uniform1f(mouthHeightLoc, params.mouthHeight);
    } else {
      // No landmarks or effects disabled - set radius/width to 0 to skip effects
      const eyeRadiusLoc = this.gl.getUniformLocation(this.program, 'u_eyeRadius');
      const mouthWidthLoc = this.gl.getUniformLocation(this.program, 'u_mouthWidth');
      this.gl.uniform1f(eyeRadiusLoc, 0);
      this.gl.uniform1f(mouthWidthLoc, 0);
    }

    // Pass effect intensity (respecting toggles)
    const eyeEnhanceLoc = this.gl.getUniformLocation(this.program, 'u_eyeEnhance');
    const teethWhitenLoc = this.gl.getUniformLocation(this.program, 'u_teethWhiten');
    this.gl.uniform1f(eyeEnhanceLoc, this.eyeEnhanceEnabled ? settings.eyeEnhance : 0);
    this.gl.uniform1f(teethWhitenLoc, this.teethWhitenEnabled ? settings.teethWhiten : 0);
    */

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

  // Eye/teeth enhancement methods disabled
  /*
  setEyeEnhance(enabled: boolean): void {
    this.eyeEnhanceEnabled = enabled;
    console.log('[AdvancedFilter] Eye enhance:', enabled);
  }

  setTeethWhiten(enabled: boolean): void {
    this.teethWhitenEnabled = enabled;
    console.log('[AdvancedFilter] Teeth whiten:', enabled);
  }

  private calculateLandmarkParams(): {
    leftEyeCenter: [number, number];
    rightEyeCenter: [number, number];
    mouthCenter: [number, number];
    eyeRadius: number;
    mouthWidth: number;
    mouthHeight: number;
  } | null {
    if (!this.lastLandmarks || this.lastLandmarks.length < 478) {
      return null;
    }

    const lm = this.lastLandmarks;

    // Left eye center (average of landmarks 33, 133, 160, 144)
    const leftEye = {
      x: (lm[33].x + lm[133].x + lm[160].x + lm[144].x) / 4,
      y: (lm[33].y + lm[133].y + lm[160].y + lm[144].y) / 4
    };

    // Right eye center (average of landmarks 362, 263, 387, 373)
    const rightEye = {
      x: (lm[362].x + lm[263].x + lm[387].x + lm[373].x) / 4,
      y: (lm[362].y + lm[263].y + lm[387].y + lm[373].y) / 4
    };

    // Eye radius (distance between outer and inner eye corners)
    const leftEyeWidth = Math.abs(lm[33].x - lm[133].x);
    const rightEyeWidth = Math.abs(lm[362].x - lm[263].x);
    const eyeRadius = (leftEyeWidth + rightEyeWidth) / 4;

    // Mouth center (average of upper and lower lip centers)
    const mouthCenter = {
      x: (lm[61].x + lm[291].x + lm[146].x + lm[375].x) / 4,
      y: (lm[61].y + lm[291].y + lm[146].y + lm[375].y) / 4
    };

    // Mouth dimensions
    const mouthWidth = Math.abs(lm[61].x - lm[291].x);
    const mouthHeight = Math.abs(lm[0].y - lm[17].y) * 0.3; // 30% of vertical distance

    return {
      leftEyeCenter: [leftEye.x, leftEye.y],
      rightEyeCenter: [rightEye.x, rightEye.y],
      mouthCenter: [mouthCenter.x, mouthCenter.y],
      eyeRadius,
      mouthWidth: mouthWidth / 2, // Half-width for ellipse
      mouthHeight: mouthHeight / 2
    };
  }
  */

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
    
    // MediaPipe cleanup disabled
    /*
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    */

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
