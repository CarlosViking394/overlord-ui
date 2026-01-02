/**
 * Main Dashboard Screen
 *
 * The primary interface after login. Shows:
 * - Projects list (sidebar on web, drawer on mobile)
 * - Project content (files)
 * - Charlie chat (always accessible)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ScrollView,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import {
    getProjects,
    getProjectFiles,
    sendMessageToCharlie,
    Project,
    FileNode,
    CharlieResponse,
} from '../services/api';
import { FloatingCharlie } from '../components/FloatingCharlie';
import { VoiceToastProvider } from '../components/VoiceToast';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isLargeScreen = width > 768;

export function MainDashboard() {
    const { user, logout } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectFiles, setProjectFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(isLargeScreen);

    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hello ${user?.name?.split(' ')[0] || 'there'}! I'm Charlie, your AI development assistant. I can help you create projects, write code, and deploy applications. What would you like to work on?`,
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sessionId] = useState(`session_${Date.now()}`);
    const chatScrollRef = useRef<ScrollView>(null);

    // Load projects
    const loadProjects = useCallback(async () => {
        setLoading(true);
        const projectList = await getProjects(user?.id);
        setProjects(projectList);
        setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    // Load project files when selected
    useEffect(() => {
        if (selectedProject) {
            getProjectFiles(selectedProject.id).then(setProjectFiles);
        }
    }, [selectedProject]);

    // Send message to Charlie
    const handleSend = async () => {
        if (!inputText.trim() || isSending) return;

        const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: inputText.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsSending(true);

        try {
            const response = await sendMessageToCharlie({
                message: userMessage.content,
                sessionId,
                userId: user?.id,
                userRole: user?.role,
                projectId: selectedProject?.id,
            });

            if (response.success && response.data) {
                const assistantMessage: ChatMessage = {
                    id: `msg_${Date.now() + 1}`,
                    role: 'assistant',
                    content: response.data.message,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMessage]);

                // If a project was created, refresh the list
                if (response.data.project) {
                    loadProjects();
                }
            } else {
                const errorMessage: ChatMessage = {
                    id: `msg_${Date.now() + 1}`,
                    role: 'assistant',
                    content: response.error || 'Sorry, I encountered an error. Please try again.',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: `msg_${Date.now() + 1}`,
                role: 'assistant',
                content: "I'm having trouble connecting. Please check your connection.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
            chatScrollRef.current?.scrollToEnd({ animated: true });
        }
    };

    // Render project item
    const renderProjectItem = ({ item }: { item: Project }) => (
        <TouchableOpacity
            style={[
                styles.projectItem,
                selectedProject?.id === item.id && styles.projectItemSelected,
            ]}
            onPress={() => {
                setSelectedProject(item);
                if (!isLargeScreen) setShowSidebar(false);
            }}
        >
            <View style={styles.projectIcon}>
                <Text style={styles.projectIconText}>
                    {item.type === 'website' ? '🌐' : item.type === 'api' ? '⚡' : item.type === 'mobile' ? '📱' : '📦'}
                </Text>
            </View>
            <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{item.name}</Text>
                <Text style={styles.projectMeta}>
                    {item.framework || item.type} • {item.status}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // Render file tree
    const renderFileNode = (node: FileNode, depth: number = 0) => (
        <View key={node.path} style={{ paddingLeft: depth * 16 }}>
            <View style={styles.fileItem}>
                <Text style={styles.fileIcon}>
                    {node.type === 'directory' ? '📁' : '📄'}
                </Text>
                <Text style={styles.fileName}>{node.name}</Text>
            </View>
            {node.children?.map(child => renderFileNode(child, depth + 1))}
        </View>
    );

    // Render chat message
    const renderMessage = (msg: ChatMessage) => (
        <View
            key={msg.id}
            style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
        >
            {msg.role === 'assistant' && (
                <Text style={styles.messageLabel}>Charlie</Text>
            )}
            <Text style={[
                styles.messageText,
                msg.role === 'user' && styles.userMessageText,
            ]}>
                {msg.content}
            </Text>
        </View>
    );

    return (
        <VoiceToastProvider>
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {!isLargeScreen && (
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setShowSidebar(!showSidebar)}
                    >
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.headerTitle}>
                    <Text style={styles.headerTitleText}>Charlie</Text>
                    <Text style={styles.headerSubtitle}>
                        {selectedProject ? selectedProject.name : 'Select a project'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.userButton} onPress={logout}>
                    <Text style={styles.userInitial}>
                        {user?.name?.charAt(0) || 'U'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Sidebar - Projects */}
                {(showSidebar || isLargeScreen) && (
                    <View style={[
                        styles.sidebar,
                        !isLargeScreen && styles.sidebarMobile,
                    ]}>
                        <View style={styles.sidebarHeader}>
                            <Text style={styles.sidebarTitle}>Projects</Text>
                            <TouchableOpacity
                                style={styles.newProjectButton}
                                onPress={() => {
                                    setInputText("Create a new project");
                                    handleSend();
                                }}
                            >
                                <Text style={styles.newProjectButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
                        ) : projects.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No projects yet</Text>
                                <Text style={styles.emptyStateHint}>
                                    Ask Charlie to create one!
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={projects}
                                renderItem={renderProjectItem}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.projectList}
                            />
                        )}
                    </View>
                )}

                {/* Main Content Area */}
                <View style={styles.mainContent}>
                    {/* Project Files (top half) */}
                    <View style={styles.filesSection}>
                        {selectedProject ? (
                            <>
                                <View style={styles.filesSectionHeader}>
                                    <Text style={styles.filesSectionTitle}>
                                        {selectedProject.name}
                                    </Text>
                                    <Text style={styles.filesSectionMeta}>
                                        {selectedProject.framework} • {selectedProject.status}
                                    </Text>
                                </View>
                                <ScrollView style={styles.fileTree}>
                                    {projectFiles.length === 0 ? (
                                        <Text style={styles.noFilesText}>
                                            No files yet. Ask Charlie to add some code!
                                        </Text>
                                    ) : (
                                        projectFiles.map(node => renderFileNode(node))
                                    )}
                                </ScrollView>
                            </>
                        ) : (
                            <View style={styles.noProjectSelected}>
                                <Text style={styles.noProjectIcon}>📂</Text>
                                <Text style={styles.noProjectText}>
                                    Select a project or create a new one
                                </Text>
                                <Text style={styles.noProjectHint}>
                                    Chat with Charlie below to get started
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Chat Section (bottom half) */}
                    <KeyboardAvoidingView
                        style={styles.chatSection}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={styles.chatHeader}>
                            <View style={styles.chatAvatar}>
                                <Text style={styles.chatAvatarText}>C</Text>
                            </View>
                            <View>
                                <Text style={styles.chatTitle}>Charlie</Text>
                                <Text style={styles.chatStatus}>
                                    {isSending ? 'Thinking...' : 'Online'}
                                </Text>
                            </View>
                        </View>

                        <ScrollView
                            ref={chatScrollRef}
                            style={styles.chatMessages}
                            contentContainerStyle={styles.chatMessagesContent}
                        >
                            {messages.map(renderMessage)}
                            {isSending && (
                                <View style={styles.typingIndicator}>
                                    <Text style={styles.typingDots}>...</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.chatInputContainer}>
                            <TextInput
                                style={styles.chatInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Ask Charlie anything..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                onSubmitEditing={handleSend}
                                editable={!isSending}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (!inputText.trim() || isSending) && styles.sendButtonDisabled,
                                ]}
                                onPress={handleSend}
                                disabled={!inputText.trim() || isSending}
                            >
                                <Text style={styles.sendButtonText}>→</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>

            {/* Floating Voice Charlie */}
            <FloatingCharlie
                onProjectCreated={loadProjects}
                onFileModified={() => {
                    if (selectedProject) {
                        getProjectFiles(selectedProject.id).then(setProjectFiles);
                    }
                }}
            />
        </View>
        </VoiceToastProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    menuButton: {
        marginRight: 12,
    },
    menuIcon: {
        fontSize: 24,
    },
    headerTitle: {
        flex: 1,
    },
    headerTitleText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748B',
    },
    userButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInitial: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: isLargeScreen ? 280 : '80%',
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
    },
    sidebarMobile: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    sidebarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    sidebarTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    newProjectButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    newProjectButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
    },
    projectList: {
        padding: 8,
    },
    projectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
    },
    projectItemSelected: {
        backgroundColor: '#E0E7FF',
    },
    projectIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    projectIconText: {
        fontSize: 20,
    },
    projectInfo: {
        flex: 1,
    },
    projectName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    projectMeta: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 8,
    },
    emptyStateHint: {
        fontSize: 14,
        color: '#94A3B8',
    },
    mainContent: {
        flex: 1,
        flexDirection: 'column',
    },
    filesSection: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    filesSectionHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    filesSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
    },
    filesSectionMeta: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
    },
    fileTree: {
        flex: 1,
        padding: 16,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    fileIcon: {
        marginRight: 8,
        fontSize: 16,
    },
    fileName: {
        fontSize: 14,
        color: '#1E293B',
    },
    noFilesText: {
        color: '#94A3B8',
        fontStyle: 'italic',
    },
    noProjectSelected: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    noProjectIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    noProjectText: {
        fontSize: 18,
        color: '#64748B',
        marginBottom: 8,
    },
    noProjectHint: {
        fontSize: 14,
        color: '#94A3B8',
    },
    chatSection: {
        flex: 1,
        backgroundColor: '#FAFBFC',
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    chatAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    chatAvatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    chatStatus: {
        fontSize: 12,
        color: '#10B981',
    },
    chatMessages: {
        flex: 1,
    },
    chatMessagesContent: {
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
        backgroundColor: '#6366F1',
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderBottomLeftRadius: 4,
    },
    messageLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6366F1',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#1E293B',
    },
    userMessageText: {
        color: 'white',
    },
    typingIndicator: {
        alignSelf: 'flex-start',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    typingDots: {
        fontSize: 20,
        color: '#6366F1',
        letterSpacing: 4,
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    chatInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F1F5F9',
        borderRadius: 22,
        fontSize: 15,
        color: '#1E293B',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#CBD5E1',
    },
    sendButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
    },
});
