import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    article?: boolean;
    author?: string;
    publishedTime?: string;
    canonical?: string;
}

export function SEO({
    title,
    description,
    image = '/og-image.jpg', // Default OG image fallback
    article = false,
    author,
    publishedTime,
    canonical,
}: SEOProps) {
    const siteName = 'عادل ضرغام - مـنـصـتـك لـلـنـشـر الـعـربـي';
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    const defaultDescription = 'عادل ضرغام - منصتك العربية لنشر وقراءة المقالات المتميزة في مختلف المجالات.';
    const shareDescription = description || defaultDescription;

    // Organization Schema (Safe Base)
    const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'عادل ضرغام (Adel Drgam)',
        'url': window.location.origin,
        'logo': `${window.location.origin}/vite.svg`,
        'sameAs': [
            // Add social links here if known
        ],
    };

    return (
        <Helmet>
            {/* Base Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={shareDescription} />
            {canonical && <link rel="canonical" href={canonical} />}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={article ? 'article' : 'website'} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={shareDescription} />
            <meta property="og:image" content={image.startsWith('http') ? image : `${window.location.origin}${image}`} />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={shareDescription} />
            <meta name="twitter:image" content={image.startsWith('http') ? image : `${window.location.origin}${image}`} />

            {/* Article Specific Meta */}
            {article && author && <meta property="article:author" content={author} />}
            {article && publishedTime && (
                <meta property="article:published_time" content={publishedTime} />
            )}

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(organizationSchema)}
            </script>
        </Helmet>
    );
}
