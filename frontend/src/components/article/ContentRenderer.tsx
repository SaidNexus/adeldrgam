import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect, useState, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface ContentRendererProps {
    content: any;
}

// Helper: Safely parse JSON with escape character handling
function safeJsonParse(data: any): any {
    if (data === null || data === undefined) {
        return null;
    }

    // If it's already an object, return it
    if (typeof data === 'object') {
        return data;
    }

    // If it's not a string, return as-is
    if (typeof data !== 'string') {
        return data;
    }

    // Clean escape characters that might have been double-encoded
    let cleaned = data
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"');

    // Try to parse as JSON
    try {
        if (cleaned.trim().startsWith('{') || cleaned.trim().startsWith('[')) {
            const parsed = JSON.parse(cleaned);
            // Recursively check if the result is another stringified JSON
            if (typeof parsed === 'string') {
                return safeJsonParse(parsed);
            }
            return parsed;
        }
    } catch (e) {
        // If parsing fails, return the cleaned string
        console.warn('safeJsonParse: Could not parse as JSON, returning cleaned string');
    }

    return cleaned;
}

// Helper: Extract plain text from TipTap JSON for fallback
function extractPlainText(node: any): string {
    if (!node) return '';

    if (typeof node === 'string') return node;

    if (node.type === 'text') {
        return node.text || '';
    }

    if (Array.isArray(node.content)) {
        return node.content.map(extractPlainText).join('\n');
    }

    if (Array.isArray(node)) {
        return node.map(extractPlainText).join('\n');
    }

    return '';
}

// Recursive TipTap JSON to React elements renderer
function TipTapRenderer({ node, keyPrefix = '' }: { node: any; keyPrefix?: string }): JSX.Element | null {
    if (!node) return null;

    // Handle arrays
    if (Array.isArray(node)) {
        return (
            <>
                {node.map((child, index) => (
                    <TipTapRenderer key={`${keyPrefix}-${index}`} node={child} keyPrefix={`${keyPrefix}-${index}`} />
                ))}
            </>
        );
    }

    // Handle text nodes
    if (node.type === 'text') {
        let content: React.ReactNode = node.text || '';

        // Apply marks (bold, italic, links, etc.)
        if (node.marks && Array.isArray(node.marks)) {
            node.marks.forEach((mark: any) => {
                switch (mark.type) {
                    case 'bold':
                        content = <strong>{content}</strong>;
                        break;
                    case 'italic':
                        content = <em>{content}</em>;
                        break;
                    case 'underline':
                        content = <u>{content}</u>;
                        break;
                    case 'strike':
                        content = <s>{content}</s>;
                        break;
                    case 'code':
                        content = <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">{content}</code>;
                        break;
                    case 'link':
                        content = (
                            <a
                                href={mark.attrs?.href || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-bold"
                            >
                                {content}
                            </a>
                        );
                        break;
                }
            });
        }

        return <>{content}</>;
    }

    // Handle different node types
    const childContent = node.content ? (
        <TipTapRenderer node={node.content} keyPrefix={`${keyPrefix}-content`} />
    ) : null;

    switch (node.type) {
        case 'doc':
            return <>{childContent}</>;

        case 'paragraph':
            return <p className="mb-6 leading-relaxed">{childContent}</p>;

        case 'heading':
            const level = node.attrs?.level || 1;
            const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
            const headingClasses: Record<number, string> = {
                1: 'text-4xl font-black mb-8 mt-12',
                2: 'text-3xl font-bold mb-6 mt-10',
                3: 'text-2xl font-bold mb-4 mt-8',
                4: 'text-xl font-semibold mb-4 mt-6',
                5: 'text-lg font-semibold mb-3 mt-4',
                6: 'text-base font-semibold mb-2 mt-4',
            };
            return <HeadingTag className={headingClasses[level] || ''}>{childContent}</HeadingTag>;

        case 'bulletList':
            return <ul className="list-disc list-inside mb-6 space-y-2 pr-4">{childContent}</ul>;

        case 'orderedList':
            return <ol className="list-decimal list-inside mb-6 space-y-2 pr-4">{childContent}</ol>;

        case 'listItem':
            return <li className="leading-relaxed">{childContent}</li>;

        case 'blockquote':
            return (
                <blockquote className="border-r-4 border-blue-500 pr-6 my-8 italic text-gray-600 bg-blue-50/30 py-4 rounded-lg">
                    {childContent}
                </blockquote>
            );

        case 'codeBlock':
            return (
                <pre className="bg-gray-900 text-gray-100 p-6 rounded-2xl overflow-x-auto mb-6 text-sm font-mono">
                    <code>{childContent || node.attrs?.content}</code>
                </pre>
            );

        case 'horizontalRule':
            return <hr className="border-gray-200 my-8" />;

        case 'image':
            return (
                <figure className="my-8">
                    <img
                        src={node.attrs?.src}
                        alt={node.attrs?.alt || ''}
                        title={node.attrs?.title}
                        className="rounded-2xl max-w-full h-auto mx-auto shadow-lg"
                    />
                    {node.attrs?.title && (
                        <figcaption className="text-center text-gray-500 text-sm mt-3">
                            {node.attrs.title}
                        </figcaption>
                    )}
                </figure>
            );

        case 'hardBreak':
            return <br />;

        default:
            // For unknown types, try to render children or return null
            console.warn(`TipTapRenderer: Unknown node type "${node.type}"`, node);
            return childContent;
    }
}

export const ContentRenderer = ({ content }: ContentRendererProps) => {
    const [renderMode, setRenderMode] = useState<'tiptap' | 'custom' | 'fallback' | 'loading'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Parse and normalize content
    const parsedContent = useMemo(() => {
        console.log('--- ContentRenderer DEBUG ---');
        console.log('Raw content received:', content);
        console.log('Content type:', typeof content);

        if (!content) {
            console.warn('ContentRenderer: No content provided');
            return null;
        }

        const parsed = safeJsonParse(content);
        console.log('Parsed content:', parsed);
        console.log('Parsed type:', typeof parsed);

        return parsed;
    }, [content]);

    // TipTap editor for native rendering
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-2xl max-w-full h-auto mx-auto shadow-lg my-8',
                },
            }),
            Link.configure({
                openOnClick: true,
                HTMLAttributes: {
                    class: 'text-blue-600 hover:underline font-bold',
                },
            }),
        ],
        content: null,
        editable: false,
    });

    // Attempt to set content in TipTap editor
    useEffect(() => {
        if (!parsedContent) {
            setRenderMode('fallback');
            setErrorMessage('لا يوجد محتوى للعرض');
            return;
        }

        // If it's a string (plain text or HTML), use custom renderer
        if (typeof parsedContent === 'string') {
            console.log('Content is plain string, using fallback text renderer');
            setRenderMode('fallback');
            return;
        }

        // If it's an object with TipTap structure
        if (typeof parsedContent === 'object') {
            // Check if it has the expected TipTap structure
            const hasTipTapStructure = parsedContent.type === 'doc' ||
                (Array.isArray(parsedContent) && parsedContent.length > 0) ||
                parsedContent.content;

            if (hasTipTapStructure) {
                // Try TipTap editor first
                if (editor) {
                    try {
                        // Wrap array in doc node if needed
                        let contentToSet = parsedContent;
                        if (Array.isArray(parsedContent)) {
                            contentToSet = { type: 'doc', content: parsedContent };
                        }

                        editor.commands.setContent(contentToSet);

                        // Check if editor actually rendered something
                        setTimeout(() => {
                            const html = editor.getHTML();
                            if (html && html.trim() !== '' && html !== '<p></p>') {
                                console.log('TipTap rendered successfully');
                                setRenderMode('tiptap');
                            } else {
                                console.log('TipTap rendered empty, switching to custom renderer');
                                setRenderMode('custom');
                            }
                        }, 100);
                    } catch (err) {
                        console.error('TipTap failed, using custom renderer:', err);
                        setRenderMode('custom');
                    }
                } else {
                    // Editor not ready, use custom
                    setRenderMode('custom');
                }
            } else {
                // Unknown object structure
                console.warn('Unknown content structure:', parsedContent);
                setRenderMode('fallback');
            }
        }
    }, [editor, parsedContent]);

    // Loading state
    if (renderMode === 'loading') {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="mr-3 text-gray-500 font-medium">جاري تحميل المحتوى...</span>
            </div>
        );
    }

    // Fallback for errors or plain text
    if (renderMode === 'fallback') {
        if (!parsedContent) {
            return (
                <div className="bg-gray-50 rounded-3xl p-12 text-center border border-gray-100">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold text-lg">{errorMessage || 'لا يوجد محتوى متاح'}</p>
                </div>
            );
        }

        // Plain text fallback
        const textContent = typeof parsedContent === 'string'
            ? parsedContent
            : extractPlainText(parsedContent);

        return (
            <div className="prose prose-2xl prose-gray max-w-none text-[#1e293b] leading-[1.8] font-['Almarai']">
                {textContent.split('\n').map((line, i) => (
                    <p key={i} className="mb-4">{line || <br />}</p>
                ))}
            </div>
        );
    }

    // Custom recursive renderer
    if (renderMode === 'custom' && parsedContent) {
        let contentToRender = parsedContent;

        // Wrap array in doc structure if needed
        if (Array.isArray(parsedContent)) {
            contentToRender = { type: 'doc', content: parsedContent };
        }

        return (
            <div className="prose prose-2xl prose-gray max-w-none text-[#1e293b] selection:bg-blue-100 leading-[1.8] font-['Almarai']">
                <TipTapRenderer node={contentToRender} />
            </div>
        );
    }

    // TipTap native rendering
    if (renderMode === 'tiptap' && editor) {
        return (
            <div className="prose prose-2xl prose-gray max-w-none text-[#1e293b] selection:bg-blue-100 leading-[1.8] font-['Almarai']">
                <EditorContent editor={editor} />
            </div>
        );
    }

    // Ultimate fallback
    return (
        <div className="bg-yellow-50 rounded-3xl p-8 border border-yellow-200">
            <p className="text-yellow-800 font-bold">⚠️ تعذر عرض المحتوى. يرجى المحاولة مرة أخرى.</p>
        </div>
    );
};
