/**
 * VoiceChat Component - Voice command interface for Charlie
 * Supports natural conversation with action approval flow
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
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
        // If accessing from localhost, use localhost; otherwise use the same host
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        // For mobile/other devices, use the same IP but port 3000
        return `http://${hostname}:3000`;
    }
    return 'http://192.168.1.144:3000';
};
const API_BASE = getApiBase();

interface PendingAction {
    id: string;
    type: string;
    description: string;
    parameters: Record<string, unknown>;
    requiresApproval: boolean;
    confirmationMessage: string;
}

interface Message {
    id: string;
    type: 'user' | 'charlie' | 'system';
    text: string;
    audioBase64?: string;
    timestamp: Date;
    intent?: {
        type: string;
        confidence: number;
    };
    pendingAction?: PendingAction;
    isApprovalResponse?: boolean;
}

interface VoiceChatProps {
    onClose?: () => void;
}

export function VoiceChat({ onClose }: VoiceChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [aiStatus, setAiStatus] = useState<{
        openai: boolean;
        anthropic: boolean;
        elevenlabs: boolean;
    } | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const sessionId = useRef(`session_${Date.now()}`);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Add initial greeting
    useEffect(() => {
        if (user && messages.length === 0) {
            const greeting: Message = {
                id: 'greeting',
                type: 'charlie',
                text: `Hey ${user.name.split(' ')[0]}! I'm Charlie, your personal assistant. How can I help you today?`,
                timestamp: new Date(),
            };
            setMessages([greeting]);
        }
    }, [user]);

    useEffect(() => {
        checkAIServices();
    }, []);

    const checkAIServices = async () => {
        try {
            const response = await fetch(`${API_BASE}/voice/test`);
            const data = await response.json();
            if (data.success) {
                setAiStatus(data.data.services);
            }
        } catch (err) {
            console.error('Failed to check AI services:', err);
        }
    };

    const playAudio = useCallback((audioBase64: string) => {
        if (Platform.OS === 'web') {
            const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
            audioRef.current = audio;
            audio.play().catch(console.error);
        }
    }, []);

    const sendTextCommand = async (textOverride?: string) => {
        const text = textOverride || inputText.trim();
        if (!text || !user) return;

        const userMessage: Message = {
            id: `msg_${Date.now()}`,
            type: 'user',
            text,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        if (!textOverride) setInputText('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/voice/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    userId: user.id,
                    sessionId: sessionId.current,
                    role: user.role,
                }),
            });

            const data = await response.json();

            if (data.success) {
                const charlieMessage: Message = {
                    id: `msg_${Date.now()}_reply`,
                    type: 'charlie',
                    text: data.data.text,
                    audioBase64: data.data.audioBase64,
                    timestamp: new Date(),
                    intent: data.data.intent,
                    pendingAction: data.data.pendingAction,
                };

                setMessages((prev) => [...prev, charlieMessage]);

                // Store pending action if approval required
                if (data.data.pendingAction?.requiresApproval) {
                    setPendingAction(data.data.pendingAction);
                }

                // Auto-play audio response
                if (data.data.audioBase64) {
                    playAudio(data.data.audioBase64);
                }
            } else {
                setError(data.message || 'Command failed');
            }
        } catch (err) {
            console.error('Voice command error:', err);
            setError('Failed to send command. Check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproval = async (approved: boolean) => {
        if (!pendingAction) return;

        const approvalText = approved ? 'Yes, go ahead' : 'No, cancel that';

        // Add user's approval response
        const userMessage: Message = {
            id: `msg_${Date.now()}_approval`,
            type: 'user',
            text: approvalText,
            timestamp: new Date(),
            isApprovalResponse: true,
        };
        setMessages((prev) => [...prev, userMessage]);

        // Clear pending action
        const actionToExecute = pendingAction;
        setPendingAction(null);

        if (approved) {
            // Execute the action
            setIsLoading(true);
            try {
                // For now, we'll send a follow-up command confirming the action
                const response = await fetch(`${API_BASE}/voice/command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `Execute: ${actionToExecute.description} - ${actionToExecute.parameters.originalCommand}`,
                        userId: user?.id,
                        sessionId: sessionId.current,
                        role: user?.role,
                    }),
                });

                const data = await response.json();

                const resultMessage: Message = {
                    id: `msg_${Date.now()}_result`,
                    type: 'charlie',
                    text: data.success
                        ? data.data.text
                        : "I'll get that done for you. The action has been queued.",
                    audioBase64: data.data?.audioBase64,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, resultMessage]);

                if (data.data?.audioBase64) {
                    playAudio(data.data.audioBase64);
                }
            } catch (err) {
                const errorMessage: Message = {
                    id: `msg_${Date.now()}_error`,
                    type: 'system',
                    text: 'Sorry, there was an issue executing that action. Please try again.',
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            } finally {
                setIsLoading(false);
            }
        } else {
            // Cancelled
            const cancelMessage: Message = {
                id: `msg_${Date.now()}_cancel`,
                type: 'charlie',
                text: "No problem, I've cancelled that. What else can I help you with?",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, cancelMessage]);
        }
    };

    const startRecording = async () => {
        if (Platform.OS !== 'web') {
            setError('Voice recording is only supported on web currently');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                stream.getTracks().forEach((track) => track.stop());
                await transcribeAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);

            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    setIsRecording(false);
                }
            }, 10000);

            (window as unknown as { _mediaRecorder: MediaRecorder })._mediaRecorder = mediaRecorder;
        } catch (err) {
            console.error('Recording error:', err);
            setError('Microphone access denied');
        }
    };

    const stopRecording = () => {
        const mediaRecorder = (window as unknown as { _mediaRecorder?: MediaRecorder })._mediaRecorder;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch(`${API_BASE}/voice/transcribe`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success && data.data.text) {
                // Auto-send transcribed text
                await sendTextCommand(data.data.text);
            } else {
                setError(data.message || 'Transcription failed');
            }
        } catch (err) {
            console.error('Transcription error:', err);
            setError('Failed to transcribe audio');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const getStatusColor = (connected: boolean) => (connected ? '#16a34a' : '#dc2626');

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Charlie</Text>
                    <Text style={styles.subtitle}>Voice Assistant</Text>
                </View>
                {onClose && (
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>X</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* AI Status */}
            {aiStatus && (
                <View style={styles.statusBar}>
                    <View style={styles.statusItem}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(aiStatus.openai) }]} />
                        <Text style={styles.statusText}>Speech</Text>
                    </View>
                    <View style={styles.statusItem}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(aiStatus.anthropic) }]} />
                        <Text style={styles.statusText}>AI</Text>
                    </View>
                    <View style={styles.statusItem}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(aiStatus.elevenlabs) }]} />
                        <Text style={styles.statusText}>Voice</Text>
                    </View>
                </View>
            )}

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
            >
                {messages.map((msg) => (
                    <View key={msg.id}>
                        <View
                            style={[
                                styles.messageBubble,
                                msg.type === 'user' ? styles.userBubble :
                                msg.type === 'system' ? styles.systemBubble : styles.charlieBubble,
                            ]}
                        >
                            {msg.type === 'charlie' && (
                                <Text style={styles.charlieLabel}>Charlie</Text>
                            )}
                            <Text style={[
                                styles.messageText,
                                msg.type === 'user' ? styles.userText :
                                msg.type === 'system' ? styles.systemText : styles.charlieText
                            ]}>
                                {msg.text}
                            </Text>
                            {msg.audioBase64 && (
                                <TouchableOpacity
                                    style={styles.replayButton}
                                    onPress={() => playAudio(msg.audioBase64!)}
                                >
                                    <Text style={styles.replayText}>Play Audio</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}

                {isLoading && (
                    <View style={styles.loadingBubble}>
                        <ActivityIndicator size="small" color="#2563eb" />
                        <Text style={styles.loadingText}>Charlie is thinking...</Text>
                    </View>
                )}
            </ScrollView>

            {/* Approval Buttons */}
            {pendingAction && !isLoading && (
                <View style={styles.approvalContainer}>
                    <Text style={styles.approvalTitle}>{pendingAction.confirmationMessage}</Text>
                    <View style={styles.approvalButtons}>
                        <TouchableOpacity
                            style={[styles.approvalButton, styles.approveButton]}
                            onPress={() => handleApproval(true)}
                        >
                            <Text style={styles.approvalButtonText}>Yes, proceed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.approvalButton, styles.cancelButton]}
                            onPress={() => handleApproval(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Error */}
            {error && (
                <View style={styles.errorBar}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
                <TouchableOpacity
                    style={[styles.micButton, isRecording && styles.micButtonActive]}
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isLoading || !!pendingAction}
                >
                    <Text style={[styles.micButtonText, isRecording && styles.micButtonTextActive]}>
                        {isRecording ? 'Stop' : 'Mic'}
                    </Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask Charlie anything..."
                    placeholderTextColor="#9ca3af"
                    editable={!isLoading && !pendingAction}
                    onSubmitEditing={() => sendTextCommand()}
                />

                <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() || isLoading || pendingAction) && styles.sendButtonDisabled]}
                    onPress={() => sendTextCommand()}
                    disabled={!inputText.trim() || isLoading || !!pendingAction}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
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
        justifyContent: 'center',
        gap: 16,
        padding: 8,
        backgroundColor: '#f3f4f6',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        color: '#6b7280',
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
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
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
        color: '#dc2626',
        textAlign: 'center',
    },
    replayButton: {
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    replayText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '500',
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
    approvalContainer: {
        padding: 16,
        backgroundColor: '#fefce8',
        borderTopWidth: 1,
        borderTopColor: '#fef08a',
    },
    approvalTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#854d0e',
        textAlign: 'center',
        marginBottom: 12,
    },
    approvalButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    approvalButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    approveButton: {
        backgroundColor: '#16a34a',
    },
    cancelButton: {
        backgroundColor: '#e5e7eb',
    },
    approvalButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },
    cancelButtonText: {
        color: '#374151',
        fontWeight: '600',
        fontSize: 15,
    },
    errorBar: {
        backgroundColor: '#fef2f2',
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: '#fecaca',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 8,
    },
    micButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    micButtonActive: {
        backgroundColor: '#dc2626',
    },
    micButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
    },
    micButtonTextActive: {
        color: 'white',
    },
    textInput: {
        flex: 1,
        height: 48,
        backgroundColor: '#f3f4f6',
        borderRadius: 24,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111',
    },
    sendButton: {
        paddingHorizontal: 20,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    sendButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});
