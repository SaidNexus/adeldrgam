import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2,
    Image as ImageIcon, Link as LinkIcon, Undo, Redo
} from 'lucide-react';

interface RichTextEditorProps {
    content: any;
    onChange: (content: any) => void;
    placeholder?: string;
}

export const RichTextEditor = ({ content, onChange, placeholder }: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image,
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder: placeholder || 'ابدأ الكتابة هنا...',
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
    });

    if (!editor) return null;

    const MenuButton = ({ onClick, isActive, children, title }: any) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-2.5 rounded-lg transition-all ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50/50 border-b border-gray-100">
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="عريض"
                >
                    <Bold className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="مائل"
                >
                    <Italic className="h-4 w-4" />
                </MenuButton>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="عنوان رئيسي"
                >
                    <Heading1 className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="عنوان فرعي"
                >
                    <Heading2 className="h-4 w-4" />
                </MenuButton>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="قائمة نقطية"
                >
                    <List className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="قائمة رقمية"
                >
                    <ListOrdered className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="اقتباس"
                >
                    <Quote className="h-4 w-4" />
                </MenuButton>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <MenuButton onClick={() => { }} title="إضافة صورة">
                    <ImageIcon className="h-4 w-4" />
                </MenuButton>
                <MenuButton onClick={() => { }} title="إضافة رابط">
                    <LinkIcon className="h-4 w-4" />
                </MenuButton>
                <div className="flex-1" />
                <MenuButton onClick={() => editor.chain().focus().undo().run()} title="تراجع">
                    <Undo className="h-4 w-4" />
                </MenuButton>
                <MenuButton onClick={() => editor.chain().focus().redo().run()} title="إعادة">
                    <Redo className="h-4 w-4" />
                </MenuButton>
            </div>
            <div className="p-8 min-h-[450px]">
                <EditorContent editor={editor} className="prose prose-lg prose-blue max-w-none focus:outline-none" />
            </div>
        </div>
    );
};
