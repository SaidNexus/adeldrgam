import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import type { Article, Category, Comment } from '@/types/article';

const getBaseUrl = (): string => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    url = url.replace(/\/+$/, '');
    const API_V1 = '/api/v1';
    return url.endsWith(API_V1) ? url : `${url}${API_V1}`;
};

const BASE_URL = getBaseUrl();

const api = axios.create({
    baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const articleService = {
    async getArticles(params: {
        status?: string;
        author_type?: string;
        author_id?: string;
        category_id?: string;
        category_slug?: string;
        pinned?: boolean;
        is_pinned?: boolean;
        featured?: boolean;
        is_featured?: boolean;
        feed_type?: string;
        limit?: number;
        offset?: number;
    } = { status: 'published' }): Promise<Article[]> {
        // Map frontend params to backend Query params if needed
        const queryParams = {
            ...params,
            is_pinned: params.is_pinned ?? params.pinned,
            is_featured: params.is_featured ?? params.featured,
        };

        // Remove the temporary aliased keys
        if ('pinned' in queryParams) delete (queryParams as any).pinned;
        if ('featured' in queryParams) delete (queryParams as any).featured;

        const { data } = await api.get('/articles', { params: queryParams });
        return data;
    },

    async getAllArticles(params: {
        status?: string;
        author_type?: string;
        author_id?: string;
        category_id?: string;
        category_slug?: string;
        pinned?: boolean;
        is_pinned?: boolean;
        featured?: boolean;
        is_featured?: boolean;
        feed_type?: string;
    } = { status: 'published' }): Promise<Article[]> {
        let allArticles: Article[] = [];
        let offset = 0;
        const limit = 50; // Use a larger limit for batch fetching
        let hasMore = true;

        while (hasMore) {
            const batch = await this.getArticles({ ...params, limit, offset });
            if (!batch || batch.length === 0) {
                hasMore = false;
                break;
            }

            allArticles = [...allArticles, ...batch];

            if (batch.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }

        // Remove duplicates just in case, based on ID
        const uniqueArticles = Array.from(new Map(allArticles.map(item => [item.id, item])).values());
        return uniqueArticles;
    },

    async getMyArticles(): Promise<Article[]> {
        const { data } = await api.get('/articles/my');
        return data;
    },

    async getArticlesByAuthor(authorId: string): Promise<Article[]> {
        const { data } = await api.get('/articles', { params: { author_id: authorId, status: 'published' } });
        return data;
    },

    async getAllArticlesByAuthor(authorId: string): Promise<Article[]> {
        return this.getAllArticles({ author_id: authorId, status: 'published' });
    },

    async getLikedArticles(): Promise<Article[]> {
        const { data } = await api.get('/articles/liked');
        return data;
    },

    async getArticleBySlug(slug: string): Promise<Article> {
        const { data } = await api.get(`/articles/${encodeURIComponent(slug)}`);
        return data;
    },

    async getArticleById(id: string): Promise<Article> {
        const { data } = await api.get(`/articles/id/${id}`);
        return data;
    },

    async getCategories(): Promise<Category[]> {
        const { data } = await api.get('/categories');
        return data;
    },

    async incrementViews(articleId: string): Promise<void> {
        await api.post(`/articles/${articleId}/view`).catch(() => { });
    },

    async getComments(articleId: string): Promise<Comment[]> {
        const { data } = await api.get(`/articles/${articleId}/comments`);
        return data;
    },

    async createComment(articleId: string, content: string, parentId?: string): Promise<Comment> {
        const { data } = await api.post(`/articles/${articleId}/comments`, {
            content,
            parent_id: parentId
        });
        return data;
    },

    async updateComment(commentId: string, content: string): Promise<Comment> {
        const { data } = await api.put(`/comments/${commentId}`, { content });
        return data;
    },

    async deleteComment(commentId: string): Promise<void> {
        await api.delete(`/comments/${commentId}`);
    },

    async createArticle(articleData: any): Promise<Article> {
        const { data } = await api.post('/articles', articleData);
        return data;
    },

    async updateArticle(articleId: string, updates: any): Promise<Article> {
        const { data } = await api.put(`/articles/${articleId}`, updates);
        return data;
    },

    async deleteArticle(articleId: string): Promise<void> {
        await api.delete(`/articles/${articleId}`);
    },

    async toggleLike(articleId: string): Promise<{ liked: boolean; likes_count: number }> {
        const { data } = await api.post(`/articles/${articleId}/like`);
        return data;
    },

    async incrementShare(articleId: string): Promise<{ success: boolean; share_count: number }> {
        const { data } = await api.post(`/articles/${articleId}/share`);
        return data;
    },
};
