/**
 * VoiceChatElevenLabs - Direct Eleven Labs Conversational AI
 * Uses Eleven Labs' optimized pipeline for low-latency voice conversations
 * Only routes to Claude for complex actions (coding, deployments, etc.)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
} from 'react-native';
import { useAuth } from '../store/AuthContext';

// Eleven Labs Conversational AI Agent
const ELEVEN_LABS_AGENT_ID = 'agent_7401kds8pqx3fqwrgk46k99wyh7g';

interface Message {
    id: string;
    type: 'user' | 'charlie' | 'system';
    text: string;
    timestamp: Date;
}

type ConversationState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening';

interface VoiceChatElevenLabsProps {
    onClose?: () => void;
}

export function VoiceChatElevenLabs({ onClose }: VoiceChatElevenLabsProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [state, setState] = useState<ConversationState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState('');

    const scrollViewRef = useRef<ScrollView>(null);
    const conversationRef = useRef<any>(null);
    const isUnmountingRef = useRef(false);
    const isConnectingRef = useRef(false);

    const addMessage = useCallback((type: Message['type'], text: string) => {
        if (!text.trim()) return;
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
            addMessage('charlie', `Hey ${user.name.split(' ')[0]}! Tap Start for a real-time conversation. I'll respond instantly!`);
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
        isUnmountingRef.current = false;
        return () => {
            isUnmountingRef.current = true;
            if (conversationRef.current) {
                try {
                    conversationRef.current.endSession();
                } catch (e) {
                    // Ignore errors during cleanup
                }
                conversationRef.current = null;
            }
        };
    }, []);

    const startConversation = async () => {
        if (Platform.OS !== 'web') {
            setError('Voice chat is only supported on web');
            return;
        }

        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current || conversationRef.current) {
            console.log('Already connecting or connected');
            return;
        }

        isConnectingRef.current = true;

        try {
            setState('connecting');
            setError(null);

            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // Check if unmounted during async operation
            if (isUnmountingRef.current) {
                isConnectingRef.current = false;
                return;
            }

            // Dynamic import of Eleven Labs SDK
            const { Conversation } = await import('@11labs/client');

            // Check again after import
            if (isUnmountingRef.current) {
                isConnectingRef.current = false;
                return;
            }

            // Start conversation with Eleven Labs agent
            const conversation = await Conversation.startSession({
                agentId: ELEVEN_LABS_AGENT_ID,
                overrides: {
                    agent: {
                        prompt: {
                            prompt: `You are Charlie, a friendly AI assistant for Agent Charlie platform. You help users manage websites, apps, and AI agents. Keep responses concise and natural for voice conversation. The user's name is ${user?.name || 'there'}.`,
                        },
                        firstMessage: `Hey ${user?.name?.split(' ')[0] || 'there'}! I'm Charlie, ready to help. What's on your mind?`,
                    },
                },
                onConnect: () => {
                    console.log('Connected to Eleven Labs');
                    if (!isUnmountingRef.current) {
                        setState('connected');
                        addMessage('system', 'Connected! Speak anytime - you can interrupt me.');
                    }
                },
                onDisconnect: () => {
                    console.log('Disconnected from Eleven Labs');
                    if (!isUnmountingRef.current) {
                        setState('idle');
                        conversationRef.current = null;
                    }
                },
                onMessage: (message: { source: string; message: string }) => {
                    console.log('Message:', message);
                    if (isUnmountingRef.current) return;
                    if (message.source === 'user') {
                        addMessage('user', message.message);
                        setTranscript('');
                    } else if (message.source === 'ai') {
                        addMessage('charlie', message.message);
                    }
                },
                onModeChange: (mode: { mode: string }) => {
                    console.log('Mode:', mode.mode);
                    if (isUnmountingRef.current) return;
                    if (mode.mode === 'speaking') {
                        setState('speaking');
                    } else if (mode.mode === 'listening') {
                        setState('listening');
                    }
                },
                onError: (error: Error) => {
                    console.error('Eleven Labs error:', error);
                    if (!isUnmountingRef.current) {
                        setError(error.message);
                        setState('idle');
                    }
                },
            });

            // Store reference only if not unmounted
            if (!isUnmountingRef.current) {
                conversationRef.current = conversation;
            } else {
                // Cleanup if component unmounted during connection
                try {
                    await conversation.endSession();
                } catch (e) {
                    // Ignore
                }
            }

        } catch (err: any) {
            console.error('Failed to start conversation:', err);
            if (!isUnmountingRef.current) {
                setError(err.message || 'Failed to connect');
                setState('idle');
            }
        } finally {
            isConnectingRef.current = false;
        }
    };

    const endConversation = async () => {
        const conversation = conversationRef.current;
        if (conversation) {
            conversationRef.current = null;
            try {
                await conversation.endSession();
            } catch (e) {
                // Ignore errors during cleanup
            }
        }
        if (!isUnmountingRef.current) {
            setState('idle');
            addMessage('system', 'Conversation ended.');
        }
    };

    const getStateText = () => {
        switch (state) {
            case 'connecting': return 'Connecting...';
            case 'connected': return 'Ready';
            case 'listening': return 'Listening...';
            case 'speaking': return 'Charlie speaking...';
            default: return 'Tap to start';
        }
    };

    const getStateColor = () => {
        switch (state) {
            case 'listening': return '#16a34a';
            case 'speaking': return '#2563eb';
            case 'connected': return '#ca8a04';
            case 'connecting': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const isActive = state !== 'idle';

    const statusEmoji = state === 'listening' ? ' 🎤' : state === 'speaking' ? ' 🔊' : '';
    const buttonLabel = isActive ? 'Stop' : 'Start';
    const buttonIcon = isActive ? '■' : '●';
    const helpMessage = isActive ? 'Speak naturally - instant responses!' : 'Tap to begin a real-time conversation';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{'Charlie'}</Text>
                    <Text style={styles.subtitle}>{'Real-time Voice (Eleven Labs)'}</Text>
                </View>
                {onClose && (
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>{'X'}</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={[styles.statusBar, { backgroundColor: getStateColor() + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStateColor() }]} />
                <Text style={[styles.statusText, { color: getStateColor() }]}>{getStateText()}{statusEmoji}</Text>
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
                            {msg.type === 'charlie' && <Text style={styles.charlieLabel}>{'Charlie'}</Text>}
                            <Text style={[styles.messageText, textStyle]}>{msg.text}</Text>
                        </View>
                    );
                })}
                {transcript ? (
                    <View style={styles.transcriptBubble}>
                        <Text style={styles.transcriptText}>{transcript}{'...'}</Text>
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
                    style={[styles.mainButton, isActive ? styles.mainButtonActive : styles.mainButtonInactive]}
                    onPress={isActive ? endConversation : startConversation}
                    disabled={state === 'connecting'}
                >
                    <Text style={styles.mainButtonIcon}>{buttonIcon}</Text>
                    <Text style={styles.mainButtonText}>{buttonLabel}</Text>
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
        backgroundColor: '#9333ea', // Purple for Eleven Labs mode
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
        backgroundColor: '#9333ea',
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
        color: '#9333ea',
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
    transcriptBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#f3e8ff',
        padding: 12,
        borderRadius: 16,
        borderBottomRightRadius: 4,
        maxWidth: '85%',
    },
    transcriptText: {
        fontSize: 16,
        color: '#7c3aed',
        fontStyle: 'italic',
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
        backgroundColor: '#9333ea',
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
