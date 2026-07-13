import React, { useMemo, useEffect, useState } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, continueRender, delayRender } from 'remotion';
import * as Styles from './StyleVariations';
import { resolveAssetUrl } from '../../utils/assetResolver';

const parseSrt = (srtFile) => {
    const segments = [];
    const blocks = srtFile.trim().split(/\n\s*\n/);
    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length < 2) continue;
        const timeLine = lines.find(l => l.includes(' --> '));
        if (!timeLine) continue;
        const startTime = parseTime(timeLine.split(' --> ')[0]);
        const endTime = parseTime(timeLine.split(' --> ')[1]);
        const text = lines.slice(lines.indexOf(timeLine) + 1).join(' ').trim();
        segments.push({ startInSeconds: startTime, endInSeconds: endTime, text });
    }
    return segments;
};

const parseTime = (timeStr) => {
    const parts = timeStr.split(':');
    const secondsParts = parts[2].split(',');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(secondsParts[0]) + parseInt(secondsParts[1]) / 1000;
};

export const Subtitles = ({ 
    src,
    subtitleData,
    styleVariation = 'Classic', 
    bottomOffset = '220px',
    fontSize = '65px' 
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;
    const [segments, setSegments] = useState([]);
    const [handle] = useState(() => delayRender('Loading Subtitles'));

    useEffect(() => {
        if (subtitleData) {
            // Use data passed directly from Supabase config
            if (Array.isArray(subtitleData) && (subtitleData[0]?.words || subtitleData[0]?.text)) {
                console.log("Loaded JSON subtitles from config:", subtitleData.length, "segments");
                const mapped = subtitleData.map((item) => ({
                    startInSeconds: item.start,
                    endInSeconds: item.end,
                    text: item.text,
                    words: item.words
                }));
                setSegments(mapped);
            }
            continueRender(handle);
            return;
        }

        if (!src) {
            continueRender(handle);
            return;
        }

        const resolvedUrl = resolveAssetUrl(src);
        console.log("Fetching subtitles from:", resolvedUrl);
        fetch(resolvedUrl)
            .then(res => {
                const isJson = src.toLowerCase().includes('.json');
                return isJson ? res.json() : res.text();
            })
            .then(data => {
                if (Array.isArray(data) && (data[0]?.words || data[0]?.text)) {
                    console.log("Loaded JSON subtitles:", data.length, "segments");
                    const mapped = data.map((item) => ({
                        startInSeconds: item.start,
                        endInSeconds: item.end,
                        text: item.text,
                        words: item.words
                    }));
                    setSegments(mapped);
                } else if (typeof data === 'string') {
                    console.log("Loaded SRT subtitles");
                    setSegments(parseSrt(data));
                }
                continueRender(handle);
            })
            .catch((err) => {
                console.error("Subtitle load error:", err);
                continueRender(handle);
            });
    }, [src, subtitleData, handle]);

    const currentSegment = segments.find(s => currentTime >= s.startInSeconds && currentTime <= s.endInSeconds);

    if (!currentSegment) return null;

    // Calculate highlighting for JSON format
    const wordsWithState = currentSegment.words?.map(w => ({
        text: w.text ?? w.word,
        isActive: currentTime >= w.start && currentTime <= w.end
    }));

    const progress = (currentTime - currentSegment.startInSeconds) * 10;
    const scale = interpolate(progress, [0, 1], [0.95, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    const StyleComponent = Styles[styleVariation] || Styles.Classic;

    return (
        <div style={{
            position: 'absolute',
            bottom: bottomOffset,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            padding: '0 60px',
            textAlign: 'center',
            zIndex: 100,
        }}>
            <div style={{ fontSize: fontSize }}>
                <StyleComponent 
                    text={currentSegment.text} 
                    words={wordsWithState}
                    scale={scale} 
                    opacity={opacity} 
                />
            </div>
        </div>
    );
};
