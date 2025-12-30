/**
 * Navigation bar component
 * Used across all pages for consistent navigation
 */

import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        
        {/* Logo / Title */}
        <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
          Media Bias Tracker
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="text-slate-400 hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link 
            href="/analyze" 
            className="text-slate-400 hover:text-white transition-colors"
          >
            Analyze
          </Link>
          {/* Add more links later: Dashboard, Login, etc. */}
        </div>

      </div>
    </nav>
  )
}