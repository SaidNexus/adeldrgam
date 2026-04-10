import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Article } from '../types/article';
import { articleService } from '../services/articles';
import { formatDate } from '../lib/utils';
import {
    Share2, Eye, Heart, Sparkles, Clock, Calendar,
    User, ArrowLeft, Loader2, CheckCircle2, Plus
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { userService } from '../services/user';
import { CommentSection } from '../components/article/CommentSection';
import { ContentRenderer } from '../components/article/ContentRenderer';
import { motion, useScroll, useSpring } from 'framer-motion';
import { toast } from 'sonner';

export const ArticlePage = () => {
    const { slug, id } = useParams<{ slug?: string; id?: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);

    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const isIdMode = !!id;
    const identifier = id || slug;

    const { data: article, isLoading, error } = useQuery({
        queryKey: ['article', identifier],
        queryFn: () => isIdMode ? articleService.getArticleById(id!) : articleService.getArticleBySlug(slug!),
        enabled: !!identifier,
        retry: 1,
    });

    // Author Profile Query for Follow State
    const { data: authorProfile } = useQuery({
        queryKey: ['profile', article?.author?.id],
        queryFn: () => userService.getProfile(article!.author!.id),
        enabled: !!article?.author?.id,
    });

    const followMutation = useMutation({
        mutationFn: () => userService.toggleFollow(article!.author!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', article?.author?.id] });
        }
    });

    const likeMutation = useMutation({
        mutationFn: () => {
            if (!article) throw new Error('Article not loaded');
            return articleService.toggleLike(article.id);
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['article', identifier] });
            const previousArticle = queryClient.getQueryData<Article>(['article', identifier]);
            if (previousArticle) {
                queryClient.setQueryData(['article', identifier], {
                    ...previousArticle,
                    liked_by_me: !previousArticle.liked_by_me,
                    likes_count: previousArticle.liked_by_me
                        ? Math.max((previousArticle.likes_count || 1) - 1, 0)
                        : (previousArticle.likes_count || 0) + 1,
                });
            }
            return { previousArticle };
        },
        onError: (err, _, context) => {
            console.error('Like mutation failed:', err);
            if (context?.previousArticle) {
                queryClient.setQueryData(['article', identifier], context.previousArticle);
            }
            toast.error('فشل في تغيير حالة الإعجاب');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['article', identifier] });
        },
    });

    const handleShare = async () => {
        if (!article) return;
        try {
            await articleService.incrementShare(article.id);
            if (navigator.share) {
                await navigator.share({
                    title: article.title,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('تم نسخ الرابط');
            }
            queryClient.invalidateQueries({ queryKey: ['article', identifier] });
        } catch { }
    };

    if (isLoading) return (
        <div className="bg-white min-h-screen flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
    );

    if (error || !identifier || (!isLoading && !article)) return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-6">
            <div className="text-center space-y-8 max-w-md">
                <div className="h-24 w-24 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                    <Sparkles className="h-12 w-12 text-gray-200" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-gray-900 text-3xl font-black tracking-tight">عادل ضرغام غير متصل</h1>
                    <p className="text-gray-400 font-medium">المحتوى الذي تبحث عنه قد تم نقله أو حذفه من أرشيف المنصة.</p>
                </div>
                <button
                    onClick={() => navigate('/articles')}
                    className="h-14 px-8 bg-gray-900 text-white rounded-2xl font-black flex items-center gap-3 justify-center w-full shadow-xl shadow-gray-900/10 active:scale-95 transition-all"
                >
                    <ArrowLeft className="h-5 w-5" />
                    استكشاف المقالات
                </button>
            </div>
        </div>
    );

    // Number formatter for consistent Western Numerals (123)
    const nf = new Intl.NumberFormat('en-US');

    // We can safely access article here because of the early return above
    const safeArticle = article!;

    return (
        <div className="bg-white min-h-screen selection:bg-blue-600 selection:text-white pb-32">
            {/* Reading Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1.5 bg-blue-600 origin-[0%] z-[70] shadow-[0_2px_10px_rgba(37,99,235,0.3)]"
                style={{ scaleX }}
            />

            {/* Premium Header / Hero Area */}
            <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-gray-50/50">
                <div className="max-w-4xl mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8 text-center md:text-right"
                    >
                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                            <span className="px-5 py-2 bg-blue-600 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">
                                {safeArticle.category?.name_ar || 'مقال عادل ضرغام'}
                            </span>
                            <div className="flex items-center gap-2 text-gray-400 text-sm font-bold">
                                <Clock className="h-4 w-4" />
                                <span>{nf.format(5)} دقائق قراءة</span>
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-7xl font-black text-[#0f172a] leading-[1.15] tracking-tight">
                            {safeArticle.title}
                        </h1>

                        {/* Author Brief */}
                        <div className="flex items-center justify-center md:justify-start gap-5 pt-4">
                            <Link to={`/profile/${safeArticle.author?.id}`} className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-gray-100 shrink-0">
                                {safeArticle.author?.avatar_url ? (
                                    <img src={safeArticle.author.avatar_url} alt={safeArticle.author.username} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                        <User className="h-8 w-8" />
                                    </div>
                                )}
                            </Link>
                            <div className="flex flex-col text-right">
                                <Link to={`/profile/${safeArticle.author?.id}`} className="text-xl font-black text-gray-900 hover:text-blue-600 transition-colors">
                                    {safeArticle.author?.full_name || safeArticle.author?.username}
                                </Link>
                                <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
                                    <Calendar className="h-4 w-4" />
                                    <span>نُشر في {formatDate(safeArticle.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />
            </header>

            {/* Featured Image */}
            {safeArticle.featured_image_url && (
                <div className="max-w-6xl mx-auto px-6 -mt-10 md:-mt-20 relative z-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="aspect-[21/9] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white bg-gray-100"
                    >
                        <img src={safeArticle.featured_image_url} alt={safeArticle.title} className="w-full h-full object-cover" />
                    </motion.div>
                </div>
            )}

            {/* Article Content Layout */}
            <div className="max-w-7xl mx-auto px-6 pt-24 relative grid lg:grid-cols-[1fr_minmax(auto,800px)_1fr] gap-12">
                {/* Floating Social Bar (Desktop Only) */}
                <aside className="hidden lg:block sticky top-32 h-fit space-y-6">
                    <div className="flex flex-col gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-3xl backdrop-blur-sm">
                        <button
                            onClick={() => {
                                if (!user) navigate('/login');
                                else likeMutation.mutate();
                            }}
                            className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-90 ${safeArticle.liked_by_me
                                ? 'bg-rose-500 text-white shadow-rose-500/20'
                                : 'bg-white text-[#64748b] hover:text-rose-500 hover:border-rose-100 border border-[#e2e8f0]'}`}
                        >
                            <Heart className={`h-6 w-6 ${safeArticle.liked_by_me ? 'fill-current' : ''}`} />
                        </button>
                        <div className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest -mt-2">
                            {nf.format(safeArticle.likes_count)}
                        </div>

                        <button
                            onClick={handleShare}
                            className="h-14 w-14 bg-white border border-[#e2e8f0] text-[#64748b] rounded-2xl flex items-center justify-center hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-90"
                        >
                            <Share2 className="h-6 w-6" />
                        </button>

                        <div className="h-px bg-gray-200/50 mx-2" />

                        <div className="flex flex-col items-center gap-1 text-gray-300">
                            <Eye className="h-5 w-5" />
                            <span className="text-[10px] font-black">{nf.format(safeArticle.views_count)}</span>
                        </div>
                    </div>
                </aside>

                {/* Main Article Body */}
                <main className="space-y-16 lg:col-start-2">
                    <div className="mb-12">
                        <ContentRenderer content={safeArticle.content} />
                    </div>

                    {/* End of Article Content Actions (Mobile & End of text) */}
                    <div className="pt-16 border-t border-gray-100 flex flex-wrap items-center justify-between gap-8">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    if (!user) navigate('/login');
                                    else likeMutation.mutate();
                                }}
                                className={`flex items-center gap-3 h-14 px-8 rounded-2xl font-black transition-all ${safeArticle.liked_by_me
                                    ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20'
                                    : 'bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 border border-transparent'}`}
                            >
                                <Heart className={`h-5 w-5 ${safeArticle.liked_by_me ? 'fill-current' : ''}`} />
                                {nf.format(safeArticle.likes_count)} إعجاب
                            </button>
                            <button
                                onClick={handleShare}
                                className="h-14 w-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent"
                            >
                                <Share2 className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Author Bio Card */}
                    <section className="bg-[#0f172a] rounded-[3rem] p-10 md:p-14 text-white relative overflow-hidden group border border-[#334155]">
                        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-10">
                            <div className="h-32 w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 shrink-0 bg-gray-800 shadow-2xl">
                                {safeArticle.author?.avatar_url ? (
                                    <img src={safeArticle.author.avatar_url} alt={safeArticle.author.username} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <User className="h-full w-full p-6 text-gray-700" />
                                )}
                            </div>
                            <div className="space-y-6 text-center md:text-right flex-1">
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black tracking-tight">{safeArticle.author?.full_name || safeArticle.author?.username}</h3>
                                    <p className="text-blue-400 font-bold uppercase text-[10px] tracking-widest">خبير ومساهم في عادل ضرغام</p>
                                </div>
                                <p className="text-gray-400 text-lg leading-relaxed italic max-w-xl">
                                    {safeArticle.author?.bio || "هذا الكاتب يشاركنا أفكاره ورؤاه العميقة عبر منصة عادل ضرغام لإثراء المحتوى الفصيح والمؤثر."}
                                </p>
                                <div className="pt-4 flex flex-wrap gap-4 justify-center md:justify-start">
                                    <Link
                                        to={`/profile/${safeArticle.author?.id}`}
                                        className="inline-flex items-center gap-3 h-14 px-8 bg-white text-gray-900 rounded-2xl font-black hover:bg-blue-100 transition-all group/btn shrink-0"
                                    >
                                        زيارة الملف الشخصي
                                        <ArrowLeft className="h-5 w-5 group-hover/btn:-translate-x-1 transition-transform" />
                                    </Link>

                                    {safeArticle.author?.id !== user?.id && (
                                        <button
                                            onClick={() => {
                                                if (!user) navigate('/login');
                                                else followMutation.mutate();
                                            }}
                                            disabled={followMutation.isPending}
                                            className={`inline-flex items-center gap-3 h-14 px-8 rounded-2xl font-black transition-all shrink-0 ${authorProfile?.is_following
                                                ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                                                : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700'
                                                }`}
                                        >
                                            {followMutation.isPending ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : authorProfile?.is_following ? (
                                                <>
                                                    <CheckCircle2 className="h-5 w-5" />
                                                    متابع
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="h-5 w-5" />
                                                    متابعة
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Decor */}
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
                    </section>

                    {/* Comments Section */}
                    <div className="pt-32 border-t border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-2 bg-blue-600 rounded-full" />
                                <div className="space-y-1">
                                    <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] tracking-tight">حوار القراء</h2>
                                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">شاركنا رأيك في هذا العمل</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#f8fafc] rounded-[3.5rem] p-4 md:p-10 border border-[#e2e8f0] shadow-sm transition-all duration-500 hover:shadow-md">
                            <CommentSection articleId={safeArticle.id} articleAuthorId={safeArticle.author?.id} />
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Bar */}
            <div className="lg:hidden fixed bottom-6 left-6 right-6 z-[60] flex items-center justify-between p-2 bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2 px-4">
                    <Heart className={`h-5 w-5 ${safeArticle.liked_by_me ? 'text-rose-500 fill-current' : 'text-gray-400'}`} />
                    <span className="text-white font-black text-sm">{nf.format(safeArticle.likes_count)}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleShare}
                        className="h-12 w-12 bg-white/10 text-white rounded-[1.25rem] flex items-center justify-center"
                    >
                        <Share2 className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => {
                            if (!user) navigate('/login');
                            else likeMutation.mutate();
                        }}
                        className={`h-12 px-6 rounded-[1.25rem] font-black text-sm transition-all ${safeArticle.liked_by_me
                            ? 'bg-rose-500 text-white'
                            : 'bg-white text-gray-900'}`}
                    >
                        {safeArticle.liked_by_me ? 'تم الإعجاب' : 'إعجاب'}
                    </button>
                </div>
            </div>
        </div>
    );
};
