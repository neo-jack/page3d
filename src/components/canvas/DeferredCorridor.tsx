import { Component, Suspense, lazy, useRef, type ComponentProps, type ReactNode } from 'react';
import type { Group } from 'three';
import SceneWarmup from './SceneWarmup';

const AboutRoom = lazy(() => import('./about/AboutRoom'));
const ignoreProgress = () => {};

class CorridorBoundary extends Component<{
  children: ReactNode;
  onError: (error: unknown) => void;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Prepare the hidden corridor after the entrance is usable. */
export default function DeferredCorridor({ ready, onReady, onError, ...props }: ComponentProps<typeof AboutRoom> & {
  ready: boolean;
  onReady: () => void;
  onError: (error: unknown) => void;
}) {
  const scope = useRef<Group>(null);
  return (
    <CorridorBoundary onError={onError}>
      <Suspense fallback={null}>
        <group ref={scope} visible={ready}>
          <AboutRoom {...props} />
          <SceneWarmup scope={scope} onReady={onReady} onProgress={ignoreProgress} onError={onError} />
        </group>
      </Suspense>
    </CorridorBoundary>
  );
}
