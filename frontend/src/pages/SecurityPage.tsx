import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ChevronLeft, Key, Loader2 } from 'lucide-react';
import { userService } from '../services/user';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const SecurityPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const validate = () => {
        if (formData.newPassword.length < 8) {
            return 'يجب أن يكون مفتاح العبور 8 أحرف على الأقل';
        }
        if (formData.newPassword !== formData.confirmPassword) {
            return 'مفاتيح العبور الجديدة غير متطابقة';
        }
        if (formData.newPassword === formData.currentPassword) {
            return 'المفتاح الجديد يجب أن يكون مختلفاً عن الحالي';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        try {
            await userService.changePassword(formData.currentPassword, formData.newPassword);
            setSuccess(true);
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setTimeout(() => setSuccess(false), 5000);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'فشل تحديث مفتاح العبور';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

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
                            <Shield className="h-4 w-4" />
                            Security Protocols
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">تأمين الهويـة</h1>
                        <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl leading-relaxed italic">قم بتحديث مفاتيح عبورك لضمان سلامة بياناتك الفكرية وحمايتها من الوصول غير المصرح.</p>
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
                <div className="max-w-4xl mx-auto px-6 grid gap-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-200 p-8 md:p-16 rounded-[2.5rem] shadow-sm relative overflow-hidden"
                    >
                        <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl flex items-center gap-3 text-base font-bold"
                                    >
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        {error}
                                    </motion.div>
                                )}

                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-5 rounded-2xl flex items-center gap-3 text-base font-bold"
                                    >
                                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                                        تم تشفير وتحديث مفتاح العبور بنجاح
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-2">
                                        <Key className="w-3.5 h-3.5" />
                                        المفتاح الحالي
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showCurrent ? 'text' : 'password'}
                                            required
                                            className="w-full h-16 bg-gray-50 border border-gray-200 rounded-2xl pe-6 ps-14 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-lg text-gray-900"
                                            value={formData.currentPassword}
                                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrent(!showCurrent)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-900 transition-colors p-2"
                                        >
                                            {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5" />
                                        المفتاح الجديد
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            required
                                            minLength={8}
                                            className="w-full h-16 bg-gray-50 border border-gray-200 rounded-2xl pe-6 ps-14 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-lg text-gray-900"
                                            value={formData.newPassword}
                                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                            placeholder="أدخل مفتاحاً جديداً..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-900 transition-colors p-2"
                                        >
                                            {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        تأكيد المفتاح
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            required
                                            className="w-full h-16 bg-gray-50 border border-gray-200 rounded-2xl pe-6 ps-14 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-lg text-gray-900"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            placeholder="تأكيد المفتاح للمرة الأخيرة..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-900 transition-colors p-2"
                                        >
                                            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 mt-6"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <Shield className="h-5 w-5" />
                                        تحديث البروتوكول الأمني
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};
