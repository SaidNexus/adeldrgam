import { create } from 'zustand';
import { notificationService } from '../services/notification';
import type { AppNotification, NotificationPreferences } from '../services/notification';

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    total: number;
    isLoading: boolean;
    error: string | null;
    preferences: NotificationPreferences | null;
    isPrefsLoading: boolean;
    prefsError: string | null;
    fetchNotifications: (limit?: number) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchPreferences: () => Promise<void>;
    updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
    addTestNotification: () => Promise<void>;
    handleWebSocketMessage: (message: any) => void;
    clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    total: 0,
    isLoading: false,
    error: null,
    preferences: null,
    isPrefsLoading: false,
    prefsError: null,

    fetchNotifications: async (limit = 20) => {
        set({ isLoading: true, error: null });
        try {
            const data = await notificationService.getMyNotifications(1, limit);
            set({
                notifications: data.items || [],
                unreadCount: data.unread_count || 0,
                total: data.total || 0,
                isLoading: false
            });
        } catch (error: any) {
            console.error('Failed to fetch notifications:', error);
            set({
                error: error?.response?.data?.detail || error?.message || 'فشل تحميل الإشعارات',
                isLoading: false
            });
        }
    },

    markAsRead: async (id: string) => {
        const { notifications, unreadCount } = get();
        const notification = notifications.find(n => n.id === id);
        if (!notification || notification.is_read) return;

        // Optimistic update
        set({
            notifications: notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ),
            unreadCount: Math.max(0, unreadCount - 1)
        });

        try {
            await notificationService.markAsRead(id);
        } catch (error) {
            // Rollback on error
            set({
                notifications: notifications.map(n =>
                    n.id === id ? { ...n, is_read: false } : n
                ),
                unreadCount
            });
            console.error('Failed to mark notification as read:', error);
        }
    },

    markAllAsRead: async () => {
        const { notifications, unreadCount } = get();
        const previousNotifications = [...notifications];
        const previousUnreadCount = unreadCount;

        // Optimistic update
        set({
            notifications: notifications.map(n => ({ ...n, is_read: true })),
            unreadCount: 0
        });

        try {
            await notificationService.markAllAsRead();
        } catch (error) {
            // Rollback on error
            set({
                notifications: previousNotifications,
                unreadCount: previousUnreadCount
            });
            console.error('Failed to mark all as read:', error);
        }
    },

    fetchPreferences: async () => {
        set({ isPrefsLoading: true, prefsError: null });
        try {
            const prefs = await notificationService.getPreferences();
            set({ preferences: prefs, isPrefsLoading: false });
        } catch (error: any) {
            console.error('Failed to fetch notification preferences:', error);
            set({
                prefsError: error?.response?.data?.detail || 'فشل تحميل الإعدادات',
                isPrefsLoading: false
            });
        }
    },

    updatePreferences: async (updates: Partial<NotificationPreferences>) => {
        const { preferences } = get();
        if (!preferences) return;

        const previousPrefs = { ...preferences };
        set({ preferences: { ...preferences, ...updates } });

        try {
            await notificationService.updatePreferences(updates);
        } catch (error: any) {
            console.error('Failed to update preferences:', error);
            set({ preferences: previousPrefs });
            throw error;
        }
    },

    addTestNotification: async () => {
        set({ isLoading: true });
        try {
            await notificationService.createTestNotification();
        } catch (error) {
            console.error('Failed to create test notification:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    handleWebSocketMessage: (message: any) => {
        const { type, notification, notification_id } = message;
        const { notifications, unreadCount, total } = get();

        switch (type) {
            case 'NEW_NOTIFICATION':
                if (notification && !notifications.find(n => n.id === notification.id)) {
                    set({
                        notifications: [notification, ...notifications].slice(0, 50),
                        unreadCount: unreadCount + 1,
                        total: total + 1
                    });
                }
                break;

            case 'NOTIFICATION_READ':
                if (notification_id) {
                    const targetNotification = notifications.find(n => n.id === notification_id);
                    if (targetNotification && !targetNotification.is_read) {
                        set({
                            notifications: notifications.map(n =>
                                n.id === notification_id ? { ...n, is_read: true } : n
                            ),
                            unreadCount: Math.max(0, unreadCount - 1)
                        });
                    }
                }
                break;

            case 'ALL_NOTIFICATIONS_READ':
                set({
                    notifications: notifications.map(n => ({ ...n, is_read: true })),
                    unreadCount: 0
                });
                break;

            default:
                break;
        }
    },

    clearError: () => set({ error: null })
}));
