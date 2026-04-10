import { useState, useRef, useEffect, useMemo } from 'react';
import {
    User as UserIcon, Camera, Save, Loader2, CheckCircle2, AlertCircle,
    FileText, Sparkles, Heart, Calendar,
    Layout, Bookmark, Edit3, Plus, X, Users, ShieldCheck, PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/auth';
import { articleService } from '../services/articles';
import { userService } from '../services/user';
import { publisherService } from '../services/publisher';
import { useImagePreviewUpload } from '../hooks/useImagePreviewUpload';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArticleCard, ArticleSkeleton } from '../components/articles/ArticleCard';
import { formatDate } from '../lib/utils';

export const ProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();

    // Determine if we are viewing our own profile or someone else's
    const isOwner = !id || id === currentUser?.id;
    const targetUserId = id || currentUser?.id || '';

    const [activeTab, setActiveTab] = useState<'articles' | 'bookmarks'>('articles');
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'bookmarks' && isOwner) {
            setActiveTab('bookmarks');
        }
    }, [searchParams, isOwner]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [listModalType, setListModalType] = useState<'followers' | 'following'>('followers');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Number formatter for consistent Western Numerals (123)
    const numberFormat = useMemo(() => new Intl.NumberFormat('en-US'), []);

    // Queries
    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: ['profile', targetUserId],
        queryFn: () => userService.getProfile(targetUserId),
        enabled: !!targetUserId,
    });

    const { data: stats } = useQuery({
        queryKey: ['profile-stats', targetUserId],
        queryFn: () => userService.getProfileStats(targetUserId),
        enabled: !!targetUserId,
    });

    const { data: articles, isLoading: loadingArticles } = useQuery({
        queryKey: ['user-articles', targetUserId],
        queryFn: () => articleService.getAllArticlesByAuthor(targetUserId),
        enabled: !!targetUserId,
    });

    const { data: bookmarkedArticles, isLoading: loadingBookmarks } = useQuery({
        queryKey: ['bookmarked-articles', targetUserId],
        queryFn: () => articleService.getLikedArticles(),
        enabled: isOwner && activeTab === 'bookmarks',
    });

    const { data: followersList, isLoading: loadingFollowers } = useQuery({
        queryKey: ['followers', targetUserId],
        queryFn: () => userService.getFollowers(targetUserId),
        enabled: isListModalOpen && listModalType === 'followers',
    });

    const { data: followingList, isLoading: loadingFollowing } = useQuery({
        queryKey: ['following', targetUserId],
        queryFn: () => userService.getFollowing(targetUserId),
        enabled: isListModalOpen && listModalType === 'following',
    });

    const { data: publisherRequest } = useQuery({
        queryKey: ['publisher-request'],
        queryFn: () => publisherService.getMyRequest(),
        enabled: isOwner && currentUser?.role !== 'publisher' && currentUser?.role !== 'admin',
    });

    // Publisher Request Mutation
    const publisherRequestMutation = useMutation({
        mutationFn: () => publisherService.createRequest(),
        onSuccess: () => {
            setSuccess('تم إرسال طلب الانضمام بنجاح! فريقنا سيقوم بمراجعته قريباً.');
            queryClient.invalidateQueries({ queryKey: ['publisher-request'] });
            setTimeout(() => setSuccess(null), 5000);
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'فشل إرسال الطلب، يرجى المحاولة مرة أخرى.');
            setTimeout(() => setError(null), 5000);
        }
    });

    // Follow Mutation
    const followMutation = useMutation({
        mutationFn: () => userService.toggleFollow(targetUserId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
            if (data.is_following) {
                setSuccess('تمت المتابعة بنجاح!');
            } else {
                setSuccess('تم إلغاء المتابعة.');
            }
            setTimeout(() => setSuccess(null), 2000);
        },
        onError: () => {
            setError('فشل تعديل حالة المتابعة');
            setTimeout(() => setError(null), 3000);
        }
    });

    const {
        previewUrl,
        isUploading,
        handleFileSelect,
        upload
    } = useImagePreviewUpload();

    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        bio: '',
    });

    useEffect(() => {
        if (profile && isOwner) {
            setFormData({
                username: profile.username || '',
                full_name: profile.full_name || '',
                bio: profile.bio || '',
            });
        }
    }, [profile, isModalOpen, isOwner]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const updateProfileMutation = useMutation({
        mutationFn: async (data: any) => {
            return authService.updateProfile(data);
        },
        onSuccess: () => {
            setSuccess('تم تحديث الملف الشخصي بنجاح!');
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
            queryClient.invalidateQueries({ queryKey: ['profile-stats', targetUserId] });
            setTimeout(() => setSuccess(null), 3000);
        },
        onError: (err: any) => {
            setError(err.message || 'حدث خطأ أثناء التحديث');
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let avatar_url = profile?.avatar_url;
            let avatar_public_id = profile?.avatar_public_id;

            if (previewUrl) {
                const result = await upload('/upload/avatar');
                avatar_url = result.url;
                avatar_public_id = result.public_id;
            }

            await updateProfileMutation.mutateAsync({
                username: formData.username,
                full_name: formData.full_name,
                bio: formData.bio,
                avatar_url: avatar_url,
                avatar_public_id: avatar_public_id,
            } as any);

        } catch (err: any) {
            // Error handled by mutation
        } finally {
            setLoading(false);
        }
    };

    if (loadingProfile || !profile) {
        return (
            <div className="bg-gray-50 min-h-screen flex items-center justify-center p-6">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        );
    }

    const currentDisplayAvatar = previewUrl || profile.avatar_url;

    const statsConfig = [
        {
            label: 'إجمالي المقالات',
            value: stats?.articles_count || 0,
            icon: FileText,
            color: 'bg-blue-50 text-blue-600 border-blue-100'
        },
        {
            label: 'المتابعين',
            value: profile.followers_count || 0,
            icon: Users,
            color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            onClick: () => {
                setListModalType('followers');
                setIsListModalOpen(true);
            }
        },
        {
            label: 'المتابَعين',
            value: profile.following_count || 0,
            icon: Sparkles,
            color: 'bg-purple-50 text-purple-600 border-purple-100',
            onClick: () => {
                setListModalType('following');
                setIsListModalOpen(true);
            }
        },
        {
            label: 'الإعجابات',
            value: stats?.likes_received || 0,
            icon: Heart,
            color: 'bg-rose-50 text-rose-600 border-rose-100'
        },
        {
            label: 'تاريخ الانضمام',
            value: profile.created_at ? formatDate(profile.created_at) : '...',
            icon: Calendar,
            color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            isDate: true
        }
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-32 font-almarai">
            {/* Success/Error Notifications */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
                    >
                        <CheckCircle2 className="h-5 w-5" />
                        {success}
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
                    >
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Header with Cover Image */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-900 to-black opacity-90" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-transparent" />
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-32 relative z-10 space-y-8">
                {/* Profile Brief Card */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-gray-200/50 border border-white/50 backdrop-blur-sm flex flex-col md:flex-row items-center md:items-end justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-right">
                        <div className="relative">
                            <motion.div
                                className="h-40 w-40 md:h-48 md:w-48 rounded-[2.5rem] bg-white border-4 border-white p-1 overflow-hidden shadow-2xl relative -mt-20 md:-mt-24"
                            >
                                <div className="w-full h-full rounded-[2rem] overflow-hidden bg-gray-100 border border-gray-100">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <UserIcon className="h-16 w-16" />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        <div className="space-y-4 mb-2">
                            <div className="space-y-1">
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] justify-center md:justify-start"
                                >
                                    <Sparkles className="h-3 w-3" />
                                    {isOwner ? 'البروفايل الحصري' : 'الملف الشخصي للكاتب'}
                                </motion.div>
                                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                                    {profile.full_name || profile.username}
                                </h1>
                                <p className="text-lg text-gray-400 font-bold font-mono">@{profile.username}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                <span className="px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    {profile.role === 'admin' ? 'إشراف كامل' : 'عضو مبدع'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mb-2">
                        {isOwner ? (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="h-14 px-8 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 group"
                            >
                                <Edit3 className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                تعديل الملف
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (!currentUser) navigate('/login');
                                    else followMutation.mutate();
                                }}
                                disabled={followMutation.isPending}
                                className={`h-14 px-10 rounded-2xl font-black transition-all shadow-xl active:scale-95 flex items-center gap-3 ${profile.is_following
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-gray-200/20'
                                    : 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700'
                                    }`}
                            >
                                {profile.is_following ? (
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

                {/* Bio Card (if bio exists) */}
                {profile.bio && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm"
                    >
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">نبذة عن الكاتب</h3>
                        <p className="text-gray-600 leading-relaxed text-lg">{profile.bio}</p>
                    </motion.div>
                )}

                {/* Publisher Access Section */}
                {isOwner && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="space-y-3 flex-1 text-center md:text-right">
                                <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest justify-center md:justify-start">
                                    <ShieldCheck className="h-4 w-4" />
                                    صلاحيات النشر
                                </div>
                                <h3 className="text-2xl font-black text-gray-900">الوصول كناشر ومؤلف</h3>
                                <p className="text-gray-500 font-medium text-sm">
                                    {(currentUser?.role === 'publisher' || currentUser?.role === 'admin')
                                        ? "لديك بالفعل صلاحيات كاملة للنشر وإدارة المقالات في المنصة."
                                        : publisherRequest?.status === 'pending'
                                            ? "طلبك قيد المراجعة حالياً. سيقوم فريقنا بالرد عليك في أقرب وقت ممكن."
                                            : "هل ترغب في مشاركة أفكارك مع المجتمع؟ اطلب صلاحية الناشر لتبدأ كتابة مقالاتك الخاصة."
                                    }
                                </p>
                            </div>

                            <div className="shrink-0 w-full md:w-auto">
                                {(currentUser?.role === 'publisher' || currentUser?.role === 'admin') ? (
                                    <div className="h-14 px-8 bg-emerald-50 text-emerald-600 rounded-2xl font-black flex items-center gap-3 border border-emerald-100">
                                        <CheckCircle2 className="h-5 w-5" />
                                        أنت ناشر مفعل
                                    </div>
                                ) : publisherRequest?.status === 'pending' ? (
                                    <div className="h-14 px-8 bg-amber-50 text-amber-600 rounded-2xl font-black flex items-center gap-3 border border-amber-100">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        قيد المراجعة
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => publisherRequestMutation.mutate()}
                                        disabled={publisherRequestMutation.isPending}
                                        className="w-full h-14 px-10 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {publisherRequestMutation.isPending ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <PlusCircle className="h-5 w-5" />
                                        )}
                                        طلب صلاحية ناشر
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Stats Cards Display (Enforced Western Numerals) */}
                <div className="grid gap-6 md:grid-cols-4">
                    {statsConfig.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            onClick={() => {
                                if ('onClick' in stat && stat.onClick) {
                                    stat.onClick();
                                }
                            }}
                            className={`bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex items-center gap-6 group ${'onClick' in stat ? 'cursor-pointer hover:border-blue-200' : ''}`}
                        >
                            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110 ${stat.color}`}>
                                <stat.icon className="h-7 w-7" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</p>
                                <h3 className={`font-black text-gray-900 ${stat.isDate ? 'text-xl' : 'text-3xl tracking-tight'}`}>
                                    {typeof stat.value === 'number' ? numberFormat.format(stat.value) : stat.value}
                                </h3>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Tabbed Navigation Layout */}
                <div className="bg-white border border-gray-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col">
                    <div className="flex border-b border-gray-100 bg-gray-50/30 p-3">
                        <div className="flex gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl shadow-sm">
                            <button
                                onClick={() => setActiveTab('articles')}
                                className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'articles' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Layout className="h-4 w-4" />
                                {isOwner ? 'مقالاتي' : 'المقالات'}
                            </button>
                            {isOwner && (
                                <button
                                    onClick={() => setActiveTab('bookmarks')}
                                    className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'bookmarks' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <Bookmark className="h-4 w-4" />
                                    المحفوظات
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 p-8 md:p-14">
                        <AnimatePresence mode="wait">
                            {/* ARTICLES TAB */}
                            {activeTab === 'articles' && (
                                <motion.div key="articles" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-black text-gray-900">{isOwner ? 'إنتاجك الفكري' : 'مقالات الكاتب'}</h2>
                                            <p className="text-gray-400 font-medium italic text-lg leading-relaxed">
                                                {isOwner
                                                    ? 'تصفح وأدر جميع الأفكار التي شاركتها مع مجتمع عادل ضرغام.'
                                                    : `تصفح جميع الأفكار التي شاركها ${profile.full_name || profile.username}.`
                                                }
                                            </p>
                                        </div>
                                        {isOwner && (currentUser?.role === 'publisher' || currentUser?.role === 'admin') && (
                                            <Link to="/editor" className="h-14 px-8 bg-blue-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">
                                                <Plus className="w-5 h-5" />
                                                كتابة مقال جديد
                                            </Link>
                                        )}
                                    </div>

                                    {loadingArticles ? (
                                        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                                            {Array(3).fill(0).map((_, i) => <ArticleSkeleton key={i} />)}
                                        </div>
                                    ) : articles?.length === 0 ? (
                                        <div className="py-24 text-center space-y-8 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                                            <div className="h-24 w-24 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                                                <FileText className="h-12 w-12 text-gray-100" />
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-3xl font-black text-gray-900">{isOwner ? 'سجلك الأدبي خالي الآن' : 'لا توجد مقالات بعد'}</h3>
                                                <p className="text-gray-400 font-medium italic text-lg max-w-sm mx-auto">
                                                    {isOwner
                                                        ? '"الأفكار تلمع ثم تنطفئ إن لم تدونها. ابدأ بكتابة أول فكرة لك الآن."'
                                                        : 'هذا الكاتب لم يشارك أي مقالات حتى الآن.'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                                            {articles?.map((article) => (
                                                <ArticleCard key={article.id} article={article} />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* BOOKMARKS TAB (Owner Only) */}
                            {isOwner && activeTab === 'bookmarks' && (
                                <motion.div key="bookmarks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-gray-900">المحفوظات</h2>
                                        <p className="text-gray-400 font-medium italic text-lg">المقالات التي أثارت إعجابك وتريد العودة إليها مراراً.</p>
                                    </div>

                                    {loadingBookmarks ? (
                                        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                                            {Array(3).fill(0).map((_, i) => <ArticleSkeleton key={i} />)}
                                        </div>
                                    ) : bookmarkedArticles?.length === 0 ? (
                                        <div className="py-24 text-center space-y-8 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                                            <div className="h-24 w-24 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                                                <Heart className="h-12 w-12 text-gray-100" />
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-3xl font-black text-gray-900">لم تحفظ أي مقال بعد</h3>
                                                <p className="text-gray-400 font-medium italic text-lg max-w-sm mx-auto">استكشف المحتوى المميز وأضف ما ينال إعجابك إلى قائمة المحفوظات الخاصة بك.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                                            {bookmarkedArticles?.map((article) => (
                                                <ArticleCard key={article.id} article={article} />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* EDIT PROFILE MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden font-almarai"
                        >
                            {/* Modal Header */}
                            <div className="p-8 md:p-10 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">إعدادات الهوية</h2>
                                    <p className="text-gray-400 text-sm font-bold">قم بتحديث معلوماتك الشخصية وصورتك</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors shadow-sm"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-10">
                                {/* Avatar Section inside Modal */}
                                <div className="flex flex-col items-center gap-6">
                                    <div
                                        className="relative group cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="h-32 w-32 rounded-[2rem] bg-gray-100 border-4 border-white shadow-xl overflow-hidden relative">
                                            {currentDisplayAvatar ? (
                                                <img src={currentDisplayAvatar} alt="Profile" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <UserIcon className="h-12 w-12" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
                                                <Camera className="h-6 w-6 text-white drop-shadow-md" />
                                            </div>
                                        </div>
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-white/80 rounded-[2rem] flex items-center justify-center">
                                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                            </div>
                                        )}
                                        <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                                            <Camera className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">تغيير الصورة الشخصية</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">المعرف الرسمي</label>
                                        <input
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-6 font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الاسم الكامل</label>
                                        <input
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-6 font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نبذة عنك (Bio)</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-6 font-medium text-gray-600 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none leading-relaxed text-lg"
                                        placeholder="شارك العالم ما يميزك..."
                                    />
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 h-16 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all active:scale-95"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || isUploading}
                                        className="flex-[2] h-16 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        حفظ التعديلات
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* USER LIST MODAL */}
            <AnimatePresence>
                {isListModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsListModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden font-almarai flex flex-col max-h-[80vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                        {listModalType === 'followers' ? 'المتابعين' : 'المتابَعين'}
                                    </h2>
                                    <p className="text-gray-400 text-sm font-bold">
                                        {listModalType === 'followers' ? 'الأشخاص الذين يتابعون هذا الحساب' : 'الأشخاص الذين يتابعهم هذا الحساب'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsListModalOpen(false)}
                                    className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors shadow-sm"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {(listModalType === 'followers' ? loadingFollowers : loadingFollowing) ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                                        <p className="text-gray-400 font-bold">جاري تحميل القائمة...</p>
                                    </div>
                                ) : (listModalType === 'followers' ? followersList : followingList)?.length === 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                            <Users className="h-10 w-10 text-gray-200" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-400">
                                            {listModalType === 'followers' ? 'لا يوجد متابعون بعد' : 'لا يتابع أحد حتى الآن'}
                                        </h3>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {(listModalType === 'followers' ? followersList : followingList)?.map((u: any) => (
                                            <div
                                                key={u.id}
                                                onClick={() => {
                                                    setIsListModalOpen(false);
                                                    navigate(`/profile/${u.id}`);
                                                }}
                                                className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-100"
                                            >
                                                <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 shrink-0">
                                                    {u.avatar_url ? (
                                                        <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                                                            <UserIcon className="h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                                        {u.full_name || u.username}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 font-bold truncate">@{u.username}</p>
                                                    {u.bio && (
                                                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 italic">{u.bio}</p>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {(isOwner && listModalType === 'following') ? (
                                                        <button
                                                            onClick={async () => {
                                                                await userService.toggleFollow(u.id);
                                                                queryClient.invalidateQueries({ queryKey: [listModalType, targetUserId] });
                                                                queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
                                                            }}
                                                            className="h-10 px-4 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-xl text-[10px] font-black transition-all border border-transparent hover:border-red-100"
                                                        >
                                                            إلغاء المتابعة
                                                        </button>
                                                    ) : (
                                                        u.id !== currentUser?.id && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!currentUser) navigate('/login');
                                                                    else {
                                                                        await userService.toggleFollow(u.id);
                                                                        queryClient.invalidateQueries({ queryKey: [listModalType, targetUserId] });
                                                                    }
                                                                }}
                                                                className={`h-10 px-4 rounded-xl text-[10px] font-black transition-all ${u.is_following
                                                                    ? 'bg-gray-50 text-gray-400'
                                                                    : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
                                                                    }`}
                                                            >
                                                                {u.is_following ? 'متابع' : 'متابعة'}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
