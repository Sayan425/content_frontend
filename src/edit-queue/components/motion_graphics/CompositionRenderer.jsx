import React, { useState, useEffect } from 'react';
import { AbsoluteFill } from 'remotion';
import { loadComposition } from '../../utils/motionGraphicRegistry';

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

const hexToRgba = (hex, alpha) => {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(full, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
};

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
  // Measured bounding box (in composition px, relative to the inner
  // container's origin) of everything the graphic actually draws.
  const [box, setBox] = useState(null);
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

  // Optional backdrop card: background and border toggle independently.
  const bd = backdrop || {};
  const showBg = bd.background === true;
  const showBorder = bd.border === true;
  const backdropOn = showBg || showBorder;
  const pad = bd.padding !== undefined ? bd.padding : 24;

  // Compositions draw with absolutely-positioned elements, so a normal
  // wrapper collapses to zero size. Instead we measure the union of every
  // visible element the graphic renders (each animation frame, since
  // graphics move) and place the card behind exactly that area.
  useEffect(() => {
    if (!backdropOn || !Component) {
      setBox(null);
      return;
    }
    let raf;
    const tick = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      const content = contentRef.current;
      if (outer && inner && content) {
        // Screen-px -> composition-px conversion: the player scales the whole
        // composition, and the user's Scale control scales this overlay.
        const outerRect = outer.getBoundingClientRect();
        const playerScale = outer.offsetWidth ? outerRect.width / outer.offsetWidth : 1;
        const totalScale = playerScale * (finalScale || 1);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, found = false;
        const els = [content, ...content.querySelectorAll('*')];
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          found = true;
          if (r.left < minX) minX = r.left;
          if (r.top < minY) minY = r.top;
          if (r.right > maxX) maxX = r.right;
          if (r.bottom > maxY) maxY = r.bottom;
        }

        if (found && totalScale > 0) {
          const innerRect = inner.getBoundingClientRect();
          const next = {
            x: (minX - innerRect.left) / totalScale,
            y: (minY - innerRect.top) / totalScale,
            w: (maxX - minX) / totalScale,
            h: (maxY - minY) / totalScale,
          };
          setBox((prev) =>
            prev &&
            Math.abs(prev.x - next.x) < 1 && Math.abs(prev.y - next.y) < 1 &&
            Math.abs(prev.w - next.w) < 1 && Math.abs(prev.h - next.h) < 1
              ? prev
              : next
          );
        } else {
          setBox(null);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [backdropOn, Component, finalScale]);

  const backdropStyle = (backdropOn && box) ? {
    position: 'absolute',
    left: `${box.x - pad}px`,
    top: `${box.y - pad}px`,
    width: `${box.w + pad * 2}px`,
    height: `${box.h + pad * 2}px`,
    backgroundColor: showBg
      ? hexToRgba(bd.backgroundColor || '#000000', (bd.backgroundOpacity !== undefined ? bd.backgroundOpacity : 60) / 100)
      : 'transparent',
    border: showBorder
      ? `${bd.borderWidth !== undefined ? bd.borderWidth : 4}px solid ${bd.borderColor || '#ffffff'}`
      : 'none',
    borderRadius: `${bd.radius !== undefined ? bd.radius : 16}px`,
    zIndex: -1,
  } : null;

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
