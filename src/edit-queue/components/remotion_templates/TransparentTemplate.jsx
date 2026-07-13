import React, { useRef, useEffect } from 'react';
import { AbsoluteFill, Video, Audio, interpolate, useCurrentFrame, useVideoConfig, Img, Sequence } from 'remotion';
import { DynamicGraphicRenderer } from '../motion_graphics/DynamicGraphicRenderer';
import { CompositionRenderer } from '../motion_graphics/CompositionRenderer';
import { Subtitles } from '../Subtitles';
import { StaticText } from '../motion_graphics/StaticText';
import { resolveAssetUrl } from '../../utils/assetResolver';
import { ProgressBar } from '../ProgressBar';
import { TextOverlay } from '../TextOverlay';

const ImageOverlayInternal = ({ src, startFrame, durationInFrames, index, position }) => {
    const frame = useCurrentFrame();
    const relativeFrame = frame - startFrame;
    
    if (relativeFrame < 0 || relativeFrame > durationInFrames) return null;

    const animStyle = index % 5;
    let baseScale = 1.1;
    let translateX = 0;
    let translateY = 0;

    if (animStyle === 0) baseScale = interpolate(relativeFrame, [0, durationInFrames], [1.1, 1.3]);
    else if (animStyle === 1) baseScale = interpolate(relativeFrame, [0, durationInFrames], [1.3, 1.1]);
    else if (animStyle === 2) { translateX = interpolate(relativeFrame, [0, durationInFrames], [-60, 60]); baseScale = 1.25; }
    else if (animStyle === 3) { translateX = interpolate(relativeFrame, [0, durationInFrames], [60, -60]); baseScale = 1.25; }
    else { translateX = interpolate(relativeFrame, [0, durationInFrames], [-30, 30]); translateY = interpolate(relativeFrame, [0, durationInFrames], [30, -30]); baseScale = 1.3; }

    const opacity = interpolate(relativeFrame, [0, 15, durationInFrames - 15, durationInFrames], [0, 1, 1, 0]);

    const parsedScale = parseFloat(position?.scale);
    const finalScale = baseScale * (!isNaN(parsedScale) ? parsedScale / 100 : 1);
    const finalRotation = position?.rotation !== undefined ? position.rotation : 0;

    return (
        <AbsoluteFill style={{ 
            opacity,
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
        }}>
            <Img src={resolveAssetUrl(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${finalScale}) translateX(${translateX}px) translateY(${translateY}px) rotate(${finalRotation}deg)` }} />
        </AbsoluteFill>
    );
};

const TEMPLATE_DEFAULTS = {
    subtitleStyle: 'Classic',
    subtitleBottom: '200px',
    subtitleSize: '65px',
    textOverlayStyle: 'Highlight',
    textOverlaySize: '65px',
    textOverlayTop: '150px',
    bgmVolume: 0.35,
    bgmFadeSeconds: 2
};

export const TransparentTemplate = ({ config }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    const targetVolume = config.bgmVolume !== undefined ? config.bgmVolume : TEMPLATE_DEFAULTS.bgmVolume;
    
    const volume = interpolate(
        frame,
        [0, TEMPLATE_DEFAULTS.bgmFadeSeconds * fps, durationInFrames - (TEMPLATE_DEFAULTS.bgmFadeSeconds * fps), durationInFrames],
        [0, targetVolume, targetVolume, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return (
        <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
            {config.showProgressBar !== false && (
                <ProgressBar color={config.progressBarColor || '#ffcc00'} />
            )}
            {config.backgroundMusicUrl && (
                <Audio src={resolveAssetUrl(config.backgroundMusicUrl)} volume={volume} />
            )}

            {/* OVERLAYS LAYER */}
            <AbsoluteFill>
                {config.overlays && config.overlays.map((overlay, index) => {
                    if (overlay.type !== 'Image') return null;
                    const startFrame = overlay.startInSeconds * fps;
                    const durationFrames = (overlay.durationInSeconds || 5) * fps;
                    return (
                        <ImageOverlayInternal 
                            key={`bg-${index}`} 
                            src={overlay.props.src || overlay.props.url} 
                            startFrame={startFrame} 
                            durationInFrames={durationFrames} 
                            index={index} 
                            position={overlay.position}
                        />
                    );
                })}
            </AbsoluteFill>
            
            {/* SUBTITLES & TEXT OVERLAYS */}
            {config.showSubtitles !== false && (config.subtitlesUrl || config.subtitleData) && (
                <Subtitles 
                    src={config.subtitlesUrl} 
                    subtitleData={config.subtitleData}
                    styleVariation={config.subtitleStyle || TEMPLATE_DEFAULTS.subtitleStyle} 
                    bottomOffset={config.subtitleBottom || TEMPLATE_DEFAULTS.subtitleBottom} 
                    fontSize={config.subtitleSize || TEMPLATE_DEFAULTS.subtitleSize}
                />
            )}

            {config.overlays && config.overlays.map((overlay, index) => {
                const startFrame = overlay.startInSeconds * fps;
                const durationFrames = (overlay.durationInSeconds || 5) * fps;
                if (overlay.type === 'Text') {
                    return (
                        <Sequence key={`text-${index}`} from={startFrame} durationInFrames={durationFrames}>
                            <TextOverlay
                                overlay={overlay}
                                styleVariation={config.textOverlayStyle || TEMPLATE_DEFAULTS.textOverlayStyle}
                                fontSize={TEMPLATE_DEFAULTS.textOverlaySize}
                                defaultTop={TEMPLATE_DEFAULTS.textOverlayTop}
                            />
                        </Sequence>
                    );
                }

                if (overlay.type === 'MotionGraphic') {
                    return (
                        <Sequence key={`overlay-${index}`} from={startFrame} durationInFrames={durationFrames}>
                            {overlay.templateId ? (
                                <CompositionRenderer
                                    templateId={overlay.templateId}
                                    props={overlay.props}
                                    position={overlay.position}
                                    opacity={overlay.opacity}
                                />
                            ) : (
                                <DynamicGraphicRenderer
                                    code={overlay.props.code}
                                    durationInFrames={durationFrames}
                                    position={overlay.position}
                                />
                            )}
                        </Sequence>
                    );
                }

                return null;
            })}
        </AbsoluteFill>
    );
};
