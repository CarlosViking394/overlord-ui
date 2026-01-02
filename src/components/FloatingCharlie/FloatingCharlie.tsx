/**
 * FloatingCharlie - Main orchestrator for the floating voice mode
 * Mobile-first design: non-intrusive globe that doesn't block content
 */

import React, { useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { useVoiceStore } from '../../store/voiceStore';
import { CharlieGlobe } from './CharlieGlobe';
import { CharlieFace } from './CharlieFace';
import { useCharlieVoice } from './useCharlieVoice';
import { FloatingCharlieProps } from './types';

export function FloatingCharlie({
    onAction,
    onProjectCreated,
    onFileModified,
}: FloatingCharlieProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const { status, isExpanded, lastResponse } = useVoiceStore();

    const handleResponse = useCallback((text: string) => {
        // Parse response for actions
        const lowerText = text.toLowerCase();

        if (lowerText.includes('created') && lowerText.includes('project')) {
            onProjectCreated?.();
            onAction?.({
                type: 'PROJECT_CREATED',
                message: 'Project created successfully',
            });
        } else if (lowerText.includes('modified') || lowerText.includes('updated')) {
            onFileModified?.();
            onAction?.({
                type: 'FILE_MODIFIED',
                message: 'File modified',
            });
        }
    }, [onAction, onProjectCreated, onFileModified]);

    const { toggleConversation } = useCharlieVoice({
        onResponse: handleResponse,
    });

    // Globe size based on screen
    const globeSize = isMobile ? 56 : 64;

    return (
        <View style={styles.container} pointerEvents="box-none">
            <View style={styles.floatingContainer} pointerEvents="box-none">
                {/* Face peek - appears when speaking */}
                <View style={styles.faceContainer}>
                    <CharlieFace
                        visible={isExpanded}
                        isSpeaking={status === 'speaking'}
                    />
                </View>

                {/* Main globe */}
                <View style={styles.globeContainer}>
                    <CharlieGlobe
                        status={status}
                        onPress={toggleConversation}
                        size={globeSize}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    floatingContainer: {
        position: 'absolute',
        bottom: 24,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    faceContainer: {
        // Face appears to the left of globe when expanded
    },
    globeContainer: {
        // Globe stays anchored to right
    },
});
