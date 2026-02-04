import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { articleService } from '../services/articles';
import { ArticleCard, ArticleSkeleton } from '../components/articles/ArticleCard';
import { Search, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../lib/motion';

export const SearchPage = () => {
    const [query, setQuery] = useState('');

    const { data: articles, isLoading } = useQuery({
        queryKey: ['search-articles', query],
        queryFn: () => articleService.getArticles(),
        enabled: true,
    });

    const filteredArticles = articles?.filter(a =>
        a.title.includes(query) || a.excerpt?.includes(query)
    );

    return (
        <div className="bg-gray-50 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto px-6 space-y-20">
                <div className="max-w-3xl mx-auto space-y-10 relative pt-16">
                    <div className="text-center space-y-3">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-tight">ابحث في نبض</h1>
                        <p className="text-gray-500 text-lg font-medium">اكتشف آلاف المقالات والأفكار المبدعة في متناول يدك</p>
                    </div>

                    <div className="relative group">
                        <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="ماذا تريد أن تتعلم اليوم؟"
                            className="w-full h-18 bg-white border border-gray-200 rounded-[2rem] pe-16 ps-8 text-xl text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-sm"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex gap-2">
                            {['كل النتائج', 'مقالات'].map((tab) => (
                                <button
                                    key={tab}
                                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'كل النتائج' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-gray-400 hover:text-blue-600'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-blue-600 transition-all font-bold text-xs">
                            <SlidersHorizontal className="h-4 w-4" />
                            تصفية متقدمة
                        </button>
                    </div>
                </div>

                <div className="space-y-12">
                    <div className="flex items-center gap-6">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight shrink-0">
                            {query ? `نتائج البحث عن "${query}"` : 'مقالات مقترحة'}
                        </h2>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {isLoading ? (
                        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                            {Array(3).fill(0).map((_, i) => <ArticleSkeleton key={i} />)}
                        </div>
                    ) : filteredArticles?.length === 0 ? (
                        <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200 flex flex-col items-center justify-center space-y-8 shadow-sm">
                            <div className="h-24 w-24 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 border border-gray-100">
                                <Search className="h-10 w-10" />
                            </div>
                            <div className="space-y-3">
                                <p className="text-2xl font-black text-gray-900">لم نجد أي نتائج لـ "{query}"</p>
                                <p className="text-gray-500 font-medium italic">جرب الكلمات الأكثر شيوعاً أو تصفح الأقسام.</p>
                            </div>
                            <button
                                onClick={() => setQuery('')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                            >
                                عرض جميع المقالات
                            </button>
                        </div>
                    ) : (
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            whileInView="animate"
                            viewport={{ once: true }}
                            className="grid gap-10 md:grid-cols-2 lg:grid-cols-3"
                        >
                            {filteredArticles?.map((article) => (
                                <motion.div key={article.id} variants={staggerItem}>
                                    <ArticleCard article={article} />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};
