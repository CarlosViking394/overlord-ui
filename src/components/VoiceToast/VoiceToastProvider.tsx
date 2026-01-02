/**
 * VoiceToastProvider - Context for managing voice feedback toasts
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Platform,
} from 'react-native';

interface Toast {
    id: string;
    message: string;
    type: 'response' | 'action' | 'error' | 'transcript';
}

interface VoiceToastContextType {
    showToast: (message: string, type?: Toast['type']) => void;
    hideToast: (id: string) => void;
}

const VoiceToastContext = createContext<VoiceToastContextType | null>(null);

export function useVoiceToast() {
    const context = useContext(VoiceToastContext);
    if (!context) {
        throw new Error('useVoiceToast must be used within VoiceToastProvider');
    }
    return context;
}

interface VoiceToastProviderProps {
    children: ReactNode;
}

export function VoiceToastProvider({ children }: VoiceToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: Toast['type'] = 'response') => {
        const id = `toast_${Date.now()}`;
        const newToast: Toast = { id, message, type };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <VoiceToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <View style={styles.toastContainer} pointerEvents="box-none">
                {toasts.map((toast, index) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        index={index}
                        onDismiss={() => hideToast(toast.id)}
                    />
                ))}
            </View>
        </VoiceToastContext.Provider>
    );
}

interface ToastItemProps {
    toast: Toast;
    index: number;
    onDismiss: () => void;
}

function ToastItem({ toast, index, onDismiss }: ToastItemProps) {
    const translateY = React.useRef(new Animated.Value(-100)).current;
    const opacity = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        // Slide in
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Slide out after delay
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -100,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 3500);

        return () => clearTimeout(timer);
    }, [translateY, opacity]);

    const getTypeStyles = () => {
        switch (toast.type) {
            case 'action':
                return { backgroundColor: '#10B981', borderColor: '#059669' };
            case 'error':
                return { backgroundColor: '#EF4444', borderColor: '#DC2626' };
            case 'transcript':
                return { backgroundColor: '#6366F1', borderColor: '#4F46E5' };
            default:
                return { backgroundColor: '#9333EA', borderColor: '#7C3AED' };
        }
    };

    const typeStyles = getTypeStyles();

    // Truncate long messages
    const displayMessage = toast.message.length > 100
        ? toast.message.substring(0, 100) + '...'
        : toast.message;

    return (
        <Animated.View
            style={[
                styles.toast,
                typeStyles,
                {
                    transform: [{ translateY }],
                    opacity,
                    top: 60 + index * 70,
                },
            ]}
        >
            <Text style={styles.toastIcon}>
                {toast.type === 'action' ? '✓' : toast.type === 'error' ? '!' : '🔊'}
            </Text>
            <Text style={styles.toastText} numberOfLines={2}>
                {displayMessage}
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toastContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1001,
    },
    toast: {
        position: 'absolute',
        left: 16,
        right: 16,
        maxWidth: 400,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
            },
        }),
    },
    toastIcon: {
        fontSize: 16,
        color: 'white',
    },
    toastText: {
        flex: 1,
        fontSize: 14,
        color: 'white',
        fontWeight: '500',
    },
});
