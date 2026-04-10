import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articleService } from '@/services/articles';
import { useAuthStore } from '@/store/useAuthStore';
import { CommentItem } from './CommentItem';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

interface CommentSectionProps {
    articleId: string;
    articleAuthorId?: string;
}

export const CommentSection = ({ articleId, articleAuthorId }: CommentSectionProps) => {
    const [content, setContent] = useState('');
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    const { data: comments, isLoading } = useQuery({
        queryKey: ['comments', articleId],
        queryFn: () => articleService.getComments(articleId),
    });



    const mutation = useMutation({
        mutationFn: (text: string) => articleService.createComment(articleId, text),
        onSuccess: () => {
            setContent('');
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
            queryClient.invalidateQueries({ queryKey: ['article'] });
            toast.success('تم إضافة تعليقك بنجاح');
        },
        onError: (error: any) => {
            if (error.response) {
                toast.error(`خطأ: ${error.response.data?.detail || 'فشل في إضافة التعليق'}`);
            } else if (error.request) {
                toast.error('لا يوجد استجابة من السيرفر. تأكد من اتصالك.');
            } else {
                toast.error(`خطأ: ${error.message}`);
            }
        }
    });

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();

        if (!articleId) {
            toast.error('خطأ برمجي: معرف المقال مفقود');
            return;
        }

        if (!content.trim()) {
            return;
        }

        mutation.mutate(content);
    };

    const authorId = articleAuthorId || '';

    return (
        <section className="space-y-10">
            <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-black italic">الأصداء ({comments?.length || 0})</h2>
            </div>

            {user ? (
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    <form onSubmit={handlePostComment} className="space-y-6">
                        <div className="relative group">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="ما رأيك في هذا العمل؟ شاركنا رؤيتك..."
                                className="w-full min-h-[160px] rounded-[2rem] bg-gray-50/50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-8 transition-all font-medium resize-none outline-none text-lg text-gray-700 placeholder:text-gray-400"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={mutation.isPending || !content.trim()}
                                className="group flex items-center gap-3 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                            >
                                {mutation.isPending ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                )}
                                إضافة تعليق
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-muted/30 rounded-[2rem] p-10 text-center space-y-4 border-2 border-dashed border-muted">
                    <p className="font-bold text-lg text-muted-foreground">يجب تسجيل الدخول للمشاركة في الحوار</p>
                    <button className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-primary/20">تسجيل الدخول</button>
                </div>
            )}

            <div className="space-y-6 max-h-[800px] overflow-y-auto pr-4 custom-scrollbar min-h-[300px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                        <p className="text-muted-foreground animate-pulse font-bold">جاري تحميل النقاشات...</p>
                    </div>
                ) : comments?.length === 0 ? (
                    <div className="text-center py-20 md:py-28 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 rounded-[2.5rem] border-2 border-dashed border-gray-200/80 relative overflow-hidden mx-auto w-full max-w-2xl">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
                        <div className="relative p-6">
                            <div className="mb-8 relative inline-block">
                                <MessageSquare className="w-16 h-16 md:w-24 md:h-24 mx-auto text-gray-300 animate-pulse" />
                                <div className="absolute inset-0 w-16 h-16 md:w-24 md:h-24 mx-auto bg-blue-400/10 rounded-full blur-2xl animate-pulse" />
                            </div>
                            <p className="text-gray-600 font-bold text-xl md:text-2xl mb-3">لا توجد أصداء بعد</p>
                            <p className="text-gray-400 font-medium text-sm md:text-base max-w-xs mx-auto leading-relaxed">كن أول من يشارك رؤيته ويترك بصمته في هذا المقال</p>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {comments?.map((comment: any) => (
                            <CommentItem key={comment.id} comment={comment} articleId={articleId} articleAuthorId={authorId} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};
