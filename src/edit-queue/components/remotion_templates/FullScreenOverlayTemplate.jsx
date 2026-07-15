import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, interpolate, useCurrentFrame, useVideoConfig, Img, Sequence } from 'remotion';
import { DynamicGraphicRenderer } from '../motion_graphics/DynamicGraphicRenderer';
import { HtmlGraphicRenderer } from '../motion_graphics/HtmlGraphicRenderer';
import { CompositionRenderer } from '../motion_graphics/CompositionRenderer';
import { Subtitles } from '../Subtitles';
import { StaticText } from '../motion_graphics/StaticText';
import { resolveAssetUrl } from '../../utils/assetResolver';
import { ProgressBar } from '../ProgressBar';
import { TextOverlay } from '../TextOverlay';

// Template-Specific Signature Defaults (GLASSMORPHISM / PREMIUM)
const TEMPLATE_DEFAULTS = {
    subtitleStyle: 'Glassmorphism',
    subtitleBottom: '400px',
    subtitleSize: '65px',
    textOverlayStyle: 'Sticker',
    textOverlaySize: '65px',
    textOverlayTop: '150px',
    bgmVolume: 0.35,
    bgmFadeSeconds: 2
};

const getBorderStyles = (preset) => {
    switch(preset) {
        case 'photographic': return { border: '12px solid white', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', borderRadius: '4px' };
        case 'neon': return { border: '2px solid #ff00ff', boxShadow: '0 0 15px #ff00ff, inset 0 0 15px #ff00ff', borderRadius: '8px' };
        case 'cinematic': return { borderTop: '20px solid black', borderBottom: '20px solid black', borderRadius: '0' };
        case 'glass': return { border: '1px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', borderRadius: '16px' };
        default: return { borderRadius: '0px' };
    }
};

const ImageOverlayInternal = ({ src, startFrame, durationInFrames, position, animationIn, animationOut, borderPreset, overlayOpacity }) => {
    const frame = useCurrentFrame();
    const relativeFrame = frame - startFrame;
    
    if (relativeFrame < 0 || relativeFrame > durationInFrames) {
        return null;
    }

    const { fps } = useVideoConfig();
    const animDuration = fps * 0.5; // 0.5s animation

    let translateX = 0;
    let translateY = 0;
    let baseScale = 1;
    let currentOpacity = overlayOpacity !== undefined ? overlayOpacity : 1;

    // IN Animation
    if (relativeFrame < animDuration) {
        if (animationIn === 'fade') {
            currentOpacity *= interpolate(relativeFrame, [0, animDuration], [0, 1], { extrapolateRight: 'clamp' });
        } else if (animationIn === 'pop') {
            baseScale *= interpolate(relativeFrame, [0, animDuration], [0.5, 1], { extrapolateRight: 'clamp' });
            currentOpacity *= interpolate(relativeFrame, [0, animDuration], [0, 1], { extrapolateRight: 'clamp' });
        } else if (animationIn === 'slide_left') {
            translateX += interpolate(relativeFrame, [0, animDuration], [500, 0], { extrapolateRight: 'clamp' });
            currentOpacity *= interpolate(relativeFrame, [0, animDuration], [0, 1], { extrapolateRight: 'clamp' });
        } else if (animationIn === 'slide_up') {
            translateY += interpolate(relativeFrame, [0, animDuration], [500, 0], { extrapolateRight: 'clamp' });
            currentOpacity *= interpolate(relativeFrame, [0, animDuration], [0, 1], { extrapolateRight: 'clamp' });
        }
    }

    // OUT Animation
    const framesLeft = durationInFrames - relativeFrame;
    if (framesLeft < animDuration) {
        const outProgress = animDuration - framesLeft;
        if (animationOut === 'fade') {
            currentOpacity *= interpolate(outProgress, [0, animDuration], [1, 0], { extrapolateRight: 'clamp' });
        } else if (animationOut === 'pop') {
            baseScale *= interpolate(outProgress, [0, animDuration], [1, 0.5], { extrapolateRight: 'clamp' });
            currentOpacity *= interpolate(outProgress, [0, animDuration], [1, 0], { extrapolateRight: 'clamp' });
        } else if (animationOut === 'slide_right') {
            translateX += interpolate(outProgress, [0, animDuration], [0, 500], { extrapolateRight: 'clamp' });
            currentOpacity *= interpolate(outProgress, [0, animDuration], [1, 0], { extrapolateRight: 'clamp' });
        } else if (animationOut === 'slide_down') {
            translateY += interpolate(outProgress, [0, animDuration], [0, 500], { extrapolateRight: 'clamp' });
            currentOpacity *= interpolate(outProgress, [0, animDuration], [1, 0], { extrapolateRight: 'clamp' });
        }
    }

    const parsedScale = parseFloat(position?.scale);
    const finalScale = baseScale * (!isNaN(parsedScale) ? parsedScale / 100 : 1);
    const finalRotation = position?.rotation !== undefined ? position.rotation : 0;
    const borderStyles = getBorderStyles(borderPreset);

    // Ignore sticker position logic - Force Full Screen Overlay
    return (
        <AbsoluteFill style={{ 
            opacity: currentOpacity,
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
        }}>
            <Img 
                src={resolveAssetUrl(src)} 
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transform: `scale(${finalScale}) translateX(${translateX}px) translateY(${translateY}px) rotate(${finalRotation}deg)`,
                    ...borderStyles
                }} 
            />
        </AbsoluteFill>
    );
};

export const FullScreenOverlayTemplate = ({ config }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // Volume calculation with Fade In and Fade Out
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

			{/* Main Video Layer */}
			<OffthreadVideo
				src={resolveAssetUrl(config.videoUrl)}
				style={{ width: '100%', height: '100%', objectFit: 'cover' }}
			/>
			
			{/* Automatic AI Subtitles Layer */}
			{config.showSubtitles !== false && (config.subtitlesUrl || config.subtitleData) && (
				<Subtitles 
					src={config.subtitlesUrl} 
					subtitleData={config.subtitleData}
					styleVariation={config.subtitleStyle || TEMPLATE_DEFAULTS.subtitleStyle} 
					bottomOffset={config.subtitleBottom || TEMPLATE_DEFAULTS.subtitleBottom} 
                    fontSize={config.subtitleSize || TEMPLATE_DEFAULTS.subtitleSize}
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
                            animationIn={overlay.animationIn}
                            animationOut={overlay.animationOut}
                            borderPreset={overlay.borderPreset}
                            overlayOpacity={overlay.opacity}
                        />
                    );
                }

                if (overlay.type === 'Text') {
                    return (
                        <Sequence
                            key={`overlay-${index}`}
                            from={startFrame}
                            durationInFrames={durationFrames}
                        >
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
