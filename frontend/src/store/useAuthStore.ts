import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Profile } from '../types';

interface AuthState {
    user: Profile | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    _hasHydrated: boolean;
    setUser: (user: Profile | null) => void;
    setToken: (token: string | null) => void;
    setRefreshToken: (token: string | null) => void;
    setLoading: (loading: boolean) => void;
    setHasHydrated: (hydrated: boolean) => void;
    login: (user: Profile, accessToken: string, refreshToken: string) => void;
    logout: () => void;
    updateUser: (updates: Partial<Profile>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: true,
            _hasHydrated: false,

            setUser: (user) => set({
                user,
                isAuthenticated: !!user
            }),

            setToken: (token) => set({ token }),

            setRefreshToken: (refreshToken) => set({ refreshToken }),

            setLoading: (isLoading) => set({ isLoading }),

            setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),

            login: (user, accessToken, refreshToken) => set({
                user,
                token: accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false
            }),

            logout: () => {
                set({
                    user: null,
                    token: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    isLoading: false
                });
            },

            updateUser: (updates) => {
                const currentUser = get().user;
                if (currentUser) {
                    set({ user: { ...currentUser, ...updates } });
                }
            }
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated
            }),
            onRehydrateStorage: () => (state, error) => {
                if (error) {
                    console.error('Auth rehydration failed:', error);
                }
                if (state) {
                    state.setHasHydrated(true);
                    state.setLoading(false);
                }
            },
        }
    )
);
