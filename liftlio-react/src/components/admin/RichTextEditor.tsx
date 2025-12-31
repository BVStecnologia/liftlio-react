import React from 'react';
import styled from 'styled-components';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

// ==========================================
// STYLED COMPONENTS
// ==========================================

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${props => props.theme.colors.bg.primary};
  border: 1px solid ${props => props.theme.colors.border.primary};
  border-radius: 12px;
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 12px;
  background: ${props => props.theme.colors.bg.secondary};
  border-bottom: 1px solid ${props => props.theme.colors.border.primary};
`;

const ToolbarGroup = styled.div`
  display: flex;
  gap: 2px;
  padding-right: 8px;
  margin-right: 8px;
  border-right: 1px solid ${props => props.theme.colors.border.primary};

  &:last-child {
    border-right: none;
    margin-right: 0;
    padding-right: 0;
  }
`;

const ToolbarButton = styled.button<{ $active?: boolean }>`
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: ${props => props.$active ? 'rgba(139, 92, 246, 0.15)' : 'transparent'};
  color: ${props => props.$active ? '#8b5cf6' : props.theme.colors.text.secondary};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;

  &:hover {
    background: ${props => props.$active ? 'rgba(139, 92, 246, 0.2)' : props.theme.colors.bg.hover};
    color: ${props => props.$active ? '#8b5cf6' : props.theme.colors.text.primary};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const HeadingSelect = styled.select`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border.primary};
  background: ${props => props.theme.colors.bg.primary};
  color: ${props => props.theme.colors.text.primary};
  font-size: 13px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }
`;

const EditorWrapper = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  .ProseMirror {
    min-height: 400px;
    outline: none;
    color: ${props => props.theme.colors.text.primary};
    font-size: 16px;
    line-height: 1.8;

    > * + * {
      margin-top: 0.75em;
    }

    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: ${props => props.theme.colors.text.muted};
      pointer-events: none;
      height: 0;
    }

    h1 {
      font-size: 2em;
      font-weight: 700;
      margin-top: 1.5em;
    }

    h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin-top: 1.3em;
    }

    h3 {
      font-size: 1.25em;
      font-weight: 600;
      margin-top: 1.2em;
    }

    h4 {
      font-size: 1.1em;
      font-weight: 600;
    }

    ul, ol {
      padding-left: 1.5em;
    }

    ul {
      list-style-type: disc;
    }

    ol {
      list-style-type: decimal;
    }

    blockquote {
      border-left: 4px solid #8b5cf6;
      padding-left: 1em;
      margin-left: 0;
      color: ${props => props.theme.colors.text.secondary};
      font-style: italic;
    }

    code {
      background: ${props => props.theme.colors.bg.secondary};
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 0.9em;
    }

    pre {
      background: ${props => props.theme.colors.bg.tertiary};
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;

      code {
        background: none;
        padding: 0;
      }
    }

    a {
      color: #8b5cf6;
      text-decoration: none;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1em 0;
    }

    mark {
      background-color: rgba(139, 92, 246, 0.3);
      padding: 0.1em 0.2em;
      border-radius: 2px;
    }

    hr {
      border: none;
      border-top: 2px solid ${props => props.theme.colors.border.primary};
      margin: 2em 0;
    }

    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-justify { text-align: justify; }
  }
`;

// ==========================================
// ICONS
// ==========================================

const Icons = {
  Bold: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  Underline: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>,
  Strikethrough: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2"/><path d="M8.8 19.6c2.1.4 4.1.3 5.6-.2 2.2-.8 3.6-2.5 3.6-4.5 0-1.4-.7-2.6-2-3.4"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  Highlight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>,
  BulletList: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>,
  OrderedList: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="3" y="7" fontSize="6" fill="currentColor" stroke="none">1</text><text x="3" y="13" fontSize="6" fill="currentColor" stroke="none">2</text><text x="3" y="19" fontSize="6" fill="currentColor" stroke="none">3</text></svg>,
  Quote: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>,
  Code: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  CodeBlock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 8 5 12 9 16"/><polyline points="15 8 19 12 15 16"/></svg>,
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Image: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  AlignLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>,
  AlignCenter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>,
  AlignRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>,
  Undo: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Redo: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>,
  HorizontalRule: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/></svg>,
};

// ==========================================
// PROPS INTERFACE
// ==========================================

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

// ==========================================
// COMPONENT
// ==========================================

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your amazing content...'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Highlight.configure({
        multicolor: false,
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const setHeading = (level: string) => {
    if (level === 'p') {
      editor.chain().focus().setParagraph().run();
    } else {
      const headingLevel = parseInt(level) as 1 | 2 | 3 | 4;
      editor.chain().focus().toggleHeading({ level: headingLevel }).run();
    }
  };

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return '1';
    if (editor.isActive('heading', { level: 2 })) return '2';
    if (editor.isActive('heading', { level: 3 })) return '3';
    if (editor.isActive('heading', { level: 4 })) return '4';
    return 'p';
  };

  return (
    <EditorContainer>
      <Toolbar>
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Icons.Undo />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Icons.Redo />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <HeadingSelect
            value={getCurrentHeading()}
            onChange={(e) => setHeading(e.target.value)}
          >
            <option value="p">Paragraph</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
          </HeadingSelect>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            $active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Icons.Bold />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            $active={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Icons.Italic />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            $active={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <Icons.Underline />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            $active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Icons.Strikethrough />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            $active={editor.isActive('highlight')}
            title="Highlight"
          >
            <Icons.Highlight />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            $active={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <Icons.AlignLeft />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            $active={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <Icons.AlignCenter />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            $active={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <Icons.AlignRight />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            $active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <Icons.BulletList />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            $active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <Icons.OrderedList />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            $active={editor.isActive('blockquote')}
            title="Quote"
          >
            <Icons.Quote />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            $active={editor.isActive('code')}
            title="Inline Code"
          >
            <Icons.Code />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            $active={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Icons.CodeBlock />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            onClick={addLink}
            $active={editor.isActive('link')}
            title="Insert Link"
          >
            <Icons.Link />
          </ToolbarButton>
          <ToolbarButton
            onClick={addImage}
            title="Insert Image"
          >
            <Icons.Image />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Icons.HorizontalRule />
          </ToolbarButton>
        </ToolbarGroup>
      </Toolbar>

      <EditorWrapper>
        <EditorContent editor={editor} />
      </EditorWrapper>
    </EditorContainer>
  );
};

export default RichTextEditor;
