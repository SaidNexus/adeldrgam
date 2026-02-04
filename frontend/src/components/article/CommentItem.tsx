import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { articleService } from '@/services/articles';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate } from '@/lib/utils';
import { Reply, Send, Loader2, Edit, Trash2, X, Check } from 'lucide-react';
import type { Comment } from '@/types/article';

interface CommentItemProps {
    comment: Comment;
    articleId: string;
    articleAuthorId: string;
}

export const CommentItem = ({ comment, articleId, articleAuthorId }: CommentItemProps) => {
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [editContent, setEditContent] = useState(comment.content);

    const currentUser = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    const replyMutation = useMutation({
        mutationFn: (text: string) => articleService.createComment(articleId, text, comment.id),
        onSuccess: () => {
            setReplyContent('');
            setIsReplying(false);
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
            queryClient.invalidateQueries({ queryKey: ['article'] });
        },
    });

    const editMutation = useMutation({
        mutationFn: (text: string) => articleService.updateComment(comment.id, text),
        onSuccess: () => {
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => articleService.deleteComment(comment.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
            queryClient.invalidateQueries({ queryKey: ['article'] });
        },
    });

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        replyMutation.mutate(replyContent);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editContent.trim()) return;
        editMutation.mutate(editContent);
    };

    const handleDelete = () => {
        if (window.confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
            deleteMutation.mutate();
        }
    };

    // PERMISSION MATRIX:
    // - canEdit: ONLY Comment Owner
    // - canDelete: Comment Owner OR Article Author OR Admin
    const canEdit = currentUser?.id === comment.user_id && !comment.is_deleted;
    const canDelete = !comment.is_deleted && (
        currentUser?.id === comment.user_id ||
        currentUser?.id === articleAuthorId ||
        currentUser?.role === 'admin'
    );

    return (
        <div className="group animate-in fade-in slide-in-from-right-4">
            <div className="flex gap-4">
                <div className="h-12 w-12 rounded-2xl bg-muted border-2 border-primary/10 shrink-0 overflow-hidden shadow-sm">
                    {comment.user?.avatar_url && <img src={comment.user.avatar_url} alt={comment.user.username} className="w-full h-full object-cover" />}
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-black text-foreground">{comment.user?.full_name || comment.user?.username}</span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded uppercase tracking-tighter">@{comment.user?.username}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{formatDate(comment.created_at)}</span>
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleEdit} className="relative">
                            <textarea
                                autoFocus
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full min-h-[100px] rounded-2xl bg-background border-2 border-primary p-4 text-sm font-medium outline-none"
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                                <button type="button" onClick={() => setIsEditing(false)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                                <button type="submit" disabled={editMutation.isPending} className="bg-primary text-white p-2 rounded-xl">
                                    {editMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className={`rounded-2xl p-4 text-foreground/90 font-medium leading-relaxed border-2 border-background group-hover:border-primary/10 transition-colors ${comment.is_deleted ? 'bg-muted/20 italic opacity-50' : 'bg-muted/30'}`}>
                            {comment.content}
                        </div>
                    )}

                    <div className="flex items-center gap-6 px-2">
                        {currentUser && !comment.is_deleted && (
                            <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-primary transition-colors">
                                <Reply className="w-3.5 h-3.5" /> رد
                            </button>
                        )}
                        {canEdit && (
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-primary transition-colors">
                                <Edit className="w-3.5 h-3.5" /> تعديل
                            </button>
                        )}
                        {canDelete && (
                            <button onClick={handleDelete} className="flex items-center gap-2 text-xs font-black text-destructive hover:scale-110 transition-all">
                                <Trash2 className="w-3.5 h-3.5" /> حذف
                            </button>
                        )}
                    </div>

                    {isReplying && (
                        <form onSubmit={handleReply} className="mt-4 flex gap-2">
                            <div className="w-full relative">
                                <input
                                    autoFocus
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`الرد على ${comment.user?.username}...`}
                                    className="w-full bg-muted/50 border-2 border-transparent focus:border-primary/30 rounded-xl px-4 py-2 text-sm font-medium transition-all outline-none"
                                />
                                <button type="submit" disabled={replyMutation.isPending || !replyContent.trim()} className="absolute left-1 top-1 bg-primary text-white p-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                    {replyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </form>
                    )}

                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 pr-6 border-r-2 border-primary/10 space-y-6">
                            {comment.replies.map((reply: any) => (
                                <CommentItem key={reply.id} comment={reply} articleId={articleId} articleAuthorId={articleAuthorId} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
