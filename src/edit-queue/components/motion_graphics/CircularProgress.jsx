"use client";

import React from 'react';
import { interpolate, useCurrentFrame } from "remotion";

export const CircularProgress = ({ 
	targetValue = 100, 
	animationDuration = 40 
}) => {
	const frame = useCurrentFrame();
	
	// Animate from 0 to targetValue over the specified duration
	const progress = interpolate(
		frame,
		[0, animationDuration],
		[0, targetValue],
		{
			extrapolateRight: "clamp",
		}
	);

	const rotation = (progress / 100) * 360;
	const radius = 80;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference - (progress / 100) * circumference;

	const pulse = 1 + Math.sin(frame / 10) * 0.05;

	return (
		<div style={{
			position: "absolute",
			top: "50%",
			left: "50%",
			transform: "translate(-50%, -50%)",
			width: "100%",
			height: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
		}}>
			<div style={{
				position: "relative",
				width: "300px",
				height: "300px",
				transform: `scale(${pulse})`,
			}}>
				<svg width="100%" height="100%" viewBox="0 0 200 200" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
					<circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="12" />
				</svg>

				<svg width="100%" height="100%" viewBox="0 0 200 200" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
					<circle
						cx="100" cy="100" r={radius}
						fill="none" stroke="url(#progressGradient)" strokeWidth="12"
						strokeDasharray={circumference}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
					/>
					<defs>
						<linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stopColor="#3b82f6" />
							<stop offset="100%" stopColor="#1e3a8a" />
						</linearGradient>
					</defs>
				</svg>

				<svg width="100%" height="100%" viewBox="0 0 200 200" style={{
					position: "absolute",
					transform: `rotate(${rotation - 90}deg)`,
				}}>
					<circle cx="180" cy="100" r="8" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
				</svg>

				<div style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					fontSize: "3.5rem",
					fontWeight: "bold",
					color: "white",
					fontFamily: "sans-serif"
				}}>
					{Math.round(progress)}%
				</div>
			</div>
		</div>
	);
};
