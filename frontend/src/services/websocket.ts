import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from './auth';

type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class WebSocketService {
    private socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private isManuallyClosed = false;
    private status: WebSocketStatus = 'disconnected';

    private getWsUrl(): string | null {
        const { token, user } = useAuthStore.getState();

        if (!token || !user?.id) {
            return null;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let host = import.meta.env.VITE_API_URL || window.location.host;

        host = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');

        const API_V1 = '/api/v1';
        if (host.endsWith(API_V1)) {
            host = host.slice(0, -API_V1.length);
        }

        return `${protocol}//${host}${API_V1}/notifications/ws/${user.id}?token=${token}`;
    }

    connect(): void {
        const { _hasHydrated, isAuthenticated } = useAuthStore.getState();

        if (!_hasHydrated || !isAuthenticated) {
            return;
        }

        if (this.socket?.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.socket?.readyState === WebSocket.CONNECTING) {
            return;
        }

        const wsUrl = this.getWsUrl();
        if (!wsUrl) {
            console.warn('[WS] Cannot build URL - missing token or user');
            return;
        }

        this.isManuallyClosed = false;
        this.status = 'connecting';

        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                this.status = 'connected';
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    useNotificationStore.getState().handleWebSocketMessage(message);

                    if (message.type === 'NEW_NOTIFICATION') {
                        window.dispatchEvent(
                            new CustomEvent('app-notification', { detail: message.notification })
                        );
                        this.playNotificationSound();
                    }
                } catch (e) {
                    console.error('[WS] Message parse error:', e);
                }
            };

            this.socket.onclose = async (event) => {
                this.status = 'disconnected';

                if (this.isManuallyClosed) {
                    return;
                }

                console.warn(`[WS] Closed (code: ${event.code})`);

                if (event.code === 1008 || event.code === 1006 || event.code === 403) {
                    // Auth error, attempting token refresh...
                    const refreshed = await authService.refreshTokens();
                    if (refreshed) {
                        this.reconnectAttempts = 0;
                        this.scheduleReconnect(1000);
                        return;
                    }
                }

                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    this.scheduleReconnect(delay);
                } else {
                    console.error('[WS] Max reconnect attempts reached');
                    this.status = 'error';
                }
            };

            this.socket.onerror = (error) => {
                console.error('[WS] Error:', error);
                this.status = 'error';
            };
        } catch (err) {
            console.error('[WS] Connection failed:', err);
            this.status = 'error';
        }
    }

    private scheduleReconnect(delay: number): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;

            this.connect();
        }, delay);
    }

    disconnect(): void {
        this.isManuallyClosed = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.status = 'disconnected';
        this.reconnectAttempts = 0;
    }

    getStatus(): WebSocketStatus {
        return this.status;
    }

    private playNotificationSound(): void {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => { });
        } catch {
            // Silent fail for audio
        }
    }
}

export const webSocketService = new WebSocketService();
