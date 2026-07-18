import React from 'react';

// Helper to render text or words
const RenderText = ({ words, text, activeStyle, inactiveStyle, staticStyle }) => {
    if (!words) return <span style={staticStyle}>{text}</span>;
    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.25em',
            lineHeight: '1.2'
        }}>
            {words.map((w, i) => (
                <span
                    key={i}
                    style={{
                        display: 'inline-block',
                        transition: 'all 0.15s cubic-bezier(0.33, 1, 0.68, 1)',
                        opacity: w.isActive ? 1 : 0.6,
                        filter: w.isActive ? 'drop-shadow(0 0 15px rgba(255,255,255,0.3))' : 'none',
                        ...(w.isActive ? activeStyle : inactiveStyle),
                    }}
                >
                    {w.text}
                </span>
            ))}
        </div>
    );
};

export const Classic = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        color: 'white',
        fontWeight: '700',
        fontFamily: 'Inter, sans-serif',
        textTransform: 'uppercase',
        textShadow: '0px 4px 10px rgba(0,0,0,0.8)',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: '10px 20px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{ transform: 'scale(1.05)', color: '#fff' }}
        />
    </div>
);

export const Highlight = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        color: 'white',
        fontWeight: '800',
        fontFamily: 'Inter, sans-serif',
        textTransform: 'uppercase',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{ backgroundColor: '#FFD700', color: 'black', padding: '0px 10px', borderRadius: '4px', transform: 'scale(1.05)' }}
            staticStyle={{ backgroundColor: '#FFD700', color: 'black', padding: '4px 14px', borderRadius: '4px' }}
        />
    </div>
);

export const Glassmorphism = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        color: 'white',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        fontWeight: '600',
        fontFamily: 'Inter, sans-serif',
        padding: '10px 20px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{ color: '#00FF7F', textShadow: '0 0 10px rgba(0, 255, 127, 0.5)' }}
        />
    </div>
);

export const Retro = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        color: '#00FF41',
        fontWeight: '400',
        fontFamily: 'Courier New, monospace',
        textTransform: 'uppercase',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: '10px 20px',
        border: '2px solid #00FF41',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{ backgroundColor: '#00FF41', color: 'black' }}
        />
    </div>
);

export const Bubble = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        color: '#333',
        backgroundColor: 'white',
        fontWeight: '700',
        fontFamily: 'Comic Sans MS, cursive',
        padding: '15px 30px',
        borderRadius: '50px',
        boxShadow: 'inset 0px -5px 0px #ddd',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{ color: '#ff4757', transform: 'scale(1.06)' }}
            staticStyle={{ color: '#ff4757' }}
        />
    </div>
);

export const Cyberpunk = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        color: '#fff',
        fontWeight: '900',
        fontFamily: 'Orbitron, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        textShadow: '3px 3px 0px #ff00ff, -3px -3px 0px #00ffff',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{
                color: '#fff',
                textShadow: '0 0 10px #fff, 0 0 20px #ff00ff, 0 0 30px #ff00ff',
                transform: 'skewX(-10deg) scale(1.1)',
            }}
        />
    </div>
);

export const Sticker = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        fontWeight: '900',
        fontFamily: 'system-ui, sans-serif',
        textTransform: 'uppercase',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{
                backgroundColor: '#ff0055',
                color: 'white',
                padding: '5px 15px',
                borderRadius: '8px',
                border: '4px solid white',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                transform: 'scale(1.2) rotate(-3deg)',
                zIndex: 10
            }}
            inactiveStyle={{
                backgroundColor: 'white',
                color: 'black',
                padding: '5px 15px',
                borderRadius: '8px',
                border: '4px solid #eee',
                transform: 'rotate(2deg)',
                opacity: 0.8
            }}
            staticStyle={{
                backgroundColor: '#ff0055',
                color: 'white',
                padding: '5px 15px',
                borderRadius: '8px',
                border: '4px solid white',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
            }}
        />
    </div>
);

export const Minimalist = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        color: '#222',
        fontWeight: '300',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px 20px',
        borderRadius: '2px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{
                color: '#000',
                fontWeight: '700',
                borderBottom: '5px solid #000',
                paddingBottom: '2px',
                transform: 'scale(1.06)'
            }}
            staticStyle={{
                color: '#000',
                fontWeight: '700',
                borderBottom: '5px solid #000',
                paddingBottom: '2px',
            }}
        />
    </div>
);

export const Butter = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        fontWeight: '700',
        fontFamily: 'Georgia, serif',
        letterSpacing: '0.03em',
        color: '#F9f1cc',
        textShadow: '3px 3px 0px #FFB650, 6px 6px 0px #FFD662, 9px 9px 0px #FF80BF, 12px 12px 0px #EF5097, 15px 15px 0px #6868AC',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{
                color: '#fff',
                transform: 'scale(1.12)',
                textShadow: '4px 4px 0px #FFB650, 8px 8px 0px #FFD662, 12px 12px 0px #FF80BF, 16px 16px 0px #EF5097, 0 0 25px rgba(255,182,80,0.6)',
            }}
            inactiveStyle={{
                color: 'rgba(249,241,204,0.5)',
                textShadow: '2px 2px 0px rgba(255,182,80,0.4), 4px 4px 0px rgba(255,214,98,0.3)',
            }}
        />
    </div>
);

export const Layered = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        fontWeight: '900',
        fontFamily: 'system-ui, sans-serif',
        textTransform: 'uppercase',
        color: '#e8a87c',
        textShadow: '-4px 4px 0 #d85d43, -8px 8px 0 #c2185b',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{ color: '#fff', textShadow: '-4px 4px 0 #ff6f61, -8px 8px 0 #e91e63', transform: 'scale(1.08)' }}
            inactiveStyle={{ color: '#e8a87c' }}
        />
    </div>
);

export const PaperCutout = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        fontWeight: '800',
        fontFamily: 'system-ui, sans-serif',
        textTransform: 'uppercase',
        background: 'linear-gradient(305deg, tomato, gold, cyan)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(3px 3px 0 rgba(30,30,60,0.7))',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{ transform: 'scale(1.1)', filter: 'brightness(1.2)' }}
            inactiveStyle={{ filter: 'brightness(0.5)' }}
        />
    </div>
);

export const Sliced = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        fontWeight: '700',
        fontFamily: 'system-ui, sans-serif',
        textTransform: 'uppercase',
        position: 'relative',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.3',
    }}>
        <div style={{ color: 'white', clipPath: 'polygon(0% 0%, 100% 0%, 100% 45%, 0% 55%)' }}>
            <RenderText
                words={words}
                text={text}
                activeStyle={{ color: '#fff', transform: 'scale(1.05)' }}
                inactiveStyle={{ color: 'rgba(255,255,255,0.7)' }}
            />
        </div>
        <div style={{
            position: 'absolute', top: '6px', left: 0, width: '100%',
            color: 'rgba(255,255,255,0.45)',
            clipPath: 'polygon(0% 55%, 100% 45%, 100% 100%, 0% 100%)',
            transform: 'translateX(-6px)',
        }}>
            <RenderText
                words={words}
                text={text}
                activeStyle={{ color: 'rgba(255,255,255,0.6)' }}
                inactiveStyle={{ color: 'rgba(255,255,255,0.3)' }}
            />
        </div>
    </div>
);

export const Press = ({ text, words, scale, opacity }) => (
    <div style={{
        transform: `scale(${scale})`,
        opacity: opacity,
        color: '#2c1e1e',
        fontWeight: '400',
        fontFamily: 'Courier New, Courier, monospace',
        backgroundColor: '#f4f1ea',
        padding: '10px 20px',
        boxShadow: '2px 2px 0px rgba(0,0,0,0.1)',
        border: '1px solid #d3d0c9',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
    }}>
        <RenderText
            words={words}
            text={text}
            activeStyle={{
                color: '#8b0000',
                fontWeight: '900',
                textDecoration: 'underline',
            }}
            staticStyle={{
                color: '#8b0000',
                fontWeight: '900',
                textDecoration: 'underline',
            }}
        />
    </div>
);
