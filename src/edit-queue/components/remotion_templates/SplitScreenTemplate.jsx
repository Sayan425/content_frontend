import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, interpolate, useCurrentFrame, useVideoConfig, Img, Sequence } from 'remotion';
import { DynamicGraphicRenderer } from '../motion_graphics/DynamicGraphicRenderer';
import { HtmlGraphicRenderer } from '../motion_graphics/HtmlGraphicRenderer';
import { CompositionRenderer } from '../motion_graphics/CompositionRenderer';
import { Subtitles } from '../Subtitles';
import { resolveAssetUrl } from '../../utils/assetResolver';
import { ProgressBar } from '../ProgressBar';

// Template-Specific Signature Defaults (NEWS / REPORT STYLE)
const TEMPLATE_DEFAULTS = {
    subtitleStyle: 'Highlight',
    subtitleBottom: '500px',
    bgmVolume: 0.35,
    bgmFadeSeconds: 2
};

const ImageOverlayInternal = ({ src, startFrame, durationInFrames, position }) => {
    const frame = useCurrentFrame();
    const relativeFrame = frame - startFrame;
    
    if (relativeFrame < 0 || relativeFrame > durationInFrames) {
        return null;
    }

    // Cinematic Ken Burns Effect
    const scale = interpolate(
        relativeFrame,
        [0, durationInFrames],
        [1, 1.12],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const translateX = interpolate(
        relativeFrame,
        [0, durationInFrames],
        [-20, 20],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const opacity = interpolate(
        relativeFrame,
        [0, 15, durationInFrames - 15, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const translateY = interpolate(
        relativeFrame,
        [0, 10],
        [-20, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const parsedScale = parseFloat(position?.scale);
    const finalScale = scale * (!isNaN(parsedScale) ? parsedScale / 100 : 1);
    const finalRotation = position?.rotation !== undefined ? position.rotation : 0;

    return (
        <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '40%',
            opacity,
            backgroundColor: '#111',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            borderBottom: '5px solid #ffcc00' 
        }}>
            <Img 
                src={resolveAssetUrl(src)} 
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transform: `scale(${finalScale}) translateX(${translateX}px) translateY(${translateY}px) rotate(${finalRotation}deg)`
                }} 
            />
            {/* Glossy Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(rgba(255,255,255,0.05), transparent)',
                pointerEvents: 'none'
            }} />
        </div>
    );
};

export const SplitScreenTemplate = ({ config }) => {
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
		<AbsoluteFill style={{ backgroundColor: 'black' }}>
            {config.showProgressBar !== false && (
                <ProgressBar color={config.progressBarColor || '#ffcc00'} />
            )}
            {config.backgroundMusicUrl && (
                <Audio 
                    src={resolveAssetUrl(config.backgroundMusicUrl)} 
                    volume={volume}
                />
            )}

			{/* Main Video Layer - Pushed to bottom 60% */}
			<div style={{ 
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '60%',
                overflow: 'hidden'
            }}>
                <OffthreadVideo
                    src={resolveAssetUrl(config.videoUrl)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>
			
            {/* Empty Top State (When no image is present) */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '40%',
                backgroundColor: '#0a0a0a',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#333',
                fontSize: '40px',
                fontWeight: 'bold',
                fontFamily: 'system-ui'
            }}>
                <div style={{ opacity: 0.3 }}>VISUAL CONTEXT</div>
            </div>

			{/* Automatic AI Subtitles Layer - Centered on the Bridge */}
			{config.showSubtitles !== false && (config.subtitlesUrl || config.subtitleData) && (
				<Subtitles 
					src={config.subtitlesUrl} 
					subtitleData={config.subtitleData}
					styleVariation={config.subtitleStyle || TEMPLATE_DEFAULTS.subtitleStyle} 
					bottomOffset={config.subtitleBottom || "1100px"} 
                    fontSize={config.subtitleSize || "65px"}
				/>
			)}
			
			{/* Unified Overlays Layer (Handling both Images and Text Headers) */}
			{config.overlays && config.overlays.map((overlay, index) => {
                const startFrame = overlay.startInSeconds * fps;
                const durationFrames = (overlay.durationInSeconds || 5) * fps;

                if (overlay.type === 'Image') {
                    return (
                        <ImageOverlayInternal 
                            key={`overlay-${index}`}
                            src={overlay.props.src || overlay.props.url}
                            startFrame={startFrame}
                            durationInFrames={durationFrames}
                            position={overlay.position}
                        />
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
                                    backdrop={overlay.backdrop}
                                />
                            ) : overlay.props?.html ? (
                                <HtmlGraphicRenderer
                                    html={overlay.props.html}
                                    position={overlay.position}
                                    opacity={overlay.opacity}
                                    backdrop={overlay.backdrop}
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
