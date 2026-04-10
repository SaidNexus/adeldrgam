import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AppNotification } from '../../services/notification';

interface ToastProps {
    notification: AppNotification;
    onClose: (id: string) => void;
}

export const Toast = ({ notification, onClose }: ToastProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="group relative w-full overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 pointer-events-auto"
        >
            <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="absolute top-0 right-0 h-1 bg-blue-600/10 z-20"
            />

            <div className="p-5 flex gap-5">
                <div className="shrink-0 h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Bell className="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0 pr-1">
                    <h4 className="text-sm font-black text-gray-900 line-clamp-1 tracking-tight">{notification.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed font-medium italic">{notification.message}</p>

                    <div className="flex items-center gap-3 mt-4">
                        <Link
                            to="/notifications"
                            onClick={() => onClose(notification.id)}
                            className="text-[9px] font-black text-blue-600 hover:underline flex items-center gap-1.5 uppercase tracking-widest"
                        >
                            <ExternalLink className="h-3 w-3" />
                            فتح التنبيهات
                        </Link>
                    </div>
                </div>

                <button
                    onClick={() => onClose(notification.id)}
                    className="shrink-0 h-8 w-8 flex items-center justify-center text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all self-start"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </motion.div>
    );
};

export const ToastContainer = ({ toasts, removeToast }: { toasts: AppNotification[], removeToast: (id: string) => void }) => {
    return (
        <div className="fixed top-24 right-6 z-[100] w-full max-w-sm flex flex-col gap-4 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <Toast key={toast.id} notification={toast} onClose={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
};
