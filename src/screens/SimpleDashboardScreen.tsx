/**
 * Simple Dashboard Screen - Using only React Native components
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
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
        case 'OVERLORD': return '#9333ea';
        case 'ADMIN': return '#2563eb';
        case 'LORD': return '#16a34a';
        default: return '#6b7280';
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'healthy': return '#16a34a';
        case 'degraded': return '#ca8a04';
        case 'unhealthy': return '#dc2626';
        case 'starting': return '#2563eb';
        default: return '#6b7280';
    }
};

export function SimpleDashboardScreen() {
    const { user, logout } = useAuth();

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
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.userName}>{user.name}</Text>
                    </View>
                    <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* User Card */}
                <View style={styles.card}>
                    <View style={styles.userInfo}>
                        <View style={[styles.avatar, { backgroundColor: getRoleBadgeColor(user.role) }]}>
                            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userEmail}>{user.email}</Text>
                            <View style={styles.roleRow}>
                                <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user.role) }]}>
                                    <Text style={styles.roleText}>{user.role}</Text>
                                </View>
                                {user.workspaceId && (
                                    <Text style={styles.workspaceText}>Client Alpha</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* API Status */}
                <View style={styles.card}>
                    <View style={styles.statusRow}>
                        <View>
                            <Text style={styles.statusLabel}>Overlord API</Text>
                            <Text style={styles.statusValue}>
                                {apiHealth?.data?.status || 'Checking...'}
                            </Text>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: apiHealth?.data?.status === 'healthy' ? '#dcfce7' : '#f3f4f6' }
                        ]}>
                            <Text style={[
                                styles.statusBadgeText,
                                { color: apiHealth?.data?.status === 'healthy' ? '#16a34a' : '#6b7280' }
                            ]}>
                                {apiHealth?.data?.status === 'healthy' ? 'Connected' : 'Checking...'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Services */}
                <Text style={styles.sectionTitle}>Registered Services</Text>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                ) : services.length === 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.emptyText}>No services registered yet</Text>
                    </View>
                ) : (
                    services.map((service) => (
                        <View key={service.id} style={styles.card}>
                            <View style={styles.serviceRow}>
                                <View style={styles.serviceIcon}>
                                    <Text style={styles.serviceIconText}>
                                        {service.type === 'api' ? 'API' :
                                         service.type === 'agent' ? 'AGT' :
                                         service.type === 'mobile_app' ? 'APP' : 'SVC'}
                                    </Text>
                                </View>
                                <View style={styles.serviceInfo}>
                                    <Text style={styles.serviceName}>{service.name}</Text>
                                    <Text style={styles.serviceMeta}>
                                        {service.type} | v{service.version}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.serviceStatus,
                                    { backgroundColor: getStatusColor(service.status) + '20' }
                                ]}>
                                    <Text style={[
                                        styles.serviceStatusText,
                                        { color: getStatusColor(service.status) }
                                    ]}>
                                        {service.status}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#2563eb' }]}>
                        <Text style={styles.actionText}>Voice Command</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#16a34a' }]}>
                        <Text style={styles.actionText}>Deploy App</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#9333ea' }]}>
                        <Text style={styles.actionText}>Manage Agents</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#6b7280' }]}>
                        <Text style={styles.actionText}>Settings</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>Agent Charlie Control Plane v1.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    welcomeText: {
        fontSize: 14,
        color: '#6b7280',
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111',
    },
    logoutButton: {
        backgroundColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutText: {
        color: '#374151',
        fontWeight: '500',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    userDetails: {
        marginLeft: 12,
        flex: 1,
    },
    userEmail: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    roleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    roleText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    workspaceText: {
        fontSize: 12,
        color: '#9ca3af',
        marginLeft: 8,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    statusValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111',
        marginTop: 8,
        marginBottom: 12,
    },
    loadingContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6b7280',
        textAlign: 'center',
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    serviceIcon: {
        width: 48,
        height: 48,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    serviceIconText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    serviceInfo: {
        marginLeft: 12,
        flex: 1,
    },
    serviceName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    serviceMeta: {
        fontSize: 12,
        color: '#9ca3af',
    },
    serviceStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    serviceStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        minWidth: '45%',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionText: {
        color: 'white',
        fontWeight: '600',
    },
    footer: {
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 24,
        marginBottom: 16,
    },
});
