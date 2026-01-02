/**
 * CharlieFace - Avatar that peeks in from the right when Charlie is speaking
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    Platform,
} from 'react-native';
import { CharlieFaceProps } from './types';

const FACE_SIZE = 48;

export function CharlieFace({ visible, isSpeaking }: CharlieFaceProps) {
    const slideAnim = useRef(new Animated.Value(100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const mouthAnim = useRef(new Animated.Value(0)).current;

    // Slide in/out animation
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 100,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, slideAnim, opacityAnim]);

    // Mouth animation while speaking
    useEffect(() => {
        let animation: Animated.CompositeAnimation;

        if (isSpeaking && visible) {
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(mouthAnim, {
                        toValue: 1,
                        duration: 150,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(mouthAnim, {
                        toValue: 0,
                        duration: 150,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
        } else {
            mouthAnim.setValue(0);
        }

        return () => animation?.stop();
    }, [isSpeaking, visible, mouthAnim]);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: opacityAnim,
                    transform: [{ translateX: slideAnim }],
                },
            ]}
            pointerEvents="none"
        >
            <View style={styles.face}>
                {/* Eyes */}
                <View style={styles.eyesContainer}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                </View>
                {/* Mouth */}
                <Animated.View
                    style={[
                        styles.mouth,
                        {
                            transform: [
                                {
                                    scaleY: mouthAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 1.5],
                                    }),
                                },
                            ],
                        },
                    ]}
                />
            </View>
            <Text style={styles.label}>Charlie</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    face: {
        width: FACE_SIZE,
        height: FACE_SIZE,
        borderRadius: FACE_SIZE / 2,
        backgroundColor: '#F3E8FF',
        borderWidth: 2,
        borderColor: '#9333EA',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(147, 51, 234, 0.3)',
            },
            default: {
                shadowColor: '#9333EA',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
            },
        }),
    },
    eyesContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    eye: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#9333EA',
    },
    mouth: {
        width: 12,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#9333EA',
    },
    label: {
        fontSize: 10,
        color: '#9333EA',
        fontWeight: '600',
        marginTop: 4,
    },
});
