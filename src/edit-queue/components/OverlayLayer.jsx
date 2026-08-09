import React from 'react';
import { AbsoluteFill, OffthreadVideo, Img, Audio, useCurrentFrame, useVideoConfig, interpolate, Sequence } from 'remotion';
import { getAnimationState, getBorderPresetStyle, normalizeOpacity } from './overlayFx';
import { TextOverlay } from './TextOverlay';
import { CompositionRenderer } from './motion_graphics/CompositionRenderer';
import { HtmlGraphicRenderer } from './motion_graphics/HtmlGraphicRenderer';
import { DynamicGraphicRenderer } from './motion_graphics/DynamicGraphicRenderer';
import { resolveAssetUrl } from '../utils/assetResolver';

/**
 * Overlay videos are B-roll layered over the narration, so their own audio is
 * always muted. Wrapping OffthreadVideo keeps that guarantee in one place
 * instead of relying on every call site remembering the prop.
 */
const MutedVideo = (props) => <OffthreadVideo {...props} muted />;

/**
 * Shared overlay renderer used by every template, so Image, Video, Text, and
 * Motion Graphic overlays all appear in all templates. Only the *media* look
 * (Image/Video) changes per template via `mediaMode`:
 *   - 'scrapbook'  : framed, positioned polaroid (Basic)
 *   - 'fullscreen' : covers the whole frame / the narrator's face (Full Screen Overlay)
 *   - 'kenburns'   : full-bleed slow pan-zoom (Transparent)
 *   - 'top'        : confined to the top 40% panel (Split-Screen)
 * Text and Motion Graphics render identically in every mode.
 */

const Tape = ({ style }) => (
    <div style={{
        position: 'absolute', width: '100px', height: '35px',
        backgroundColor: 'rgba(255, 250, 200, 0.4)', backdropFilter: 'blur(1px)',
        boxShadow: '1px 1px 3px rgba(0,0,0,0.05)', zIndex: 10, transform: 'rotate(-5deg)',
        ...style
    }} />
);

const mediaSrc = (overlay) => resolveAssetUrl(overlay.props?.src || overlay.props?.url);

// Framed, positioned media (Basic scrapbook look). Works for Image and Video.
const ScrapbookMedia = ({ overlay, index, durationInFrames, isVideo }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const position = overlay.position || {};

    const defaultRotation = (index % 2 === 0 ? 3 : -3) + (index % 3);
    const finalRotation = position.rotation !== undefined ? position.rotation : defaultRotation;
    const parsedScale = parseFloat(position.scale);
    const baseScale = (!isNaN(parsedScale) ? parsedScale : 100) / 100;

    const anim = getAnimationState({
        relativeFrame: frame,
        durationInFrames,
        fps,
        animationIn: overlay.animationIn || (isVideo ? 'pop' : 'fade'),
        animationOut: overlay.animationOut || 'fade',
        baseScale,
        userOpacity: normalizeOpacity(overlay.opacity),
    });

    const isAbsolute = position.x !== undefined || position.y !== undefined;
    const src = mediaSrc(overlay);
    const isBlurBg = overlay.borderPreset === 'blur_bg';
    const isLined = overlay.borderPreset === 'lined';
    const isVintage = overlay.borderPreset === 'vintage';
    const isEightBit = overlay.borderPreset === 'eightbit';
    const isStructural = isLined || isVintage || isEightBit;

    // "Frameless Blurred Background": a blurred, enlarged copy of the media
    // fills the square area behind the sharp, contained copy — so any aspect
    // ratio fits with no hard frame. (Two media layers, same source.)
    const containerStyle = isBlurBg
        ? { position: 'relative', overflow: 'hidden', padding: '26px', boxSizing: 'border-box', backgroundColor: '#000' }
        : isStructural
        ? { backgroundColor: 'transparent' }
        : getBorderPresetStyle(overlay.borderPreset || 'photographic');


    // "Infinite Lined Borders": concentric rings drawn with a repeating radial
    // border-image. Fewer, bolder rings than the original.
    const lb = 22, ln = 3, lc = '#774F38';
    const lp = lb * ln;
    const lsz = 460;
    const ld = lsz / (2 * ln) + lb;
    const linedStyle = {
        width: '100%', height: 'auto', display: 'block',
        boxSizing: 'border-box', border: `${lp}px solid transparent`,
        borderRadius: `${lp + lb / 4}px`,
        borderImage: `repeating-radial-gradient(${lc} 0,#0000 2px calc(${(ld / 2).toFixed(2)}px - 2px),${lc} ${(ld / 2).toFixed(2)}px ${ld.toFixed(2)}px) 49.8%/${lp}px`,
        clipPath: `inset(0 round ${lp}px)`,
    };

    // "8-Bit Pixel Border": stepped pixel frame with notched corners, built
    // from the SCSS step1 mixin expanded to a two-level box-shadow (one color).
    const pw = 8, pc = '#000';
    const eightBitStyle = {
        width: '88%', height: 'auto', display: 'block', objectFit: 'cover',
        boxShadow: [
            `${pw}px 0 ${pc}`, `-${pw}px 0 ${pc}`, `0 -${pw}px ${pc}`, `0 ${pw}px ${pc}`,
            `${2 * pw}px 0 ${pc}`, `-${2 * pw}px 0 ${pc}`, `0 -${2 * pw}px ${pc}`, `0 ${2 * pw}px ${pc}`,
            `0 0 0 ${pw}px ${pc}`,
        ].join(', '),
    };

    // Video overlays are B-roll behind the narration, so their own audio is
    // always silenced rather than competing with the voiceover. `muted` is
    // only valid on OffthreadVideo, never on Img.
    const MediaTag = isVideo ? MutedVideo : Img;

    return (
        <AbsoluteFill style={{
            display: 'flex',
            justifyContent: isAbsolute ? 'flex-start' : 'center',
            alignItems: isAbsolute ? 'flex-start' : 'center',
            opacity: anim.opacity,
            filter: anim.blurAmt > 0 ? `blur(${anim.blurAmt}px)` : 'none',
        }}>
            <div style={{
                position: isAbsolute ? 'absolute' : 'relative',
                left: position.x !== undefined ? position.x : 'auto',
                top: position.y !== undefined ? position.y : 'auto',
                width: '75%',
                transform: `${isAbsolute ? 'translate(-50%, -50%) ' : ''}scale(${anim.scale}) rotate(${finalRotation + anim.extraRotation}deg) rotateY(${anim.flipRotation}deg) translateX(${anim.translateX}px) translateY(${anim.translateY}px)`,
                ...containerStyle,
            }}>
                {isBlurBg ? (
                    <>
                        {/* Blurred fill spans the whole box (incl. the even padding);
                            sharp copy sits on top with uniform padding around it. */}
                        <MediaTag src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(0.95) blur(14px)', transform: 'scale(1.08)' }} />
                        <MediaTag src={src} style={{ position: 'relative', width: '100%', height: 'auto', display: 'block', zIndex: 1, boxShadow: '0 0 16px #0006' }} />
                    </>
                ) : isLined ? (
                    <MediaTag src={src} style={linedStyle} />
                ) : isEightBit ? (
                    <MediaTag src={src} style={eightBitStyle} />
                ) : isVintage ? (
                    <div style={{ border: '2px solid #DE9B72', padding: '6px', backgroundColor: '#0d0b10' }}>
                        <div style={{ border: '6px solid #DE9B72', padding: '6px' }}>
                            <div style={{ border: '2px solid #DE9B72', display: 'flex' }}>
                                <MediaTag src={src} style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {(!overlay.borderPreset || overlay.borderPreset === 'photographic') && (
                            <>
                                <Tape style={{ top: '-15px', left: '-30px', rotate: '-40deg' }} />
                                <Tape style={{ bottom: '-10px', right: '-30px', rotate: '-30deg' }} />
                            </>
                        )}
                        <MediaTag src={src} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </>
                )}
            </div>
        </AbsoluteFill>
    );
};

// Full-bleed media covering the frame (or the top panel). Works for Image and Video.
const FullBleedMedia = ({ overlay, index, durationInFrames, isVideo, kenBurns, region }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const anim = getAnimationState({
        relativeFrame: frame,
        durationInFrames,
        fps,
        animationIn: overlay.animationIn || 'fade',
        animationOut: overlay.animationOut || 'fade',
        baseScale: 1,
        userOpacity: normalizeOpacity(overlay.opacity),
    });

    // Gentle Ken Burns pan/zoom, varied a little per overlay index.
    let kb = 1, panX = 0, panY = 0;
    if (kenBurns) {
        const variant = index % 3;
        if (variant === 0) kb = interpolate(frame, [0, durationInFrames], [1.1, 1.28], { extrapolateRight: 'clamp' });
        else if (variant === 1) { kb = 1.2; panX = interpolate(frame, [0, durationInFrames], [-50, 50], { extrapolateRight: 'clamp' }); }
        else { kb = 1.2; panY = interpolate(frame, [0, durationInFrames], [40, -40], { extrapolateRight: 'clamp' }); }
    }

    const parsedScale = parseFloat(overlay.position?.scale);
    const userScale = !isNaN(parsedScale) ? parsedScale / 100 : 1;
    const scale = anim.scale * kb * userScale;
    const src = mediaSrc(overlay);
    const regionStyle = region === 'top'
        ? { top: 0, left: 0, width: '100%', height: '40%', borderBottom: '5px solid rgba(0,0,0,0.4)' }
        : { top: 0, left: 0, width: '100%', height: '100%' };

    const mediaStyle = {
        width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${scale}) translateX(${panX + anim.translateX}px) translateY(${panY + anim.translateY}px) rotate(${overlay.position?.rotation || 0}deg)`,
    };

    return (
        <div style={{
            position: 'absolute', overflow: 'hidden', opacity: anim.opacity,
            filter: anim.blurAmt > 0 ? `blur(${anim.blurAmt}px)` : 'none',
            ...regionStyle,
        }}>
            {isVideo
                ? <MutedVideo src={src} style={mediaStyle} />
                : <Img src={src} style={mediaStyle} />}
        </div>
    );
};

const MotionGraphicRender = ({ overlay, durationInFrames }) => {
    if (overlay.templateId) {
        return (
            <CompositionRenderer
                templateId={overlay.templateId}
                props={overlay.props}
                position={overlay.position}
                opacity={overlay.opacity}
                backdrop={overlay.backdrop}
            />
        );
    }
    if (overlay.props?.html) {
        return (
            <HtmlGraphicRenderer
                html={overlay.props.html}
                position={overlay.position}
                opacity={overlay.opacity}
                backdrop={overlay.backdrop}
            />
        );
    }
    return (
        <DynamicGraphicRenderer
            code={overlay.props?.code}
            opacity={overlay.opacity}
            backdrop={overlay.backdrop}
            durationInFrames={durationInFrames}
            position={overlay.position}
        />
    );
};

const OverlayAudio = ({ overlay }) => {
    if (!overlay.audioEffect?.enabled || !overlay.audioEffect?.url) return null;
    return <Audio src={overlay.audioEffect.url} volume={overlay.audioEffect.volume ?? 0.8} />;
};

export const OverlayLayer = ({ overlays, fps, defaults = {}, mediaMode = 'scrapbook' }) => {
    if (!overlays) return null;

    return overlays.map((overlay, index) => {
        const startFrame = (overlay.startInSeconds || 0) * fps;
        const durationFrames = (overlay.durationInSeconds || 5) * fps;
        const key = `overlay-${index}`;

        if (overlay.type === 'Image' || overlay.type === 'Video') {
            const isVideo = overlay.type === 'Video';
            return (
                <Sequence key={key} from={startFrame} durationInFrames={durationFrames}>
                    <OverlayAudio overlay={overlay} />
                    {mediaMode === 'scrapbook' ? (
                        <ScrapbookMedia overlay={overlay} index={index} durationInFrames={durationFrames} isVideo={isVideo} />
                    ) : (
                        <FullBleedMedia
                            overlay={overlay}
                            index={index}
                            durationInFrames={durationFrames}
                            isVideo={isVideo}
                            kenBurns={mediaMode === 'kenburns'}
                            region={mediaMode === 'top' ? 'top' : 'full'}
                        />
                    )}
                </Sequence>
            );
        }

        if (overlay.type === 'Text' || overlay.type === 'TextOverlay') {
            return (
                <Sequence key={key} from={startFrame} durationInFrames={durationFrames}>
                    <OverlayAudio overlay={overlay} />
                    <TextOverlay
                        overlay={overlay}
                        durationInFrames={durationFrames}
                        styleVariation={defaults.textOverlayStyle || 'Sticker'}
                        fontSize={defaults.textOverlaySize || '65px'}
                        defaultTop={defaults.textOverlayTop || '150px'}
                    />
                </Sequence>
            );
        }

        if (overlay.type === 'MotionGraphic') {
            return (
                <Sequence key={key} from={startFrame} durationInFrames={durationFrames}>
                    <OverlayAudio overlay={overlay} />
                    <MotionGraphicRender overlay={overlay} durationInFrames={durationFrames} />
                </Sequence>
            );
        }

        return null;
    });
};
