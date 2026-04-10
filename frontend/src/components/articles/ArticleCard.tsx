import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, MessageCircle, Share2, User,
    Check, Plus, Clock
} from 'lucide-react';
import type { Article } from '../../types/article';
import { formatDate } from '../../lib/utils';
import { articleService } from '../../services/articles';
import { userService } from '../../services/user';
import { useAuthStore } from '../../store/useAuthStore';

interface ArticleCardProps {
    article: Article;
}

export const ArticleCard = ({ article }: ArticleCardProps) => {
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useAuthStore();

    const [isLiked, setIsLiked] = useState(article.liked_by_me);
    const [likesCount, setLikesCount] = useState(article.likes_count);
    const [isFollowing, setIsFollowing] = useState(article.author?.is_following || false);
    const [isLiking, setIsLiking] = useState(false);
    const [isFollowingLoading, setIsFollowingLoading] = useState(false);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (isLiking) return;

        // Optimistic update
        const prevLiked = isLiked;
        const prevCount = likesCount;

        setIsLiked(!prevLiked);
        setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);
        setIsLiking(true);

        try {
            const result = await articleService.toggleLike(article.id);
            setLikesCount(result.likes_count);
            setIsLiked(result.liked);
        } catch (error) {
            // Rollback
            setIsLiked(prevLiked);
            setLikesCount(prevCount);
        } finally {
            setIsLiking(false);
        }
    };

    const handleFollow = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!article.author?.id || isFollowingLoading) return;

        // Optimistic
        const prevFollowing = isFollowing;
        setIsFollowing(!prevFollowing);
        setIsFollowingLoading(true);

        try {
            const result = await userService.toggleFollow(article.author.id);
            setIsFollowing(result.is_following);
        } catch (error) {
            setIsFollowing(prevFollowing);
        } finally {
            setIsFollowingLoading(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            if (navigator.share) {
                await navigator.share({
                    title: article.title,
                    text: article.excerpt || '',
                    url: `${window.location.origin}/articles/${article.slug}`
                });
                await articleService.incrementShare(article.id);
            } else {
                throw new Error('Share API not supported');
            }
        } catch {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(`${window.location.origin}/articles/${article.slug}`);
            // Visual feedback could be added here
        }
    };

    const isOwnPost = currentUser?.id === article.author?.id;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white border border-[#e2e8f0] rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 font-almarai h-full flex flex-col"
        >
            {/* Header: Author Info */}
            <div className="p-4 md:p-5 flex items-center justify-between border-b border-[#f1f5f9] bg-white/50 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        to={`/profile/${article.author?.id}`}
                        className="h-11 w-11 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform active:scale-95"
                    >
                        {article.author?.avatar_url ? (
                            <img src={article.author.avatar_url} alt={article.author.username} className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-5 w-5 text-gray-400" />
                        )}
                    </Link>
                    <div className="min-w-0">
                        <Link
                            to={`/profile/${article.author?.id}`}
                            className="text-[15px] font-black text-[#0f172a] hover:text-blue-600 transition-colors block leading-tight truncate"
                        >
                            {article.author?.full_name || article.author?.username}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-[#64748b]">
                            <span>{formatDate(article.created_at)}</span>
                            <span className="w-1 h-1 bg-gray-200 rounded-full" />
                            <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                5 دقائق
                            </span>
                        </div>
                    </div>
                </div>

                {!isOwnPost && isAuthenticated && (
                    <button
                        onClick={handleFollow}
                        disabled={isFollowingLoading}
                        className={`h-9 px-5 rounded-full text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 ${isFollowing
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10'
                            }`}
                    >
                        <AnimatePresence mode="wait">
                            {isFollowing ? (
                                <motion.div
                                    key="check"
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                    className="flex items-center gap-1.5"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    أتابعه
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="plus"
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                    className="flex items-center gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    متابعة
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </button>
                )}
            </div>

            {/* Content: Title & Preview */}
            <Link to={`/articles/${article.slug}`} className="block group/content flex-grow flex flex-col">
                <div className="px-5 py-4 flex-grow">
                    <h3 className="text-xl md:text-2xl font-black text-[#0f172a] leading-[1.3] group-hover/content:text-blue-600 transition-colors line-clamp-2">
                        {article.title}
                    </h3>
                    {article.excerpt && (
                        <p className="mt-2 text-[#475569] text-sm leading-relaxed line-clamp-3 font-medium">
                            {article.excerpt}
                        </p>
                    )}
                </div>

                <div className="relative aspect-video overflow-hidden bg-gray-50 shrink-0 mt-auto">
                    <img
                        src={article.featured_image_url || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80'}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/content:scale-105"
                    />
                    <div className="absolute top-4 right-4">
                        <span className="bg-white/95 backdrop-blur shadow-sm text-gray-900 text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider border border-gray-100">
                            {article.category?.name_ar || 'عام'}
                        </span>
                    </div>
                </div>
            </Link>

            {/* Footer: Action Bar */}
            <div className="px-3 py-2 border-t border-[#f1f5f9] flex items-center justify-between bg-[#f8fafc]/30 shrink-0 mt-auto">
                <div className="flex items-center">
                    <button
                        onClick={handleLike}
                        className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${isLiked ? 'text-red-500' : 'text-gray-500 hover:bg-red-50 hover:text-red-500'
                            }`}
                    >
                        <div className={`p-1.5 rounded-full transition-all ${isLiked ? 'bg-red-50' : 'group-hover:bg-red-100'}`}>
                            <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500' : 'fill-none'}`} />
                        </div>
                        <span className="text-sm font-black">{likesCount > 0 ? likesCount.toLocaleString('en-US') : 'إعجاب'}</span>
                    </button>

                    <Link
                        to={`/articles/${article.slug}#comments`}
                        className="group flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                        <div className="p-1.5 rounded-full transition-all group-hover:bg-blue-100">
                            <MessageCircle className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black">{article.comments_count > 0 ? article.comments_count.toLocaleString('en-US') : 'تعليق'}</span>
                    </Link>
                </div>

                <button
                    onClick={handleShare}
                    className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-all active:scale-95"
                    title="مشاركة"
                >
                    <Share2 className="h-5 w-5" />
                </button>
            </div>
        </motion.div>
    );
};

export const ArticleSkeleton = () => (
    <div className="bg-white border border-gray-100 rounded-[1.5rem] overflow-hidden shadow-sm animate-pulse">
        <div className="p-4 flex items-center gap-3 border-b border-gray-50">
            <div className="h-11 w-11 bg-gray-100 rounded-full" />
            <div className="space-y-2 flex-1">
                <div className="h-3 w-32 bg-gray-100 rounded" />
                <div className="h-2 w-20 bg-gray-100 rounded" />
            </div>
        </div>
        <div className="px-5 py-4 space-y-3">
            <div className="h-6 w-full bg-gray-100 rounded" />
            <div className="h-6 w-2/3 bg-gray-100 rounded" />
        </div>
        <div className="aspect-video bg-gray-50" />
        <div className="p-3 flex gap-4">
            <div className="h-8 w-20 bg-gray-100 rounded-xl" />
            <div className="h-8 w-20 bg-gray-100 rounded-xl" />
        </div>
    </div>
);
