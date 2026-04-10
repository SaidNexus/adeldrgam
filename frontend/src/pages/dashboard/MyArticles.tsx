import { useQuery, useQueryClient } from '@tanstack/react-query';
import { articleService } from '../../services/articles';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDate } from '../../lib/utils';
import { Edit, Trash2, Plus, ExternalLink, Eye, Layout, Sparkles, ThumbsUp, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const MyArticles = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { data: articles, isLoading } = useQuery({
        queryKey: ['my-articles', user?.id],
        queryFn: () => articleService.getMyArticles(),
    });

    const handleDelete = async (articleId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المقال؟')) return;

        try {
            await articleService.deleteArticle(articleId);
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            queryClient.invalidateQueries({ queryKey: ['my-articles'] });
            queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
        } catch (error) {
            console.error('Delete error:', error);
            alert('فشل في حذف المقال');
        }
    };

    const stats = [
        { label: 'إجمالي المقالات', value: articles?.length || 0, icon: Layout, color: 'text-blue-600' },
        { label: 'إجمالي المشاهدات', value: articles?.reduce((acc, curr) => acc + (curr.views_count || 0), 0).toLocaleString('ar-EG', { numberingSystem: 'latn' }) || 0, icon: Eye, color: 'text-blue-600' },
        { label: 'إجمالي التفاعلات', value: articles?.reduce((acc, curr) => acc + (curr.likes_count || 0) + (curr.comments_count || 0), 0).toLocaleString('ar-EG', { numberingSystem: 'latn' }) || 0, icon: ThumbsUp, color: 'text-blue-600' },
        { label: 'إجمالي التعليقات', value: articles?.reduce((acc, curr) => acc + (curr.comments_count || 0), 0).toLocaleString('ar-EG', { numberingSystem: 'latn' }) || 0, icon: MessageSquare, color: 'text-blue-600' }
    ];

    return (
        <div className="bg-gray-50 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto px-6 space-y-12">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-16">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                            <Sparkles className="w-4 h-4" />
                            استوديو المبدعين
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-tight">مقالاتي</h1>
                        <p className="text-gray-500 font-medium text-lg italic max-w-2xl">"إدارة وتحرير مقالاتك المنشورة والمسودات، حيث تتحول الأفكار إلى واقع ملموس."</p>
                    </div>
                    <Link
                        to="/editor"
                        className="h-16 px-10 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-900/10 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                    >
                        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
                        كتابة مقال جديد
                    </Link>
                </header>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white border border-gray-100 rounded-3xl p-8 space-y-4 shadow-sm group hover:shadow-md transition-all"
                        >
                            <div className={`h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-blue-600 group-hover:text-white transition-all ${stat.color}`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</p>
                                <h3 className="text-3xl font-black tracking-tight text-gray-900">{stat.value}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="bg-white border border-gray-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-10 py-8 font-black text-[10px] text-gray-400 uppercase tracking-widest">المقال</th>
                                    <th className="px-10 py-8 font-black text-[10px] text-gray-400 uppercase tracking-widest">الحالة</th>
                                    <th className="px-10 py-8 font-black text-[10px] text-gray-400 uppercase tracking-widest text-center">المشاهدات</th>
                                    <th className="px-10 py-8 font-black text-[10px] text-gray-400 uppercase tracking-widest">تاريخ النشر</th>
                                    <th className="px-10 py-8 font-black text-[10px] text-gray-400 uppercase tracking-widest text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    Array(4).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-10 py-10 h-24 bg-gray-50/20"></td>
                                        </tr>
                                    ))
                                ) : (
                                    articles?.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50/30 transition-colors group">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="h-16 w-16 rounded-2xl bg-gray-100 overflow-hidden shrink-0 border border-white shadow-sm">
                                                        {article.featured_image_url && (
                                                            <img src={article.featured_image_url} className="h-full w-full object-cover" alt="" />
                                                        )}
                                                    </div>
                                                    <div className="max-w-md space-y-1">
                                                        <p className="font-black text-lg text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{article.title}</p>
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                                            {article.category?.name_ar || 'تصنيف عام'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border ${article.status === 'published'
                                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                                    }`}>
                                                    {article.status === 'published' ? 'منشور' : 'مسودة'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-center text-lg font-black text-gray-900">
                                                {article.views_count.toLocaleString('ar-EG', { numberingSystem: 'latn' })}
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700">{formatDate(article.created_at)}</span>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">تاريخ الإنشاء</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link to={`/articles/${article.slug}`} className="p-3 bg-gray-50 hover:bg-white text-gray-400 hover:text-blue-600 border border-transparent hover:border-gray-100 rounded-xl transition-all shadow-sm" title="معاينة">
                                                        <ExternalLink className="h-5 w-5" />
                                                    </Link>
                                                    <Link to={`/editor/${article.id}`} className="p-3 bg-gray-50 hover:bg-white text-gray-400 hover:text-blue-600 border border-transparent hover:border-gray-100 rounded-xl transition-all shadow-sm" title="تعديل">
                                                        <Edit className="h-5 w-5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(article.id)}
                                                        className="p-3 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 border border-transparent hover:border-red-100 rounded-xl transition-all shadow-sm"
                                                        title="حذف"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {!isLoading && articles?.length === 0 && (
                        <div className="py-32 text-center space-y-8 bg-white">
                            <div className="h-24 w-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto border border-gray-100">
                                <Plus className="h-10 w-10 text-gray-200" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-3xl font-black text-gray-900">لم تبدأ بعد؟</h3>
                                <p className="text-gray-500 font-medium italic max-w-sm mx-auto">شارك أفكارك الملهمة مع آلاف القراء في مجتمع عادل ضرغام.</p>
                            </div>
                            <Link to="/editor" className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all hover:-translate-y-1 active:scale-95">
                                <Plus className="w-5 h-5" />
                                ابدأ كتابة أول مقال
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
