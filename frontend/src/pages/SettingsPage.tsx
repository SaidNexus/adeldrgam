import { Bell, Shield, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const SettingsPage = () => {
    const settingsSections = [
        {
            icon: Bell,
            title: 'إعدادات الإشعارات',
            description: 'التحكم في تدفق التنبيهات والتحديثات الرقمية.',
            link: '/settings/notifications',
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            icon: Shield,
            title: 'الأمان والخصوصية',
            description: 'إدارة مفاتيح العبور وحماية الهوية الرقمية.',
            link: '/settings/security',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
    ];

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header Section */}
            <header className="py-24 md:py-32 bg-white border-b border-gray-200 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-wider"
                        >
                            Control Center
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">الإعدادات</h1>
                        <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl leading-relaxed">
                            قم بضبط إعدادات تجربتك في عادل ضرغام لتناسب طريقتك في التفكير.
                        </p>
                    </div>
                </div>
            </header>

            {/* Content Section */}
            <section className="py-20 md:py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {settingsSections.map((section, idx) => (
                            <motion.div
                                key={section.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Link
                                    to={section.link}
                                    className="group flex flex-col bg-white border border-gray-200 rounded-3xl p-10 hover:border-blue-300 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 h-full"
                                >
                                    <div className="flex items-center justify-between mb-10">
                                        <div className={`h-16 w-16 rounded-2xl ${section.bg} flex items-center justify-center ${section.color} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                                            <section.icon className="h-8 w-8" />
                                        </div>
                                        <div className="h-10 w-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all duration-300">
                                            <ChevronLeft className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                                            {section.title}
                                        </h3>
                                        <p className="text-gray-500 font-medium leading-relaxed">
                                            {section.description}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};
