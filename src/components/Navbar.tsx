/**
 * Navigation bar with theme toggle
 */

'use client'

import Link from 'next/link'
import { useTheme } from '@/app/theme'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        
        <Link href="/" className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 transition-colors duration-300">
          Media Bias Tracker
        </Link>

        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300"
          >
            Home
          </Link>
          <Link 
            href="/articles" 
            className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300"
          >
            Discover
          </Link>
          <Link
            href="/analyze"
            className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300"
          >
            Analyze
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300"
          >
            Dashboard
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors duration-300"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}