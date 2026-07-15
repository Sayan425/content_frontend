import React from 'react';
import { AbsoluteFill, OffthreadVideo, Video, Audio, interpolate, useCurrentFrame, useVideoConfig, Img, spring, Sequence } from 'remotion';
import { DynamicGraphicRenderer } from '../motion_graphics/DynamicGraphicRenderer';
import { HtmlGraphicRenderer } from '../motion_graphics/HtmlGraphicRenderer';
import { CompositionRenderer } from '../motion_graphics/CompositionRenderer';
import { Subtitles } from '../Subtitles';
import { StaticText } from '../motion_graphics/StaticText';
import { resolveAssetUrl } from '../../utils/assetResolver';
import { ProgressBar } from '../ProgressBar';
import { TextOverlay } from '../TextOverlay';

const Tape = ({ style }) => (
    <div style={{
        position: 'absolute',
        width: '100px',
        height: '35px',
        backgroundColor: 'rgba(255, 250, 200, 0.4)',
        backdropFilter: 'blur(1px)',
        boxShadow: '1px 1px 3px rgba(0,0,0,0.05)',
        zIndex: 10,
        transform: 'rotate(-5deg)',
        ...style
    }} />
);

const ImageOverlayInternal = ({ src, startFrame, durationInFrames, index, position, animationIn, animationOut, borderPreset, opacityVal }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const relativeFrame = frame - startFrame;
    
    if (relativeFrame < 0 || relativeFrame > durationInFrames) {
        return null;
    }

    const defaultRotation = (index % 2 === 0 ? 3 : -3) + (index % 3);
    const finalRotation = position?.rotation !== undefined ? position.rotation : defaultRotation;
    const parsedScale = parseFloat(position?.scale);
    const baseScaleRaw = !isNaN(parsedScale) ? parsedScale : 100;
    const baseScale = baseScaleRaw / 100;
    
    const userOpacityRaw = opacityVal !== undefined ? opacityVal : 1;
    const userOpacity = userOpacityRaw > 1 ? userOpacityRaw / 100 : userOpacityRaw;
    let currentOpacity = userOpacity;
    let currentScale = baseScale;
    let translateX = 0;
    let translateY = 0;
    let extraRotation = 0;
    let blurAmt = 0;
    let flipRotation = 0;

    const springEntry = spring({ frame: relativeFrame, fps, config: { damping: 12, stiffness: 100 } });
    const springExit = spring({ frame: durationInFrames - relativeFrame, fps, config: { damping: 12, stiffness: 100 } });

    if (relativeFrame < 15) {
        if (animationIn === 'fade') currentOpacity = interpolate(relativeFrame, [0, 15], [0, userOpacity], { extrapolateRight: 'clamp' });
        else if (animationIn === 'pop') currentScale = springEntry * baseScale;
        else if (animationIn === 'slide_left') translateX = interpolate(relativeFrame, [0, 15], [500, 0], { extrapolateRight: 'clamp' });
        else if (animationIn === 'slide_right') translateX = interpolate(relativeFrame, [0, 15], [-500, 0], { extrapolateRight: 'clamp' });
        else if (animationIn === 'slide_up') translateY = interpolate(relativeFrame, [0, 15], [500, 0], { extrapolateRight: 'clamp' });
        else if (animationIn === 'slide_down') translateY = interpolate(relativeFrame, [0, 15], [-500, 0], { extrapolateRight: 'clamp' });
        else if (animationIn === 'zoom_in') currentScale = interpolate(relativeFrame, [0, 15], [0, baseScale], { extrapolateRight: 'clamp' });
        else if (animationIn === 'spin_in') {
            currentScale = springEntry * baseScale;
            extraRotation = interpolate(relativeFrame, [0, 15], [-180, 0], { extrapolateRight: 'clamp' });
        }
        else if (animationIn === 'drop_down') translateY = interpolate(relativeFrame, [0, 15], [-1000, 0], { extrapolateRight: 'clamp' });
        else if (animationIn === 'blur_in') {
            currentOpacity = interpolate(relativeFrame, [0, 15], [0, userOpacity], { extrapolateRight: 'clamp' });
            blurAmt = interpolate(relativeFrame, [0, 15], [20, 0], { extrapolateRight: 'clamp' });
        }
        else if (animationIn === 'flip_in') {
            flipRotation = interpolate(relativeFrame, [0, 15], [90, 0], { extrapolateRight: 'clamp' });
            currentOpacity = interpolate(relativeFrame, [0, 15], [0, userOpacity], { extrapolateRight: 'clamp' });
        }
        else if (!animationIn || animationIn === 'none') { /* instant */ }
    }

    const framesLeft = durationInFrames - relativeFrame;
    if (framesLeft < 15) {
        if (animationOut === 'fade') currentOpacity = interpolate(framesLeft, [0, 15], [0, userOpacity], { extrapolateLeft: 'clamp' });
        else if (animationOut === 'pop') currentScale = springExit * baseScale;
        else if (animationOut === 'slide_right') translateX = interpolate(framesLeft, [0, 15], [500, 0], { extrapolateLeft: 'clamp' });
        else if (animationOut === 'slide_left') translateX = interpolate(framesLeft, [0, 15], [-500, 0], { extrapolateLeft: 'clamp' });
        else if (animationOut === 'slide_down') translateY = interpolate(framesLeft, [0, 15], [500, 0], { extrapolateLeft: 'clamp' });
        else if (animationOut === 'slide_up') translateY = interpolate(framesLeft, [0, 15], [-500, 0], { extrapolateLeft: 'clamp' });
        else if (animationOut === 'zoom_out') currentScale = interpolate(framesLeft, [0, 15], [0, baseScale], { extrapolateLeft: 'clamp' });
        else if (animationOut === 'spin_out') {
            currentScale = springExit * baseScale;
            extraRotation = interpolate(framesLeft, [0, 15], [180, 0], { extrapolateLeft: 'clamp' });
        }
        else if (animationOut === 'fly_away') {
            translateY = interpolate(framesLeft, [0, 15], [-1000, 0], { extrapolateLeft: 'clamp' });
            translateX = interpolate(framesLeft, [0, 15], [500, 0], { extrapolateLeft: 'clamp' });
        }
        else if (animationOut === 'blur_out') {
            currentOpacity = interpolate(framesLeft, [0, 15], [0, userOpacity], { extrapolateLeft: 'clamp' });
            blurAmt = interpolate(framesLeft, [0, 15], [20, 0], { extrapolateLeft: 'clamp' });
        }
        else if (animationOut === 'flip_out') {
            flipRotation = interpolate(framesLeft, [0, 15], [90, 0], { extrapolateLeft: 'clamp' });
            currentOpacity = interpolate(framesLeft, [0, 15], [0, userOpacity], { extrapolateLeft: 'clamp' });
        }
        else if (!animationOut || animationOut === 'none') { /* instant */ }
    }

    let containerStyle = {};
    if (borderPreset === 'none') containerStyle = { backgroundColor: 'transparent' };
    else if (borderPreset === 'neon') containerStyle = { backgroundColor: 'black', border: '2px solid #0ff', boxShadow: '0 0 20px #0ff, inset 0 0 20px #0ff', padding: '10px' };
    else if (borderPreset === 'cyberpunk') containerStyle = { backgroundColor: '#1a0b16', border: '3px solid #ff003c', boxShadow: '5px 5px 0px #00f0ff', padding: '12px' };
    else if (borderPreset === 'cinematic') containerStyle = { backgroundColor: '#111', border: '1px solid #333', padding: '2px' };
    else if (borderPreset === 'minimal_shadow') containerStyle = { backgroundColor: 'white', padding: '5px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', borderRadius: '12px' };
    else if (borderPreset === 'glass') containerStyle = { backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '15px', borderRadius: '16px' };
    else if (borderPreset === 'gold_frame') containerStyle = { backgroundColor: '#111', border: '8px solid #d4af37', boxShadow: 'inset 0 0 20px #8a6327, 0 10px 30px rgba(0,0,0,0.5)', padding: '2px' };
    else if (borderPreset === 'comic_book') containerStyle = { backgroundColor: 'white', border: '4px solid black', padding: '10px', boxShadow: '10px 10px 0px black' };
    else if (borderPreset === 'retro_vhs') containerStyle = { backgroundColor: 'black', border: '1px solid #555', padding: '15px', filter: 'contrast(1.2) sepia(0.3) hue-rotate(-20deg)', boxShadow: '3px 0px 0px red, -3px 0px 0px blue' };
    else if (borderPreset === 'polaroid_modern') containerStyle = { backgroundColor: 'white', padding: '15px 15px 45px 15px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', borderRadius: '8px' };
    else containerStyle = { backgroundColor: 'white', padding: '20px 20px 60px 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #ddd' };

    const isAbsolute = position?.x !== undefined || position?.y !== undefined;

    return (
        <AbsoluteFill style={{ 
            display: 'flex', 
            justifyContent: isAbsolute ? 'flex-start' : 'center', 
            alignItems: isAbsolute ? 'flex-start' : 'center',
            opacity: currentOpacity,
            filter: blurAmt > 0 ? `blur(${blurAmt}px)` : 'none'
        }}>
            <div style={{
                position: isAbsolute ? 'absolute' : 'relative',
                left: position?.x !== undefined ? position.x : 'auto',
                top: position?.y !== undefined ? position.y : 'auto',
                width: '75%',
                transform: `${isAbsolute ? 'translate(-50%, -50%) ' : ''}scale(${currentScale}) rotate(${finalRotation + extraRotation}deg) rotateY(${flipRotation}deg) translateX(${translateX}px) translateY(${translateY}px)`,
                ...containerStyle
            }}>
                {(!borderPreset || borderPreset === 'photographic') && (
                    <>
                        <Tape style={{ top: '-15px', left: '-30px', rotate: '-40deg' }} />
                        <Tape style={{ bottom: '-10px', right: '-30px', rotate: '-30deg' }} />
                    </>
                )}
                
                <Img src={resolveAssetUrl(src)} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: borderPreset === 'glass' ? '8px' : '0' }} />
            </div>
        </AbsoluteFill>
    );
};

const VideoOverlayAnimated = ({ src, durationInFrames, index, position }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Organic "Throw" animation
    const springEntry = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 100 }
    });

    const opacity = interpolate(
        frame,
        [0, 10, durationInFrames - 15, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const defaultRotation = (index % 2 === 0 ? 3 : -3) + (index % 3);
    const finalRotation = position?.rotation !== undefined ? position.rotation : defaultRotation;
    const parsedScale = parseFloat(position?.scale);
    const baseScaleRaw = !isNaN(parsedScale) ? parsedScale : 100;
    const baseScale = baseScaleRaw / 100;

    const userOpacityRaw = position?.opacity !== undefined ? position.opacity : 1;
    const userOpacity = userOpacityRaw > 1 ? userOpacityRaw / 100 : userOpacityRaw;

    const finalScale = springEntry * baseScale;

    const isAbsolute = position?.x !== undefined || position?.y !== undefined;

    return (
        <AbsoluteFill style={{ 
            display: 'flex', 
            justifyContent: isAbsolute ? 'flex-start' : 'center', 
            alignItems: isAbsolute ? 'flex-start' : 'center',
            opacity 
        }}>
            <div style={{
                position: isAbsolute ? 'absolute' : 'relative',
                left: position?.x !== undefined ? position.x : 'auto',
                top: position?.y !== undefined ? position.y : 'auto',
                width: '75%',
                transform: `${isAbsolute ? 'translate(-50%, -50%) ' : ''}scale(${finalScale}) rotate(${finalRotation}deg)`,
                backgroundColor: 'white',
                padding: '20px 20px 60px 20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                border: '1px solid #ddd'
            }}>
                <Tape style={{ top: '-15px', left: '-30px', rotate: '-40deg' }} />
                <Tape style={{ bottom: '-10px', right: '-30px', rotate: '-30deg' }} />
                
                <OffthreadVideo 
                    src={resolveAssetUrl(src)} 
                    style={{ 
                        width: '100%', 
                        height: 'auto', 
                        display: 'block'
                    }} 
                />
            </div>
        </AbsoluteFill>
    );
};

const VideoOverlayInternal = ({ src, startFrame, durationInFrames, index, position }) => {
    return (
        <Sequence from={startFrame} durationInFrames={durationInFrames}>
            <VideoOverlayAnimated src={src} durationInFrames={durationInFrames} index={index} position={position} />
        </Sequence>
    );
};

// Template-Specific Signature Defaults (SCRAPBOOK / STORYTELLING)
const TEMPLATE_DEFAULTS = {
    subtitleStyle: 'Sticker',
    subtitleBottom: '400px',
    subtitleSize: '65px',
    textOverlayStyle: 'Sticker',
    textOverlaySize: '65px',
    textOverlayTop: '150px',
    bgmVolume: 0.35,
    bgmFadeSeconds: 2
};

export const BasicTemplate = ({ config }) => {
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
            {config.showBgm !== false && config.backgroundMusicUrl && (
                <Audio 
                    src={resolveAssetUrl(config.backgroundMusicUrl)} 
                    volume={volume}
                />
            )}

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
                            index={index}
                            src={overlay.props.src || overlay.props.url}
                            startFrame={startFrame}
                            durationInFrames={durationFrames}
                            position={overlay.position}
                            animationIn={overlay.animationIn}
                            animationOut={overlay.animationOut}
                            borderPreset={overlay.borderPreset}
                            opacityVal={overlay.opacity}
                        />
                    );
                }

                if (overlay.type === 'Video') {
                    return (
                        <VideoOverlayInternal 
                            key={`overlay-${index}`}
                            index={index}
                            src={overlay.props.src || overlay.props.url}
                            startFrame={startFrame}
                            durationInFrames={durationFrames}
                            position={overlay.position}
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
                                    opacity={overlay.opacity}
                                    backdrop={overlay.backdrop}
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
