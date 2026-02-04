import { api } from './auth';

export interface PublisherRequest {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    username?: string;
    email?: string;
}

export const publisherService = {
    createRequest: async () => {
        const response = await api.post('/publisher-requests');
        return response.data;
    },
    getMyRequest: async () => {
        const response = await api.get('/publisher-requests/me');
        return response.data;
    },
    getAllRequests: async () => {
        const response = await api.get('/publisher-requests');
        return response.data as PublisherRequest[];
    },
    approveRequest: async (id: string) => {
        const response = await api.patch(`/publisher-requests/${id}/approve`);
        return response.data;
    },
    rejectRequest: async (id: string) => {
        const response = await api.patch(`/publisher-requests/${id}/reject`);
        return response.data;
    }
};
