import { useEffect } from 'react';
import { Bell, CheckCircle2, Settings, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../components/ui/AppLoader';

export const NotificationsPage = () => {
    const navigate = useNavigate();
    const { notifications, fetchNotifications, markAsRead, markAllAsRead, isLoading, error } = useNotificationStore();
    const { isAuthenticated, _hasHydrated } = useAuthStore();

    useEffect(() => {
        if (_hasHydrated && isAuthenticated) {
            fetchNotifications();
        }
    }, [_hasHydrated, isAuthenticated, fetchNotifications]);

    if (!_hasHydrated || (isLoading && notifications.length === 0)) {
        return <PageLoader />;
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header Section */}
            <header className="py-24 md:py-32 bg-white border-b border-gray-200 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-10">
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-wider"
                        >
                            <Sparkles className="h-4 w-4" />
                            Activity Hub
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">مركز التنبيهات</h1>
                        <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl leading-relaxed">تتبع كل جديد في عالم عادل ضرغام، من تفاعلات القراء إلى تحديثات المنصة.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => markAllAsRead()}
                            disabled={notifications.every(n => n.is_read) || notifications.length === 0}
                            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all disabled:opacity-30 active:scale-95 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            تعيين الكل كمقروء
                        </button>
                        <button
                            onClick={() => navigate('/settings/notifications')}
                            className="h-14 w-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                        >
                            <Settings className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Section */}
            <section className="py-20 md:py-32">
                <div className="max-w-4xl mx-auto px-6">
                    {error ? (
                        <div className="bg-white border border-red-100 p-12 rounded-[2.5rem] text-center space-y-8 shadow-sm">
                            <div className="h-20 w-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-500 border border-red-100">
                                <AlertCircle className="h-10 w-10" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-gray-900">خطأ في استرجاع البيانات</h3>
                                <p className="text-gray-500 font-medium">{error}</p>
                            </div>
                            <button onClick={() => fetchNotifications()} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold">تحديث</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {notifications.length > 0 ? (
                                    notifications.map((n, idx) => {
                                        const avatarUrl = n.metadata_?.avatar_url ||
                                            n.metadata_?.last_liker_avatar ||
                                            n.metadata_?.commenter_avatar ||
                                            n.metadata_?.follower_avatar ||
                                            n.metadata_?.author_avatar ||
                                            null;

                                        return (
                                            <motion.div
                                                key={n.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={`group p-6 md:p-8 rounded-[2.5rem] border transition-all duration-300 shadow-sm cursor-pointer ${!n.is_read
                                                    ? 'bg-white border-blue-200 ring-4 ring-blue-500/5'
                                                    : 'bg-white border-gray-100 opacity-80 hover:opacity-100 hover:border-gray-200'
                                                    }`}
                                                onClick={() => {
                                                    if (!n.is_read) markAsRead(n.id);
                                                    // Navigate logic
                                                    if (n.metadata_?.article_slug) navigate(`/articles/${n.metadata_.article_slug}`);
                                                    else if (n.metadata_?.article_id) navigate(`/articles/id/${n.metadata_.article_id}`);
                                                    else if (n.metadata_?.follower_id) navigate(`/profile/${n.metadata_.follower_id}`);
                                                    else if (n.metadata_?.author_id) navigate(`/profile/${n.metadata_.author_id}`);
                                                }}
                                            >
                                                <div className="flex gap-6 items-start">
                                                    <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 shadow-sm relative">
                                                        {avatarUrl ? (
                                                            <img src={avatarUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <Bell className="h-7 w-7" />
                                                            </div>
                                                        )}
                                                        {!n.is_read && (
                                                            <div className="absolute top-1 right-1 h-3 w-3 bg-blue-600 rounded-full border-2 border-white shadow-sm" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-4">
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${n.type === 'like' ? 'bg-red-50 text-red-600' : n.type === 'comment' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                        {n.type === 'like' ? 'إعجاب' : n.type === 'comment' ? 'تعليق' : n.type === 'follow' ? 'متابعة' : 'مقال جديد'}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-gray-400">
                                                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                                                                    </span>
                                                                </div>
                                                                <h3 className={`text-xl font-black transition-colors ${!n.is_read ? 'text-gray-900 group-hover:text-blue-600' : 'text-gray-500 group-hover:text-gray-900'}`}>
                                                                    {n.message}
                                                                </h3>
                                                            </div>
                                                        </div>
                                                        {n.metadata_?.article_title && (
                                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100/50 inline-block pointer-events-none">
                                                                <span className="text-xs font-bold text-gray-500">مقال: {n.metadata_.article_title}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                ) : (
                                    <div className="py-32 bg-white rounded-[3rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-10 space-y-8">
                                        <div className="h-32 w-32 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 border border-gray-100 relative">
                                            <Bell className="w-16 h-16" />
                                            <div className="absolute inset-0 border-4 border-white/50 rounded-full animate-ping" />
                                        </div>
                                        <div className="space-y-3">
                                            <h3 className="text-3xl font-black text-gray-900">لا توجد تنبيهات حالياً</h3>
                                            <p className="text-gray-500 font-medium italic max-w-sm mx-auto">
                                                ابقَ متصلاً وتابع الكتاب المفضلين لديك لتلقي آخر التحديثات!
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/articles')}
                                            className="h-14 px-10 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                                        >
                                            استكشف المقالات
                                        </button>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {!isLoading && notifications.length > 0 && (
                        <div className="mt-20 flex justify-center">
                            <button
                                onClick={() => navigate('/')}
                                className="h-14 px-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black transition-all flex items-center gap-3"
                            >
                                <ArrowRight className="h-5 w-5" />
                                العودة للرئيسية
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
