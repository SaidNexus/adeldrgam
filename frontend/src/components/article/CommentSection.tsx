import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articleService } from '@/services/articles';
import { useAuthStore } from '@/store/useAuthStore';
import { CommentItem } from './CommentItem';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

interface CommentSectionProps {
    articleId: string;
}

export const CommentSection = ({ articleId }: CommentSectionProps) => {
    const [content, setContent] = useState('');
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    const { data: comments, isLoading } = useQuery({
        queryKey: ['comments', articleId],
        queryFn: () => articleService.getComments(articleId),
    });

    // Need article author ID for delete permissions
    const { data: article } = useQuery({
        queryKey: ['article'],
        queryFn: () => queryClient.getQueryData(['article']) as any,
        enabled: !!queryClient.getQueryData(['article'])
    });

    const mutation = useMutation({
        mutationFn: (text: string) => articleService.createComment(articleId, text),
        onSuccess: () => {
            setContent('');
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
            queryClient.invalidateQueries({ queryKey: ['article'] });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        mutation.mutate(content);
    };

    const authorId = article?.author_id || '';

    return (
        <section className="space-y-10 pt-10 border-t">
            <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-black italic">الأصداء ({comments?.length || 0})</h2>
            </div>

            {user ? (
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="ما رأيك في هذا العمل؟ شاركنا رؤيتك..."
                        className="w-full min-h-[120px] rounded-[2rem] bg-muted/50 border-2 border-transparent focus:border-primary/30 p-6 pr-6 transition-all font-medium resize-none outline-none"
                    />
                    <button
                        type="submit"
                        disabled={mutation.isPending || !content.trim()}
                        className="absolute bottom-4 left-4 flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        إرسال
                    </button>
                </form>
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
                    <div className="text-center py-20 bg-muted/10 rounded-[2rem] border-2 border-dashed border-muted/30">
                        <div className="mb-4 opacity-20">
                            <MessageSquare className="w-16 h-16 mx-auto" />
                        </div>
                        <p className="text-muted-foreground font-bold italic text-lg">لا توجد أصداء بعد. كن أول من يضع رؤيته!</p>
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
