/**
 * CharlieGlobe - The floating sphere with state-based animations
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Easing,
    Platform,
} from 'react-native';
import { CharlieGlobeProps } from './types';

const GLOBE_SIZE = 56;
const GLOBE_SIZE_TABLET = 64;

export function CharlieGlobe({ status, onPress, size }: CharlieGlobeProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const nudgeAnim = useRef(new Animated.Value(0)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;

    const globeSize = size || GLOBE_SIZE;

    // Pulse animation
    useEffect(() => {
        let animation: Animated.CompositeAnimation;

        if (status === 'idle') {
            // Subtle pulse for idle
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
        } else if (status === 'listening') {
            // Intense pulse for listening
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
        } else if (status === 'speaking') {
            pulseAnim.setValue(0.9);
        } else if (status === 'error') {
            // Shake animation
            animation = Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
                ...Array(3).fill(null).map(() => [
                    Animated.timing(nudgeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                    Animated.timing(nudgeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                ]).flat(),
                Animated.timing(nudgeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]);
        } else {
            pulseAnim.setValue(1);
        }

        animation?.start();
        return () => animation?.stop();
    }, [status, pulseAnim, nudgeAnim]);

    // Glow and nudge for speaking
    useEffect(() => {
        if (status === 'speaking') {
            Animated.parallel([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false,
                }),
                Animated.timing(nudgeAnim, {
                    toValue: -40,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }),
                Animated.timing(nudgeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [status, glowAnim, nudgeAnim]);

    // Ripple effect for listening
    useEffect(() => {
        let animation: Animated.CompositeAnimation;

        if (status === 'listening') {
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(rippleAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(rippleAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
        } else {
            rippleAnim.setValue(0);
        }

        return () => animation?.stop();
    }, [status, rippleAnim]);

    const getGlobeColor = () => {
        switch (status) {
            case 'listening':
                return '#10B981'; // Emerald
            case 'speaking':
                return '#9333EA'; // Purple
            case 'connecting':
                return '#F59E0B'; // Amber
            case 'error':
                return '#EF4444'; // Red
            default:
                return '#6366F1'; // Indigo
        }
    };

    const getIcon = () => {
        switch (status) {
            case 'listening':
                return '🎤';
            case 'speaking':
                return '🔊';
            case 'connecting':
                return '⏳';
            case 'error':
                return '⚠️';
            default:
                return '🎙️';
        }
    };

    const globeColor = getGlobeColor();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [
                        { translateX: nudgeAnim },
                        { scale: pulseAnim },
                    ],
                },
            ]}
        >
            {/* Ripple effect */}
            {status === 'listening' && (
                <Animated.View
                    style={[
                        styles.ripple,
                        {
                            width: globeSize + 40,
                            height: globeSize + 40,
                            borderRadius: (globeSize + 40) / 2,
                            borderColor: globeColor,
                            opacity: rippleAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.6, 0],
                            }),
                            transform: [
                                {
                                    scale: rippleAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 1.5],
                                    }),
                                },
                            ],
                        },
                    ]}
                />
            )}

            {/* Main globe */}
            <TouchableOpacity
                style={[
                    styles.globe,
                    {
                        width: globeSize,
                        height: globeSize,
                        borderRadius: globeSize / 2,
                        backgroundColor: globeColor,
                    },
                ]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <Animated.Text
                    style={[
                        styles.icon,
                        { fontSize: globeSize * 0.45 },
                    ]}
                >
                    {getIcon()}
                </Animated.Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    globe: {
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer',
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
    icon: {
        textAlign: 'center',
    },
    ripple: {
        position: 'absolute',
        borderWidth: 2,
    },
});
