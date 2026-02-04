import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Sparkles, ChevronRight } from 'lucide-react';

export const LoginPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (isAuthenticated) {
            const from = (location.state as any)?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.signIn(email, password);
            const from = (location.state as any)?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err: any) {
            const message = err?.response?.data?.detail || err?.message || 'فشل التحقق من الهوية الرقمية';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-6 selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white border border-gray-200 p-10 md:p-14 rounded-[2.5rem] shadow-xl shadow-gray-200/50 space-y-10">
                    {/* Brand Header */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-4">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900">عودة لـ نبض</h2>
                        <p className="text-gray-500 font-medium">سجل دخولك لتستمر رحلتك المعرفية</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-100 text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                                    البريد الإلكتروني
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="w-full h-14 bg-gray-50 border border-gray-200 rounded-xl px-6 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold"
                                    placeholder="name@nexus.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                                    مفتاح العبور
                                </label>
                                <div className="relative group">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        className="w-full h-14 bg-gray-50 border border-gray-200 rounded-xl px-6 pl-14 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-900 transition-colors p-2"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    تأكيد الدخول
                                    <ChevronRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Actions */}
                    <div className="text-center pt-4">
                        <p className="text-sm font-bold text-gray-400">
                            لا تملك عضويّة فكريّة؟{' '}
                            <Link to="/register" className="text-blue-600 hover:underline">
                                سجل الآن
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    © {new Date().getFullYear()} نبض • الوصول الآمن
                </p>
            </motion.div>
        </div>
    );
};
