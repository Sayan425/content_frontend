import React from 'react';
import { AbsoluteFill, OffthreadVideo, Img, useCurrentFrame, useVideoConfig, interpolate, Sequence } from 'remotion';
import { getAnimationState, getBorderPresetStyle, normalizeOpacity } from './overlayFx';
import { TextOverlay } from './TextOverlay';
import { CompositionRenderer } from './motion_graphics/CompositionRenderer';
import { HtmlGraphicRenderer } from './motion_graphics/HtmlGraphicRenderer';
import { DynamicGraphicRenderer } from './motion_graphics/DynamicGraphicRenderer';
import { resolveAssetUrl } from '../utils/assetResolver';

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
    const isWavy = overlay.borderPreset === 'wavy';
    const isLined = overlay.borderPreset === 'lined';
    const isArtDeco = overlay.borderPreset === 'artdeco';
    const isVintage = overlay.borderPreset === 'vintage';
    const isStructural = isWavy || isLined || isArtDeco || isVintage;

    // "Frameless Blurred Background": a blurred, enlarged copy of the media
    // fills the square area behind the sharp, contained copy — so any aspect
    // ratio fits with no hard frame. (Two media layers, same source.)
    const containerStyle = isBlurBg
        ? { position: 'relative', overflow: 'hidden', display: 'grid', width: '100%', aspectRatio: '1' }
        : isStructural
        ? { backgroundColor: 'transparent' }
        : getBorderPresetStyle(overlay.borderPreset || 'photographic');

    // "Wavy Edges": scalloped border via a tiled radial/conic mask, applied to
    // the image itself (the orange padding shows through the scallops).
    const s = 14;
    const r = (Math.SQRT2 * s).toFixed(2);
    const wavyMask =
        `radial-gradient(${r}px,#000 calc(100% - 1px),#0000), ` +
        `conic-gradient(#000 0 0) content-box, ` +
        `radial-gradient(${r}px,#0000 100%,#000 calc(100% + 1px)) ${s}px ${s}px padding-box`;
    const wavyStyle = {
        width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block',
        boxSizing: 'border-box', padding: `${s}px`, border: `${s}px solid transparent`,
        background: '#BF4D28', borderRadius: `${3.5 * s}px`,
        WebkitMask: wavyMask, mask: wavyMask,
        WebkitMaskSize: `${4 * s}px ${4 * s}px`, maskSize: `${4 * s}px ${4 * s}px`,
    };

    // "Infinite Lined Borders": concentric rings drawn with a repeating radial
    // border-image in a thick transparent border band.
    const lb = 16, ln = 5, lc = '#774F38';
    const lp = lb * ln;
    const lsz = 460;
    const ld = lsz / (2 * ln) + lb;
    const linedStyle = {
        width: `${lsz}px`, aspectRatio: '1.2', objectFit: 'cover', display: 'block',
        boxSizing: 'border-box', border: `${lp}px solid transparent`,
        borderRadius: `${lp + lb / 4}px`,
        borderImage: `repeating-radial-gradient(${lc} 0,#0000 2px calc(${(ld / 2).toFixed(2)}px - 2px),${lc} ${(ld / 2).toFixed(2)}px ${ld.toFixed(2)}px) 49.8%/${lp}px`,
        clipPath: `inset(0 round ${lp}px)`,
    };

    // "Art Deco Corners": thin gold frame with L-shaped corner brackets.
    const deco = '#e8d3a0';
    const cornerStyle = (corner) => ({
        position: 'absolute', width: '22px', height: '22px', borderStyle: 'solid',
        borderColor: deco, borderWidth: 0,
        ...(corner.includes('t') ? { top: '-5px', borderTopWidth: '1px' } : { bottom: '-5px', borderBottomWidth: '1px' }),
        ...(corner.includes('l') ? { left: '-5px', borderLeftWidth: '1px' } : { right: '-5px', borderRightWidth: '1px' }),
    });

    const MediaTag = isVideo ? OffthreadVideo : Img;

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
                        <MediaTag src={src} style={{ gridArea: '1/1', width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(0.8) blur(40px)', transform: 'scale(1.3)' }} />
                        <MediaTag src={src} style={{ gridArea: '1/1', margin: 'auto', width: '78%', height: '78%', objectFit: 'contain', boxShadow: '0 0 20px #0005', zIndex: 1 }} />
                    </>
                ) : isWavy ? (
                    <MediaTag src={src} style={wavyStyle} />
                ) : isLined ? (
                    <MediaTag src={src} style={linedStyle} />
                ) : isArtDeco ? (
                    <div style={{ position: 'relative', border: `1px solid ${deco}`, padding: '14px', backgroundColor: '#17121c', display: 'flex' }}>
                        <MediaTag src={src} style={{ width: '100%', height: 'auto', display: 'block' }} />
                        {['tl', 'tr', 'bl', 'br'].map(c => <span key={c} style={cornerStyle(c)} />)}
                    </div>
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
                ? <OffthreadVideo src={src} style={mediaStyle} />
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
                    <MotionGraphicRender overlay={overlay} durationInFrames={durationFrames} />
                </Sequence>
            );
        }

        return null;
    });
};
