import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, BookOpen, Sparkles, Mail } from 'lucide-react';

interface LoginProps {
  onMockLogin: (email: string) => void;
}

export default function Login({ onMockLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your Gmail address');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      setError('Please enter a valid @gmail.com address');
      return;
    }
    setError('');
    onMockLogin(cleanEmail);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors duration-300 px-4">
      {/* Decorative background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-200/40 dark:bg-indigo-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-200/40 dark:bg-violet-900/20 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl overflow-hidden p-8 relative z-10"
      >
        <div className="flex flex-col items-center text-center">
          {/* Logo Icon */}
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shadow-lg mb-6">
            <BookOpen className="w-8 h-8" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-semibold tracking-tight font-sans text-zinc-900 dark:text-zinc-50">
            Simple Notes
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-sm max-w-xs font-sans">
            A fast, minimal, and distraction-free note-taking space.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full mt-6 space-y-4">
            <div className="text-left">
              <label htmlFor="email-input" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Gmail Address
              </label>
              <div className="relative flex items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all px-3 py-2.5">
                <Mail className="w-5 h-5 text-zinc-400 mr-2.5" />
                <input
                  id="email-input"
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:ring-0 p-0"
                />
              </div>
              {error && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">
                  {error}
                </p>
              )}
            </div>

            <button
              id="signin-submit-btn"
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-zinc-950 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950 font-medium py-3 px-4 rounded-xl shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <LogIn className="w-5 h-5" />
              <span>Enter Workspace</span>
            </button>
          </form>

          {/* Feature List */}
          <div className="w-full mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2.5 text-left">
            <div className="flex items-start gap-3 text-zinc-500 dark:text-zinc-400 text-xs">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>Instant database session isolation via your Gmail ID.</span>
            </div>
            <div className="flex items-start gap-3 text-zinc-500 dark:text-zinc-400 text-xs">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>Beautiful rich-text editor with pinning, checklists, and auto-saving.</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
