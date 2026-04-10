/**
 * ============================================================
 * NABDH PAGE TEMPLATE (LIGHT MODE)
 * ============================================================
 * 
 * This is the standard template for all pages in the Nabdh
 * application. Follow this structure exactly.
 * 
 * CRITICAL LAYOUT RULES:
 * 
 * 1. Root wrapper: bg-white or bg-gray-50 min-h-screen
 * 2. Each section: py-20 md:py-32 border-b border-gray-100
 * 3. Content container: max-w-7xl mx-auto px-6
 * 4. Typography: text-gray-900 for titles, text-gray-500 for secondary
 * 5. Accents: blue-600 for primary actions and highlights
 * 
 * ============================================================
 */

import { Sparkles, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const TemplatePage = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-gray-50 min-h-screen selection:bg-blue-100 selection:text-blue-900">
            {/* ============================================================
                HEADER SECTION
                - Full-width with white background
                - Contains page title, subtitle, and actions
                ============================================================ */}
            <header className="py-24 md:py-32 border-b border-gray-200 bg-white relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -ml-32 -mt-32" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-10">
                    <div className="space-y-6">
                        {/* Section Tag */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest"
                        >
                            <Sparkles className="h-4 w-4" />
                            Creative Hub
                        </motion.div>

                        {/* Page Title */}
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-tight">
                            عنوان الصفحة
                        </h1>

                        {/* Page Description */}
                        <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl leading-relaxed italic">
                            وصف موجز للصفحة يشرح محتواها والغرض منها بشكل واضح ومختصر، مع لمسة إبداعية.
                        </p>
                    </div>

                    {/* Header Actions */}
                    <button
                        onClick={() => navigate(-1)}
                        className="h-16 px-10 bg-white border border-gray-200 rounded-2xl text-gray-500 font-bold hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm flex items-center gap-3 active:scale-95"
                    >
                        <ChevronLeft className="h-6 w-6" />
                        تراجع
                    </button>
                </div>
            </header>

            {/* ============================================================
                CONTENT SECTION 1
                - Main content area
                ============================================================ */}
            <section className="py-24 md:py-32">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Your content here */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {/* Content cards, forms, or other components */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 border border-gray-100">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">عنصر المحتوى</h3>
                            <p className="text-gray-500 font-medium leading-relaxed italic">
                                وصف للعنصر أو المحتوى الموجود داخل هذه البطاقة بشكل بسيط وجذاب.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ============================================================
                FOOTER SECTION (Optional)
                - Final summary section
                ============================================================ */}
            <section className="py-32 border-t border-gray-100 bg-white/50">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
                    <p className="text-xl md:text-2xl font-medium text-gray-400 italic leading-relaxed max-w-2xl mx-auto">
                        "اقتباس أو رسالة ختامية للصفحة تلخص الفكرة الرئيسية وتترك أثراً في نفس القارئ."
                    </p>
                    <div className="h-px w-24 bg-gray-200 mx-auto" />
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest ">
                        NABDH PLATFORM • ECOSYSTEM DESIGN
                    </p>
                </div>
            </section>
        </div>
    );
};
