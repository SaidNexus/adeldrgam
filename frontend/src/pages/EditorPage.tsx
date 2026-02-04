import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { articleService } from '@/services/articles';
import {
    ImageIcon, Loader2,
    CheckCircle2, AlertCircle, Eye, Layout,
    ChevronRight, Clock, Hash, Trash2, X,
    Settings as SettingsIcon, ChevronDown, Sparkles
} from 'lucide-react';

import { useImagePreviewUpload } from '@/hooks/useImagePreviewUpload';
import { motion, AnimatePresence } from 'framer-motion';

export const EditorPage = () => {
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState<any>(null);
    const [excerpt, setExcerpt] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const [initialImageUrl, setInitialImageUrl] = useState<string | null>(null);
    const [initialPublicId, setInitialPublicId] = useState<string | null>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEditMode);
    const [categories, setCategories] = useState<any[]>([]);
    const [slug, setSlug] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const {
        previewUrl,
        isUploading,
        handleFileSelect,
        clearSelection,
        upload,
        setPreviewUrl
    } = useImagePreviewUpload();

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        if (!isEditMode && title.trim()) {
            const timer = setTimeout(() => {
                const generated = title.toLowerCase().trim()
                    .replace(/[\s\W_]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                setSlug(generated);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [title, isEditMode]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const cats = await articleService.getCategories();
                setCategories(cats);

                if (isEditMode) {
                    const article = await articleService.getArticleById(id!);
                    if (article) {
                        setTitle(article.title);
                        setContent(article.content);
                        setExcerpt(article.excerpt || '');
                        setCategoryId(article.category_id || '');
                        if (article.featured_image_url) {
                            setInitialImageUrl(article.featured_image_url);
                            setInitialPublicId(article.cover_public_id || null);
                            setPreviewUrl(article.featured_image_url);
                        }
                    } else {
                        setError('المقال غير موجود');
                    }
                } else {
                    const savedTitle = localStorage.getItem('article_draft_title');
                    const savedContent = localStorage.getItem('article_draft_content');
                    const savedExcerpt = localStorage.getItem('article_draft_excerpt');
                    if (savedTitle) setTitle(savedTitle);
                    if (savedContent) {
                        try { setContent(JSON.parse(savedContent)); } catch { setContent(null); }
                    }
                    if (savedExcerpt) setExcerpt(savedExcerpt);
                }

                if (!cats || cats.length === 0) {
                    setError('لم يتم تحميل أقسام المقالات. يرجى التواصل مع الدعم الفني.');
                }
            } catch (err) {
                setError('فشل في تحميل بيانات المحرر');
            } finally {
                setLoading(false);
                setIsDirty(false);
            }
        };

        loadInitialData();
    }, [id, isEditMode]);

    useEffect(() => {
        setIsDirty(true);
    }, [title, content, excerpt, categoryId, previewUrl]);

    useEffect(() => {
        if (loading) return;

        const timer = setInterval(() => {
            if (isDirty && title.trim()) {
                if (!isEditMode) {
                    localStorage.setItem('article_draft_title', title);
                    localStorage.setItem('article_draft_excerpt', excerpt);
                    if (content) localStorage.setItem('article_draft_content', JSON.stringify(content));
                }
                setLastSaved(new Date());
            }
        }, 10000);

        return () => clearInterval(timer);
    }, [title, content, excerpt, isDirty, isEditMode, loading]);

    const handleSave = async (targetStatus: 'draft' | 'published') => {
        if (!title.trim()) {
            setError('يرجى إدخال عنوان للمقال');
            return;
        }
        if (!categoryId) {
            setError('يرجى اختيار قسم للمقال');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            let featured_image_url = previewUrl === initialImageUrl ? initialImageUrl : undefined;
            let cover_public_id = previewUrl === initialImageUrl ? initialPublicId : undefined;

            if (previewUrl && previewUrl !== initialImageUrl && !previewUrl.startsWith('http')) {
                const result = await upload('/upload');
                featured_image_url = result.url;
                cover_public_id = result.public_id;
            } else if (!previewUrl) {
                featured_image_url = null as any;
                cover_public_id = null as any;
            }

            const articleData = {
                title,
                slug: slug || title.replace(/\s+/g, '-').toLowerCase(),
                content,
                excerpt,
                featured_image_url: featured_image_url || undefined,
                cover_public_id: cover_public_id || undefined,
                status: targetStatus,
                category_id: categoryId || undefined
            };

            const data = isEditMode
                ? await articleService.updateArticle(id!, articleData)
                : await articleService.createArticle(articleData);

            queryClient.invalidateQueries({ queryKey: ['articles'] });
            queryClient.invalidateQueries({ queryKey: ['article'] });

            setIsDirty(false);
            setLastSaved(new Date());

            if (!isEditMode) {
                localStorage.removeItem('article_draft_title');
                localStorage.removeItem('article_draft_content');
                localStorage.removeItem('article_draft_excerpt');
            }

            setSuccess(targetStatus === 'published' ? 'تم نشر المقال بنجاح' : 'تم حفظ التغييرات');
            setTimeout(() => {
                navigate(`/articles/${data.slug}`);
            }, 1500);
        } catch (error: any) {
            setError(error.response?.data?.detail || error.message || 'حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4 bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-gray-500 font-bold">جاري تحميل البيانات...</p>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            {/* STICKY HEADER ACTIONS */}
            <div className="sticky top-0 z-[60] w-full bg-white/70 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col">
                            <h2 className="text-sm font-black text-gray-900 leading-tight">
                                {isEditMode ? 'تعديل المسودة' : 'إنشاء مقال جديد'}
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className={`h-1.5 w-1.5 rounded-full ${isDirty ? 'bg-blue-600 animate-pulse' : 'bg-green-500'}`} />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {lastSaved ? `تم الحفظ: ${lastSaved.toLocaleTimeString('ar-EG')}` : 'جاري المزامنة...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsPreviewModalOpen(true)}
                            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="معاينة"
                        >
                            <Eye className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className={`p-3 rounded-xl transition-all flex items-center gap-2 font-bold text-sm ${isSettingsOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            <SettingsIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">الإعدادات</span>
                        </button>

                        <div className="h-6 w-px bg-gray-100 mx-2" />

                        <button
                            onClick={() => handleSave('draft')}
                            disabled={saving || !isDirty}
                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ كمسودة'}
                        </button>
                        <button
                            onClick={() => handleSave('published')}
                            disabled={saving || !title.trim() || !categoryId}
                            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'نشر الآن'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-16">
                <main className="space-y-12">
                    {/* TITLE AREA */}
                    <div className="space-y-6">
                        <textarea
                            placeholder="ضع هنا عنواناً يلهم القراء..."
                            maxLength={100}
                            className="w-full bg-transparent text-5xl md:text-6xl font-black border-none focus:ring-0 resize-none h-auto min-h-[140px] placeholder:text-gray-100 leading-[1.1] tracking-tight text-gray-900 outline-none p-0"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-300 uppercase tracking-widest pb-4 border-b border-gray-50">
                            <Sparkles className="w-4 h-4 text-blue-600/30" />
                            <span>حرر المقال بلمستك الإبداعية</span>
                            <span className="ms-auto">{title.length}/100</span>
                        </div>
                    </div>

                    {/* FEATURED IMAGE */}
                    <div className="group relative">
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files[0];
                                if (file) {
                                    const event = { target: { files: [file] } } as any;
                                    handleFileSelect(event);
                                }
                            }}
                            className={`aspect-video w-full rounded-[2.5rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden
                                ${previewUrl ? 'border-transparent bg-white shadow-xl' : 'border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/30'}`}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Cover" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-white text-gray-900 px-8 py-3 rounded-2xl font-black shadow-2xl hover:scale-105 transition-transform"
                                        >
                                            تغيير الصورة
                                        </button>
                                        <button
                                            onClick={clearSelection}
                                            className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl hover:scale-105 transition-transform"
                                        >
                                            <Trash2 className="h-6 w-6" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-6 p-12 text-center">
                                    <div className="h-20 w-20 rounded-3xl bg-white border border-gray-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                        <ImageIcon className="h-10 w-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-gray-900">أضف غلافاً للمقال</p>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">DRAG AND DROP OR CLICK TO UPLOAD</p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                            )}

                            {isUploading && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center gap-4 z-20">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    >
                                        <Loader2 className="w-12 h-12 text-blue-600" />
                                    </motion.div>
                                    <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Processing Creative Asset...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CORE EDITOR */}
                    <div className="prose-editor-container">
                        <RichTextEditor
                            content={content}
                            onChange={(val) => {
                                setContent(val);
                                setIsDirty(true);
                            }}
                            placeholder="ابدأ بسرد ملامح قصتك هنا..."
                        />
                    </div>
                </main>
            </div>

            {/* SETTINGS SIDEBAR (COLLAPSIBLE) */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSettingsOpen(false)}
                            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[70]"
                        />
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[80] overflow-y-auto border-l border-gray-100 p-8"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-2xl font-black text-gray-900">إعدادات المقال</h3>
                                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                                        <Layout className="w-4 h-4 text-blue-600" />
                                        تصنيف المقال
                                    </label>
                                    <div className="relative group">
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-base appearance-none cursor-pointer"
                                        >
                                            <option value="">اختر القسم...</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name_ar}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform group-hover:translate-y-[-2px]" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                                        <Hash className="w-4 h-4 text-blue-600" />
                                        المخلص (Meta Excerpt)
                                    </label>
                                    <textarea
                                        placeholder="اكتب وصفاً قصيراً لنتائج البحث..."
                                        maxLength={250}
                                        className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-600 leading-relaxed resize-none h-40"
                                        value={excerpt}
                                        onChange={(e) => setExcerpt(e.target.value)}
                                    />
                                    <p className="text-[10px] text-gray-300 font-bold text-center">أقصى طول: 250 حرف</p>
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <div className="bg-blue-50 rounded-2xl p-6 space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            معلومات النشر
                                        </div>
                                        <p className="text-xs font-bold text-blue-900/70 leading-relaxed">
                                            بمجرد النشر، سيتم إدراج مقالك في الصفحة الرئيسية وإتاحته للقراء في قسم {categories.find(c => c.id === categoryId)?.name_ar || 'الأقسام العامة'}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isPreviewModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPreviewModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-50 bg-gray-50/50">
                                <span className="text-sm font-bold text-gray-500">معاينة المقال</span>
                                <button
                                    onClick={() => setIsPreviewModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="p-10 md:p-20 overflow-y-auto max-h-[calc(90vh-64px)] text-right" dir="rtl">
                                <article className="prose prose-xl prose-blue max-w-none">
                                    <div className="flex items-center gap-3 mb-10">
                                        <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold">
                                            {categories.find(c => c.id === categoryId)?.name_ar || 'بدون قسم'}
                                        </span>
                                    </div>
                                    <h1 className="text-4xl md:text-6xl font-black leading-tight text-gray-900 mb-10">
                                        {title || 'عنوان المقال'}
                                    </h1>
                                    {previewUrl && (
                                        <div className="w-full aspect-video overflow-hidden rounded-[2rem] shadow-sm mb-12 border border-white">
                                            <img src={previewUrl} alt="Featured" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: content?.html || (typeof content === 'string' ? content : '')
                                        }}
                                    />
                                </article>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-gray-900 text-white p-5 rounded-2xl shadow-xl flex items-center gap-4 pointer-events-auto"
                        >
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            <span className="font-bold">{success}</span>
                        </motion.div>
                    )}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-red-600 text-white p-5 rounded-2xl shadow-xl flex items-center gap-4 pointer-events-auto"
                        >
                            <AlertCircle className="w-6 h-6" />
                            <span className="font-bold">{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
