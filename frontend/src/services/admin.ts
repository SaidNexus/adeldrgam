import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import type { Profile } from '../types';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    timeout: 30000
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface AdminStats {
    total_users: number;
    total_articles: number;
    pending_approvals: number;
    total_likes: number;
}

export const adminService = {
    /**
     * Get global admin statistics
     */
    async getStats(): Promise<AdminStats> {
        const response = await api.get('/admin/stats');
        console.log('FRONTEND RECEIVING:', response.data);
        return response.data;
    },

    /**
     * Get all users (Admin only)
     */
    async getUsers(search?: string, limit = 100, offset = 0): Promise<Profile[]> {
        const { data } = await api.get('/admin/users', {
            params: { search, limit, offset }
        });
        return data;
    },

    /**
     * Update user role (Admin only)
     */
    async updateUserRole(userId: string, role: string) {
        const { data } = await api.patch(`/admin/users/${userId}/role`, null, {
            params: { role }
        });
        return data;
    },

    /**
     * Update user status (Ban/Unban)
     */
    async updateUserStatus(userId: string, isActive: boolean) {
        const { data } = await api.patch(`/admin/users/${userId}/status`, null, {
            params: { is_active: isActive }
        });
        return data;
    },

    /**
     * Delete user (Admin only)
     */
    async deleteUser(userId: string) {
        const { data } = await api.delete(`/admin/users/${userId}`);
        return data;
    },

    /**
     * Update article status (Approve/Reject)
     */
    async updateArticleStatus(articleId: string, status: string) {
        const { data } = await api.patch(`/articles/${articleId}/status`, null, {
            params: { status }
        });
        return data;
    },

    /**
     * Manage categories (Admin only)
     */
    async createCategory(catData: { name_ar: string, slug: string, description_ar?: string }) {
        const { data } = await api.post('/categories', catData);
        return data;
    },

    async updateCategory(catId: string, catData: any) {
        const { data } = await api.patch(`/categories/${catId}`, catData);
        return data;
    },

    async deleteCategory(catId: string) {
        const { data } = await api.delete(`/categories/${catId}`);
        return data;
    }
};
