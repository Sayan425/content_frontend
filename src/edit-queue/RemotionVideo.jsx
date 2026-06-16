import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BasicTemplate } from './components/remotion_templates/BasicTemplate';
import { FullScreenOverlayTemplate } from './components/remotion_templates/FullScreenOverlayTemplate';
import { SplitScreenTemplate } from './components/remotion_templates/SplitScreenTemplate';
import { TransparentTemplate } from './components/remotion_templates/TransparentTemplate';

const TEMPLATE_MAP = {
    'BasicTemplate': BasicTemplate,
    'FullScreenOverlayTemplate': FullScreenOverlayTemplate,
    'SplitScreenTemplate': SplitScreenTemplate,
    'TransparentTemplate': TransparentTemplate,
};

export const RemotionVideo = ({ config }) => {
    if (!config) return null;
    
    const SELECTED_TEMPLATE = config.templateId || 'BasicTemplate';
    const TemplateComponent = TEMPLATE_MAP[SELECTED_TEMPLATE] || BasicTemplate;

    return (
        <AbsoluteFill>
            <TemplateComponent config={config} />
        </AbsoluteFill>
    );
};
