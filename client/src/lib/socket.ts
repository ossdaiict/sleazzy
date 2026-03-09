import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from './socketEvents';

const getSocketUrl = () => {
    const configured = (import.meta.env.VITE_API_URL || '').trim();
    if (configured) return configured;

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return 'http://localhost:4000';
};

const getSupabaseAccessToken = () => {
    if (typeof window === 'undefined') return null;

    const directToken = localStorage.getItem('supabase_access_token');
    if (directToken) return directToken;

    const authStorageKey = Object.keys(localStorage).find((key) => key.endsWith('-auth-token'));
    if (!authStorageKey) return null;

    try {
        const raw = localStorage.getItem(authStorageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { access_token?: string };
        return parsed.access_token || null;
    } catch {
        return null;
    }
};

class SocketService {
    private socket: Socket | null = null;
    private connectionPromise: Promise<void> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    private applyLatestAuthToken() {
        if (!this.socket) return;

        const token = getSupabaseAccessToken();
        const currentAuth = (this.socket.auth || {}) as { token?: string };

        if (token) {
            this.socket.auth = { ...currentAuth, token };
        } else if (currentAuth.token) {
            const { token: _token, ...rest } = currentAuth;
            this.socket.auth = rest;
        }
    }

    ensureAuthContext() {
        if (!this.socket) return;

        const nextToken = getSupabaseAccessToken();
        const currentToken = ((this.socket.auth || {}) as { token?: string }).token;

        if (nextToken && currentToken !== nextToken) {
            this.socket.auth = { ...(this.socket.auth as Record<string, unknown>), token: nextToken };
            if (this.socket.connected) {
                this.socket.disconnect().connect();
            }
            return;
        }

        if (!nextToken && currentToken) {
            const currentAuth = (this.socket.auth || {}) as Record<string, unknown>;
            delete currentAuth.token;
            this.socket.auth = currentAuth;
            if (this.socket.connected) {
                this.socket.disconnect().connect();
            }
        }
    }

    connect() {
        if (this.socket?.connected) return Promise.resolve();
        if (this.connectionPromise) return this.connectionPromise;

        this.connectionPromise = new Promise((resolve, reject) => {
            this.socket = io(getSocketUrl(), {
                reconnectionAttempts: this.maxReconnectAttempts,
                timeout: 10000,
            });

            this.applyLatestAuthToken();

            this.socket.on('connect', () => {
                console.log('[Socket.io] Connected');
                this.reconnectAttempts = 0;
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.warn('[Socket.io] Connection error:', error.message);
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    reject(error);
                }
            });
        });

        return this.connectionPromise;
    }

    joinAdmin() {
        this.socket?.emit('join:admin');
    }

    joinClub(clubId: string) {
        this.socket?.emit('join:club', clubId);
    }

    on(event: string, callback: (...args: any[]) => void) {
        this.socket?.on(event, callback);
    }

    off(event: string, callback?: (...args: any[]) => void) {
        this.socket?.off(event, callback);
    }

    getSocketInstance() {
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connectionPromise = null;
    }
}

export const socketService = new SocketService();

export const getSocket = () => {
    const existing = socketService.getSocketInstance();
    if (existing) {
        socketService.ensureAuthContext();
        return existing;
    }

    // Lazily initialize the singleton so callers can subscribe immediately.
    void socketService.connect().catch((error) => {
        console.warn('[Socket.io] Initial lazy connect failed:', error);
    });

    return socketService.getSocketInstance();
};

export { SOCKET_EVENTS };
