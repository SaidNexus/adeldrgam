import { useEffect, useState } from 'react';
import { Bell, Mail, Shield, AppWindow, Sparkles, AlertCircle, RefreshCcw, Loader2, ChevronLeft } from 'lucide-react';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { webSocketService } from '../services/websocket';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../components/ui/AppLoader';

export const NotificationSettingsPage = () => {
    const navigate = useNavigate();
    const { preferences, isPrefsLoading, prefsError, fetchPreferences, updatePreferences } = useNotificationStore();
    const { isAuthenticated, _hasHydrated } = useAuthStore();
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            if (_hasHydrated && isAuthenticated) {
                await fetchPreferences();
                webSocketService.connect();
            }
        };
        init();
    }, [_hasHydrated, isAuthenticated, fetchPreferences]);

    const togglePreference = async (key: string, value: boolean) => {
        setToggling(key);
        try {
            await updatePreferences({ [key]: value });
        } catch (err) {
            console.error('Toggle failed:', err);
        } finally {
            setToggling(null);
        }
    };

    if (!_hasHydrated || (isPrefsLoading && !preferences)) {
        return <PageLoader />;
    }

    if (prefsError && !preferences) {
        return (
            <div className="bg-gray-50 min-h-screen">
                <section className="py-24">
                    <div className="max-w-2xl mx-auto px-6">
                        <div className="bg-white border border-red-100 p-12 rounded-[2.5rem] text-center space-y-8 shadow-sm">
                            <div className="h-20 w-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-500 border border-red-100">
                                <AlertCircle className="h-10 w-10" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-gray-900">عذراً، حدث خطأ ما</h3>
                                <p className="text-gray-500 font-medium">{prefsError}</p>
                            </div>
                            <button
                                onClick={() => fetchPreferences()}
                                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all active:scale-95 mx-auto"
                            >
                                <RefreshCcw className="w-5 h-5" />
                                تحميل الإعدادات مجدداً
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    const preferenceItems = [
        {
            id: 'in_app_notifications',
            title: 'إشعارات داخل النظام',
            description: 'تلقي تنبيهات فورية وتفاعلية أثناء تصفحك للمنصة لا تفوت أي جديد.',
            icon: AppWindow,
        },
        {
            id: 'email_notifications',
            title: 'إشعارات البريد الإلكتروني',
            description: 'سنقوم بموافاتك بأهم الأخبار والتحليلات الأسبوعية مباشرة إلى صندوق بريدك.',
            icon: Mail,
        },
        {
            id: 'security_notifications',
            title: 'تنبيهات الحماية والأمان',
            description: 'تحذيرات فورية عند تسجيل الدخول من أجهزة مجهولة أو محاولات تغيير حساسة.',
            icon: Shield,
        },
        {
            id: 'marketing_notifications',
            title: 'الميزات والفعاليات والجديد',
            description: 'كن أول من يعرف عن الميزات الجديدة والفعاليات الحصرية التي نقوم بتنظيمها.',
            icon: Sparkles,
        }
    ];

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
                            <Bell className="h-4 w-4" />
                            Notification Protocols
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">تفضيلات الإشعارات</h1>
                        <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl leading-relaxed">تحكم كامل في كيفية تلقيك للتنبيهات والرسائل.</p>
                    </div>
                    <button
                        onClick={() => navigate('/settings')}
                        className="h-16 px-8 bg-gray-50 border border-gray-200 rounded-2xl text-gray-500 font-bold hover:text-gray-900 hover:border-gray-300 transition-all flex items-center gap-2"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        تراجع للغرفة
                    </button>
                </div>
            </header>

            {/* Content Section */}
            <section className="py-24">
                <div className="max-w-3xl mx-auto px-6 space-y-8">
                    {/* Status Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-600 text-white rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-8 shadow-lg shadow-blue-500/20"
                    >
                        <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div className="space-y-1 flex-1 text-center md:text-right">
                            <h4 className="text-2xl font-black italic tracking-tight">النظام الذكي مفعّل</h4>
                            <p className="text-lg text-blue-50 font-medium leading-relaxed">
                                نقوم بمزامنة إعداداتك المفضلة لحظياً عبر جميع تطبيقاتنا لضمان تجربة متسقة دائماً.
                            </p>
                        </div>
                    </motion.div>

                    {/* Preference Items */}
                    <div className="grid gap-4">
                        {preferences && preferenceItems.map((item, idx) => {
                            const isEnabled = (preferences as any)[item.id] ?? false;
                            const isToggling = toggling === item.id;

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`bg-white border transition-all duration-300 rounded-[2rem] p-8 group shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-8 ${isEnabled ? 'border-blue-100' : 'border-gray-200 opacity-90'
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 ${isEnabled ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 border border-gray-100 text-gray-300'
                                            }`}>
                                            <item.icon className="h-7 w-7" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-xl text-gray-900 tracking-tight">{item.title}</h3>
                                            <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-sm">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => !isToggling && togglePreference(item.id, !isEnabled)}
                                        disabled={isToggling}
                                        className={`relative h-8 w-14 shrink-0 rounded-full transition-all duration-300 outline-none ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                            } ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:ring-4 ring-blue-500/5'}`}
                                    >
                                        <motion.div
                                            layout
                                            animate={{ x: isEnabled ? 24 : 4 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            className="absolute top-1 left-0 h-6 w-6 rounded-full bg-white shadow-md flex items-center justify-center"
                                        >
                                            {isToggling && <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />}
                                        </motion.div>
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
};
