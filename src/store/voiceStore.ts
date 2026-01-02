/**
 * Voice Store - Global state management for Charlie's floating voice mode
 */

import { create } from 'zustand';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

export interface VoiceAction {
    type: 'PROJECT_CREATED' | 'FILE_MODIFIED' | 'DEPLOY_STARTED' | 'GENERIC';
    payload?: any;
    message: string;
}

interface VoiceState {
    // Connection state
    status: VoiceStatus;
    error: string | null;

    // UI state
    isExpanded: boolean;
    lastTranscript: string;
    lastResponse: string;

    // Pending action
    pendingAction: VoiceAction | null;

    // Methods
    setStatus: (status: VoiceStatus) => void;
    setError: (error: string | null) => void;
    setExpanded: (expanded: boolean) => void;
    setTranscript: (text: string) => void;
    setResponse: (text: string) => void;
    setPendingAction: (action: VoiceAction | null) => void;
    reset: () => void;
}

const initialState = {
    status: 'idle' as VoiceStatus,
    error: null,
    isExpanded: false,
    lastTranscript: '',
    lastResponse: '',
    pendingAction: null,
};

export const useVoiceStore = create<VoiceState>((set) => ({
    ...initialState,

    setStatus: (status) => set({ status }),
    setError: (error) => set({ error }),
    setExpanded: (expanded) => set({ isExpanded: expanded }),
    setTranscript: (text) => set({ lastTranscript: text }),
    setResponse: (text) => set({ lastResponse: text }),
    setPendingAction: (action) => set({ pendingAction: action }),
    reset: () => set(initialState),
}));
