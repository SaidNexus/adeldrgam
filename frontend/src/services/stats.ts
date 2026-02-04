import { api } from './auth';

const VISIT_KEY = 'nabdh_visitor_recorded';

export const statsService = {
    /**
     * Get the current visitor count
     */
    async getVisitorCount(): Promise<number> {
        try {
            const response = await api.get('/visitors/count');
            return response.data.visitors_count || 61125;
        } catch (error) {
            console.error('Failed to fetch visitor count:', error);
            return 61125; // Fallback
        }
    },

    /**
     * Record a unique visit (only once per session)
     */
    async recordVisit(): Promise<void> {
        try {
            // Check if already recorded in this session
            const alreadyRecorded = sessionStorage.getItem(VISIT_KEY);
            if (alreadyRecorded) {
                return;
            }

            await api.post('/visitors/increment');

            // Mark as recorded for this session
            sessionStorage.setItem(VISIT_KEY, 'true');
        } catch (error) {
            console.error('Failed to record visit:', error);
        }
    }
};
