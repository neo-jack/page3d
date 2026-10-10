import { Component, Suspense, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createRoot, events, extend, type ReconcilerRoot, type RootStore } from '@react-three/fiber';
import { useContextBridge } from '@react-three/drei';
import * as THREE from 'three';
import { AudioContext } from '../../../context/AudioManager';

// Same namespace registration as R3F Canvas; constants are never instantiated.
extend(THREE as unknown as Parameters<typeof extend>[0]);

class SceneErrorBoundary extends Component<{ children: ReactNode; onError: (error: unknown) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

// Own the configure Promise: Canvas in R3F 9.7 calls it without a rejection handler.
export default function SceneCanvas({ children, onError }: { children: ReactNode; onError: (error: unknown) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null);
  const Bridge = useContextBridge(AudioContext);
  const content = useRef<ReactNode>(null);
  content.current = <Bridge><SceneErrorBoundary onError={onError}><Suspense fallback={null}>{children}</Suspense></SceneErrorBoundary></Bridge>;

  useLayoutEffect(() => {
    const host = hostRef.current!;
    // A fresh node per effect keeps StrictMode's delayed R3F cleanup off the new root.
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    host.appendChild(canvas);
    let disposed = false;
    let failed = false;
    let initializing = false;
    let store: RootStore | undefined;
    let root: ReconcilerRoot<HTMLCanvasElement> | undefined;
    const fail = (error: unknown) => {
      if (disposed || failed) return;
      failed = true;
      onError(error);
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      fail(new Error('WebGL context lost'));
    };
    canvas.addEventListener('webglcontextlost', contextLost);
    const resize = async () => {
      if (disposed || failed || initializing) return;
      const { width, height, top, left } = host.getBoundingClientRect();
      if (!width || !height) return;
      try {
        if (store) {
          store.getState().setDpr([1, 2]);
          store.getState().setSize(width, height, top, left);
          return;
        }
        initializing = true;
        root = createRoot(canvas);
        await root.configure({
          events,
          frameloop: 'never',
          camera: { position: [0, 0.2, 28], fov: 60, near: 0.1, far: 150 },
          dpr: [1, 2],
          gl: { antialias: true, alpha: false },
          size: { width, height, top, left },
          onCreated: (state) => state.events.connect?.(host),
        });
        if (disposed || failed) return;
        rootRef.current = root;
        store = root.render(content.current);
        const bounds = host.getBoundingClientRect();
        store.getState().setSize(bounds.width, bounds.height, bounds.top, bounds.left);
      } catch (error) {
        fail(error);
      } finally {
        initializing = false;
      }
    };
    const observer = new ResizeObserver(() => { void resize(); });
    observer.observe(host);
    void resize();
    return () => {
      disposed = true;
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      rootRef.current = null;
      root?.unmount();
      canvas.remove();
    };
  }, [onError]);

  useLayoutEffect(() => { rootRef.current?.render(content.current); });
  return <div ref={hostRef} className="relative h-full w-full overflow-hidden" style={{ cursor: 'auto' }} />;
}
