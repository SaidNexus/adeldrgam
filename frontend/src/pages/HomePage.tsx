import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { articleService } from '../services/articles';
import { ArticleCard, ArticleSkeleton } from '../components/articles/ArticleCard';
import { Link, useNavigate } from 'react-router-dom';
import {
    Sparkles, Home,
    Bookmark, Hash, Users, Bell,
    PlusCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';

export const HomePage = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const [feedType, setFeedType] = useState<'for_you' | 'following'>('for_you');

    // Intersection Observer for Infinite Scroll
    const observerTarget = useRef<HTMLDivElement>(null);

    // Fetch Feed Articles (Infinite Query)
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isFeedLoading,
        error: feedError,
        refetch
    } = useInfiniteQuery({
        queryKey: ['articles-feed', feedType],
        queryFn: ({ pageParam = 0 }) =>
            articleService.getArticles({
                feed_type: feedType,
                limit: 10,
                offset: pageParam
            }),
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < 10) return undefined;
            return allPages.flat().length;
        },
        initialPageParam: 0,
    });

    const articles = useMemo(() => data?.pages.flat() || [], [data]);

    // Fetch Suggestions (Mock or real authors)
    const { data: suggestions } = useQuery({
        queryKey: ['follow-suggestions'],
        queryFn: () => articleService.getArticles({ limit: 4, author_type: 'others' }),
        enabled: isAuthenticated
    });

    // Infinite Scroll logic
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="bg-gray-50 min-h-screen pt-16 font-almarai">
            <div className="container-centered max-w-7xl mx-auto px-4 md:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT SIDEBAR: Quick Links & Categories (Hidden on mobile) */}
                    <aside className="hidden lg:block lg:col-span-3 sticky top-24 h-fit space-y-6">
                        <div className="bg-white rounded-[2rem] border border-gray-100 p-3 shadow-sm">
                            <nav className="space-y-1">
                                <SidebarLink icon={<Home className="h-5 w-5" />} label="الرئيسية" active to="/" />
                                <SidebarLink icon={<Hash className="h-5 w-5" />} label="استكشف" to="/articles" />
                                <SidebarLink icon={<Bookmark className="h-5 w-5" />} label="المحفوظات" to="/profile?tab=bookmarks" />
                                <SidebarLink icon={<Users className="h-5 w-5" />} label="المجتمع" to="/authors" />
                                {isAuthenticated && <SidebarLink icon={<Bell className="h-5 w-5" />} label="التنبيهات" to="/notifications" />}
                            </nav>
                        </div>


                        <footer className="px-6 text-[10px] text-gray-400 font-bold space-x-reverse space-x-3">
                            <Link to="/about" className="hover:text-gray-900">حول عادل ضرغام</Link>
                            <Link to="/contact" className="hover:text-gray-900">اتصل بنا</Link>
                            <Link to="/terms" className="hover:text-gray-900">الشروط</Link>
                            <Link to="/privacy" className="hover:text-gray-900">الخصوصية</Link>
                            <p className="mt-4">© 2026 عادل ضرغام - جميع الحقوق محفوظة</p>
                        </footer>
                    </aside>

                    {/* MAIN FEED (Center) */}
                    <main className="lg:col-span-6 space-y-6">

                        {/* CREATE POST BOX */}
                        {(user?.role === 'publisher' || user?.role === 'admin') && (
                            <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm">
                                <div className="flex gap-4 items-center">
                                    <Link
                                        to={isAuthenticated ? "/profile" : "/login"}
                                        className="h-12 w-12 rounded-full bg-gray-50 border border-gray-100 shrink-0 overflow-hidden shadow-inner flex items-center justify-center"
                                    >
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} className="h-full w-full object-cover" />
                                        ) : (
                                            <Users className="h-6 w-6 text-gray-300" />
                                        )}
                                    </Link>
                                    <Link
                                        to="/editor"
                                        className="flex-1 bg-gray-50 hover:bg-gray-100 rounded-2xl px-6 py-3.5 text-right text-gray-500 font-bold text-sm transition-all focus:outline-none placeholder-gray-400 cursor-text"
                                    >
                                        {isAuthenticated ? `ماذا يدور في ذهنك يا ${user?.full_name?.split(' ')[0] || user?.username || 'صديقي'}؟` : "سجل دخولك لتشارك أفكارك..."}
                                    </Link>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                                    <PostAction icon={<Sparkles className="h-4 w-4 text-orange-400" />} label="أطروحة" to="/editor" />
                                    <PostAction icon={<PlusCircle className="h-4 w-4 text-blue-400" />} label="مقالة" to="/editor" />
                                    <PostAction icon={<Hash className="h-4 w-4 text-purple-400" />} label="وسم" to="/articles" />
                                </div>
                            </div>
                        )}

                        {/* FEED TABS */}
                        <div className="flex items-center bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                            <button
                                onClick={() => setFeedType('for_you')}
                                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all relative ${feedType === 'for_you' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {feedType === 'for_you' && <motion.div layoutId="tab-bg" className="absolute inset-0 bg-blue-50 rounded-xl" />}
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <Sparkles className={`h-4 w-4 ${feedType === 'for_you' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    لك (For You)
                                </span>
                            </button>
                            <button
                                onClick={() => {
                                    if (!isAuthenticated) navigate('/login');
                                    else setFeedType('following');
                                }}
                                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all relative ${feedType === 'following' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {feedType === 'following' && <motion.div layoutId="tab-bg" className="absolute inset-0 bg-blue-50 rounded-xl" />}
                                <span className={`relative z-10 flex items-center justify-center gap-2 ${!isAuthenticated ? 'opacity-40' : ''}`}>
                                    <Users className={`h-4 w-4 ${feedType === 'following' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    أتابعهم
                                </span>
                            </button>
                        </div>

                        {/* FEED CONTENT */}
                        <div className="space-y-6">
                            {isFeedLoading && (
                                <div className="space-y-6">
                                    <ArticleSkeleton />
                                    <ArticleSkeleton />
                                </div>
                            )}

                            {feedError && (
                                <div className="p-8 bg-red-50 rounded-[2rem] border border-red-100 text-center space-y-4">
                                    <Users className="h-10 w-10 text-red-300 mx-auto" />
                                    <p className="text-red-900 font-black">فشل تحميل الخلاصة</p>
                                    <button onClick={() => refetch()} className="px-6 py-2 bg-red-100 text-red-600 rounded-xl font-bold text-sm">حاول مجدداً</button>
                                </div>
                            )}

                            {!isFeedLoading && articles.length === 0 && (
                                <div className="p-16 bg-white rounded-[2.5rem] border border-gray-100 text-center space-y-8 shadow-sm">
                                    <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-200 ring-8 ring-blue-50/50">
                                        <Users className="h-12 w-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-gray-900">
                                            {feedType === 'following' ? 'لا تتابع أحداً بعد' : 'لا توجد مقالات الآن'}
                                        </h3>
                                        <p className="text-gray-500 text-sm font-medium">ابدأ بمتابعة الكتاب المفضلين لديك لتظهر مقالاتهم هنا.</p>
                                    </div>

                                    {feedType === 'following' && suggestions && suggestions.length > 0 && (
                                        <div className="pt-4 space-y-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">كتاب مقترحون لك</p>
                                            <div className="flex justify-center gap-4">
                                                {suggestions.slice(0, 3).map(s => (
                                                    <Link key={s.id} to={`/profile/${s.author?.id}`} className="flex flex-col items-center gap-2 group">
                                                        <div className="h-12 w-12 rounded-full border-2 border-white shadow-md overflow-hidden group-hover:scale-105 transition-transform">
                                                            <img src={s.author?.avatar_url || ''} className="h-full w-full object-cover" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-600 group-hover:text-blue-600">{s.author?.full_name?.split(' ')[0]}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Link to="/authors" className="inline-block bg-blue-600 text-white px-10 py-4 rounded-[1.25rem] font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all hover:bg-blue-700">
                                        استكشف الكتاب
                                    </Link>
                                </div>
                            )}

                            {articles.map((article) => (
                                <ArticleCard key={article.id} article={article} />
                            ))}

                            {/* INFINITE SCROLL LOADER */}
                            <div ref={observerTarget} className="py-10 flex justify-center">
                                {isFetchingNextPage ? (
                                    <div className="space-y-6 w-full">
                                        <ArticleSkeleton />
                                    </div>
                                ) : hasNextPage ? (
                                    <div className="h-10 w-full" />
                                ) : articles.length > 0 ? (
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <div className="w-12 h-1 bg-gray-100 rounded-full" />
                                        <p className="text-[11px] font-black uppercase tracking-widest">لقد وصلت للنهاية</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </main>

                    {/* RIGHT SIDEBAR: Suggestions & Trending (Hidden on mobile) */}
                    <aside className="hidden lg:block lg:col-span-3 sticky top-24 h-fit space-y-6">
                        {isAuthenticated && (
                            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center justify-between">
                                    كتاب قد يهمونك
                                    <Link to="/authors" className="text-[10px] text-blue-600">عرض الكل</Link>
                                </h3>
                                <div className="space-y-5">
                                    {(suggestions || []).slice(0, 3).map((article) => (
                                        <div key={article.id} className="flex items-center justify-between gap-3">
                                            <Link to={`/profile/${article.author?.id}`} className="flex items-center gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                                    {article.author?.avatar_url ? (
                                                        <img src={article.author.avatar_url} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Users className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-black text-gray-900 truncate">
                                                        {article.author?.full_name || article.author?.username}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-bold truncate">كاتب محتوى</p>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => navigate(`/profile/${article.author?.id}`)}
                                                className="px-4 py-1.5 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-black text-blue-600 transition-all"
                                            >
                                                متابعة
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-[#1e293b] rounded-3xl p-8 relative overflow-hidden group">
                            <div className="relative z-10 space-y-5">
                                <div className="h-10 w-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center text-blue-400">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <h3 className="text-xl font-black text-white leading-tight">كن جزءاً من <span className="text-blue-400 underline decoration-2 underline-offset-4">عادل ضرغام</span> المعرفة</h3>
                                <p className="text-gray-400 text-xs font-medium leading-relaxed">انضم إلى آلاف القراء والمفكرين العرب وشارك أطروحاتك اليوم.</p>
                                <Link to={isAuthenticated ? ((user?.role === 'publisher' || user?.role === 'admin') ? "/editor" : "/profile") : "/register"} className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm transition-all shadow-xl shadow-blue-500/20 active:scale-95">
                                    ابدأ الآن
                                </Link>
                            </div>
                            <div className="absolute top-0 right-0 h-32 w-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                        </div>
                    </aside>

                </div>
            </div>
        </div>
    );
};

// HELPER COMPONENTS
const SidebarLink = ({ icon, label, to, active = false }: { icon: React.ReactNode, label: string, to: string, active?: boolean }) => (
    <Link
        to={to}
        className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl transition-all font-black text-sm ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
    >
        <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
        {label}
    </Link>
);

const PostAction = ({ icon, label, to }: { icon: React.ReactNode, label: string, to: string }) => (
    <Link
        to={to}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-xs font-black text-gray-600"
    >
        {icon}
        {label}
    </Link>
);
