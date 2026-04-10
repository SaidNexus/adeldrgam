import { api } from './auth';
import type { Profile } from '../types';

export const userService = {
    /**
     * Change user password
     */
    async changePassword(current_password: string, new_password: string) {
        try {
            const { data } = await api.patch('/users/change-password', {
                current_password,
                new_password
            });
            return data;
        } catch (error: any) {
            throw new Error(error.response?.data?.detail || 'فشل تغيير كلمة المرور');
        }
    },

    /**
     * Get profile stats (article count, likes, join date)
     */
    async getProfileStats(userId: string) {
        try {
            const { data } = await api.get(`/profiles/stats/${userId}`);
            return data;
        } catch (error: any) {
            console.error('Error fetching profile stats:', error);
            return {
                articles_count: 0,
                likes_received: 0,
                created_at: null
            };
        }
    },

    /**
     * Get public profiles / authors
     */
    async getProfiles(search?: string): Promise<Profile[]> {
        const { data } = await api.get('/profiles', { params: { search } });
        return data;
    },

    async getProfile(userId: string): Promise<Profile> {
        const { data } = await api.get(`/profiles/${userId}`);
        return data;
    },

    /**
     * Toggle follow/unfollow an author
     */
    async toggleFollow(userId: string) {
        const { data = {} } = await api.post(`/profiles/${userId}/follow`);
        return data;
    },

    /**
     * Get followers list for a user
     */
    async getFollowers(userId: string) {
        const { data } = await api.get(`/profiles/${userId}/followers`);
        return data;
    },

    /**
     * Get following list for a user
     */
    async getFollowing(userId: string) {
        const { data } = await api.get(`/profiles/${userId}/following`);
        return data;
    }
};

