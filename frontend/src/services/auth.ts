import axios, { AxiosError} from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const getBaseUrl = (): string => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    url = url.replace(/\/+$/, '');
    const API_V1 = '/api/v1';
    return url.endsWith(API_V1) ? url : `${url}${API_V1}`;
};

const BASE_URL = getBaseUrl();

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().token;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token: string) => {
                            if (originalRequest.headers) {
                                originalRequest.headers.Authorization = `Bearer ${token}`;
                            }
                            resolve(api(originalRequest));
                        },
                        reject
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const { refreshToken, setToken, setRefreshToken, logout } = useAuthStore.getState();

            if (!refreshToken) {
                logout();
                isRefreshing = false;
                return Promise.reject(error);
            }

            try {
                const { data } = await axios.post(
                    `${BASE_URL}/auth/refresh`,
                    {},
                    { headers: { Authorization: `Bearer ${refreshToken}` } }
                );

                const newAccessToken = data.access_token;
                const newRefreshToken = data.refresh_token;

                setToken(newAccessToken);
                setRefreshToken(newRefreshToken);

                processQueue(null, newAccessToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                logout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export const authService = {
    async initializeAuth(): Promise<void> {
        const { setLoading, setHasHydrated, setUser } = useAuthStore.getState();

        const start = Date.now();
        while (!useAuthStore.getState()._hasHydrated && Date.now() - start < 2000) {
            await new Promise((r) => setTimeout(r, 50));
        }
        setHasHydrated(true);

        const currentToken = useAuthStore.getState().token;
        if (!currentToken) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.get('/auth/me');
            if (data?.user) {
                setUser(data.user);
            }
        } catch (err) {
            console.warn('Auth initialization failed, token may be expired');
        } finally {
            setLoading(false);
        }
    },

    async signIn(email: string, password: string) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const { data } = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, user } = data;
        const { login } = useAuthStore.getState();
        login(user, access_token, refresh_token);

        return data;
    },

    async register(email: string, password: string, fullName: string, username: string) {
        const { data } = await api.post('/auth/register', {
            email,
            password,
            full_name: fullName,
            username
        });
        return data;
    },

    async updateProfile(userData: {
        username?: string;
        full_name?: string;
        bio?: string;
        avatar_url?: string;
        avatar_public_id?: string;
    }) {
        const { data } = await api.patch('/users/me', userData);
        const { setUser } = useAuthStore.getState();
        if (data?.user) {
            setUser(data.user);
        }
        return data;
    },

    async signOut() {
        const { logout } = useAuthStore.getState();
        try {
            await api.post('/auth/logout');
        } catch {
            // Silent fail on logout API
        } finally {
            logout();
        }
    },

    async refreshTokens(): Promise<boolean> {
        const { refreshToken, setToken, setRefreshToken, logout } = useAuthStore.getState();

        if (!refreshToken) {
            logout();
            return false;
        }

        try {
            const { data } = await axios.post(
                `${BASE_URL}/auth/refresh`,
                {},
                { headers: { Authorization: `Bearer ${refreshToken}` } }
            );

            setToken(data.access_token);
            setRefreshToken(data.refresh_token);
            return true;
        } catch {
            logout();
            return false;
        }
    }
};
