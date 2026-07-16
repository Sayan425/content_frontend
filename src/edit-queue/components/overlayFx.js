import { interpolate, spring } from 'remotion';

/**
 * Shared overlay animation + border-preset logic, so Image, Video, and Text
 * overlays all honor the same "Animations & Styles" panel controls.
 * Mirrors the behavior originally implemented for Image overlays.
 */

const ANIM_FRAMES = 15;

/**
 * Computes the animated visual state for one overlay at a given moment.
 *
 * @param relativeFrame     frames since the overlay appeared
 * @param durationInFrames  overlay lifetime in frames
 * @param fps               video fps
 * @param animationIn/out   names from MANIFEST_REFERENCE.md ('fade', 'pop', ...)
 * @param baseScale         user Scale control (1 = 100%)
 * @param userOpacity       user Opacity control (0..1)
 */
export function getAnimationState({ relativeFrame, durationInFrames, fps, animationIn, animationOut, baseScale = 1, userOpacity = 1 }) {
  let opacity = userOpacity;
  let scale = baseScale;
  let translateX = 0;
  let translateY = 0;
  let extraRotation = 0;
  let blurAmt = 0;
  let flipRotation = 0;

  const springEntry = spring({ frame: relativeFrame, fps, config: { damping: 12, stiffness: 100 } });
  const springExit = spring({ frame: durationInFrames - relativeFrame, fps, config: { damping: 12, stiffness: 100 } });

  if (relativeFrame < ANIM_FRAMES) {
    if (animationIn === 'fade') opacity = interpolate(relativeFrame, [0, ANIM_FRAMES], [0, userOpacity], { extrapolateRight: 'clamp' });
    else if (animationIn === 'pop') scale = springEntry * baseScale;
    else if (animationIn === 'slide_left') translateX = interpolate(relativeFrame, [0, ANIM_FRAMES], [500, 0], { extrapolateRight: 'clamp' });
    else if (animationIn === 'slide_right') translateX = interpolate(relativeFrame, [0, ANIM_FRAMES], [-500, 0], { extrapolateRight: 'clamp' });
    else if (animationIn === 'slide_up') translateY = interpolate(relativeFrame, [0, ANIM_FRAMES], [500, 0], { extrapolateRight: 'clamp' });
    else if (animationIn === 'slide_down') translateY = interpolate(relativeFrame, [0, ANIM_FRAMES], [-500, 0], { extrapolateRight: 'clamp' });
    else if (animationIn === 'zoom_in') scale = interpolate(relativeFrame, [0, ANIM_FRAMES], [0, baseScale], { extrapolateRight: 'clamp' });
    else if (animationIn === 'spin_in') {
      scale = springEntry * baseScale;
      extraRotation = interpolate(relativeFrame, [0, ANIM_FRAMES], [-180, 0], { extrapolateRight: 'clamp' });
    }
    else if (animationIn === 'drop_down') translateY = interpolate(relativeFrame, [0, ANIM_FRAMES], [-1000, 0], { extrapolateRight: 'clamp' });
    else if (animationIn === 'blur_in') {
      opacity = interpolate(relativeFrame, [0, ANIM_FRAMES], [0, userOpacity], { extrapolateRight: 'clamp' });
      blurAmt = interpolate(relativeFrame, [0, ANIM_FRAMES], [20, 0], { extrapolateRight: 'clamp' });
    }
    else if (animationIn === 'flip_in') {
      flipRotation = interpolate(relativeFrame, [0, ANIM_FRAMES], [90, 0], { extrapolateRight: 'clamp' });
      opacity = interpolate(relativeFrame, [0, ANIM_FRAMES], [0, userOpacity], { extrapolateRight: 'clamp' });
    }
  }

  const framesLeft = durationInFrames - relativeFrame;
  if (framesLeft < ANIM_FRAMES) {
    if (animationOut === 'fade') opacity = interpolate(framesLeft, [0, ANIM_FRAMES], [0, userOpacity], { extrapolateLeft: 'clamp' });
    else if (animationOut === 'pop') scale = springExit * baseScale;
    else if (animationOut === 'slide_right') translateX = interpolate(framesLeft, [0, ANIM_FRAMES], [500, 0], { extrapolateLeft: 'clamp' });
    else if (animationOut === 'slide_left') translateX = interpolate(framesLeft, [0, ANIM_FRAMES], [-500, 0], { extrapolateLeft: 'clamp' });
    else if (animationOut === 'slide_down') translateY = interpolate(framesLeft, [0, ANIM_FRAMES], [500, 0], { extrapolateLeft: 'clamp' });
    else if (animationOut === 'slide_up') translateY = interpolate(framesLeft, [0, ANIM_FRAMES], [-500, 0], { extrapolateLeft: 'clamp' });
    else if (animationOut === 'zoom_out') scale = interpolate(framesLeft, [0, ANIM_FRAMES], [0, baseScale], { extrapolateLeft: 'clamp' });
    else if (animationOut === 'spin_out') {
      scale = springExit * baseScale;
      extraRotation = interpolate(framesLeft, [0, ANIM_FRAMES], [180, 0], { extrapolateLeft: 'clamp' });
    }
    else if (animationOut === 'fly_away') {
      translateY = interpolate(framesLeft, [0, ANIM_FRAMES], [-1000, 0], { extrapolateLeft: 'clamp' });
      translateX = interpolate(framesLeft, [0, ANIM_FRAMES], [500, 0], { extrapolateLeft: 'clamp' });
    }
    else if (animationOut === 'blur_out') {
      opacity = interpolate(framesLeft, [0, ANIM_FRAMES], [0, userOpacity], { extrapolateLeft: 'clamp' });
      blurAmt = interpolate(framesLeft, [0, ANIM_FRAMES], [20, 0], { extrapolateLeft: 'clamp' });
    }
    else if (animationOut === 'flip_out') {
      flipRotation = interpolate(framesLeft, [0, ANIM_FRAMES], [90, 0], { extrapolateLeft: 'clamp' });
      opacity = interpolate(framesLeft, [0, ANIM_FRAMES], [0, userOpacity], { extrapolateLeft: 'clamp' });
    }
  }

  return { opacity, scale, translateX, translateY, extraRotation, blurAmt, flipRotation };
}

/** Container style for a media overlay's border preset. */
export function getBorderPresetStyle(borderPreset) {
  if (borderPreset === 'none') return { backgroundColor: 'transparent' };
  if (borderPreset === 'neon') return { backgroundColor: 'black', border: '2px solid #0ff', boxShadow: '0 0 20px #0ff, inset 0 0 20px #0ff', padding: '10px' };
  if (borderPreset === 'cyberpunk') return { backgroundColor: '#1a0b16', border: '3px solid #ff003c', boxShadow: '5px 5px 0px #00f0ff', padding: '12px' };
  if (borderPreset === 'cinematic') return { backgroundColor: '#111', border: '1px solid #333', padding: '2px' };
  if (borderPreset === 'minimal_shadow') return { backgroundColor: 'white', padding: '5px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', borderRadius: '12px' };
  if (borderPreset === 'glass') return { backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '15px', borderRadius: '16px' };
  if (borderPreset === 'gold_frame') return { backgroundColor: '#111', border: '8px solid #d4af37', boxShadow: 'inset 0 0 20px #8a6327, 0 10px 30px rgba(0,0,0,0.5)', padding: '2px' };
  if (borderPreset === 'comic_book') return { backgroundColor: 'white', border: '4px solid black', padding: '10px', boxShadow: '10px 10px 0px black' };
  if (borderPreset === 'retro_vhs') return { backgroundColor: 'black', border: '1px solid #555', padding: '15px', filter: 'contrast(1.2) sepia(0.3) hue-rotate(-20deg)', boxShadow: '3px 0px 0px red, -3px 0px 0px blue' };
  if (borderPreset === 'polaroid_modern') return { backgroundColor: 'white', padding: '15px 15px 45px 15px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', borderRadius: '8px' };
  if (borderPreset === 'airmail') return {
    backgroundColor: '#eee6d3',
    padding: '12px',
    borderStyle: 'solid',
    borderWidth: '2.4rem',
    borderImageSource: 'repeating-linear-gradient(142deg, #d22f47 0px 30px, transparent 30px 50px, #315f9b 50px 80px, transparent 80px 100px)',
    borderImageSlice: 40,
    borderImageWidth: '2.4rem',
  };
  // default: classic photographic scrapbook frame
  return { backgroundColor: 'white', padding: '20px 20px 60px 20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #ddd' };
}

/** Normalizes the 0–100 panel opacity to 0–1 (accepts either convention). */
export function normalizeOpacity(rawOpacity) {
  const v = rawOpacity !== undefined ? rawOpacity : 100;
  return v > 1 ? v / 100 : v;
}
