/**
 * useCharlieVoice - Custom hook for Eleven Labs voice integration
 * Extracted from VoiceChatElevenLabs for use with floating globe
 */

import { useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useVoiceStore, VoiceAction } from '../../store/voiceStore';

const ELEVEN_LABS_AGENT_ID = 'agent_7401kds8pqx3fqwrgk46k99wyh7g';
const DEBUG_MODE = false;

// Lazy load Eleven Labs client - only on web
let ElevenLabsConversation: any = null;
const getConversation = async () => {
    if (Platform.OS !== 'web') {
        throw new Error('Voice only supported on web');
    }
    if (!ElevenLabsConversation) {
        try {
            // Dynamic import for web only
            const client = await import('@elevenlabs/client');
            ElevenLabsConversation = client.Conversation;
        } catch (e) {
            console.error('Failed to load Eleven Labs client:', e);
            throw new Error('Voice service unavailable');
        }
    }
    return ElevenLabsConversation;
};

interface UseCharlieVoiceOptions {
    onTranscript?: (text: string) => void;
    onResponse?: (text: string) => void;
    onAction?: (action: VoiceAction) => void;
}

export function useCharlieVoice(options: UseCharlieVoiceOptions = {}) {
    const {
        status,
        setStatus,
        setError,
        setExpanded,
        setTranscript,
        setResponse,
        reset,
    } = useVoiceStore();

    const conversationRef = useRef<any>(null);
    const isUnmountingRef = useRef(false);
    const isConnectingRef = useRef(false);
    const currentResponseRef = useRef('');

    // Cleanup on unmount
    useEffect(() => {
        isUnmountingRef.current = false;
        return () => {
            isUnmountingRef.current = true;
            if (conversationRef.current) {
                try {
                    conversationRef.current.endSession();
                } catch (e) {
                    // Ignore
                }
                conversationRef.current = null;
            }
        };
    }, []);

    const startConversation = useCallback(async () => {
        if (Platform.OS !== 'web') {
            setError('Voice chat is only supported on web');
            return;
        }

        if (isConnectingRef.current || conversationRef.current) {
            return;
        }

        isConnectingRef.current = true;

        try {
            setStatus('connecting');
            setError(null);

            await navigator.mediaDevices.getUserMedia({ audio: true });

            if (isUnmountingRef.current) {
                isConnectingRef.current = false;
                return;
            }

            const Conversation = await getConversation();

            if (isUnmountingRef.current) {
                isConnectingRef.current = false;
                return;
            }

            if (DEBUG_MODE) {
                console.log('[FloatingCharlie] Starting session with agent:', ELEVEN_LABS_AGENT_ID);
            }

            const conversation = await Conversation.startSession({
                agentId: ELEVEN_LABS_AGENT_ID,
                onConnect: () => {
                    if (DEBUG_MODE) console.log('[FloatingCharlie] Connected');
                    if (!isUnmountingRef.current) {
                        setStatus('connected');
                    }
                },
                onDisconnect: () => {
                    if (DEBUG_MODE) console.log('[FloatingCharlie] Disconnected');
                    if (!isUnmountingRef.current) {
                        setStatus('idle');
                        setExpanded(false);
                        conversationRef.current = null;
                    }
                },
                onMessage: (message: any) => {
                    if (DEBUG_MODE) console.log('[FloatingCharlie] Message:', message);
                    if (isUnmountingRef.current) return;

                    const source = message.source || message.type;
                    const text = message.message || message.text || message.content;
                    const isFinal = message.isFinal !== false;

                    if (source === 'user') {
                        if (isFinal && text) {
                            setTranscript(text);
                            options.onTranscript?.(text);
                        }
                    } else if (source === 'ai' || source === 'agent') {
                        if (text) {
                            currentResponseRef.current = text;
                            // Don't set response yet - wait for mode change
                        }
                    }
                },
                onModeChange: (mode: { mode: string }) => {
                    if (DEBUG_MODE) console.log('[FloatingCharlie] Mode:', mode.mode);
                    if (isUnmountingRef.current) return;

                    if (mode.mode === 'speaking') {
                        setStatus('speaking');
                        setExpanded(true);
                    } else if (mode.mode === 'listening') {
                        setStatus('listening');
                        // Add response to history when done speaking
                        if (currentResponseRef.current) {
                            setResponse(currentResponseRef.current);
                            options.onResponse?.(currentResponseRef.current);
                            currentResponseRef.current = '';
                        }
                        setExpanded(false);
                    }
                },
                onError: (error: Error) => {
                    console.error('[FloatingCharlie] Error:', error);
                    if (!isUnmountingRef.current) {
                        setError(error.message || 'Connection failed');
                        setStatus('error');
                        setTimeout(() => setStatus('idle'), 2000);
                    }
                },
            });

            if (!isUnmountingRef.current) {
                conversationRef.current = conversation;
            } else {
                try {
                    await conversation.endSession();
                } catch (e) {
                    // Ignore
                }
            }
        } catch (err: any) {
            console.error('[FloatingCharlie] Failed to start:', err);
            if (!isUnmountingRef.current) {
                setError(err.message || 'Failed to connect');
                setStatus('error');
                setTimeout(() => setStatus('idle'), 2000);
            }
        } finally {
            isConnectingRef.current = false;
        }
    }, [setStatus, setError, setExpanded, setTranscript, setResponse, options]);

    const endConversation = useCallback(async () => {
        const conversation = conversationRef.current;
        if (conversation) {
            conversationRef.current = null;
            try {
                await conversation.endSession();
            } catch (e) {
                // Ignore
            }
        }
        if (!isUnmountingRef.current) {
            setStatus('idle');
            setExpanded(false);
        }
    }, [setStatus, setExpanded]);

    const toggleConversation = useCallback(() => {
        if (status === 'idle' || status === 'error') {
            startConversation();
        } else {
            endConversation();
        }
    }, [status, startConversation, endConversation]);

    return {
        status,
        isActive: status !== 'idle' && status !== 'error',
        toggleConversation,
        startConversation,
        endConversation,
    };
}
