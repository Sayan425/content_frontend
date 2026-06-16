import React from 'react';
import * as Styles from '../Subtitles/StyleVariations';

export const StaticText = ({ 
    text, 
    styleVariation, 
    fontSize = '65px' 
}) => {
    // Dynamically pick the style component
    const StyleComponent = Styles[styleVariation] || Styles.Classic;

    return (
        <div style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: fontSize,
        }}>
            <StyleComponent 
                text={text} 
                scale={1} 
                opacity={1} 
                words={undefined} // Passing undefined makes it static
            />
        </div>
    );
};
