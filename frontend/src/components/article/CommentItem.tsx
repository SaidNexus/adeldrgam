import { useState, memo } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { articleService } from '@/services/articles';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate } from '@/lib/utils';
import { Reply, Send, Loader2, Edit, Trash2, X } from 'lucide-react';
import type { Comment } from '@/types/article';

interface CommentItemProps {
    comment: Comment;
    articleId: string;
    articleAuthorId: string;
}

export const CommentItem = memo(({ comment, articleId, articleAuthorId }: CommentItemProps) => {
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
            toast.success('تم إضافة الرد بنجاح');
        },
        onError: (error: any) => {
            console.error('Reply submission error:', error);
            const detail = error.response?.data?.detail || 'فشل إضافة الرد';
            toast.error(detail);
        }
    });

    const editMutation = useMutation({
        mutationFn: (text: string) => articleService.updateComment(comment.id, text),
        onSuccess: () => {
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
            toast.success('تم تعديل التعليق');
        },
        onError: (error: any) => {
            console.error('Comment edit error:', error);
            const detail = error.response?.data?.detail || 'فشل تعديل التعليق';
            toast.error(detail);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: () => articleService.deleteComment(comment.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
            queryClient.invalidateQueries({ queryKey: ['article'] });
            toast.success('تم حذف التعليق');
        },
        onError: (error: any) => {
            console.error('Comment delete error:', error);
            const detail = error.response?.data?.detail || 'فشل حذف التعليق';
            toast.error(detail);
        }
    });

    const handlePostReply = (e: React.FormEvent) => {
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
        <div className="group bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 mb-8 last:mb-0">
            <div className="flex gap-6">
                {/* Circular Avatar on the Left */}
                <div className="h-14 w-14 rounded-full bg-blue-50 border-2 border-white shrink-0 overflow-hidden shadow-sm ring-1 ring-gray-100">
                    {comment.user?.avatar_url ? (
                        <img src={comment.user.avatar_url} alt={comment.user.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-300 font-black text-xl">
                            {comment.user?.username?.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-4">
                    {/* Header: Name and Date */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <span className="font-black text-gray-900 text-lg leading-none">
                                {comment.user?.full_name || comment.user?.username}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">@{comment.user?.username}</span>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                            {formatDate(comment.created_at)}
                        </span>
                    </div>

                    {/* Body: Comment Content */}
                    {isEditing ? (
                        <form onSubmit={handleEdit} className="relative mt-2">
                            <textarea
                                autoFocus
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full min-h-[120px] rounded-2xl bg-gray-50 border-2 border-blue-500 p-6 text-base font-medium outline-none focus:bg-white transition-all"
                            />
                            <div className="flex gap-2 mt-3 justify-end">
                                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-400 hover:text-gray-900 font-bold transition-all">إلغاء</button>
                                <button type="submit" disabled={editMutation.isPending} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50">
                                    {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التعديل'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className={`text-gray-700 text-lg leading-relaxed font-medium ${comment.is_deleted ? 'italic opacity-40' : ''}`}>
                            {comment.content}
                        </div>
                    )}

                    {/* Footer: Actions */}
                    <div className="flex items-center gap-6 pt-2">
                        {currentUser && !comment.is_deleted && (
                            <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-blue-600 transition-all group/btn">
                                <Reply className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
                                <span>رد</span>
                            </button>
                        )}
                        {canEdit && (
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-blue-600 transition-all">
                                <Edit className="w-4 h-4" />
                                <span>تعديل</span>
                            </button>
                        )}
                        {canDelete && (
                            <button onClick={handleDelete} className="flex items-center gap-2 text-xs font-black text-gray-300 hover:text-red-500 transition-all">
                                <Trash2 className="w-4 h-4" />
                                <span>حذف</span>
                            </button>
                        )}
                    </div>

                    {/* Reply Form */}
                    {isReplying && (
                        <form onSubmit={handlePostReply} className="mt-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`الرد على ${comment.user?.username}...`}
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-xl px-5 py-3 text-sm font-medium transition-all outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={replyMutation.isPending || !replyContent.trim()}
                                    className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-100 transition-all"
                                >
                                    {replyMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsReplying(false); setReplyContent(''); }}
                                    className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-8 space-y-8 pl-0 pr-4 sm:pr-8 border-r-2 border-gray-50">
                            {comment.replies.map((reply: any) => (
                                <CommentItem key={reply.id} comment={reply} articleId={articleId} articleAuthorId={articleAuthorId} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
