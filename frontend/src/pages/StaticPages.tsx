import { PlaceholderPage } from './PlaceholderPage';
import { Info, Mail, FileText, ShieldCheck, Database, LayoutGrid } from 'lucide-react';

export const AboutPage = () => (
    <PlaceholderPage
        title="عن عادل ضرغام"
        description="نحن منصة تهدف إلى إثراء المحتوى العربي من خلال تقديم مقالات نوعية وتجربة قراءة وإبداع فريدة تدعم الكتاب والقراء العرب في كل مكان."
        icon={Info}
    />
);

export const ContactPage = () => (
    <PlaceholderPage
        title="اتصل بنا"
        description="لديك استفسار أو اقتراح؟ يسعدنا دائماً التواصل معك. فريقنا جاهز للرد على رسائلك."
        icon={Mail}
    />
);

export const TermsPage = () => (
    <PlaceholderPage
        title="شروط الاستخدام"
        description="يرجى قراءة شروط وأحكام استخدام المنصة لضمان تجربة آمنة ومفيدة للجميع."
        icon={FileText}
    />
);

export const PrivacyPage = () => (
    <PlaceholderPage
        title="سياسة الخصوصية"
        description="نحن نلتزم بحماية بياناتك وخصوصيتك. تعرف على كيفية تعاملنا مع المعلومات."
        icon={ShieldCheck}
    />
);

export const CookiesPage = () => (
    <PlaceholderPage
        title="سياسة ملفات التعريف"
        description="تعرف على كيفية استخدامنا لملفات تعريف الارتباط لتحسين تجربة تصفحك للمنصة."
        icon={Database}
    />
);

export const CategoriesPage = () => (
    <PlaceholderPage
        title="الأقسام"
        description="استكشف المعرفة من خلال أقسامنا المتنوعة التي تغطي التقنية، الثقافة، الأخبار، والمزيد."
        icon={LayoutGrid}
    />
);
