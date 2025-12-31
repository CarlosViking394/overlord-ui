/**
 * Simple Login Screen - Using only React Native components
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import { login } from '../services/api';

export function SimpleLoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { login: authLogin } = useAuth();

    const handleLogin = async () => {
        if (!email.trim()) {
            setError('Email is required');
            return;
        }
        if (!password) {
            setError('Password is required');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const result = await login({ email: email.trim(), password });

            if (result.success && result.user) {
                authLogin(result.user);
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fillTestUser = (userEmail: string) => {
        setEmail(userEmail);
        setPassword('charlie123');
        setError(null);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.inner}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Agent Charlie</Text>
                    <Text style={styles.subtitle}>Sign in to access the control plane</Text>
                </View>

                {/* Error */}
                {error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Test Users */}
                <View style={styles.testUsers}>
                    <Text style={styles.testUsersTitle}>Development Test Users</Text>
                    <View style={styles.testUserButtons}>
                        <TouchableOpacity
                            style={[styles.testButton, { backgroundColor: '#9333ea' }]}
                            onPress={() => fillTestUser('carlos@agentcharlie.dev')}
                        >
                            <Text style={styles.testButtonText}>OVERLORD</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.testButton, { backgroundColor: '#2563eb' }]}
                            onPress={() => fillTestUser('admin@clientalpha.com')}
                        >
                            <Text style={styles.testButtonText}>ADMIN</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.testButton, { backgroundColor: '#16a34a' }]}
                            onPress={() => fillTestUser('lord@clientalpha.com')}
                        >
                            <Text style={styles.testButtonText}>LORD</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.passwordHint}>Password: charlie123</Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    inner: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    errorBox: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
    },
    form: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    button: {
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#2563eb',
        marginTop: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    testUsers: {
        backgroundColor: '#e5e7eb',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    testUsersTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 12,
    },
    testUserButtons: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    testButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    testButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    passwordHint: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 8,
    },
});
