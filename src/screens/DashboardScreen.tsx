/**
 * Dashboard Screen - Main app view after login
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { YStack, XStack, Text, H1, H2, Card, Button, Separator, Spinner, Avatar } from 'tamagui';
import { useAuthStore } from '../store/authStore';
import { getServices, getHealth } from '../services/api';

interface Service {
    id: string;
    name: string;
    type: string;
    status: string;
    baseUrl: string;
    version: string;
}

const getRoleBadgeColor = (role: string) => {
    switch (role) {
        case 'OVERLORD': return '$purple10';
        case 'ADMIN': return '$blue10';
        case 'LORD': return '$green10';
        default: return '$gray10';
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'healthy': return '$green10';
        case 'degraded': return '$yellow10';
        case 'unhealthy': return '$red10';
        case 'starting': return '$blue10';
        default: return '$gray10';
    }
};

const getServiceIcon = (type: string) => {
    switch (type) {
        case 'api': return 'API';
        case 'agent': return 'AGT';
        case 'mobile_app': return 'APP';
        case 'web_app': return 'WEB';
        default: return 'SVC';
    }
};

export function DashboardScreen() {
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);

    const [services, setServices] = useState<Service[]>([]);
    const [apiHealth, setApiHealth] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const [servicesData, healthData] = await Promise.all([
                getServices(),
                getHealth(),
            ]);
            setServices(servicesData);
            setApiHealth(healthData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setIsRefreshing(true);
        loadData();
    };

    if (!user) return null;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#f5f5f5' }}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            }
        >
            <YStack flex={1} padding="$4" space="$4">
                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center">
                    <YStack>
                        <Text color="$gray11" fontSize="$3">Welcome back,</Text>
                        <H1 color="$color" fontSize="$8">{user.name}</H1>
                    </YStack>
                    <Button
                        size="$3"
                        backgroundColor="$gray5"
                        color="$gray11"
                        onPress={logout}
                    >
                        Logout
                    </Button>
                </XStack>

                {/* User Info Card */}
                <Card elevate bordered padding="$4">
                    <XStack space="$4" alignItems="center">
                        <Avatar circular size="$6" backgroundColor={getRoleBadgeColor(user.role)}>
                            <Text color="white" fontWeight="bold" fontSize="$5">
                                {user.name.charAt(0)}
                            </Text>
                        </Avatar>
                        <YStack flex={1}>
                            <Text fontWeight="bold" fontSize="$5">{user.email}</Text>
                            <XStack space="$2" alignItems="center" marginTop="$1">
                                <XStack
                                    backgroundColor={getRoleBadgeColor(user.role)}
                                    paddingHorizontal="$2"
                                    paddingVertical="$1"
                                    borderRadius="$2"
                                >
                                    <Text color="white" fontSize="$2" fontWeight="bold">
                                        {user.role}
                                    </Text>
                                </XStack>
                                {user.workspaceId && (
                                    <Text color="$gray10" fontSize="$2">
                                        Workspace: Client Alpha
                                    </Text>
                                )}
                            </XStack>
                        </YStack>
                    </XStack>
                </Card>

                {/* API Status */}
                <Card elevate bordered padding="$4">
                    <XStack justifyContent="space-between" alignItems="center">
                        <YStack>
                            <Text color="$gray11" fontSize="$2">Overlord API</Text>
                            <Text fontWeight="bold" fontSize="$4">
                                {apiHealth?.data?.status || 'Unknown'}
                            </Text>
                        </YStack>
                        <XStack
                            backgroundColor={apiHealth?.data?.status === 'healthy' ? '$green3' : '$gray3'}
                            paddingHorizontal="$3"
                            paddingVertical="$2"
                            borderRadius="$3"
                        >
                            <Text
                                color={apiHealth?.data?.status === 'healthy' ? '$green11' : '$gray11'}
                                fontWeight="600"
                            >
                                {apiHealth?.data?.status === 'healthy' ? 'Connected' : 'Checking...'}
                            </Text>
                        </XStack>
                    </XStack>
                </Card>

                <Separator marginVertical="$2" />

                {/* Registered Services */}
                <YStack space="$3">
                    <XStack justifyContent="space-between" alignItems="center">
                        <H2 fontSize="$6">Registered Services</H2>
                        <Text color="$gray10">{services.length} services</Text>
                    </XStack>

                    {isLoading ? (
                        <YStack padding="$6" alignItems="center">
                            <Spinner size="large" color="$blue10" />
                        </YStack>
                    ) : services.length === 0 ? (
                        <Card bordered padding="$4">
                            <Text color="$gray11" textAlign="center">
                                No services registered yet
                            </Text>
                        </Card>
                    ) : (
                        services.map((service) => (
                            <Card key={service.id} elevate bordered padding="$4">
                                <XStack space="$3" alignItems="center">
                                    {/* Service Icon */}
                                    <YStack
                                        width={48}
                                        height={48}
                                        backgroundColor="$gray3"
                                        borderRadius="$3"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Text color="$gray11" fontWeight="bold" fontSize="$2">
                                            {getServiceIcon(service.type)}
                                        </Text>
                                    </YStack>

                                    {/* Service Info */}
                                    <YStack flex={1}>
                                        <Text fontWeight="bold" fontSize="$4">{service.name}</Text>
                                        <XStack space="$2" alignItems="center">
                                            <Text color="$gray10" fontSize="$2">{service.type}</Text>
                                            <Text color="$gray8">|</Text>
                                            <Text color="$gray10" fontSize="$2">v{service.version}</Text>
                                        </XStack>
                                    </YStack>

                                    {/* Status Badge */}
                                    <XStack
                                        backgroundColor={`${getStatusColor(service.status)}`.replace('10', '3')}
                                        paddingHorizontal="$2"
                                        paddingVertical="$1"
                                        borderRadius="$2"
                                    >
                                        <Text
                                            color={getStatusColor(service.status)}
                                            fontSize="$2"
                                            fontWeight="600"
                                        >
                                            {service.status}
                                        </Text>
                                    </XStack>
                                </XStack>
                            </Card>
                        ))
                    )}
                </YStack>

                {/* Quick Actions */}
                <Separator marginVertical="$2" />

                <YStack space="$3">
                    <H2 fontSize="$6">Quick Actions</H2>
                    <XStack space="$3" flexWrap="wrap">
                        <Button flex={1} minWidth={140} size="$4" backgroundColor="$blue10" color="white">
                            Voice Command
                        </Button>
                        <Button flex={1} minWidth={140} size="$4" backgroundColor="$green10" color="white">
                            Deploy App
                        </Button>
                    </XStack>
                    <XStack space="$3" flexWrap="wrap">
                        <Button flex={1} minWidth={140} size="$4" backgroundColor="$purple10" color="white">
                            Manage Agents
                        </Button>
                        <Button flex={1} minWidth={140} size="$4" backgroundColor="$gray10" color="white">
                            Settings
                        </Button>
                    </XStack>
                </YStack>

                {/* Footer */}
                <YStack alignItems="center" padding="$4" marginTop="$4">
                    <Text color="$gray9" fontSize="$2">
                        Agent Charlie Control Plane v1.0
                    </Text>
                </YStack>
            </YStack>
        </ScrollView>
    );
}
