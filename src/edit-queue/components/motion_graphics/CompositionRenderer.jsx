import React, { useState, useEffect } from 'react';
import { AbsoluteFill } from 'remotion';
import { loadComposition } from '../../utils/motionGraphicRegistry';
import { useMeasuredBackdropStyle } from './backdropMeasure';

// Isolates a runtime error inside one motion graphic so a single broken
// composition can never crash the whole Remotion player. Resets itself when
// the graphic (resetKey) changes.
class GraphicErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error('MotionGraphic runtime error:', error);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}

/**
 * Renders a library motion graphic referenced by `templateId`, passing the
 * overlay's editable `props` straight through to the composition. Wraps it in
 * the same position / scale / rotation / opacity container used by other
 * overlays so the standard transform controls apply.
 *
 * `backdrop` optionally draws a card behind the (transparent) graphic:
 * background and border are independent toggles, each with its own color.
 */
export const CompositionRenderer = ({ templateId, props, position, opacity, backdrop }) => {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);
  const outerRef = React.useRef(null);
  const innerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  useEffect(() => {
    let alive = true;
    setComponent(null);
    setError(null);
    loadComposition(templateId)
      .then((C) => { if (alive) setComponent(() => C); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [templateId]);

  const isAbsolute = position?.x !== undefined || position?.y !== undefined;
  const parsedScale = parseFloat(position?.scale);
  const finalScale = !isNaN(parsedScale) ? parsedScale / 100 : 1;
  const finalRotation = position?.rotation || 0;
  const rawOpacity = opacity !== undefined ? opacity : 100;
  const finalOpacity = rawOpacity > 1 ? rawOpacity / 100 : rawOpacity;

  // Optional backdrop card behind the graphic (shared with the other
  // motion-graphic renderers — see backdropMeasure.js).
  const backdropStyle = useMeasuredBackdropStyle({
    backdrop,
    ready: !!Component,
    outerRef,
    innerRef,
    contentRef,
    userScale: finalScale,
  });

  return (
    <AbsoluteFill ref={outerRef} style={{
      display: 'flex',
      justifyContent: isAbsolute ? 'flex-start' : 'center',
      alignItems: isAbsolute ? 'flex-start' : 'center',
      pointerEvents: 'none',
      opacity: finalOpacity,
      zIndex: 9999,
    }}>
      <div ref={innerRef} style={{
        position: isAbsolute ? 'absolute' : 'relative',
        left: position?.x !== undefined ? (typeof position.x === 'number' ? `${position.x}%` : position.x) : 'auto',
        top: position?.y !== undefined ? (typeof position.y === 'number' ? `${position.y}%` : position.y) : 'auto',
        width: isAbsolute ? 'auto' : '100%',
        height: isAbsolute ? 'auto' : '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `${isAbsolute ? 'translate(-50%, -50%) ' : ''}scale(${finalScale}) rotate(${finalRotation}deg)`,
      }}>
        {/* Card behind the graphic, sized to its measured bounds + padding */}
        {backdropStyle && <div style={backdropStyle} />}
        {error ? (
          <div style={{ color: 'red', backgroundColor: 'black', padding: '10px', fontSize: 14 }}>
            Motion Graphic Error: {error}
          </div>
        ) : Component ? (
          <GraphicErrorBoundary resetKey={templateId} fallback={null}>
            <div ref={contentRef} style={{ display: 'contents' }}>
              <Component {...(props || {})} />
            </div>
          </GraphicErrorBoundary>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
