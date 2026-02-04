/**
 * Strict Data Transfer Objects for API communication.
 * These DTOs define exactly what the frontend should send to the backend.
 * System fields (author_id, views_count, created_at, updated_at) are NEVER sent.
 */

// Article Create DTO - Only fields the frontend should send
export interface ArticleCreateDTO {
    title: string;
    slug: string;
    excerpt?: string;
    content?: any; // TipTap JSON
    featured_image_url?: string;
    cover_public_id?: string;
    status?: 'draft' | 'published';
    category_id?: string;
}

// Article Update DTO - Only fields that can be updated
export interface ArticleUpdateDTO {
    title?: string;
    excerpt?: string;
    content?: any;
    featured_image_url?: string;
    cover_public_id?: string;
    status?: 'draft' | 'published';
    category_id?: string;
}

// Profile Update DTO - Only fields that can be updated
export interface ProfileUpdateDTO {
    bio?: string;
    avatar_url?: string;
    avatar_public_id?: string;
    full_name?: string;
    username?: string;
}
