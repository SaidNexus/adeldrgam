import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import {
    Users, Search, User, Plus, CheckCircle2, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDebounce } from '../hooks/useDebounce';

export const AuthorsPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: currentUser, isAuthenticated } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 400);

    const { data: authors, isLoading, error } = useQuery({
        queryKey: ['authors', debouncedSearch],
        queryFn: () => userService.getProfiles(debouncedSearch),
    });

    // Follow Mutation
    const followMutation = useMutation({
        mutationFn: (authorId: string) => userService.toggleFollow(authorId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['authors'] });
        }
    });

    const handleFollow = (e: React.MouseEvent, authorId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        followMutation.mutate(authorId);
    };

    return (
        <div className="bg-gray-50 min-h-screen pt-24 pb-32 selection:bg-blue-100 selection:text-blue-900 font-almarai">
            <div className="container-centered max-w-7xl mx-auto px-6">

                {/* Header Section */}
                <header className="mb-20 space-y-8">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12">
                        <div className="space-y-6 max-w-3xl">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]"
                            >
                                <Sparkles className="h-4 w-4" />
                                Authors Community
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 leading-tight"
                            >
                                مجتمع <span className="text-gray-400 italic">المبدعين</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-xl md:text-2xl text-gray-400 font-medium leading-relaxed max-w-2xl"
                            >
                                التقي بالعقول التي تثري المحتوى العربي، وتابع أقلامك المفضلة لتصلك أحدث كتاباتهم.
                            </motion.p>
                        </div>

                        {/* Search Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative group w-full lg:w-96"
                        >
                            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="ابحث عن كاتب..."
                                className="w-full h-16 bg-white border border-gray-100 rounded-2xl ps-14 pe-8 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-gray-900 font-bold text-lg placeholder:text-gray-300"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </motion.div>
                    </div>
                </header>

                {/* Authors Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array(6).fill(0).map((_, i) => <AuthorSkeleton key={i} />)}
                    </div>
                ) : error ? (
                    <div className="py-24 text-center bg-white rounded-[3rem] border border-red-100 space-y-4 shadow-sm">
                        <div className="h-20 w-20 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
                            <Users className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">حدث خطأ أثناء تحميل البيانات</h2>
                        <button onClick={() => window.location.reload()} className="text-blue-600 font-bold hover:underline">إعادة المحاولة</button>
                    </div>
                ) : authors?.length === 0 ? (
                    <div className="py-24 text-center bg-white rounded-[3rem] border border-gray-100 border-dashed space-y-6">
                        <div className="h-20 w-20 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mx-auto border border-gray-100">
                            <Search className="h-10 w-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-gray-900">لم نعثر على هذا المبدع</h2>
                            <p className="text-gray-400 font-medium italic">تأكد من كتابة الاسم بشكل صحيح أو جرب كلمات أخرى.</p>
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {authors?.map((author) => (
                            <AuthorCard
                                key={author.id}
                                author={author}
                                onFollow={(e) => handleFollow(e, author.id)}
                                isFollowing={author.is_following}
                                isMe={currentUser?.id === author.id}
                            />
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const AuthorCard = ({ author, onFollow, isFollowing, isMe }: { author: any, onFollow: (e: any) => void, isFollowing?: boolean, isMe: boolean }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -8 }}
            className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all group relative overflow-hidden"
        >
            <Link to={`/profile/${author.id}`} className="absolute inset-0 z-0" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                {/* Avatar */}
                <Link to={`/profile/${author.id}`} className="relative block group">
                    <div className="h-32 w-32 rounded-[2rem] bg-gray-50 border border-gray-100 p-1.5 overflow-hidden group-hover:border-blue-200 transition-all duration-300">
                        <div className="w-full h-full rounded-[1.5rem] overflow-hidden bg-white border border-gray-50">
                            {author.avatar_url ? (
                                <img src={author.avatar_url} alt={author.username} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-200">
                                    <User className="h-12 w-12" />
                                </div>
                            )}
                        </div>
                    </div>
                    {author.role === 'admin' && (
                        <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-blue-600 text-white rounded-xl flex items-center justify-center border-4 border-white shadow-lg z-20">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    )}
                </Link>

                {/* Info */}
                <div className="space-y-2 w-full">
                    <Link to={`/profile/${author.id}`}>
                        <h3 className="text-2xl font-black text-gray-900 hover:text-blue-600 transition-colors truncate px-2">
                            {author.full_name || author.username}
                        </h3>
                    </Link>
                    <p className="text-gray-400 font-bold font-mono text-sm inline-block px-3 py-1 bg-gray-50 rounded-full">@{author.username}</p>
                    {author.bio ? (
                        <p className="text-gray-500 text-sm font-medium line-clamp-2 mt-4 leading-relaxed min-h-[40px] italic px-4">
                            "{author.bio}"
                        </p>
                    ) : (
                        <p className="text-gray-300 text-sm font-medium italic mt-4 leading-relaxed min-h-[40px]">لم يكتب نبذة شخصية بعد...</p>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-gray-50">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">المتابعين</p>
                        <p className="text-lg font-black text-gray-900">{author.followers_count || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">المقالات</p>
                        <p className="text-lg font-black text-gray-900">{author.articles_count || 0}</p>
                    </div>
                </div>

                {/* Action */}
                {!isMe && (
                    <button
                        onClick={onFollow}
                        className={`w-full h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-3 active:scale-95 ${isFollowing
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
                            }`}
                    >
                        {isFollowing ? (
                            <>
                                <CheckCircle2 className="h-5 w-5" />
                                متابع
                            </>
                        ) : (
                            <>
                                <Plus className="h-5 w-5" />
                                متابعة
                            </>
                        )}
                    </button>
                )}
                {isMe && (
                    <Link
                        to="/profile"
                        className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-gray-900/20 hover:bg-black transition-all"
                    >
                        ملفي الشخصي
                    </Link>
                )}
            </div>
        </motion.div>
    );
};

const AuthorSkeleton = () => (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm animate-pulse space-y-6">
        <div className="h-32 w-32 bg-gray-100 rounded-[2rem] mx-auto" />
        <div className="space-y-3">
            <div className="h-6 bg-gray-100 rounded-full w-2/3 mx-auto" />
            <div className="h-4 bg-gray-50 rounded-full w-1/3 mx-auto" />
        </div>
        <div className="h-12 bg-gray-100 rounded-2xl w-full" />
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
            <div className="h-10 bg-gray-50 rounded-xl" />
            <div className="h-10 bg-gray-50 rounded-xl" />
        </div>
        <div className="h-14 bg-gray-100 rounded-2xl w-full" />
    </div>
);
