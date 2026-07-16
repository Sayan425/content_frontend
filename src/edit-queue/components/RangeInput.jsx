import React, { useState, useEffect } from 'react';

/**
 * Slider + keyboard-editable number field, kept in sync. The typed value and
 * the slider are both clamped to [min, max], so neither path can exceed the
 * limits. While typing, intermediate/empty text is allowed (so you can clear
 * and retype); the committed value is clamped on blur or Enter.
 */
const clamp = (n, min, max) => {
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
};

export const RangeInput = ({ label, value, onChange, min, max, step }) => {
  // Local text state lets the field show what's being typed without fighting
  // the clamped source of truth on every keystroke.
  const [text, setText] = useState(String(value ?? 0));

  useEffect(() => {
    setText(String(value ?? 0));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(text);
    if (isNaN(parsed)) {
      setText(String(value ?? 0)); // revert bad input
      return;
    }
    const clamped = clamp(parsed, min, max);
    setText(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-sm font-medium text-on-surface-variant flex justify-between items-center gap-2">
        <span>{label}</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') { commit(); e.target.blur(); } }}
          className="w-16 text-center tabular-nums bg-white/5 border border-white/15 text-on-surface font-semibold text-sm px-2 py-1 rounded-md hover:border-white/30 hover:bg-white/10 focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-colors cursor-text [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value || 0, min, max)}
        onChange={e => onChange(clamp(parseFloat(e.target.value), min, max))}
        className="w-full accent-primary"
      />
    </div>
  );
};
