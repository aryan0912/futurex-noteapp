import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3, 
  Link as LinkIcon, CheckSquare, CloudCheck, CloudLightning, ChevronLeft, Calendar, Clock, FileText
} from 'lucide-react';
import { Note } from '../types';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  saveStatus: 'saved' | 'saving' | 'idle';
  setSaveStatus: (status: 'saved' | 'saving' | 'idle') => void;
  onOpenSidebar: () => void;
}

export default function Editor({
  note,
  onUpdateNote,
  saveStatus,
  setSaveStatus,
  onOpenSidebar,
}: EditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync state with note when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      if (editorRef.current && editorRef.current.innerHTML !== note.content) {
        editorRef.current.innerHTML = note.content;
      }
    } else {
      setTitle('');
      setContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [note?.id]);

  // Handle formatting command
  const handleCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    // Focus back on editor
    if (editorRef.current) {
      editorRef.current.focus();
      handleContentChange();
    }
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      alert('Please select some text to insert a link.');
      return;
    }
    const url = prompt('Enter URL (e.g., https://google.com):');
    if (url) {
      // Validate link format
      const validUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      handleCommand('createLink', validUrl);
    }
  };

  const handleInsertChecklist = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    
    const checklistDiv = document.createElement('div');
    checklistDiv.className = 'todo-item flex items-center gap-2.5 py-1.5 my-1';
    // Use non-contenteditable checkbox wrapper, with check handle
    checklistDiv.innerHTML = `
      <input type="checkbox" class="todo-checkbox w-4 h-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 rounded focus:ring-indigo-500 cursor-pointer" />
      <span class="todo-text flex-1 outline-none text-zinc-800 dark:text-zinc-200" contenteditable="true">New task...</span>
    `;

    range.deleteContents();
    range.insertNode(checklistDiv);

    // Position cursor inside the newly created task item span
    const textNode = checklistDiv.querySelector('.todo-text');
    if (textNode) {
      const newRange = document.createRange();
      newRange.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    if (editorRef.current) {
      editorRef.current.focus();
      handleContentChange();
    }
  };

  const handleContentChange = () => {
    if (editorRef.current && note) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      setSaveStatus('saving');
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (note) {
      setTitle(e.target.value);
      setSaveStatus('saving');
    }
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (!note || saveStatus !== 'saving') return;

    const delayDebounce = setTimeout(async () => {
      try {
        await onUpdateNote(note.id, {
          title,
          content,
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error auto-saving:', err);
        setSaveStatus('idle'); // revert on failure
      }
    }, 1500); // Wait 1.5 seconds after final typing before saving

    return () => clearTimeout(delayDebounce);
  }, [title, content, note?.id]);

  // Track click on checkboxes inside the rich text editor to toggle completed state
  useEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;

    const handleCheckboxClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
        const checkbox = target as HTMLInputElement;
        const textSpan = checkbox.nextElementSibling as HTMLElement;
        if (textSpan) {
          if (checkbox.checked) {
            textSpan.style.textDecoration = 'line-through';
            textSpan.style.opacity = '0.5';
            checkbox.setAttribute('checked', 'true');
          } else {
            textSpan.style.textDecoration = 'none';
            textSpan.style.opacity = '1';
            checkbox.removeAttribute('checked');
          }
        }
        handleContentChange();
      }
    };

    editorEl.addEventListener('click', handleCheckboxClick);
    return () => {
      editorEl.removeEventListener('click', handleCheckboxClick);
    };
  }, [note?.id]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 transition-colors duration-300 p-8 text-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 flex items-center justify-center mb-6">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
            No Note Selected
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Select an existing note from the sidebar or create a new one to start writing.
          </p>
          <button
            onClick={onOpenSidebar}
            className="md:hidden flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Open Sidebar</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 transition-colors duration-300 h-full overflow-hidden">
      {/* Editor Top Bar Controls */}
      <header className="h-12 shrink-0 flex items-center justify-between px-6 md:px-8 bg-white dark:bg-zinc-900 border-b border-[#f1f1f1] dark:border-zinc-800/80 z-20">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Trigger */}
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-2 rounded-lg text-zinc-500 hover:bg-[#efefed] dark:hover:bg-zinc-800"
            title="Open Notes List"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Path Navigation styled like Notion */}
          <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 font-sans">
            <span>All Notes</span>
            <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-[#37352f] dark:text-zinc-200 font-medium truncate max-w-[120px] md:max-w-[200px]">
              {note.title.trim() || 'Untitled Note'}
            </span>
          </div>
        </div>

        {/* Auto Save Status styled exactly like Clean Minimalism */}
        <div className="flex items-center">
          {saveStatus === 'saving' && (
            <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 animate-ping"></div>
              <span>Saving...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></div>
              <span>Saved</span>
            </div>
          )}
          {saveStatus === 'idle' && (
            <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-2"></div>
              <span>Draft</span>
            </div>
          )}
        </div>
      </header>

      {/* Editor Scrolling Workspace Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-24 py-8 md:py-16 bg-white dark:bg-zinc-900 font-sans">
        <div className="max-w-3xl mx-auto space-y-6 flex flex-col h-full">
          {/* Note Title Input with text-5xl like Notion style */}
          <input
            id="editor-note-title"
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full text-4xl md:text-5xl font-bold border-none focus:ring-0 p-0 placeholder:text-zinc-200 dark:placeholder:text-zinc-800 outline-none text-[#37352f] dark:text-zinc-50 bg-transparent tracking-tight leading-tight"
          />

          {/* Sticky Editor Formatting Toolbar inside container */}
          <div className="flex items-center flex-wrap gap-1 border-b border-[#f1f1f1] dark:border-zinc-800/80 pb-3 sticky top-0 bg-white dark:bg-zinc-900 z-10 select-none">
            <button
              onClick={() => handleCommand('bold')}
              className="p-1 w-8 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold transition-colors text-sm flex items-center justify-center"
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              onClick={() => handleCommand('italic')}
              className="p-1 w-8 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 italic transition-colors text-sm flex items-center justify-center"
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              onClick={() => handleCommand('underline')}
              className="p-1 w-8 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 underline transition-colors text-sm flex items-center justify-center"
              title="Underline (Ctrl+U)"
            >
              U
            </button>

            <div className="w-[1px] h-4 bg-gray-200 dark:bg-zinc-800 mx-1.5 shrink-0" />

            <button
              onClick={() => handleCommand('formatBlock', '<h1>')}
              className="p-1 px-1.5 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 font-semibold transition-colors flex items-center gap-0.5"
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() => handleCommand('formatBlock', '<h2>')}
              className="p-1 px-1.5 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 font-semibold transition-colors flex items-center gap-0.5"
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => handleCommand('formatBlock', '<h3>')}
              className="p-1 px-1.5 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 font-semibold transition-colors flex items-center gap-0.5"
              title="Heading 3"
            >
              H3
            </button>

            <div className="w-[1px] h-4 bg-gray-200 dark:bg-zinc-800 mx-1.5 shrink-0" />

            <button
              onClick={() => handleCommand('insertUnorderedList')}
              className="flex items-center space-x-1 p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-xs text-zinc-500 dark:text-zinc-400 font-medium transition-colors"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bullet</span>
            </button>
            
            <button
              onClick={handleInsertChecklist}
              className="flex items-center space-x-1 p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-xs text-zinc-500 dark:text-zinc-400 font-medium transition-colors"
              title="Checklist Item"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Checklist</span>
            </button>

            <button
              onClick={handleLink}
              className="flex items-center space-x-1 p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-xs text-zinc-500 dark:text-zinc-400 font-medium transition-colors"
              title="Insert Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Link</span>
            </button>
          </div>

          {/* Note Rich Text Area inside prose style */}
          <div
            id="editor-rich-textarea"
            ref={editorRef}
            contentEditable
            onInput={handleContentChange}
            placeholder="Start writing your thoughts, checklists or embed links..."
            className="flex-1 w-full min-h-[400px] text-[#37352f] dark:text-zinc-200 bg-transparent border-none outline-none text-base md:text-lg leading-relaxed pb-32 focus:outline-none prose max-w-none dark:prose-invert"
          />
        </div>
      </div>
    </div>
  );
}
