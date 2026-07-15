import React from 'react';
import { AbsoluteFill } from 'remotion';

const hexToRgba = (hex, alpha) => {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(full, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
};

/**
 * Renders a user-supplied inline HTML/CSS motion graphic straight from the
 * manifest (overlay.props.html). Nothing is uploaded or saved elsewhere —
 * the code lives only inside the manifest.
 *
 * Unlike library compositions, plain HTML participates in normal layout, so
 * the optional backdrop is a simple padded wrapper — no measuring needed.
 */
export const HtmlGraphicRenderer = ({ html, position, opacity, backdrop }) => {
  const isAbsolute = position?.x !== undefined || position?.y !== undefined;
  const parsedScale = parseFloat(position?.scale);
  const finalScale = !isNaN(parsedScale) ? parsedScale / 100 : 1;
  const finalRotation = position?.rotation || 0;
  const rawOpacity = opacity !== undefined ? opacity : 100;
  const finalOpacity = rawOpacity > 1 ? rawOpacity / 100 : rawOpacity;

  const bd = backdrop || {};
  const showBg = bd.background === true;
  const showBorder = bd.border === true;
  const backdropStyle = (showBg || showBorder) ? {
    backgroundColor: showBg
      ? hexToRgba(bd.backgroundColor || '#000000', (bd.backgroundOpacity !== undefined ? bd.backgroundOpacity : 60) / 100)
      : 'transparent',
    border: showBorder
      ? `${bd.borderWidth !== undefined ? bd.borderWidth : 4}px solid ${bd.borderColor || '#ffffff'}`
      : 'none',
    borderRadius: `${bd.radius !== undefined ? bd.radius : 16}px`,
    padding: `${bd.padding !== undefined ? bd.padding : 24}px`,
  } : null;

  return (
    <AbsoluteFill style={{
      display: 'flex',
      justifyContent: isAbsolute ? 'flex-start' : 'center',
      alignItems: isAbsolute ? 'flex-start' : 'center',
      pointerEvents: 'none',
      opacity: finalOpacity,
      zIndex: 9999,
    }}>
      <div style={{
        position: isAbsolute ? 'absolute' : 'relative',
        left: position?.x !== undefined ? (typeof position.x === 'number' ? `${position.x}%` : position.x) : 'auto',
        top: position?.y !== undefined ? (typeof position.y === 'number' ? `${position.y}%` : position.y) : 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `${isAbsolute ? 'translate(-50%, -50%) ' : ''}scale(${finalScale}) rotate(${finalRotation}deg)`,
        ...(backdropStyle || {}),
      }}>
        <div dangerouslySetInnerHTML={{ __html: html || '' }} />
      </div>
    </AbsoluteFill>
  );
};
