import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Subtitles } from '../Subtitles';
import { resolveAssetUrl } from '../../utils/assetResolver';
import { ProgressBar } from '../ProgressBar';
import { OverlayLayer } from '../OverlayLayer';

// Transparent: the narrator is a cut-out composited over full-bleed visuals.
// Image/Video overlays fill the background with a Ken Burns motion; the
// speaker video sits on top. (Real chroma-key removal happens at final
// render; the preview shows the speaker over the visuals.)
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
    const fadeFrames = Math.min(
        TEMPLATE_DEFAULTS.bgmFadeSeconds * fps,
        Math.max(0, Math.floor(durationInFrames / 2))
    );

    const volume = fadeFrames > 0 && durationInFrames > fadeFrames * 2
        ? interpolate(
            frame,
            [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
            [0, targetVolume, targetVolume, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
        : targetVolume;

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {config.showProgressBar !== false && (
                <ProgressBar color={config.progressBarColor || '#ffcc00'} />
            )}
            {config.showBgm !== false && config.backgroundMusicUrl && (
                <Audio src={resolveAssetUrl(config.backgroundMusicUrl)} volume={volume} />
            )}

            {/* Full-bleed media overlays sit BEHIND the speaker cut-out. */}
            <OverlayLayer
                overlays={config.overlays}
                fps={fps}
                defaults={{ ...TEMPLATE_DEFAULTS, textOverlayStyle: config.textOverlayStyle || TEMPLATE_DEFAULTS.textOverlayStyle }}
                mediaMode="kenburns"
            />

            {/* Speaker video on top (chroma-keyed to a cut-out at final render). */}
            <OffthreadVideo
                src={resolveAssetUrl(config.videoUrl)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Subtitles above everything */}
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
