/**
 * Auth Store - Zustand store for authentication state
 */

import { create } from 'zustand';

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'OVERLORD' | 'ADMIN' | 'LORD';
    workspaceId?: string;
    voiceId?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (user: User) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: (user) => set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
    }),

    logout: () => set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
    }),

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error, isLoading: false }),
}));
