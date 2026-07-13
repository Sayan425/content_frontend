import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

// Shared top-of-video progress bar used by every template. The fill color is
// editable from the Main Video panel (config.progressBarColor); the gradient
// end and glow are derived from it so one color choice styles the whole bar.
export const ProgressBar = ({ color = '#ffcc00' }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const progress = frame / durationInFrames;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            overflow: 'hidden'
        }}>
            <div style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 55%, white))`,
                boxShadow: `0 0 20px ${color}`,
                borderRight: '3px solid white',
                transition: 'width 0.1s linear'
            }} />
        </div>
    );
};
