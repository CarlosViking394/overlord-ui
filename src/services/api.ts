/**
 * API Service - Communication with Overlord API
 */

// Dynamic API base - works from localhost or mobile devices
const getApiBase = () => {
    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        return `http://${hostname}:3000`;
    }
    return 'http://192.168.1.144:3000';
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
