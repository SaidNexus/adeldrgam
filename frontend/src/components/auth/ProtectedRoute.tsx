import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requirePublisher?: boolean;
    requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requirePublisher, requireAdmin }: ProtectedRouteProps) => {
    const location = useLocation();
    const { token, user, isLoading, _hasHydrated } = useAuthStore();

    if (!_hasHydrated || isLoading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
                    <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-500 animate-pulse" />
                </div>
                <p className="text-zinc-500 font-medium animate-pulse">جاري التحقق...</p>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !user?.is_admin && user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    if (requirePublisher && user?.role === 'user') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
