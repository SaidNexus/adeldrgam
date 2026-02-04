import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const AppLoader = () => {
    return (
        <div className="fixed inset-0 flex h-screen w-screen flex-col items-center justify-center bg-gray-50 z-[9999] overflow-hidden selection:bg-transparent">
            {/* Background Blur Accents */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] rounded-full" />

            <div className="relative mb-12">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="h-28 w-28 rounded-[2.5rem] bg-white border border-gray-100 shadow-[0_20px_40px_rgba(0,0,0,0.03)]"
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6 relative z-10"
            >
                <div className="flex items-center justify-center gap-4">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">نـبـض</h1>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ">
                        Initialising Nexus Ecosystem
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" />
                    </div>
                </div>
            </motion.div>

            {/* Bottom Credit */}
            <div className="absolute bottom-12 left-0 right-0 text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest ">NABDH • MEDIA INTELLIGENCE</p>
            </div>
        </div>
    );
};

export const PageLoader = () => {
    return (
        <div className="flex h-[400px] flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-3xl bg-white border border-gray-100 shadow-sm" />
                <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
            </div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Syncing Content...</p>
        </div>
    );
};

export const InlineLoader = ({ text = 'Fetching Data...' }: { text?: string }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="h-1 w-32 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    animate={{ x: [-128, 128] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full w-20 bg-blue-600 rounded-full"
                />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{text}</span>
        </div>
    );
};

export const SkeletonCard = () => {
    return (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 animate-pulse space-y-8">
            <div className="aspect-video bg-gray-50 rounded-2xl w-full" />
            <div className="space-y-4">
                <div className="h-8 bg-gray-50 rounded-xl w-3/4" />
                <div className="h-4 bg-gray-50 rounded-lg w-full" />
                <div className="h-4 bg-gray-50 rounded-lg w-2/3" />
            </div>
        </div>
    );
};

export const SkeletonList = ({ count = 3 }: { count?: number }) => {
    return (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
};
