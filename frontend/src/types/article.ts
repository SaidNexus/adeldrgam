export type AuthorInfo = {
    id: string;
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    is_following?: boolean;
};

export type Profile = {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    avatar_public_id?: string;
    bio?: string;
    role: 'user' | 'publisher' | 'admin';
    is_admin: boolean;
    created_at: string;
    followers_count: number;
    following_count: number;
    is_following?: boolean;
};

export type CommentUser = {
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
};

export type Comment = {
    id: string;
    article_id: string;
    user_id: string;
    content: string;
    created_at: string;
    is_deleted?: boolean;
    user: CommentUser;
    replies: Comment[];
    parent_id?: string | null;
};

export type Category = {
    id: string;
    name_ar: string;
    slug: string;
    description_ar?: string;
};

export type ArticleStatus = 'draft' | 'published';

export interface Article {
    id: string;
    author_id: string;
    category_id?: string | null;
    title: string;
    slug: string;
    excerpt?: string | null;
    content?: any;
    featured_image_url?: string | null;
    cover_public_id?: string | null;
    status: ArticleStatus | string;
    views_count: number;
    share_count: number;
    likes_count: number;
    comments_count: number;
    liked_by_me: boolean;
    is_pinned: boolean;
    is_featured: boolean;
    created_at: string;
    updated_at: string;
    author?: AuthorInfo | null;
    category?: Category | null;
}
