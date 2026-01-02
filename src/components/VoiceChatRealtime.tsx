/**
 * VoiceChatRealtime - Real-time voice conversation with Charlie
 * Continuous listening with automatic silence detection
 *
 * State Machine:
 * - IDLE: Not listening, waiting for user to start
 * - LISTENING: Recording audio, detecting voice activity
 * - PROCESSING: Transcribing and getting response
 * - SPEAKING: Playing Charlie's audio response
 * - After SPEAKING → auto-return to LISTENING (if conversation active)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Platform,
} from 'react-native';
import { useAuth } from '../store/AuthContext';

// Use your computer's IP for mobile access, localhost for web
const getApiBase = () => {
    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        return `http://${hostname}:3000`;
    }
    return 'http://192.168.1.144:3000';
};
const API_BASE = getApiBase();

interface Message {
    id: string;
    type: 'user' | 'charlie' | 'system';
    text: string;
    timestamp: Date;
}

type ConversationState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking';

interface VoiceChatRealtimeProps {
    onClose?: () => void;
}

export function VoiceChatRealtime({ onClose }: VoiceChatRealtimeProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [state, setState] = useState<ConversationState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [volumeLevel, setVolumeLevel] = useState(0); // Visual feedback

    // Use refs for values that need to be accessed in callbacks without stale closures
    const isActiveRef = useRef(false);
    const isProcessingRef = useRef(false);
    const stateRef = useRef<ConversationState>('idle');
    const hasSpokenRef = useRef(false); // Track if user has spoken

    const scrollViewRef = useRef<ScrollView>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const vadIntervalRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number>(0);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const lastVolumeUpdateRef = useRef<number>(0);
    const voiceFrameCountRef = useRef<number>(0); // Consecutive frames with voice
    const silenceFrameCountRef = useRef<number>(0); // Consecutive frames with silence

    // Voice Activity Detection settings
    const VOICE_THRESHOLD = 0.035; // Higher threshold - must be actual speech, not background noise
    const SILENCE_THRESHOLD = 0.015; // Below this is considered silence
    const VOICE_FRAMES_REQUIRED = 5; // Need 5 consecutive frames above threshold to count as speech (~80ms)
    const SILENCE_FRAMES_REQUIRED = 15; // Need 15 consecutive frames below threshold (~250ms) before starting timeout
    const SILENCE_DURATION = 800; // 0.8 seconds of sustained silence after speech before processing
    const MAX_RECORDING_MS = 60000; // Max recording duration (60 sec fallback)

    // Update state ref whenever state changes
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const addMessage = useCallback((type: Message['type'], text: string) => {
        setMessages(prev => [...prev, {
            id: `msg_${Date.now()}_${Math.random()}`,
            type,
            text,
            timestamp: new Date(),
        }]);
    }, []);

    // Initial greeting
    useEffect(() => {
        if (user && messages.length === 0) {
            addMessage('charlie', `Hey ${user.name.split(' ')[0]}! Tap Start to begin our conversation - I'll listen and respond naturally.`);
        }
    }, [user, messages.length, addMessage]);

    // Scroll to bottom on new messages
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = () => {
        isActiveRef.current = false;
        isProcessingRef.current = false;
        hasSpokenRef.current = false;
        voiceFrameCountRef.current = 0;
        silenceFrameCountRef.current = 0;
        setVolumeLevel(0);

        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }

        if (vadIntervalRef.current) {
            cancelAnimationFrame(vadIntervalRef.current);
            vadIntervalRef.current = null;
        }

        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }

        if (mediaRecorderRef.current?.state === 'recording') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                // Ignore errors during cleanup
            }
        }
        mediaRecorderRef.current = null;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const detectVoiceActivity = useCallback(() => {
        if (!analyserRef.current || !isActiveRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume (normalized 0-1)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;

        // Throttle volume state updates to reduce re-renders (every 100ms)
        const now = Date.now();
        if (now - lastVolumeUpdateRef.current > 100) {
            lastVolumeUpdateRef.current = now;
            setVolumeLevel(Math.min(average * 10, 1)); // Amplify for visibility
        }

        // Only process if we're actively recording
        if (mediaRecorderRef.current?.state === 'recording' && stateRef.current === 'listening') {
            const recordingDuration = Date.now() - recordingStartTimeRef.current;

            // Check for max recording duration (fallback)
            if (recordingDuration > MAX_RECORDING_MS && hasSpokenRef.current) {
                console.log('Max recording duration reached, processing...');
                processCurrentRecording();
                return;
            }

            const isVoice = average >= VOICE_THRESHOLD;
            // Once speech is confirmed, anything below voice threshold counts as "not speaking"
            const isNotSpeaking = hasSpokenRef.current ? (average < VOICE_THRESHOLD) : (average < SILENCE_THRESHOLD);

            if (isVoice) {
                // Voice detected - count consecutive frames
                voiceFrameCountRef.current++;
                silenceFrameCountRef.current = 0;

                // Only mark as "spoken" after sustained voice detection
                if (voiceFrameCountRef.current >= VOICE_FRAMES_REQUIRED && !hasSpokenRef.current) {
                    console.log('Speech confirmed! average:', average.toFixed(4), 'frames:', voiceFrameCountRef.current);
                    hasSpokenRef.current = true;
                }

                // Cancel any pending silence timeout - user is speaking
                if (silenceTimeoutRef.current) {
                    clearTimeout(silenceTimeoutRef.current);
                    silenceTimeoutRef.current = null;
                }
            } else if (isNotSpeaking) {
                // Not speaking (either silence OR noise zone after speech started)
                silenceFrameCountRef.current++;
                voiceFrameCountRef.current = 0;

                // Only start silence timeout after confirmed speech AND sustained not-speaking
                if (hasSpokenRef.current &&
                    silenceFrameCountRef.current >= SILENCE_FRAMES_REQUIRED &&
                    !silenceTimeoutRef.current) {
                    console.log('Speech ended, starting timeout... average:', average.toFixed(4), 'frames:', silenceFrameCountRef.current);
                    silenceTimeoutRef.current = setTimeout(() => {
                        console.log('Timeout fired! Processing...');
                        silenceTimeoutRef.current = null;

                        if (mediaRecorderRef.current?.state === 'recording' &&
                            !isProcessingRef.current &&
                            isActiveRef.current &&
                            hasSpokenRef.current) {
                            processCurrentRecording();
                        }
                    }, SILENCE_DURATION);
                }
            } else {
                // Below voice threshold but above silence - gradual voice frame decay
                voiceFrameCountRef.current = Math.max(0, voiceFrameCountRef.current - 1);
            }
        }

        // Continue monitoring if conversation is active
        if (isActiveRef.current) {
            vadIntervalRef.current = requestAnimationFrame(detectVoiceActivity);
        }
    }, []);

    const processCurrentRecording = useCallback(() => {
        console.log('processCurrentRecording called, recorder state:', mediaRecorderRef.current?.state);
        if (mediaRecorderRef.current?.state === 'recording') {
            console.log('Stopping MediaRecorder...');
            mediaRecorderRef.current.stop();
        } else {
            console.log('MediaRecorder not in recording state, cannot stop');
        }
    }, []);

    const processAudio = useCallback(async (audioBlob: Blob) => {
        // Guard against double processing or inactive state
        if (isProcessingRef.current || !isActiveRef.current) {
            console.log('Skipping processAudio - already processing or inactive');
            return;
        }

        console.log('Processing audio blob, size:', audioBlob.size, 'hasSpoken:', hasSpokenRef.current);

        // Skip very short recordings (likely noise) - only if we didn't detect speech
        if (audioBlob.size < 1000 && !hasSpokenRef.current) {
            console.log('Audio too short and no speech detected, resuming listening');
            if (isActiveRef.current) {
                startRecording();
            }
            return;
        }

        isProcessingRef.current = true;
        setState('processing');

        try {
            // Transcribe with OpenAI Whisper
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            console.log('Transcribing audio...');
            const transcribeResponse = await fetch(`${API_BASE}/voice/transcribe`, {
                method: 'POST',
                body: formData,
            });

            const transcribeData = await transcribeResponse.json();
            console.log('Transcription result:', transcribeData);

            if (!transcribeData.success || !transcribeData.data?.text?.trim()) {
                // No speech detected, resume listening
                console.log('No speech detected, resuming listening');
                isProcessingRef.current = false;
                if (isActiveRef.current) {
                    setState('listening');
                    startRecording();
                }
                return;
            }

            const userText = transcribeData.data.text.trim();
            addMessage('user', userText);

            // Get response from Charlie
            console.log('Getting Charlie response...');
            const commandResponse = await fetch(`${API_BASE}/voice/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: userText,
                    userId: user?.id || 'anonymous',
                    sessionId: `realtime_${Date.now()}`,
                    role: user?.role || 'LORD',
                }),
            });

            const commandData = await commandResponse.json();
            console.log('Command response:', commandData.success);

            if (commandData.success && commandData.data?.text) {
                addMessage('charlie', commandData.data.text);

                // Play audio response
                if (commandData.data.audioBase64 && Platform.OS === 'web') {
                    setState('speaking');

                    const audio = new Audio(`data:audio/mpeg;base64,${commandData.data.audioBase64}`);
                    currentAudioRef.current = audio;

                    audio.onended = () => {
                        console.log('Audio playback ended');
                        currentAudioRef.current = null;
                        isProcessingRef.current = false;

                        // Auto-resume listening if conversation is still active
                        if (isActiveRef.current) {
                            console.log('Resuming listening after speech');
                            setState('listening');
                            startRecording();
                        } else {
                            setState('idle');
                        }
                    };

                    audio.onerror = (e) => {
                        console.error('Audio playback error:', e);
                        currentAudioRef.current = null;
                        isProcessingRef.current = false;

                        if (isActiveRef.current) {
                            setState('listening');
                            startRecording();
                        } else {
                            setState('idle');
                        }
                    };

                    await audio.play();
                } else {
                    // No audio to play, resume listening
                    isProcessingRef.current = false;
                    if (isActiveRef.current) {
                        setState('listening');
                        startRecording();
                    } else {
                        setState('idle');
                    }
                }
            } else {
                // No response, resume listening
                isProcessingRef.current = false;
                if (isActiveRef.current) {
                    setState('listening');
                    startRecording();
                } else {
                    setState('idle');
                }
            }
        } catch (err) {
            console.error('Audio processing error:', err);
            setError('Processing failed. Resuming...');
            isProcessingRef.current = false;

            // Clear error after a moment
            setTimeout(() => setError(null), 3000);

            if (isActiveRef.current) {
                setState('listening');
                startRecording();
            } else {
                setState('idle');
            }
        }
    }, [user, addMessage]);

    const startRecording = useCallback(() => {
        if (!streamRef.current || isProcessingRef.current || !isActiveRef.current) {
            console.log('Cannot start recording:', {
                hasStream: !!streamRef.current,
                isProcessing: isProcessingRef.current,
                isActive: isActiveRef.current,
            });
            return;
        }

        // Clear any existing silence timeout
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }

        // Reset speech tracking for new recording
        hasSpokenRef.current = false;
        voiceFrameCountRef.current = 0;
        silenceFrameCountRef.current = 0;

        try {
            chunksRef.current = [];
            recordingStartTimeRef.current = Date.now();

            const mediaRecorder = new MediaRecorder(streamRef.current, {
                mimeType: 'audio/webm;codecs=opus',
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log('MediaRecorder onstop fired! chunks:', chunksRef.current.length, 'isActive:', isActiveRef.current);
                if (chunksRef.current.length > 0) {
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    console.log('Created audio blob, size:', audioBlob.size);
                    if (isActiveRef.current) {
                        processAudio(audioBlob);
                    } else {
                        console.log('Not processing - conversation is no longer active');
                    }
                } else {
                    console.log('No audio chunks to process');
                }
            };

            mediaRecorder.start(100); // Collect data every 100ms
            mediaRecorderRef.current = mediaRecorder;

            console.log('Recording started');
            setState('listening');

            // Start voice activity detection
            detectVoiceActivity();
        } catch (err) {
            console.error('Recording start error:', err);
            setError('Failed to start recording');
        }
    }, [processAudio, detectVoiceActivity]);

    const startConversation = async () => {
        if (Platform.OS !== 'web') {
            setError('Real-time voice is only supported on web');
            return;
        }

        try {
            setState('connecting');
            setError(null);

            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            streamRef.current = stream;

            // Set up audio analysis for VAD
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Set active BEFORE starting recording
            isActiveRef.current = true;
            isProcessingRef.current = false;

            addMessage('system', 'Conversation started. Speak naturally - I\'ll respond when you pause.');

            // Start recording
            startRecording();
        } catch (err) {
            console.error('Failed to start conversation:', err);
            setError('Microphone access denied');
            setState('idle');
            isActiveRef.current = false;
        }
    };

    const stopConversation = () => {
        console.log('Stopping conversation...');

        // Set inactive FIRST to prevent auto-restart
        isActiveRef.current = false;

        cleanup();

        setState('idle');
        addMessage('system', 'Conversation ended.');
    };

    const getStateText = () => {
        switch (state) {
            case 'connecting': return 'Connecting...';
            case 'listening': return 'Listening...';
            case 'processing': return 'Thinking...';
            case 'speaking': return 'Speaking...';
            default: return 'Tap to start';
        }
    };

    const getStateColor = () => {
        switch (state) {
            case 'listening': return '#16a34a';
            case 'processing': return '#ca8a04';
            case 'speaking': return '#2563eb';
            default: return '#6b7280';
        }
    };

    const isConversationActive = state !== 'idle' && state !== 'connecting';

    const volumeEmoji = volumeLevel > 0.35 ? '🎤' : volumeLevel > 0.15 ? '📢' : '🔇';
    const volumeColor = volumeLevel > 0.35 ? '#16a34a' : volumeLevel > 0.15 ? '#ca8a04' : '#d1d5db';
    const buttonIcon = isConversationActive ? '■' : '●';
    const buttonLabel = isConversationActive ? 'Stop' : 'Start';
    const helpMessage = isConversationActive
        ? 'Speak naturally. Charlie responds when you pause.'
        : 'Tap to begin a voice conversation';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{'Charlie'}</Text>
                    <Text style={styles.subtitle}>{'Voice Conversation'}</Text>
                </View>
                {onClose ? (
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>{'X'}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            <View style={[styles.statusBar, { backgroundColor: getStateColor() + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStateColor() }]} />
                <Text style={[styles.statusText, { color: getStateColor() }]}>{getStateText()}</Text>
                {state === 'listening' ? (
                    <React.Fragment>
                        <View style={styles.volumeBarContainer}>
                            <View style={[styles.volumeBar, { width: `${volumeLevel * 100}%`, backgroundColor: volumeColor }]} />
                        </View>
                        <Text style={styles.volumeText}>{volumeEmoji}</Text>
                    </React.Fragment>
                ) : null}
            </View>
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
            >
                {messages.map((msg) => {
                    const bubbleStyle = msg.type === 'user' ? styles.userBubble :
                        msg.type === 'system' ? styles.systemBubble : styles.charlieBubble;
                    const textStyle = msg.type === 'user' ? styles.userText :
                        msg.type === 'system' ? styles.systemText : styles.charlieText;
                    return (
                        <View key={msg.id} style={[styles.messageBubble, bubbleStyle]}>
                            {msg.type === 'charlie' ? <Text style={styles.charlieLabel}>{'Charlie'}</Text> : null}
                            <Text style={[styles.messageText, textStyle]}>{msg.text}</Text>
                        </View>
                    );
                })}
                {state === 'processing' ? (
                    <View style={styles.loadingBubble}>
                        <ActivityIndicator size="small" color="#2563eb" />
                        <Text style={styles.loadingText}>{'Charlie is thinking...'}</Text>
                    </View>
                ) : null}
            </ScrollView>
            {error ? (
                <View style={styles.errorBar}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
            <View style={styles.controlContainer}>
                <TouchableOpacity
                    style={[styles.mainButton, isConversationActive ? styles.mainButtonActive : styles.mainButtonInactive]}
                    onPress={isConversationActive ? stopConversation : startConversation}
                    disabled={state === 'connecting'}
                >
                    {state === 'connecting' ? (
                        <ActivityIndicator size="large" color="white" />
                    ) : (
                        <React.Fragment>
                            <Text style={styles.mainButtonIcon}>{buttonIcon}</Text>
                            <Text style={styles.mainButtonText}>{buttonLabel}</Text>
                        </React.Fragment>
                    )}
                </TouchableOpacity>
                <Text style={styles.helpText}>{helpMessage}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#2563eb',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    pulsingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        opacity: 0.5,
    },
    volumeBarContainer: {
        width: 60,
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
        marginLeft: 8,
    },
    volumeBar: {
        height: '100%',
        borderRadius: 4,
    },
    volumeText: {
        fontSize: 14,
        marginLeft: 4,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#2563eb',
        borderBottomRightRadius: 4,
    },
    charlieBubble: {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderBottomLeftRadius: 4,
    },
    systemBubble: {
        alignSelf: 'center',
        backgroundColor: '#f3f4f6',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    charlieLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2563eb',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: 'white',
    },
    charlieText: {
        color: '#111',
    },
    systemText: {
        color: '#6b7280',
        fontSize: 13,
        textAlign: 'center',
    },
    loadingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    loadingText: {
        fontSize: 14,
        color: '#6b7280',
    },
    errorBar: {
        backgroundColor: '#fef2f2',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#fecaca',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
    },
    controlContainer: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    mainButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    mainButtonInactive: {
        backgroundColor: '#16a34a',
    },
    mainButtonActive: {
        backgroundColor: '#dc2626',
    },
    mainButtonIcon: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    mainButtonText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
        textAlign: 'center',
        fontWeight: '600',
    },
    helpText: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 16,
        textAlign: 'center',
    },
});
