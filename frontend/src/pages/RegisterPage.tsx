import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { motion } from 'framer-motion';
import { Loader2, UserPlus, Sparkles } from 'lucide-react';

export const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');

    // Use the custom hook
    const { registerAsync, isLoading, error: apiError } = useRegister();
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await registerAsync({ email, password, fullName, username });
            navigate('/login');
        } catch (err) {
            // Error is handled by the hook's state (apiError)
            // We can leave this empty or log if needed
        }
    };

    // Helper to check for field errors
    const hasError = (field: string) => !!apiError?.details?.[field];

    return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-6 selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl relative z-10"
            >
                <div className="bg-white border border-gray-200 p-10 md:p-16 rounded-[3rem] shadow-xl shadow-gray-200/50 space-y-12">
                    {/* Brand Header */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-4">
                            <UserPlus className="h-8 w-8" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900">انضم لعادل ضرغام</h2>
                        <p className="text-gray-500 font-medium text-lg italic">"حيث تلتقي الأفكار العميقة، لتبدأ رحلة التأثير."</p>
                    </div>

                    <form className="space-y-8" onSubmit={handleRegister}>
                        {apiError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-100 text-center"
                            >
                                {apiError.message}
                            </motion.div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="fullName" className={`block text-[10px] font-black uppercase tracking-widest px-1 ${hasError('full_name') ? 'text-red-500' : 'text-gray-400'}`}>الاسم الكامل</label>
                                <input
                                    id="fullName"
                                    type="text"
                                    required
                                    className={`w-full h-14 bg-gray-50 border rounded-xl px-6 text-gray-900 focus:bg-white focus:ring-4 outline-none transition-all font-bold ${hasError('full_name')
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/5'
                                        }`}
                                    placeholder="الاسم كامل"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="username" className={`block text-[10px] font-black uppercase tracking-widest px-1 ${hasError('username') ? 'text-red-500' : 'text-gray-400'}`}>اسم المستخدم</label>
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    className={`w-full h-14 bg-gray-50 border rounded-xl px-6 text-gray-900 focus:bg-white focus:ring-4 outline-none transition-all font-bold ${hasError('username')
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/5'
                                        }`}
                                    placeholder="اسم المستخدم"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="email" className={`block text-[10px] font-black uppercase tracking-widest px-1 ${hasError('email') ? 'text-red-500' : 'text-gray-400'}`}>البريد الإلكتروني</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className={`w-full h-14 bg-gray-50 border rounded-xl px-6 text-gray-900 focus:bg-white focus:ring-4 outline-none transition-all font-bold ${hasError('email')
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/5'
                                        }`}
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label htmlFor="password" className={`block text-[10px] font-black uppercase tracking-widest px-1 ${hasError('password') ? 'text-red-500' : 'text-gray-400'}`}>مفتاح العبور</label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    className={`w-full h-14 bg-gray-50 border rounded-xl px-6 text-gray-900 focus:bg-white focus:ring-4 outline-none transition-all font-bold ${hasError('password')
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/5'
                                        }`}
                                    placeholder="أدخل مفتاحاً قوياً..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    إنشاء الحساب
                                    <Sparkles className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Actions */}
                    <div className="text-center pt-4">
                        <p className="text-gray-500 font-bold">
                            هل تملك حساباً بالفعل؟{' '}
                            <Link to="/login" className="text-blue-600 hover:underline">
                                سجل دخولك
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    منظومة عادل ضرغام • الخصوصية محمية
                </p>
            </motion.div>
        </div>
    );
};
