import { api } from './auth';

export interface AppNotification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    metadata_: any;
    created_at: string;
}

export interface NotificationPreferences {
    user_id: string;
    email_notifications: boolean;
    in_app_notifications: boolean;
    marketing_notifications: boolean;
    security_notifications: boolean;
}

export const notificationService = {
    /**
     * Get paginated notifications for current user
     */
    async getMyNotifications(page = 1, limit = 10, unreadOnly = false) {
        const { data } = await api.get('/notifications/me', {
            params: { page, limit, unread_only: unreadOnly }
        });
        return data;
    },

    /**
     * Get quick unread count
     */
    async getUnreadCount() {
        const { data } = await api.get('/notifications/unread-count');
        return data.unread_count;
    },

    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId: string) {
        const { data } = await api.patch(`/notifications/${notificationId}/read`);
        return data;
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        const { data } = await api.post('/notifications/mark-all-read');
        return data;
    },

    /**
     * Get notification preferences
     */
    async getPreferences() {
        const { data } = await api.get('/notifications/preferences');
        return data;
    },

    /**
     * Update notification preferences
     */
    async updatePreferences(updates: Partial<NotificationPreferences>) {
        const { data } = await api.patch('/notifications/preferences', updates);
        return data;
    },

    /**
     * Create a test notification
     */
    async createTestNotification() {
        const { data } = await api.post('/notifications/test');
        return data;
    }
};
