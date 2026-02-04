import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const NotFoundPage = () => {
    return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-6 selection:bg-blue-100 overflow-hidden relative">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full" />

            <div className="max-w-4xl w-full relative z-10 text-center space-y-16">
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 bg-white border border-gray-100 px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase text-blue-600 shadow-sm"
                    >
                        <Sparkles className="h-4 w-4" />
                        Navigation Error
                    </motion.div>

                    <div className="relative inline-block">
                        <motion.h1
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-[14rem] md:text-[20rem] font-black leading-none text-gray-100/50 select-none tracking-tighter"
                        >
                            404
                        </motion.h1>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: "spring", damping: 15 }}
                                className="h-32 w-32 bg-white border border-gray-100 rounded-[2.5rem] flex items-center justify-center shadow-2xl"
                            >
                                <HelpCircle className="h-12 w-12 text-blue-600" />
                            </motion.div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl md:text-6xl font-black tracking-tight text-gray-900 leading-tight"
                    >
                        تاهت الكلمات <br />
                        <span className="text-gray-400 italic font-medium">وضلّت</span> الفكرة الطريق
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-500 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed italic"
                    >
                        "لا تحزن على ما فات، فكل نهاية هي بداية لرحلة معرفية جديدة. استكشف طريق الذهب من البداية."
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center"
                >
                    <Link
                        to="/"
                        className="inline-flex items-center gap-4 bg-gray-900 text-white px-12 py-5 rounded-2xl font-black text-lg shadow-xl shadow-gray-900/10 transition-all hover:-translate-y-1 active:scale-95 group"
                    >
                        العودة للمنبع الرئيسي
                        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-2 transition-transform duration-300" />
                    </Link>
                </motion.div>

                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[1em] translate-x-[0.5em]">SYSTEM STABILITY: OPTIMAL</p>
            </div>
        </div>
    );
};
