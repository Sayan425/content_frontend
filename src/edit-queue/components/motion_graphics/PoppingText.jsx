"use client";

import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const PoppingText = ({ 
	text = "HELLO!",
	animationDuration 
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const textArray = text.split("");
	const colors = ["#1e3a8a", "#3b82f6", "#A9D6E5"];

	return (
		<div style={{
			position: "absolute",
			top: "50%",
			left: "50%",
			transform: "translate(-50%, -50%)",
			width: "100%",
			textAlign: "center",
			perspective: "1000px",
			height: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
		}}>
			{textArray.map((char, i) => {
				const delay = i * 7;
				const colorIndex = i % colors.length;

				// Spring stays at final position once complete
				const opacity = spring({
					frame: frame - delay,
					fps, from: 0, to: 1,
					config: { mass: 0.3, damping: 8, stiffness: 100 },
				});

				const y = spring({
					frame: frame - delay,
					fps, from: -200, to: 0,
					config: { mass: 0.5, damping: 6, stiffness: 120 },
				});

				const scale = spring({
					frame: frame - delay,
					fps, from: 0, to: 1.2,
					config: { mass: 0.4, damping: 7, stiffness: 150 },
				});

				// Pulsing effect
				const pulse = 1 + interpolate(Math.sin((frame - delay) / 10), [-1, 1], [0, 0.1]);

				return (
					<span key={i} style={{
						position: "relative",
						display: "inline-block",
						opacity,
						color: colors[colorIndex],
						fontSize: "8rem",
						fontWeight: "900",
						margin: "0 0.1em",
						transform: `translateY(${y}px) scale(${scale * pulse})`,
						fontFamily: "'Impact', 'Arial Black', sans-serif",
					}}>
						{char === " " ? "\u00A0" : char}
					</span>
				);
			})}
		</div>
	);
};
