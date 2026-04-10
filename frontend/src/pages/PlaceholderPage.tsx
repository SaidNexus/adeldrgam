import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Sparkles, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlaceholderPageProps {
    title: string;
    description: string;
    icon: LucideIcon;
    tag?: string;
}

export const PlaceholderPage = ({ title, description, icon: Icon, tag = "Coming Soon" }: PlaceholderPageProps) => {
    return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-6 selection:bg-blue-100 overflow-hidden relative">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full" />

            <div className="max-w-2xl w-full relative z-10 text-center space-y-12">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative inline-block"
                >
                    <div className="relative h-32 w-32 mx-auto bg-white border border-gray-100 rounded-[2.5rem] flex items-center justify-center shadow-2xl group">
                        <Icon className="h-12 w-12 text-blue-600 group-hover:scale-110 transition-transform duration-700" />

                        <div className="absolute -top-3 -right-3 bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg border-2 border-white uppercase tracking-widest">
                            {tag}
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-3"
                    >
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 leading-tight">
                            {title}
                        </h1>
                        <p className="text-gray-500 leading-relaxed text-lg md:text-xl font-medium max-w-lg mx-auto italic">
                            {description}
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center"
                >
                    <Link
                        to="/"
                        className="inline-flex items-center gap-3 bg-gray-900 border border-transparent hover:bg-black text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-gray-900/10 transition-all active:scale-95 group"
                    >
                        <ChevronLeft className="h-5 w-5 group-hover:translate-x-[-4px] transition-transform duration-300" />
                        العودة للرئيسية
                    </Link>
                </motion.div>

                <div className="pt-16 text-[10px] font-black text-gray-300 uppercase tracking-widest ">
                    NABDH PLATFORM • FUTURE INSIGHT
                </div>
            </div>
        </div>
    );
};
