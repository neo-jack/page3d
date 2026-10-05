import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { RefObject } from 'react';
import * as THREE from 'three';

interface SceneWarmupProps {
  scope?: RefObject<THREE.Group | null>;
  onReady: () => void;
  onProgress: (progress: number) => void;
  onError: (error: unknown) => void;
}

type TextMesh = THREE.Mesh & {
  sync: () => void;
  textRenderInfo: { sdfTexture: THREE.Texture } | null;
};

function isTextMesh(object: THREE.Object3D): object is TextMesh {
  return 'sync' in object && 'textRenderInfo' in object;
}

/** Runs after its Suspense boundary resolves; scope isolates background preparation. */
export default function SceneWarmup({ scope, onReady, onProgress, onError }: SceneWarmupProps) {
  const { gl, scene: fullScene, camera } = useThree();

  useEffect(() => {
    const scene = scope?.current ?? fullScene;
    let cancelled = false;
    let frameId = 0;
    let taskId: ReturnType<typeof setTimeout> | undefined;
    let fallbackId: ReturnType<typeof setTimeout> | undefined;
    let resumeFrame: (() => void) | undefined;
    const nextFrame = () => new Promise<void>((resolve) => {
      const finish = () => {
        cancelAnimationFrame(frameId);
        clearTimeout(taskId);
        clearTimeout(fallbackId);
        resumeFrame = undefined;
        resolve();
      };
      resumeFrame = finish;
      // Occluded windows can throttle rAF to 1 Hz even while visibility is "visible".
      // Keep yielding, but do not make each upload wait an entire throttled frame.
      fallbackId = setTimeout(finish, 50);
      frameId = requestAnimationFrame(() => {
        // rAF promise continuations run before paint. Defer GPU work to a new task
        // so the browser can submit the loading animation frame first.
        taskId = setTimeout(finish, 0);
      });
    });

    // GPU completion is independent of display refresh. A new task lets the
    // command queue progress without paying a full animation frame per fence.
    const nextTask = () => new Promise<void>((resolve) => {
      resumeFrame = resolve;
      taskId = setTimeout(() => {
        resumeFrame = undefined;
        resolve();
      }, 0);
    });

    const settleGpu = async () => {
      const context = gl.getContext();
      if (!(context instanceof WebGL2RenderingContext)) {
        await nextTask();
        return;
      }
      const fence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!fence) throw new Error('Unable to schedule scene preparation');
      context.flush();
      try {
        do {
          await nextTask();
          if (cancelled) return;
          const status = context.clientWaitSync(fence, 0, 0);
          if (status === context.WAIT_FAILED || context.isContextLost()) throw new Error('GPU preparation failed');
          if (status !== context.TIMEOUT_EXPIRED) return;
        } while (!cancelled);
      } finally {
        context.deleteSync(fence);
      }
    };

    const prepare = async () => {
      // Font fetching can finish before Troika generates the text geometry/atlas.
      let stableFrames = 0;
      let previousTextCount = -1;
      while (!cancelled && stableFrames < 2) {
        await nextFrame();
        if (cancelled) return;
        let textCount = 0;
        let readyTextCount = 0;
        scene.traverse((object) => {
          if (!isTextMesh(object)) return;
          textCount += 1;
          object.sync();
          if (object.textRenderInfo) readyTextCount += 1;
        });
        onProgress(0.25 * (textCount ? readyTextCount / textCount : 1));
        stableFrames = readyTextCount === textCount && textCount === previousTextCount ? stableFrames + 1 : 0;
        previousTextCount = textCount;
      }
      if (cancelled) return;

      const textures = new Set<THREE.Texture>();
      const collect = (value: unknown) => {
        if (value instanceof THREE.Texture && value.image) textures.add(value);
      };
      scene.traverse((object) => {
        if (isTextMesh(object)) collect(object.textRenderInfo?.sdfTexture);
        const material = (object as THREE.Mesh).material;
        if (!material) return;
        for (const entry of Array.isArray(material) ? material : [material]) {
          Object.values(entry).forEach(collect);
          const uniforms = (entry as THREE.ShaderMaterial).uniforms;
          if (uniforms) Object.values(uniforms).forEach((uniform) => collect(uniform.value));
        }
      });

      // Cloned textures share an image. Decode/orient it once per upload variant,
      // then release the bitmap before preparing the next image (bounded memory).
      const uploadGroups = new Map<unknown, Map<string, THREE.Texture[]>>();
      for (const texture of textures) {
        let variants = uploadGroups.get(texture.image);
        if (!variants) uploadGroups.set(texture.image, variants = new Map());
        const key = `${texture.flipY}:${texture.premultiplyAlpha}`;
        const group = variants.get(key) ?? [];
        group.push(texture);
        variants.set(key, group);
      }
      let uploaded = 0;
      for (const variants of uploadGroups.values()) {
        const firstTexture = variants.values().next().value![0];
        const image = firstTexture.image as { decode?: () => Promise<void> };
        if (image.decode) await image.decode();
        if (cancelled) return;
        for (const group of variants.values()) {
          const texture = group[0];
          // Prepare pixel orientation outside the synchronous WebGL upload. Keep the
          // original image for CPU alpha picking, shared clones and context restoration.
          const sourceImage = texture.image;
          let bitmap: ImageBitmap | undefined;
          if (sourceImage instanceof HTMLImageElement && typeof createImageBitmap === 'function') {
            bitmap = await createImageBitmap(sourceImage, {
              imageOrientation: texture.flipY ? 'flipY' : 'none',
              premultiplyAlpha: texture.premultiplyAlpha ? 'premultiply' : 'none',
              colorSpaceConversion: 'none',
            });
          }
          try {
            if (cancelled) return;
            for (const entry of group) {
              try {
                if (bitmap) entry.image = bitmap;
                gl.initTexture(entry);
              } finally {
                entry.image = sourceImage;
              }
              uploaded += 1;
              onProgress(0.25 + 0.5 * uploaded / textures.size);
              await settleGpu();
              if (cancelled) return;
            }
          } finally {
            bitmap?.close();
          }
        }
      }

      // compileAsync gathers programs synchronously; restore visibility before yielding.
      const hidden: THREE.Object3D[] = [];
      scene.traverse((object) => {
        if (!object.visible) { hidden.push(object); object.visible = true; }
      });
      let compilation: Promise<unknown>;
      try {
        compilation = gl.compileAsync(fullScene, camera);
      } finally {
        hidden.forEach((object) => { object.visible = false; });
      }
      await compilation;
      if (cancelled) return;
      onProgress(0.85);

      // Warm real draw calls: geometry and Troika uniforms initialize on render.
      // Never move the live camera or expose hidden objects in a visible frame.
      const target = new THREE.WebGLRenderTarget(128, 128);
      const warmCamera = camera.clone();
      try {
        // Culling is disabled below, so one pass initializes every object;
        // a second camera position repeats the same geometry/program work.
        await nextFrame();
        if (cancelled) return;
        warmCamera.updateMatrixWorld();
        const previousTarget = gl.getRenderTarget();
        const previousFace = gl.getActiveCubeFace();
        const previousMip = gl.getActiveMipmapLevel();
        const flags = new Map<THREE.Object3D, [boolean, boolean]>();
        try {
          scene.traverse((object) => {
            flags.set(object, [object.visible, object.frustumCulled]);
            object.visible = true;
            object.frustumCulled = false;
          });
          gl.setRenderTarget(target);
          // Spread first-use geometry/shader work across frames, not one full-scene draw.
          const drawables: THREE.Object3D[] = [];
          fullScene.traverse((object) => {
            const drawable = object as THREE.Mesh & THREE.Line & THREE.Points & THREE.Sprite;
            if (drawable.isMesh || drawable.isLine || drawable.isPoints || drawable.isSprite) drawables.push(object);
          });
          const scopedObjects = new Set<THREE.Object3D>();
          scene.traverse((object) => scopedObjects.add(object));
          const warmDrawables = drawables.filter((object) => scopedObjects.has(object));
          const masks = drawables.map((object) => object.layers.mask);
          const cameraMask = warmCamera.layers.mask;
          try {
            // Keep normal light layers enabled so warmed shader variants match live frames.
            warmCamera.layers.enable(31);
            for (let start = 0; start < warmDrawables.length; start += 32) {
              const batch = new Set(warmDrawables.slice(start, start + 32));
              drawables.forEach((object) => { object.layers.mask = batch.has(object) ? (1 << 31) : 0; });
              gl.render(fullScene, warmCamera);
              // Restore the shared scene/target before yielding to browser work.
              drawables.forEach((object, index) => { object.layers.mask = masks[index]; });
              flags.forEach(([visible, frustumCulled], object) => {
                object.visible = visible;
                object.frustumCulled = frustumCulled;
              });
              gl.setRenderTarget(previousTarget, previousFace, previousMip);
              await settleGpu();
              if (cancelled) return;
              onProgress(0.85 + 0.14 * Math.min(1, (start + 32) / warmDrawables.length));
              flags.forEach((_flags, object) => { object.visible = true; object.frustumCulled = false; });
              gl.setRenderTarget(target);
            }
          } finally {
            drawables.forEach((object, index) => { object.layers.mask = masks[index]; });
            warmCamera.layers.mask = cameraMask;
          }
        } finally {
          flags.forEach(([visible, frustumCulled], object) => {
            object.visible = visible;
            object.frustumCulled = frustumCulled;
          });
          gl.setRenderTarget(previousTarget, previousFace, previousMip);
        }
      } finally {
        target.dispose();
      }
      // Allow a normal entrance frame to paint before the paper starts opening.
      await nextFrame();
      if (cancelled) return;
      if (gl.getContext().isContextLost()) throw new Error('WebGL context lost during startup');
      onProgress(1);
      onReady();
    };

    void prepare().catch((error: unknown) => { if (!cancelled) onError(error); });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      clearTimeout(taskId);
      clearTimeout(fallbackId);
      resumeFrame?.();
    };
  }, [camera, gl, fullScene, scope, onReady, onProgress, onError]);

  return null;
}
