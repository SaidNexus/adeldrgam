import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell, User as UserIcon, LogOut, Settings, Layout, PlusCircle, ShieldCheck, Menu, X, ChevronDown } from 'lucide-react';
import { authService } from '../../services/auth';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { webSocketService } from '../../services/websocket';
import { formatDate } from '../../lib/utils';

export const Navbar = () => {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const {
        notifications, unreadCount, fetchNotifications,
        markAsRead, markAllAsRead
    } = useNotificationStore();

    const menuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Initial fetch and WS connection
    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications(10);
            webSocketService.connect();
        } else {
            webSocketService.disconnect();
        }
    }, [isAuthenticated, fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await authService.signOut();
            setIsMenuOpen(false);
            setIsMobileMenuOpen(false);
            navigate('/', { replace: true });
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const isPublisher = user?.role === 'publisher' || user?.role === 'admin';
    const isAdmin = user?.role === 'admin';

    return (
        <header className="sticky top-0 z-[100] w-full border-b border-[#e2e8f0] bg-white backdrop-blur-md transition-colors">
            <div className="container-centered h-20 flex items-center justify-between">
                {/* Logo & Desktop Nav */}
                <div className="flex items-center gap-10">
                    <Link to="/" className="text-2xl font-black text-blue-600 tracking-tighter shrink-0">عادل ضرغام</Link>

                    <nav className="hidden md:flex items-center gap-8 border-s border-gray-100 ps-8">
                        <Link to="/" className={`text-sm font-bold transition-colors ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>الرئيسية</Link>
                        <Link to="/articles" className={`text-sm font-bold transition-colors ${location.pathname === '/articles' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>المقالات</Link>
                        <Link to="/authors" className={`text-sm font-bold transition-colors ${location.pathname === '/authors' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>المجتمع</Link>
                    </nav>
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                                    className={`p-2.5 rounded-xl relative transition-all ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                >
                                    <Bell className={`h-5 w-5 ${isNotifOpen ? 'fill-blue-600/10' : ''}`} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 h-4 min-w-[1rem] flex items-center justify-center px-1 bg-blue-600 text-white text-[10px] font-black rounded-full border-2 border-white">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                <AnimatePresence>
                                    {isNotifOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 mt-2 w-80 bg-white border border-[#e2e8f0] rounded-3xl shadow-2xl py-2 z-50 overflow-hidden font-almarai"
                                        >
                                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                                <h3 className="text-sm font-black text-gray-900">التنبيهات</h3>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={() => markAllAsRead()}
                                                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        تحديد الكل كمقروء
                                                    </button>
                                                )}
                                            </div>

                                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                                {notifications.length === 0 ? (
                                                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-center px-6">
                                                        <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                                                            <Bell className="h-6 w-6 text-gray-300" />
                                                        </div>
                                                        <p className="text-xs font-bold text-gray-400">لا توجد تنبيهات حالياً.. ابقَ متصلاً!</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-gray-50">
                                                        {notifications.slice(0, 10).map((notif) => (
                                                            <button
                                                                key={notif.id}
                                                                onClick={() => {
                                                                    markAsRead(notif.id);
                                                                    setIsNotifOpen(false);
                                                                    // Navigate logic based on type
                                                                    if (notif.metadata_?.article_slug) {
                                                                        navigate(`/articles/${notif.metadata_.article_slug}`);
                                                                    } else if (notif.metadata_?.article_id) {
                                                                        navigate(`/articles/id/${notif.metadata_.article_id}`);
                                                                    } else if (notif.metadata_?.follower_id) {
                                                                        navigate(`/profile/${notif.metadata_.follower_id}`);
                                                                    }
                                                                }}
                                                                className={`w-full text-right px-5 py-4 hover:bg-gray-50 transition-all flex gap-3 items-start relative ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                                                            >
                                                                {!notif.is_read && (
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 bg-blue-600 rounded-full" />
                                                                )}
                                                                <div className="h-9 w-9 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                                                                    {notif.metadata_?.avatar_url || notif.metadata_?.last_liker_avatar || notif.metadata_?.commenter_avatar ? (
                                                                        <img src={notif.metadata_.avatar_url || notif.metadata_.last_liker_avatar || notif.metadata_.commenter_avatar} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <UserIcon className="h-4 w-4 text-gray-400" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-xs leading-relaxed ${!notif.is_read ? 'text-gray-900 font-black' : 'text-gray-600 font-bold'}`}>
                                                                        {notif.message}
                                                                    </p>
                                                                    <span className="text-[10px] text-gray-400 font-bold block mt-1">
                                                                        {formatDate(notif.created_at)}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 border-t border-gray-50">
                                                <Link
                                                    to="/notifications"
                                                    onClick={() => setIsNotifOpen(false)}
                                                    className="block w-full text-center py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-black text-gray-600 transition-all"
                                                >
                                                    عرض الكل
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2 p-1 pe-3 rounded-full bg-[#f8fafc] border border-[#e2e8f0] hover:border-blue-200 transition-all group"
                                >
                                    <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-blue-500 transition-colors">
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-4 w-4 text-gray-400" />
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 max-w-[100px] truncate">{user?.full_name || user?.username}</span>
                                    <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className="absolute top-full left-0 mt-2 w-64 bg-white border border-[#e2e8f0] rounded-2xl shadow-xl py-2 overflow-hidden"
                                        >
                                            <div className="px-4 py-3 border-b border-gray-100 mb-1">
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">حسابك</p>
                                                <p className="text-sm font-black text-gray-900 truncate">{user?.full_name}</p>
                                                <p className="text-[10px] font-bold text-blue-600 truncate">{user?.email}</p>
                                            </div>

                                            <div className="space-y-0.5">
                                                <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <UserIcon className="h-4 w-4" />الملف الشخصي
                                                </Link>
                                                <Link to="/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <Settings className="h-4 w-4" />الإعدادات
                                                </Link>

                                                {isPublisher && (
                                                    <>
                                                        <div className="h-px bg-gray-50 my-1 mx-4" />
                                                        <Link to="/dashboard/my-articles" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                            <Layout className="h-4 w-4" />مقالاتي
                                                        </Link>
                                                        <Link to="/editor" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                            <PlusCircle className="h-4 w-4" />كتابة مقال
                                                        </Link>
                                                    </>
                                                )}

                                                {isAdmin && (
                                                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all border-t border-gray-50 mt-1">
                                                        <ShieldCheck className="h-4 w-4" />لوحة التحكم
                                                    </Link>
                                                )}

                                                <button
                                                    onClick={handleLogout}
                                                    disabled={isLoggingOut}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-red-500 hover:bg-red-50 transition-all border-t border-gray-100 mt-1"
                                                >
                                                    <LogOut className="h-4 w-4" />تسجيل الخروج
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <Link to="/login" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">دخول</Link>
                            <Link to="/register" className="h-11 px-7 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center">
                                انضم إلينا
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Menu Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        ref={mobileMenuRef}
                        className="md:hidden border-t border-gray-50 bg-white overflow-hidden"
                    >
                        <div className="container-centered py-6 flex flex-col gap-1">
                            {isAuthenticated && (
                                <div className="flex items-center gap-4 px-4 py-4 bg-gray-50 rounded-2xl mb-4">
                                    <div className="h-12 w-12 rounded-full border border-white overflow-hidden shrink-0 shadow-sm">
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-6 w-6 text-gray-300 p-2" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-gray-900 truncate">{user?.full_name}</p>
                                        <p className="text-[10px] font-bold text-blue-600 truncate">{user?.email}</p>
                                    </div>
                                </div>
                            )}

                            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all">الرئيسية</Link>
                            <Link to="/articles" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all">المقالات</Link>
                            <Link to="/authors" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all">المجتمع</Link>

                            {isAuthenticated ? (
                                <>
                                    <div className="h-px bg-gray-50 my-2" />
                                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all"><UserIcon className="h-5 w-5" /> الملف الشخصي</Link>
                                    <Link to="/notifications" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all relative">
                                        <Bell className="h-5 w-5" /> التنبيهات
                                        {unreadCount > 0 && <span className="absolute left-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                                    </Link>

                                    {isPublisher && (
                                        <>
                                            <Link to="/dashboard/my-articles" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all"><Layout className="h-5 w-5" /> مقالاتي</Link>
                                            <Link to="/editor" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all"><PlusCircle className="h-5 w-5" /> كتابة مقال جديد</Link>
                                        </>
                                    )}

                                    {isAdmin && (
                                        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><ShieldCheck className="h-5 w-5" /> لوحة الإدارة</Link>
                                    )}
                                    <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all"><Settings className="h-5 w-5" /> الإعدادات</Link>

                                    <button
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="mt-4 flex items-center gap-3 px-4 py-4 text-base font-black text-red-500 bg-red-50 rounded-xl transition-all"
                                    >
                                        <LogOut className="h-5 w-5" /> تسجيل الخروج
                                    </button>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center h-12 rounded-xl text-sm font-bold text-gray-600 bg-gray-50 transition-all">دخول</Link>
                                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center h-12 rounded-xl text-sm font-bold text-white bg-blue-600 transition-all">تسجيل</Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};
