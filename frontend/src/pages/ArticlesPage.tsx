import { useQuery } from '@tanstack/react-query';
import { articleService } from '../services/articles';
import { ArticleCard, ArticleSkeleton } from '../components/articles/ArticleCard';
import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Sparkles, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const ArticlesPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('الكل');

    const { data: categoriesData } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            try {
                return await articleService.getCategories();
            } catch (err) {
                console.warn('Failed to fetch categories, using fallbacks');
                return [];
            }
        },
        retry: 1
    });

    const categories = useMemo(() => {
        const virtualFilters = ["عادل ضرغام", "كتاب آخرون"];
        if (!categoriesData || categoriesData.length === 0) {
            return ['الكل', ...virtualFilters, "الرواية", "الشعر", "القصة القصيرة", "حوارات"];
        }
        const categoryNames = categoriesData.map(c => c.name_ar);
        const filteredCategoryNames = categoryNames.filter(name => !virtualFilters.includes(name));
        return ['الكل', ...virtualFilters, ...filteredCategoryNames];
    }, [categoriesData]);

    useEffect(() => {
        const authorIdParam = searchParams.get('author_id');
        const authorType = searchParams.get('author_type');
        const categoryParam = searchParams.get('category');

        if (authorIdParam === 'dc7bc849-727d-48af-9274-18f74bf243d8') {
            setSelectedCategory('عادل ضرغام');
        } else if (authorType === 'others') {
            setSelectedCategory('كتاب آخرون');
        } else if (categoryParam) {
            // Find category by slug
            const cat = categoriesData?.find(c => c.slug === categoryParam);
            if (cat) {
                setSelectedCategory(cat.name_ar);
            } else {
                // Fallback for names if slug not matched or for static filters
                setSelectedCategory(categoryParam);
            }
        } else {
            setSelectedCategory('الكل');
        }
    }, [searchParams, categoriesData]);

    const handleCategoryChange = (cat: string) => {
        if (cat === 'عادل ضرغام') setSearchParams({ author_id: 'dc7bc849-727d-48af-9274-18f74bf243d8' });
        else if (cat === 'كتاب آخرون') setSearchParams({ author_type: 'others' });
        else if (cat === 'الكل') setSearchParams({});
        else {
            const catObj = categoriesData?.find(c => c.name_ar === cat);
            if (catObj) {
                setSearchParams({ category: catObj.slug });
            } else {
                setSearchParams({ category: cat });
            }
        }
    };

    const activeCategoryObj = useMemo(() => {
        return categoriesData?.find(c => c.name_ar === selectedCategory);
    }, [categoriesData, selectedCategory]);

    const { data: articles, isLoading, error: articlesError } = useQuery({
        queryKey: ['articles', selectedCategory, activeCategoryObj?.id],
        queryFn: () => {
            const params: any = { status: 'published' };
            if (selectedCategory === "كتاب آخرون") {
                params.author_type = 'others';
            } else if (selectedCategory === "عادل ضرغام") {
                params.author_id = 'dc7bc849-727d-48af-9274-18f74bf243d8';
            } else if (activeCategoryObj) {
                params.category_id = activeCategoryObj.id;
            } else if (selectedCategory !== "الكل") {
                const slug = selectedCategory.toLowerCase().trim()
                    .replace(/[\s\W_]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                params.category_slug = slug;
            }
            return articleService.getArticles(params);
        },
    });

    const filteredArticles = useMemo(() => {
        if (!articles) return [];
        return articles.filter(article =>
            (article.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
        );
    }, [articles, searchQuery]);

    return (
        <div className="bg-gray-50 min-h-screen selection:bg-blue-100 selection:text-blue-900">
            {/* Header Section */}
            <header className="py-24 md:py-32 border-b border-gray-200 bg-white overflow-hidden relative">
                <div className="container-centered relative z-10">
                    <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-6 max-w-3xl">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-wider"
                            >
                                <Sparkles className="h-4 w-4" />
                                Knowledge Catalog
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 leading-tight"
                            >
                                سجل <span className="text-gray-400 italic">المعرفة</span> العربي
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-xl md:text-2xl text-gray-500 font-medium leading-relaxed"
                            >
                                اكتشف عالماً من الأفكار والرؤى التي يشكلها نخبة من الكتاب والمفكرين العرب.
                            </motion.p>
                        </div>

                        {/* Search & Filter Controls */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto"
                        >
                            <div className="relative group w-full sm:w-96">
                                <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="ابحث عن جوهر الفكرة..."
                                    className="w-full h-16 bg-gray-50 border border-gray-200 rounded-2xl ps-14 pe-8 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-gray-900 font-bold text-lg placeholder:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="h-16 w-16 flex items-center justify-center bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:text-blue-600 transition-all active:scale-95 text-gray-400 group">
                                <SlidersHorizontal className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
                            </button>
                        </motion.div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="mt-16 pt-8 border-t border-gray-100 overflow-hidden">
                        <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => handleCategoryChange(cat)}
                                    className={`flex-shrink-0 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 border shadow-sm active:scale-95 uppercase tracking-wide ${selectedCategory === cat
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Articles Grid Section */}
            <section className="py-24 min-h-[500px]">
                <div className="container-centered">
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {Array(6).fill(0).map((_, i) => <ArticleSkeleton key={i} />)}
                        </div>
                    ) : articlesError ? (
                        <div className="max-w-2xl mx-auto text-center py-20 bg-white border border-red-200 rounded-[2.5rem] space-y-8 shadow-sm">
                            <div className="h-20 w-20 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto border border-red-100">
                                <Filter className="h-10 w-10" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-gray-900">انقطع الاتصال المعرفي</h2>
                                <p className="text-gray-500 font-medium text-lg italic">"لا تحزن، قد تكون هذه فرصة للتأمل العابر قبل المحاولة مرة أخرى."</p>
                            </div>
                            <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/10 transition-all active:scale-95">إعادة الاتصال</button>
                        </div>
                    ) : filteredArticles.length === 0 ? (
                        <div className="max-w-2xl mx-auto text-center py-24 bg-white border border-gray-200 border-dashed rounded-[2.5rem] space-y-8">
                            <div className="h-20 w-20 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto border border-gray-100">
                                <Search className="h-10 w-10" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-gray-900">لم نعثر على " {searchQuery} "</h2>
                                <p className="text-gray-500 font-medium text-lg leading-relaxed max-w-sm mx-auto">ربما الفكرة لم تُكتب بعد، أو أنها تتخفى خلف كلمات أخرى.</p>
                            </div>
                            <button onClick={() => { setSearchQuery(''); handleCategoryChange('الكل'); }} className="text-blue-600 font-bold text-lg hover:underline underline-offset-8">تنظيف الفلاتر والبدء من جديد</button>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
                        >
                            {filteredArticles.map((article) => (
                                <ArticleCard key={article.id} article={article} />
                            ))}
                        </motion.div>
                    )}

                    {/* Go back bottom link */}
                    {!isLoading && filteredArticles.length > 0 && (
                        <div className="mt-20 pt-16 border-t border-gray-200 flex justify-center">
                            <Link to="/" className="inline-flex items-center gap-3 text-gray-400 hover:text-gray-900 font-bold text-lg transition-all group">
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-[-4px] transition-transform" />
                                العودة للقائمة الرئيسية
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
