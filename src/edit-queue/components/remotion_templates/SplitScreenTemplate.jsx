import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Subtitles } from '../Subtitles';
import { resolveAssetUrl } from '../../utils/assetResolver';
import { ProgressBar } from '../ProgressBar';
import { OverlayLayer } from '../OverlayLayer';

// Split-Screen (NEWS / REPORT STYLE): speaker in the bottom 60%, visual
// context (image/video overlays) in the top 40% panel. Text and motion
// graphics render on top.
const TEMPLATE_DEFAULTS = {
    subtitleStyle: 'Highlight',
    subtitleBottom: '1100px',
    subtitleSize: '65px',
    textOverlayStyle: 'Highlight',
    textOverlaySize: '65px',
    textOverlayTop: '150px',
    bgmVolume: 0.35,
    bgmFadeSeconds: 2
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
            {config.showBgm !== false && config.backgroundMusicUrl && (
                <Audio src={resolveAssetUrl(config.backgroundMusicUrl)} volume={volume} />
            )}

            {/* Main Video Layer - bottom 60% */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%', overflow: 'hidden' }}>
                <OffthreadVideo
                    src={resolveAssetUrl(config.videoUrl)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>

            {/* Empty top state placeholder (shown when no media overlay is active) */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '40%',
                backgroundColor: '#0a0a0a', display: 'flex', justifyContent: 'center',
                alignItems: 'center', color: '#333', fontSize: '40px', fontWeight: 'bold',
                fontFamily: 'system-ui'
            }}>
                <div style={{ opacity: 0.3 }}>VISUAL CONTEXT</div>
            </div>

            {/* Media overlays fill the top panel; text/motion graphics on top. */}
            <OverlayLayer
                overlays={config.overlays}
                fps={fps}
                defaults={{ ...TEMPLATE_DEFAULTS, textOverlayStyle: config.textOverlayStyle || TEMPLATE_DEFAULTS.textOverlayStyle }}
                mediaMode="top"
            />

            {/* Subtitles centered on the bridge */}
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
