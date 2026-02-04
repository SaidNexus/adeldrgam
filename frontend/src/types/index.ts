/**
 * DIAGNOSTICS: Using named type exports to prevent ESM runtime export issues.
 * Interfaces re-exported via '*' are erased in JS, causing browser SyntaxErrors
 * if imported via non-type imports.
 */
export type { Article, ArticleStatus, Profile, Category } from "./article";

export type Comment = {
    id: string;
    article_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user?: import("./article").Profile;
    replies?: Comment[];
};

export type Like = {
    article_id: string;
    user_id: string;
    created_at: string;
};

export type Tag = {
    id: string;
    name: string;
};
