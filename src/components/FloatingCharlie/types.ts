/**
 * Shared types for FloatingCharlie components
 */

import { VoiceStatus, VoiceAction } from '../../store/voiceStore';

export interface CharlieGlobeProps {
    status: VoiceStatus;
    onPress: () => void;
    size?: number;
}

export interface CharlieFaceProps {
    visible: boolean;
    isSpeaking: boolean;
}

export interface FloatingCharlieProps {
    onAction?: (action: VoiceAction) => void;
    onProjectCreated?: () => void;
    onFileModified?: () => void;
}

export interface VoiceToastData {
    id: string;
    message: string;
    type: 'response' | 'action' | 'error' | 'transcript';
    duration?: number;
}
