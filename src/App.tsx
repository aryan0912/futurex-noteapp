import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, BookOpen, FileText } from 'lucide-react';

import { auth } from './firebase';
import { Note } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';

export default function App() {
  const [user, setUser] = useState<{ email: string; uid: string; photoURL?: string | null } | null>(() => {
    const saved = localStorage.getItem('mock_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  
  // Responsive sidebar state for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  // Theme synchronization effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth State Listener
  useEffect(() => {
    setAuthLoading(false);
  }, []);

  // Handle mock email login
  const handleMockLogin = (email: string) => {
    const mockUid = 'mock-uid-' + btoa(email).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 24);
    const mockUser = {
      email,
      uid: mockUid,
      photoURL: null
    };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  // Helper to fetch authorization header
  const getAuthHeaders = async () => {
    if (user && user.email) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock:${user.email}`
      };
    }
    const token = await auth.currentUser?.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch all notes from Neon DB backend
  const fetchNotes = async () => {
    if (!auth.currentUser) return;
    setNotesLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/notes', { headers });
      if (!res.ok) throw new Error('Failed to fetch notes');
      const fetchedNotes = await res.json();
      setNotes(fetchedNotes);

      // Auto-select first note if there's no active note selected yet and notes exist (on large screen only)
      if (fetchedNotes.length > 0 && !activeNoteId && window.innerWidth >= 768) {
        setActiveNoteId(fetchedNotes[0].id);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  // Notes fetch trigger when user auth shifts
  useEffect(() => {
    if (user) {
      fetchNotes();
    } else {
      setNotes([]);
      setActiveNoteId(null);
    }
  }, [user]);

  // Handle Create Note
  const handleCreateNote = async () => {
    if (!user) return;

    try {
      // Create a unique local alphanumeric ID similar to Firestore format
      const noteId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const newNotePayload = {
        id: noteId,
        title: 'Untitled Note',
        content: '',
        pinned: false,
      };

      const headers = await getAuthHeaders();
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify(newNotePayload)
      });
      if (!res.ok) throw new Error('Failed to create note');

      const createdNote = await res.json();
      
      // Update state locally
      setNotes(prev => [createdNote, ...prev]);
      setActiveNoteId(noteId);
      setSaveStatus('saved');
      
      // Open editor instantly on mobile
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  // Handle Update Note
  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    if (!user) return;

    // Optimistic UI state updates
    setNotes(prevNotes => prevNotes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          ...updates,
          updatedAt: new Date().toISOString() as any
        };
      }
      return n;
    }));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update note');
    } catch (error) {
      console.error('Error updating note:', error);
      // Fallback: sync state with backend
      fetchNotes();
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Avoid selecting note when clicking delete
    
    const confirmDelete = window.confirm('Are you sure you want to delete this note?');
    if (!confirmDelete) return;

    // Optimistic UI deletion
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete note');
    } catch (error) {
      console.error('Error deleting note:', error);
      // Re-fetch to sync accurately if request fails
      fetchNotes();
    }
  };

  // Handle Toggle Pin status
  const handleTogglePin = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Avoid selecting note when pinning
    
    const noteToToggle = notes.find(n => n.id === noteId);
    if (!noteToToggle) return;

    try {
      await handleUpdateNote(noteId, { pinned: !noteToToggle.pinned });
    } catch (error) {
      console.error('Error pinning note:', error);
    }
  };

  // Handle Sign Out
  const handleLogout = async () => {
    localStorage.removeItem('mock_user');
    setUser(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const activeNote = notes.find(note => note.id === activeNoteId) || null;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600 dark:text-violet-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-zinc-500 dark:text-zinc-400 font-mono text-sm">Initializing Note Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onMockLogin={handleMockLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors duration-300">
      
      {/* Sidebar - Desktop Layout */}
      <div className="hidden md:block w-[280px] h-full shrink-0">
        <Sidebar
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={setActiveNoteId}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onTogglePin={handleTogglePin}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          userEmail={user.email}
          userPhoto={user.photoURL}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          isOpen={true}
          onClose={() => {}}
        />
      </div>

      {/* Sidebar - Mobile Slide-Over Layout */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black z-30 md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] h-full z-40 md:hidden shadow-2xl"
            >
              <Sidebar
                notes={notes}
                activeNoteId={activeNoteId}
                onSelectNote={setActiveNoteId}
                onCreateNote={handleCreateNote}
                onDeleteNote={handleDeleteNote}
                onTogglePin={handleTogglePin}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                userEmail={user.email}
                userPhoto={user.photoURL}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Top Bar Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900 flex items-center px-4 justify-between z-20">
        <button
          id="hamburger-menu-btn"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-violet-400" />
          <span>Simple Notes</span>
        </div>
        <div className="w-8 h-8" /> {/* Balance spacer */}
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 h-full pt-14 md:pt-0 overflow-hidden relative">
        <Editor
          note={activeNote}
          onUpdateNote={handleUpdateNote}
          saveStatus={saveStatus}
          setSaveStatus={setSaveStatus}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
      </main>

    </div>
  );
}
