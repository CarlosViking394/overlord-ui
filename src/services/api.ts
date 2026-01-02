/**
 * API Service - Communication with Overlord API
 */

// Dynamic API base - works from localhost or mobile devices
const getApiBase = () => {
    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        return `http://${hostname}:3001`;
    }
    return 'http://192.168.1.144:3001';
};
const API_BASE_URL = getApiBase();

// Development seed users (matching the database)
const DEV_USERS = [
    {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
        email: 'carlos@agentcharlie.dev',
        name: 'Carlos',
        role: 'OVERLORD' as const,
        workspaceId: undefined,
        voiceId: 'elevenlabs-carlos-voice-id',
    },
    {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        email: 'admin@clientalpha.com',
        name: 'Alex Admin',
        role: 'ADMIN' as const,
        workspaceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        voiceId: 'elevenlabs-professional-voice',
    },
    {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        email: 'lord@clientalpha.com',
        name: 'Luna Lord',
        role: 'LORD' as const,
        workspaceId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        voiceId: 'elevenlabs-friendly-voice',
    },
];

const DEV_PASSWORD = 'charlie123';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    user?: typeof DEV_USERS[0];
    error?: string;
}

/**
 * Login - Development implementation
 * TODO: Replace with actual API call
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = DEV_USERS.find(u => u.email.toLowerCase() === request.email.toLowerCase());

    if (!user) {
        return { success: false, error: 'User not found' };
    }

    if (request.password !== DEV_PASSWORD) {
        return { success: false, error: 'Invalid password' };
    }

    return { success: true, user };
}

/**
 * Get registered services from the API
 */
export async function getServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/registry/services`);
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch services:', error);
        return [];
    }
}

/**
 * Get API health status
 */
export async function getHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch health:', error);
        return null;
    }
}

// =============================================================================
// CHARLIE AI ENDPOINTS
// =============================================================================

export interface Project {
    id: string;
    name: string;
    description?: string;
    type: 'website' | 'api' | 'mobile' | 'library' | 'other';
    status: 'active' | 'archived' | 'deploying' | 'error';
    framework?: string;
    lastModified: string;
    createdAt: string;
}

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

export interface CharlieMessage {
    message: string;
    sessionId?: string;
    userId?: string;
    userRole?: 'OVERLORD' | 'ADMIN' | 'LORD';
    projectId?: string;
}

export interface CharlieResponse {
    success: boolean;
    data?: {
        message: string;
        intent?: { type: string; confidence: number };
        agentUsed?: string;
        pendingAction?: any;
        project?: Project;
    };
    sessionId?: string;
    error?: string;
}

/**
 * Send a message to Charlie
 */
export async function sendMessageToCharlie(request: CharlieMessage): Promise<CharlieResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/charlie/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        return await response.json();
    } catch (error) {
        console.error('Failed to send message to Charlie:', error);
        return { success: false, error: 'Failed to connect to Charlie' };
    }
}

/**
 * Get all projects
 */
export async function getProjects(userId?: string): Promise<Project[]> {
    try {
        const url = userId
            ? `${API_BASE_URL}/charlie/projects?userId=${userId}`
            : `${API_BASE_URL}/charlie/projects`;
        const response = await fetch(url);
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return [];
    }
}

/**
 * Get project details
 */
export async function getProject(projectId: string): Promise<Project | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/charlie/projects/${projectId}`);
        const data = await response.json();
        return data.data || null;
    } catch (error) {
        console.error('Failed to fetch project:', error);
        return null;
    }
}

/**
 * Create a new project
 */
export async function createProject(
    name: string,
    type: Project['type'],
    framework?: string,
    userId?: string
): Promise<Project | null> {
    try {
        const url = userId
            ? `${API_BASE_URL}/charlie/projects?userId=${userId}`
            : `${API_BASE_URL}/charlie/projects`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, framework }),
        });
        const data = await response.json();
        return data.data || null;
    } catch (error) {
        console.error('Failed to create project:', error);
        return null;
    }
}

/**
 * Get project file tree
 */
export async function getProjectFiles(projectId: string): Promise<FileNode[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/charlie/projects/${projectId}/files`);
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch project files:', error);
        return [];
    }
}

/**
 * Approve or reject a pending action
 */
export async function approveAction(
    sessionId: string,
    actionId: string,
    approved: boolean
): Promise<{ success: boolean; message?: string }> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/charlie/actions/${actionId}/approve?sessionId=${sessionId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved }),
            }
        );
        return await response.json();
    } catch (error) {
        console.error('Failed to approve action:', error);
        return { success: false, message: 'Failed to connect' };
    }
}
