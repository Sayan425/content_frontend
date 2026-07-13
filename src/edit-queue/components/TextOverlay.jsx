import React from 'react';
import { StaticText } from './motion_graphics/StaticText';

/**
 * Shared Text overlay wrapper used by every template.
 *
 * The box sizes itself to the text (`max-content`) but is capped at 88% of
 * the screen, so a sentence stays on one line until it genuinely runs out of
 * width — instead of shrink-wrapping into a one-word-per-line column when a
 * manual position is set.
 */
export const TextOverlay = ({ overlay, styleVariation, fontSize, defaultTop }) => {
    const pos = overlay.position || {};
    const parsedScale = parseFloat(pos.scale);
    const scale = !isNaN(parsedScale) ? parsedScale / 100 : 1;

    return (
        <div style={{
            position: 'absolute',
            left: pos.x !== undefined ? pos.x : '50%',
            top: pos.y !== undefined ? pos.y : defaultTop,
            width: 'max-content',
            maxWidth: '88%',
            display: 'flex',
            justifyContent: 'center',
            // Always center horizontally on the anchor; only center vertically
            // when the user placed the overlay themselves.
            transform: `translate(-50%, ${pos.y !== undefined ? '-50%' : '0'}) scale(${scale}) rotate(${pos.rotation || 0}deg)`,
        }}>
            <StaticText
                text={overlay.props.text}
                styleVariation={styleVariation}
                fontSize={fontSize}
            />
        </div>
    );
};
