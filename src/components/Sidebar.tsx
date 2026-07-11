import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Pin, FileText, Trash2, Calendar, Menu, X, LogOut, Sun, Moon } from 'lucide-react';
import { Note } from '../types';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string, event: React.MouseEvent) => void;
  onTogglePin: (noteId: string, event: React.MouseEvent) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userEmail: string | null;
  userPhoto: string | null;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onTogglePin,
  searchQuery,
  setSearchQuery,
  userEmail,
  userPhoto,
  onLogout,
  theme,
  onToggleTheme,
  isOpen,
  onClose,
}: SidebarProps) {
  // Strip HTML to display raw text preview
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const filteredNotes = notes.filter(note => {
    const rawContent = stripHtml(note.content).toLowerCase();
    const titleMatch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const contentMatch = rawContent.includes(searchQuery.toLowerCase());
    return titleMatch || contentMatch;
  });

  const pinnedNotes = filteredNotes.filter(note => note.pinned);
  const otherNotes = filteredNotes.filter(note => !note.pinned);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNoteCard = (note: Note) => {
    const isActive = note.id === activeNoteId;
    const plainText = stripHtml(note.content);
    const previewText = plainText.length > 60 ? plainText.slice(0, 60) + '...' : plainText || 'No additional text';

    return (
      <motion.div
        key={note.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => {
          onSelectNote(note.id);
          onClose(); // Close sidebar on mobile
        }}
        className={`group relative p-2.5 rounded-md cursor-pointer transition-all duration-150 border ${
          isActive
            ? 'bg-[#efefed] dark:bg-zinc-800 border-transparent text-[#37352f] dark:text-zinc-100'
            : 'bg-transparent border-transparent hover:bg-[#efefed]/50 dark:hover:bg-zinc-900/60'
        }`}
      >
        <div className="flex justify-between items-start gap-2 mb-0.5">
          <h4 className={`text-sm font-medium truncate pr-12 ${
            isActive ? 'text-[#37352f] dark:text-zinc-50' : 'text-zinc-700 dark:text-zinc-300'
          }`}>
            {note.title.trim() || 'Untitled Note'}
          </h4>
          
          <div className="absolute right-2 top-2.5 flex items-center gap-1 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
            {/* Pin Toggle Button */}
            <button
              id={`pin-btn-${note.id}`}
              onClick={(e) => onTogglePin(note.id, e)}
              className={`p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${
                note.pinned ? 'text-[#eb5757]' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
              title={note.pinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin className="w-3 h-3 fill-current" />
            </button>

            {/* Delete Button */}
            <button
              id={`delete-btn-${note.id}`}
              onClick={(e) => onDeleteNote(note.id, e)}
              className="p-0.5 rounded text-zinc-400 hover:text-[#eb5757] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-1 font-sans">
          {previewText}
        </p>

        <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
          <Calendar className="w-2.5 h-2.5" />
          <span>{formatDate(note.updatedAt)}</span>
        </div>
      </motion.div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#f7f6f3] dark:bg-zinc-950 border-r border-[#ececec] dark:border-zinc-800/80 transition-colors duration-300">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#ececec] dark:border-zinc-900">
        <div className="flex items-center gap-2">
          {/* Custom red/amber style block like J in the Minimalist spec */}
          <div className="w-6 h-6 rounded bg-[#eb5757] text-white flex items-center justify-center text-xs font-bold font-sans">
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'N'}
          </div>
          <span className="font-semibold text-[#37352f] dark:text-zinc-50 tracking-tight text-sm font-sans">
            {userEmail ? `${userEmail.split('@')[0]}'s Space` : 'Workspace'}
          </span>
        </div>
        
        {/* Toggle Theme & Mobile Close Button */}
        <div className="flex items-center gap-1">
          <button
            id="toggle-theme-btn"
            onClick={onToggleTheme}
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-[#efefed] dark:hover:bg-zinc-900 transition-colors focus:outline-none"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          <button
            id="close-sidebar-btn"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-[#efefed] dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Header Info */}
      {userEmail && (
        <div className="px-4 py-2 flex items-center justify-between bg-transparent border-b border-[#ececec] dark:border-[#ececec]/10">
          <div className="flex items-center gap-2 max-w-[170px]">
            {userPhoto ? (
              <img src={userPhoto} alt="User avatar" className="w-5 h-5 rounded-full border border-[#ececec] dark:border-zinc-800" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold uppercase">
                {userEmail.charAt(0)}
              </div>
            )}
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-sans" title={userEmail}>
              {userEmail}
            </span>
          </div>
          <button
            id="logout-btn"
            onClick={onLogout}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3">
        <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-[#e0e0de] dark:border-zinc-800 rounded-md focus-within:ring-1 focus-within:ring-[#2383e2] focus-within:border-[#2383e2] transition-all">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
          <input
            id="sidebar-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 bg-transparent border-none text-sm outline-none text-[#37352f] dark:text-zinc-200 placeholder-zinc-400 focus:ring-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="pr-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Note Lists */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {/* Pinned Notes section */}
        {pinnedNotes.length > 0 && (
          <div>
            <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-sans">
              <Pin className="w-2.5 h-2.5 fill-current text-[#eb5757]" />
              <span>Pinned</span>
            </div>
            <div className="space-y-0.5">
              <AnimatePresence initial={false}>
                {pinnedNotes.map(renderNoteCard)}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Other Notes section */}
        <div>
          <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-sans">
            <span>Recent Notes</span>
          </div>
          
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 px-4 text-zinc-400 dark:text-zinc-500">
              <p className="text-xs font-sans">No notes found</p>
              {searchQuery && <p className="text-[11px] mt-1 font-mono">Try adjusting your search</p>}
            </div>
          ) : (
            <div className="space-y-0.5">
              <AnimatePresence initial={false}>
                {otherNotes.map(renderNoteCard)}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Create New Note Button */}
      <div className="p-3 border-t border-[#ececec] dark:border-zinc-900 bg-[#f7f6f3] dark:bg-zinc-950">
        <button
          id="create-note-btn"
          onClick={onCreateNote}
          className="w-full flex items-center justify-center gap-2 bg-[#efefed] hover:bg-[#e0e0de] dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-[#e0e0de] dark:border-zinc-800 text-[#37352f] dark:text-zinc-300 text-xs font-semibold py-2 px-4 rounded-md transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>
      </div>
    </div>
  );

  return sidebarContent;
}
