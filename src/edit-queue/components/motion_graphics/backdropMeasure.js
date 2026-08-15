import { useEffect, useState } from 'react';

/**
 * Shared backdrop logic for motion-graphic renderers.
 *
 * Graphics draw with absolutely-positioned elements, so a normal CSS wrapper
 * collapses to zero size. Instead we measure the union of every visible
 * element the graphic renders (each animation frame, since graphics move)
 * and return a style that places the card behind exactly that area,
 * expanded by the user's padding.
 */

export const hexToRgba = (hex, alpha) => {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(full, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
};

/**
 * @param backdrop   overlay.backdrop ({background, backgroundColor, ...})
 * @param ready      whether the graphic is mounted and rendering
 * @param outerRef   the AbsoluteFill covering the whole composition
 * @param innerRef   the transformed positioning container (card's parent)
 * @param contentRef wrapper around the graphic's own elements
 * @param userScale  the overlay's Scale control (1 = 100%)
 * @returns a style object for the card div, or null when it shouldn't render
 */
export function useMeasuredBackdropStyle({ backdrop, ready, outerRef, innerRef, contentRef, userScale }) {
  const bd = backdrop || {};
  const showBg = bd.background === true;
  const showBorder = bd.border === true;
  const backdropOn = showBg || showBorder;
  const parseNum = (val, fallback) => (typeof val === 'number' && isFinite(val) ? val : (parseInt(val, 10) || fallback));
  const pad = parseNum(bd.padding, 24);
  const borderWidth = parseNum(bd.borderWidth, 4);
  const radius = parseNum(bd.radius, 16);

  const [box, setBox] = useState(null);

  useEffect(() => {
    if (!backdropOn || !ready) {
      setBox(null);
      return;
    }
    let raf;
    const tick = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      const content = contentRef.current;
      if (outer && inner && content) {
        // Screen-px -> composition-px: the player scales the composition,
        // and the user's Scale control scales this overlay.
        const outerRect = outer.getBoundingClientRect();
        const playerScale = outer.offsetWidth ? outerRect.width / outer.offsetWidth : 1;
        const totalScale = playerScale * (userScale || 1);

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
  }, [backdropOn, ready, userScale]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!backdropOn || !box) return null;

  return {
    position: 'absolute',
    left: `${box.x - pad}px`,
    top: `${box.y - pad}px`,
    width: `${box.w + pad * 2}px`,
    height: `${box.h + pad * 2}px`,
    backgroundColor: showBg
      ? hexToRgba(bd.backgroundColor || '#000000', (bd.backgroundOpacity !== undefined ? bd.backgroundOpacity : 60) / 100)
      : 'transparent',
    border: showBorder
      ? `${borderWidth}px solid ${bd.borderColor || '#ffffff'}`
      : 'none',
    borderRadius: `${radius}px`,
    zIndex: -1,
  };
}
