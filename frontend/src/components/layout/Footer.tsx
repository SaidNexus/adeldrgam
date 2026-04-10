import { Link } from 'react-router-dom';
import { Users, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { statsService } from '../../services/stats';

export const Footer = () => {
    const [visitorCount, setVisitorCount] = useState<number>(61125);

    useEffect(() => {
        // Fetch count
        const fetchStats = async () => {
            const count = await statsService.getVisitorCount();
            setVisitorCount(count);
        };
        fetchStats();
    }, []);

    return (
        <footer className="border-t border-[#e2e8f0] bg-white">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid gap-12 md:grid-cols-4">
                    <div className="space-y-6">
                        <Link to="/" className="text-3xl font-black text-blue-600 tracking-tighter">عادل ضرغام</Link>
                        <p className="text-gray-500 leading-relaxed font-medium">
                            رائدة المحتوى العربي الرقمي. منصتنا تجمع بين حكمة الفكر العربي المعاصر وأحدث أدوات التكنولوجيا الإبداعية.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-gray-900 font-bold">المنصة</h4>
                        <ul className="space-y-3">
                            {['عن عادل ضرغام', 'تصفح المقالات', 'الأقسام'].map((label, i) => (
                                <li key={i}>
                                    <Link to="#" className="text-gray-500 hover:text-blue-600 transition-colors">{label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-gray-900 font-bold">قانوني</h4>
                        <ul className="space-y-3">
                            {['شروط الاستخدام', 'سياسة الخصوصية', 'ملفات التعريف'].map((label, i) => (
                                <li key={i}>
                                    <Link to="#" className="text-gray-500 hover:text-blue-600 transition-colors">{label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-gray-900 font-bold">تواصل معنا</h4>
                        <a
                            href="mailto:drgham68@gmail.com"
                            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium"
                        >
                            <Mail className="h-4 w-4" />
                            drgham68@gmail.com
                        </a>
                        <p className="text-gray-500 leading-relaxed font-medium text-sm">
                            اشترك في نشرتنا الإخبارية ليصلك كل جديد في عالم الفكر العربي.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="بريدك الإلكتروني..."
                                className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm w-full outline-none focus:border-blue-500 ring-offset-2 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                            />
                            <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors">اشترك</button>
                        </div>
                    </div>
                </div>

                {/* Visitor Counter & Support - Perfectly Centered */}
                <div className="mt-12 pt-10 border-t border-[#e2e8f0] flex flex-col items-center gap-10">
                    <div className="flex items-center gap-4 bg-[#f8fafc] px-10 py-5 rounded-3xl border border-[#e2e8f0] w-fit shadow-sm">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center md:text-right">إحصائيات المنصة</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-[#0f172a] tabular-nums">
                                    {visitorCount.toLocaleString('en-US')}
                                </span>
                                <span className="text-xs font-bold text-gray-500">زائر</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">للتواصل المباشر</span>
                        <a
                            href="mailto:drgham68@gmail.com"
                            className="text-xl font-black text-[#0f172a] hover:text-blue-600 transition-colors flex items-center gap-3"
                        >
                            <div className="h-10 w-10 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
                                <Mail className="h-5 w-5" />
                            </div>
                            drgham68@gmail.com
                        </a>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-xs text-gray-400 font-medium">
                        © {new Date().getFullYear()} NABDH. Designed for the Arabic Mind.
                    </p>
                    <div className="flex gap-8">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Arabic</span>
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Technology</span>
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Culture</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

