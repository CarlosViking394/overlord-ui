/**
 * Login Screen
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, Input, Button, H1, Paragraph, Spinner } from 'tamagui';
import { useAuthStore } from '../store/authStore';
import { login } from '../services/api';

interface LoginScreenProps {
    onLoginSuccess?: () => void;
    onNavigateToSignup?: () => void;
}

export function LoginScreen({ onLoginSuccess, onNavigateToSignup }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const authLogin = useAuthStore(state => state.login);

    const handleLogin = async () => {
        // Validation
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
                onLoginSuccess?.();
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
            style={{ flex: 1 }}
        >
            <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center">
                <YStack space="$4" maxWidth={400} width="100%" alignSelf="center">
                    {/* Header */}
                    <YStack space="$2" alignItems="center" marginBottom="$4">
                        <H1 color="$color" textAlign="center">Agent Charlie</H1>
                        <Paragraph color="$gray11" textAlign="center">
                            Sign in to access the control plane
                        </Paragraph>
                    </YStack>

                    {/* Error Message */}
                    {error && (
                        <XStack
                            backgroundColor="$red3"
                            padding="$3"
                            borderRadius="$3"
                            borderWidth={1}
                            borderColor="$red6"
                        >
                            <Text color="$red11" fontSize="$3">{error}</Text>
                        </XStack>
                    )}

                    {/* Form */}
                    <YStack space="$4">
                        {/* Email */}
                        <YStack space="$2">
                            <Text color="$gray11" fontSize="$3" fontWeight="600">Email</Text>
                            <Input
                                placeholder="Enter your email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                size="$4"
                                borderColor="$gray6"
                                focusStyle={{ borderColor: '$blue10' }}
                            />
                        </YStack>

                        {/* Password */}
                        <YStack space="$2">
                            <Text color="$gray11" fontSize="$3" fontWeight="600">Password</Text>
                            <Input
                                placeholder="Enter your password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoComplete="password"
                                size="$4"
                                borderColor="$gray6"
                                focusStyle={{ borderColor: '$blue10' }}
                            />
                        </YStack>

                        {/* Login Button */}
                        <Button
                            size="$4"
                            backgroundColor="$blue10"
                            color="white"
                            onPress={handleLogin}
                            disabled={isLoading}
                            marginTop="$2"
                        >
                            {isLoading ? <Spinner color="white" /> : 'Sign In'}
                        </Button>
                    </YStack>

                    {/* Test Users (Development) */}
                    <YStack space="$3" marginTop="$6" padding="$4" backgroundColor="$gray2" borderRadius="$3">
                        <Text color="$gray11" fontSize="$2" fontWeight="600" textAlign="center">
                            Development Test Users
                        </Text>
                        <XStack space="$2" flexWrap="wrap" justifyContent="center">
                            <Button
                                size="$2"
                                backgroundColor="$purple10"
                                color="white"
                                onPress={() => fillTestUser('carlos@agentcharlie.dev')}
                            >
                                OVERLORD
                            </Button>
                            <Button
                                size="$2"
                                backgroundColor="$blue10"
                                color="white"
                                onPress={() => fillTestUser('admin@clientalpha.com')}
                            >
                                ADMIN
                            </Button>
                            <Button
                                size="$2"
                                backgroundColor="$green10"
                                color="white"
                                onPress={() => fillTestUser('lord@clientalpha.com')}
                            >
                                LORD
                            </Button>
                        </XStack>
                        <Text color="$gray10" fontSize="$1" textAlign="center">
                            Password: charlie123
                        </Text>
                    </YStack>

                    {/* Sign Up Link */}
                    {onNavigateToSignup && (
                        <XStack justifyContent="center" marginTop="$4">
                            <Text color="$gray11">Don't have an account? </Text>
                            <Text
                                color="$blue10"
                                fontWeight="600"
                                onPress={onNavigateToSignup}
                                cursor="pointer"
                            >
                                Sign Up
                            </Text>
                        </XStack>
                    )}
                </YStack>
            </YStack>
        </KeyboardAvoidingView>
    );
}
