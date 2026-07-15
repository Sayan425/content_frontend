import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { StaticText } from './motion_graphics/StaticText';
import { getAnimationState, normalizeOpacity } from './overlayFx';

/**
 * Shared Text overlay wrapper used by every template.
 *
 * The box sizes itself to the text (`max-content`) but is capped at 88% of
 * the screen, so a sentence stays on one line until it genuinely runs out of
 * width — instead of shrink-wrapping into a one-word-per-line column when a
 * manual position is set.
 *
 * Rendered inside the overlay's <Sequence>, so useCurrentFrame() is relative
 * to the overlay's start — animations from the panel apply here.
 */
export const TextOverlay = ({ overlay, styleVariation, fontSize, defaultTop, durationInFrames }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const pos = overlay.position || {};
    const parsedScale = parseFloat(pos.scale);
    const baseScale = !isNaN(parsedScale) ? parsedScale / 100 : 1;

    const anim = getAnimationState({
        relativeFrame: frame,
        durationInFrames: durationInFrames || Infinity,
        fps,
        animationIn: overlay.animationIn,
        animationOut: overlay.animationOut,
        baseScale,
        userOpacity: normalizeOpacity(overlay.opacity),
    });

    // A per-overlay style (props.style) wins over the template/global default.
    const finalStyle = overlay.props?.style || styleVariation;

    return (
        <div style={{
            position: 'absolute',
            left: pos.x !== undefined ? pos.x : '50%',
            top: pos.y !== undefined ? pos.y : defaultTop,
            width: 'max-content',
            maxWidth: '88%',
            display: 'flex',
            justifyContent: 'center',
            opacity: anim.opacity,
            filter: anim.blurAmt > 0 ? `blur(${anim.blurAmt}px)` : 'none',
            // Always center horizontally on the anchor; only center vertically
            // when the user placed the overlay themselves.
            transform: `translate(-50%, ${pos.y !== undefined ? '-50%' : '0'}) scale(${anim.scale}) rotate(${(pos.rotation || 0) + anim.extraRotation}deg) rotateY(${anim.flipRotation}deg) translateX(${anim.translateX}px) translateY(${anim.translateY}px)`,
        }}>
            <StaticText
                text={overlay.props.text}
                styleVariation={finalStyle}
                fontSize={fontSize}
            />
        </div>
    );
};
