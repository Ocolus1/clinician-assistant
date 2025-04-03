import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  autofocus?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your notes here...',
  className,
  minHeight = 'min-h-32',
  autofocus = false,
}: RichTextEditorProps) {
  // Ref to allow access to the editor from focus button
  const editorRef = React.useRef<ReturnType<typeof useEditor> | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: autofocus,
  });
  
  // Store editor in ref for external access
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Only update if the value has changed externally
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Effect for autofocus and ensuring editor gets focus when 
  // user clicks anywhere in the editor container
  useEffect(() => {
    if (editor && autofocus) {
      // Set timeout to ensure the editor is fully mounted
      setTimeout(() => {
        editor.commands.focus('end');
      }, 100);
    }
  }, [editor, autofocus]);

  if (!editor) {
    return null;
  }

  // Handler to focus the editor when clicking on the container
  const handleContainerClick = () => {
    if (editor) {
      editor.commands.focus();
    }
  };

  // Focus handler for the explicit focus button
  const handleFocusEditor = () => {
    if (editor) {
      editor.commands.focus('end');
    }
  };

  return (
    <div className={cn("rounded-md border border-input bg-background text-text-primary", className)}>
      <div className="flex flex-wrap items-center justify-between gap-1 p-1 border-b border-border-color">
        <div className="flex flex-wrap items-center gap-1">
          <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-muted data-[state=on]:text-primary",
            editor.isActive('bold') ? 'bg-muted text-primary' : ''
          )}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-muted data-[state=on]:text-primary",
            editor.isActive('italic') ? 'bg-muted text-primary' : ''
          )}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-muted data-[state=on]:text-primary",
            editor.isActive('heading', { level: 3 }) ? 'bg-muted text-primary' : ''
          )}
          aria-label="Heading"
        >
          <Heading className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border-color mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-muted data-[state=on]:text-primary",
            editor.isActive('bulletList') ? 'bg-muted text-primary' : ''
          )}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-muted data-[state=on]:text-primary",
            editor.isActive('orderedList') ? 'bg-muted text-primary' : ''
          )}
          aria-label="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border-color mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-muted data-[state=on]:text-primary",
            editor.isActive({ textAlign: 'left' }) ? 'bg-muted text-primary' : ''
          )}
          aria-label="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-muted data-[state=on]:text-primary",
            editor.isActive({ textAlign: 'center' }) ? 'bg-muted text-primary' : ''
          )}
          aria-label="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn(
            "h-8 w-8 p-0 data-[state=on]:bg-muted data-[state=on]:text-primary", 
            editor.isActive({ textAlign: 'right' }) ? 'bg-muted text-primary' : ''
          )}
          aria-label="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        </div>
        
        {/* Focus editor button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFocusEditor}
          className="ml-auto text-xs flex items-center px-2"
        >
          <span className="mr-1">Focus Editor</span>
        </Button>
      </div>
      
      <div 
        className="relative" 
        onClick={handleContainerClick}
      >
        <EditorContent 
          editor={editor} 
          className={cn("p-3", minHeight, "focus-within:outline-none focus-within:ring-2 focus-within:ring-primary")}
        />
      </div>
    </div>
  );
}