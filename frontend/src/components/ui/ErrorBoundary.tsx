import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 selection:bg-blue-100">
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-12 max-w-md w-full text-center space-y-8 shadow-2xl shadow-gray-200/50">
                        <div className="h-24 w-24 mx-auto rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">حدث خطأ تقني</h2>
                            <p className="text-gray-500 font-medium italic">
                                نعتذر عن هذا العطل المفاجئ. فريقنا يعمل لاستعادة التوازن الرقمي.
                            </p>
                        </div>
                        {this.state.error && (
                            <div className="bg-gray-50 rounded-xl p-6 text-xs text-gray-400 font-mono text-right overflow-auto max-h-32 border border-gray-100 leading-relaxed italic">
                                {this.state.error.message}
                            </div>
                        )}
                        <button
                            onClick={this.handleRetry}
                            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <RefreshCw className="h-5 w-5" />
                            تحديث المنصة
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
