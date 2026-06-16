import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import * as Babel from '@babel/standalone';

export const DynamicGraphicRenderer = ({ code, durationInFrames, position }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const Component = useMemo(() => {
        if (!code) return () => null;

        try {
            // Wrap in a function to avoid 'return outside function' errors during Babel parsing
            const wrappedCode = `function __render__(React, frame, fps, durationInFrames, interpolate, spring) { \n${code}\n }`;
            
            const transpiled = Babel.transform(wrappedCode, {
                presets: ['react']
            }).code;

            // Extract the function safely using new Function
            const getFunction = new Function(`${transpiled}\nreturn __render__;`);
            const generateElement = getFunction();

            return () => {
                try {
                    return generateElement(React, frame, fps, durationInFrames, interpolate, spring);
                } catch (e) {
                    console.error("DynamicGraphic runtime error:", e);
                    return <div style={{ color: 'red', backgroundColor: 'black', padding: '10px' }}>Runtime Error: {e.message}</div>;
                }
            };
        } catch (e) {
            console.error("DynamicGraphic compile error:", e);
            return () => <div style={{ color: 'red', backgroundColor: 'black', padding: '10px' }}>Compile Error: {e.message}</div>;
        }
    }, [code, frame, fps, durationInFrames]);

    const isAbsolute = position?.x !== undefined || position?.y !== undefined;
    const parsedScale = parseFloat(position?.scale);
    const finalScale = !isNaN(parsedScale) ? parsedScale / 100 : 1;
    const finalRotation = position?.rotation || 0;

    return (
        <AbsoluteFill style={{
            display: 'flex',
            justifyContent: isAbsolute ? 'flex-start' : 'center',
            alignItems: isAbsolute ? 'flex-start' : 'center',
            pointerEvents: 'none',
            zIndex: 9999
        }}>
            <div style={{
                position: isAbsolute ? 'absolute' : 'relative',
                left: position?.x !== undefined ? (typeof position.x === 'number' ? `${position.x}%` : position.x) : 'auto',
                top: position?.y !== undefined ? (typeof position.y === 'number' ? `${position.y}%` : position.y) : 'auto',
                width: isAbsolute ? 'auto' : '100%',
                height: isAbsolute ? 'auto' : '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: `${isAbsolute ? 'translate(-50%, -50%) ' : ''}scale(${finalScale}) rotate(${finalRotation}deg)`,
                border: '2px dashed red' // For debugging visibility
            }}>
                <Component />
            </div>
        </AbsoluteFill>
    );
};
