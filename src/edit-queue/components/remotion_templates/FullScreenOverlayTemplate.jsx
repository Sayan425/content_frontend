import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Subtitles } from '../Subtitles';
import { resolveAssetUrl } from '../../utils/assetResolver';
import { ProgressBar } from '../ProgressBar';
import { OverlayLayer } from '../OverlayLayer';

// Full Screen Overlay: image/video overlays cover the whole frame (the
// narrator's face) while they're on screen; text and motion graphics still
// sit on top as usual.
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

export const FullScreenOverlayTemplate = ({ config }) => {
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
                <Audio src={resolveAssetUrl(config.backgroundMusicUrl)} volume={volume} />
            )}

            {/* Main Video Layer */}
            <OffthreadVideo
                src={resolveAssetUrl(config.videoUrl)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Media overlays cover the frame; text/motion graphics sit on top. */}
            <OverlayLayer
                overlays={config.overlays}
                fps={fps}
                defaults={{ ...TEMPLATE_DEFAULTS, textOverlayStyle: config.textOverlayStyle || TEMPLATE_DEFAULTS.textOverlayStyle }}
                mediaMode="fullscreen"
            />

            {/* Automatic AI Subtitles Layer (above the covering media) */}
            {config.showSubtitles !== false && (config.subtitlesUrl || config.subtitleData) && (
                <Subtitles
                    src={config.subtitlesUrl}
                    subtitleData={config.subtitleData}
                    styleVariation={config.subtitleStyle || TEMPLATE_DEFAULTS.subtitleStyle}
                    bottomOffset={config.subtitleBottom || TEMPLATE_DEFAULTS.subtitleBottom}
                    fontSize={config.subtitleSize || TEMPLATE_DEFAULTS.subtitleSize}
                />
            )}
        </AbsoluteFill>
    );
};
