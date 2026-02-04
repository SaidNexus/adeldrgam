import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin';
import { articleService } from '../services/articles';
import { publisherService } from '../services/publisher';
import {
    LayoutDashboard, Users, FileText, Layers, ShieldCheck,
    CheckCircle2, XCircle, Trash2, UserCheck,
    Search, ExternalLink,
    Plus, AlertTriangle, ArrowRight
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type AdminTab = 'overview' | 'content' | 'users' | 'publishers' | 'categories';

export const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // Modals state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        actionLabel: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning' | 'primary';
    }>({
        isOpen: false,
        title: '',
        message: '',
        actionLabel: '',
        onConfirm: () => { },
        variant: 'primary'
    });

    const openConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' | 'primary' = 'danger', actionLabel = 'تأكيد') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, variant, actionLabel });
    };

    return (
        <div className="bg-gray-50 min-h-screen flex selection:bg-blue-100 selection:text-blue-900 font-almarai">

            {/* Admin Sidebar */}
            <aside className="w-80 bg-white border-e border-gray-100 sticky top-0 h-screen hidden lg:flex flex-col p-8 z-50">
                <div className="flex items-center gap-3 mb-12">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-black tracking-tight text-gray-900 uppercase">Super Admin</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard />} label="نظرة عامة" />
                    <NavButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon={<FileText />} label="إدارة المحتوى" />
                    <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users />} label="إدارة المستخدمين" />
                    <NavButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers />} label="التصنيفات" />
                    <NavButton active={activeTab === 'publishers'} onClick={() => setActiveTab('publishers')} icon={<UserCheck />} label="طلبات الانضمام" />
                </nav>

                <div className="mt-auto pt-8 border-t border-gray-50">
                    <Link to="/" className="flex items-center gap-3 p-4 rounded-2xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all font-bold">
                        <ArrowRight className="h-5 w-5" />
                        العودة للمنصة
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-h-screen px-6 md:px-12 py-12 lg:py-16">
                <div className="max-w-7xl mx-auto space-y-12">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 capitalize tracking-tight">
                                {activeTab === 'overview' && 'لوحة التحكم'}
                                {activeTab === 'content' && 'إدارة المحتوى'}
                                {activeTab === 'users' && 'سجل المستخدمين'}
                                {activeTab === 'categories' && 'إدارة التصنيفات'}
                                {activeTab === 'publishers' && 'طلبات الناشرين'}
                            </h1>
                            <p className="text-gray-500 font-medium text-lg leading-relaxed max-w-2xl">
                                {activeTab === 'overview' && 'مرحباً أيها المشرف، إليك ملخص لأداء المنصة اليوم.'}
                                {activeTab === 'content' && 'راجع المقالات، اقبل المميز منها وقم بتصفية المرفوض.'}
                                {activeTab === 'users' && 'تحكم في أدوار المستخدمين وقم بإدارة الصلاحيات.'}
                                {activeTab === 'categories' && 'أضف فئات جديدة أو عدل الفئات الحالية.'}
                                {activeTab === 'publishers' && 'راجع المبدعين الراغبين في الانضمام إلى مجتمعنا.'}
                            </p>
                        </div>

                        {/* Global Search (Simplified) */}
                        <div className="relative group w-full md:w-80">
                            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="بحث سريع..."
                                className="w-full h-14 bg-white border border-gray-100 rounded-2xl ps-12 pe-8 shadow-sm focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-gray-900"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tab Panels */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && <OverviewPanel key="overview" />}
                        {activeTab === 'content' && <ContentPanel key="content" openConfirm={openConfirm} />}
                        {activeTab === 'users' && <UsersPanel key="users" openConfirm={openConfirm} userSearchQuery={userSearchQuery} setUserSearchQuery={setUserSearchQuery} />}
                        {activeTab === 'categories' && <CategoriesPanel key="categories" openConfirm={openConfirm} />}
                        {activeTab === 'publishers' && <PublishersPanel key="publishers" />}
                    </AnimatePresence>
                </div>
            </main>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                            <div className={`h-20 w-20 rounded-2xl flex items-center justify-center mx-auto ${confirmModal.variant === 'danger' ? 'bg-red-50 text-red-500' :
                                confirmModal.variant === 'warning' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                                }`}>
                                <AlertTriangle className="h-10 w-10" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-black text-gray-900">{confirmModal.title}</h3>
                                <p className="text-gray-500 font-medium">{confirmModal.message}</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
                                    className={`flex-1 h-14 rounded-2xl font-black shadow-lg transition-all active:scale-95 ${confirmModal.variant === 'danger' ? 'bg-red-600 text-white shadow-red-600/20 hover:bg-red-700' :
                                        confirmModal.variant === 'warning' ? 'bg-orange-600 text-white shadow-orange-600/20 hover:bg-orange-700' : 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700'
                                        }`}
                                >
                                    {confirmModal.actionLabel}
                                </button>
                                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 h-14 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl font-black transition-all active:scale-95">
                                    تراجع
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all relative overflow-hidden group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
            }`}
    >
        <span className={`${active ? 'text-white' : 'text-gray-300 group-hover:text-blue-500'} transition-colors`}>{icon}</span>
        {label}
        {active && <motion.div layoutId="nav-active" className="absolute right-0 h-full w-1 bg-white rounded-l-full" />}
    </button>
);

// --- OVERVIEW PANEL ---
const OverviewPanel = () => {
    const { data: stats } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: () => adminService.getStats()
    });

    // Debug: Log stats to console
    if (stats) {
        console.table(stats);
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatsCard label="إجمالي المستخدمين" value={stats?.total_users || 0} icon={<Users />} index={0} />
            <StatsCard label="إجمالي المقالات" value={stats?.total_articles || 0} icon={<FileText />} index={1} />
            <StatsCard label="طلبات معلقة" value={stats?.pending_approvals || 0} icon={<UserCheck />} index={2} isAlert={(stats?.pending_approvals || 0) > 0} />
            <StatsCard label="إجمالي الإعجابات" value={stats?.total_likes || 0} icon={<CheckCircle2 />} index={3} />
        </motion.div>
    );
};

const StatsCard = ({ label, value, icon, index, isAlert }: { label: string, value: number, icon: any, index: number, isAlert?: boolean }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 group hover:shadow-xl hover:shadow-gray-200/50 transition-all"
    >
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all ${isAlert ? 'bg-orange-50 text-orange-500 animate-pulse' : 'bg-gray-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
            }`}>
            {icon}
        </div>
        <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{label}</p>
            <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl font-black text-gray-900 tabular-nums"
            >
                <AnimatedCounter value={value} />
            </motion.h3>
        </div>
    </motion.div>
);

const AnimatedCounter = ({ value }: { value: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) return;
        let totalMiliseconds = 1500;
        let incrementTime = (totalMiliseconds / end) > 40 ? (totalMiliseconds / end) : 40;
        let timer = setInterval(() => {
            start += Math.ceil(end / 30);
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, incrementTime);
        return () => clearInterval(timer);
    }, [value]);
    return <>{count.toLocaleString('en-US')}</>;
};

// --- CONTENT PANEL ---
const ContentPanel = ({ openConfirm }: { openConfirm: any }) => {
    const queryClient = useQueryClient();
    const { data: articles, isLoading } = useQuery({
        queryKey: ['admin-articles-all'],
        queryFn: () => articleService.getArticles({ limit: 100 })
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => adminService.updateArticleStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-articles-all'] })
    });

    if (isLoading) return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-right">
                <tbody className="divide-y divide-gray-50">
                    <TableSkeleton cols={4} />
                </tbody>
            </table>
        </div>
    );

    const approve = (id: string) => openConfirm('اعتماد المقال', 'هل أنت متأكد من رغبتك في اعتماد هذا المقال للنشر العام؟', () => statusMutation.mutate({ id, status: 'published' }), 'primary', 'اعتماد');
    const reject = (id: string) => openConfirm('رفض المقال', 'سيتم تحويل المقال إلى مسودة ولن يظهر للجمهور. هل أنت متأكد؟', () => statusMutation.mutate({ id, status: 'draft' }), 'warning', 'رفض');

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">المقال</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الكاتب</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الحالة</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? <TableSkeleton cols={4} /> : articles?.map((art) => (
                            <tr key={art.id} className="hover:bg-gray-50/30 transition-colors group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 rounded-2xl bg-gray-100 overflow-hidden shrink-0 shadow-sm border border-white">
                                            {art.featured_image_url && <img src={art.featured_image_url} className="h-full w-full object-cover" />}
                                        </div>
                                        <div className="max-w-md">
                                            <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{art.title}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{formatDate(art.created_at)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-center font-bold text-gray-600">@{art.author?.username}</td>
                                <td className="px-10 py-6 text-center font-bold">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest ${art.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                        }`}>
                                        {art.status === 'published' ? 'معتمد' : 'معلق'}
                                    </span>
                                </td>
                                <td className="px-10 py-6">
                                    <div className="flex items-center justify-center gap-2">
                                        {art.status !== 'published' && (
                                            <button onClick={() => approve(art.id)} className="h-10 w-10 flex items-center justify-center bg-gray-50 hover:bg-green-50 text-green-600 rounded-xl transition-all border border-gray-100" title="قبول">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </button>
                                        )}
                                        {art.status === 'published' && (
                                            <button onClick={() => reject(art.id)} className="h-10 w-10 flex items-center justify-center bg-gray-50 hover:bg-orange-50 text-orange-600 rounded-xl transition-all border border-gray-100" title="رفض">
                                                <XCircle className="h-5 w-5" />
                                            </button>
                                        )}
                                        <Link to={`/articles/${art.slug}`} className="h-10 w-10 flex items-center justify-center bg-gray-50 hover:bg-blue-50 text-blue-600 rounded-xl transition-all border border-gray-100" title="عرض">
                                            <ExternalLink className="h-5 w-5" />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

// --- USERS PANEL ---
const UsersPanel = ({ openConfirm, userSearchQuery, setUserSearchQuery }: { openConfirm: any, userSearchQuery: string, setUserSearchQuery: any }) => {
    const queryClient = useQueryClient();
    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users', userSearchQuery],
        queryFn: () => adminService.getUsers(userSearchQuery)
    });

    const roleMutation = useMutation({
        mutationFn: ({ id, role }: { id: string, role: string }) => adminService.updateUserRole(id, role),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => adminService.deleteUser(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    });

    const handleRole = (id: string, name: string, role: string) => {
        const roleAr = role === 'publisher' ? 'ناشر' : 'قارئ';
        openConfirm('تغيير رتبة المستخدم', `هل أنت متأكد من تحويل ${name} إلى رتبة ${roleAr}؟`, () => roleMutation.mutate({ id, role }), 'warning', 'تغيير الرتبة');
    };

    const handleDelete = (id: string, name: string) => {
        openConfirm('حذف المستخدم نهائياً', `هل أنت متأكد من حذف حساب ${name}؟ سيؤدي ذلك لمسح كافة بياناته ولا يمكن التراجع عن هذه الخطوة.`, () => deleteMutation.mutate(id), 'danger', 'حذف نهائي');
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* User Search */}
            <div className="relative group">
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                    type="text"
                    placeholder="البحث عن مستخدم (الاسم، البريد، أو المعرف)..."
                    className="w-full h-14 bg-white border border-gray-100 rounded-2xl ps-12 pe-12 shadow-sm focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-gray-900"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">المستخدم</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الرتبة</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الإنضمام</th>
                                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? <TableSkeleton cols={4} /> : users?.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4 text-right">
                                            <div className="h-12 w-12 rounded-[1rem] bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                                                {user.avatar_url && <img src={user.avatar_url} className="h-full w-full object-cover" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 line-clamp-1">{user.full_name || user.username}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">@{user.username}</p>
                                                <p className="text-[9px] text-gray-400 font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest ${user.role === 'admin' ? 'bg-red-50 text-red-600' :
                                            user.role === 'publisher' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {user.role === 'admin' ? 'مشرف' : user.role === 'publisher' ? 'ناشر' : 'قارئ'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-center text-xs font-bold text-gray-400 tracking-tight tabular-nums">{formatDate(user.created_at)}</td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center justify-center gap-2">
                                            {user.role !== 'admin' && (
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRole(user.id, user.username, e.target.value)}
                                                    className="h-10 px-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold transition-all outline-none focus:border-blue-500 cursor-pointer"
                                                >
                                                    <option value="user">قارئ</option>
                                                    <option value="publisher">ناشر</option>
                                                </select>
                                            )}
                                            {user.role === 'admin' && <span className="text-[10px] font-black text-red-600 px-4">مشرف أساسي</span>}
                                            <button
                                                onClick={() => handleDelete(user.id, user.username)}
                                                disabled={deleteMutation.isPending}
                                                className="h-10 w-10 flex items-center justify-center bg-gray-50 text-red-400 rounded-xl border border-gray-100 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                                                title="حذف المستخدم"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

// --- CATEGORIES PANEL ---
const CategoriesPanel = ({ openConfirm }: { openConfirm: any }) => {
    const queryClient = useQueryClient();
    const { data: categories, isLoading } = useQuery({
        queryKey: ['admin-categories'],
        queryFn: () => articleService.getCategories()
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => adminService.deleteCategory(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => adminService.createCategory(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    });

    const [newCat, setNewCat] = useState({ name_ar: '', slug: '', description_ar: '' });

    const handleDelete = (id: string, name: string) => {
        openConfirm('حذف التصنيف', `سيتم حذف تصنيف "${name}" نهائياً من المتجر. هل أنت متأكد؟`, () => deleteMutation.mutate(id), 'danger');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Create Section */}
            <div className="lg:col-span-1">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 sticky top-32">
                    <h3 className="text-2xl font-black text-gray-900">إضافة تصنيف</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pr-2">الاسم العربي</label>
                            <input type="text" value={newCat.name_ar} onChange={(e) => setNewCat({ ...newCat, name_ar: e.target.value })} className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-6 outline-none focus:border-blue-500 font-bold transition-all" />
                        </div>
                        <button
                            disabled={!newCat.name_ar}
                            onClick={() => { createMutation.mutate(newCat); setNewCat({ name_ar: '', slug: '', description_ar: '' }); }}
                            className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Plus className="h-5 w-5" />
                                حفظ التصنيف
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right min-w-[500px]">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">التصنيف</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">المسار</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? <TableSkeleton cols={3} /> : categories?.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-10 py-6 font-black text-gray-900">{cat.name_ar}</td>
                                        <td className="px-10 py-6 text-center text-xs font-bold text-gray-400">{cat.slug}</td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleDelete(cat.id, cat.name_ar)} className="h-10 w-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- PUBLISHERS PANEL ---
const PublishersPanel = () => {
    const queryClient = useQueryClient();
    const { data: requests, isLoading } = useQuery({
        queryKey: ['publisher-requests'],
        queryFn: () => publisherService.getAllRequests()
    });

    const approve = useMutation({
        mutationFn: (id: string) => publisherService.approveRequest(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['publisher-requests'] })
    });

    const reject = useMutation({
        mutationFn: (id: string) => publisherService.rejectRequest(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['publisher-requests'] })
    });

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">المتقدم</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">البريد الإلكتروني</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">التاريخ</th>
                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">القرار</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? <TableSkeleton cols={4} /> : (requests || []).length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-10 py-32 text-center">
                                    <div className="space-y-4">
                                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                                            <ShieldCheck className="h-10 w-10" />
                                        </div>
                                        <p className="text-xl font-black text-gray-300 italic">لا توجد طلبات معلقة حالياً</p>
                                    </div>
                                </td>
                            </tr>
                        ) : requests?.map((req: any) => (
                            <tr key={req.id} className="hover:bg-gray-50/30 transition-colors group">
                                <td className="px-10 py-6">
                                    <div className="font-black text-gray-900 text-lg">{req.username}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest tracking-[0.2em]">{req.user_id}</div>
                                </td>
                                <td className="px-10 py-6 text-center font-bold text-gray-500">{req.email}</td>
                                <td className="px-10 py-6 text-center text-xs font-bold text-gray-400">{formatDate(req.created_at)}</td>
                                <td className="px-10 py-6">
                                    <div className="flex items-center justify-center gap-3">
                                        <button onClick={() => approve.mutate(req.id)} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/10 hover:bg-blue-700 transition-all active:scale-95">قبول</button>
                                        <button onClick={() => reject.mutate(req.id)} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-black border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95">رفض</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

const TableSkeleton = ({ cols }: { cols: number }) => (
    <>
        {Array(5).fill(0).map((_, i) => (
            <tr key={i} className="animate-pulse">
                <td colSpan={cols} className="px-10 py-8 bg-gray-50/20 h-24"></td>
            </tr>
        ))}
    </>
);
