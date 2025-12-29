import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ showSearch = false, onSearch }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

  return (
    <header className="bg-white dark:bg-hope-gray-800 border-b border-hope-gray-200 dark:border-hope-gray-700 sticky top-0 z-50 transition-theme shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <a href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-hope-green-dark bg-clip-text text-transparent">
                NewRoots
              </span>
            </a>

            {/* Desktop Navigation */}
            {token && (
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/" className="nav-link">Explore</a>
              </nav>
            )}
          </div>

          {/* Search Bar - Only show on home/explore */}
          {showSearch && (
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearchSubmit} className="w-full search-bar">
                <input
                  type="text"
                  placeholder="Search events, jobs, housing..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 bg-transparent border-none focus:outline-none text-hope-gray-700 dark:text-hope-gray-200"
                />
                <button type="submit" className="px-6 py-2 bg-primary hover:bg-hope-green-dark text-white font-medium transition-colors duration-150">
                  Search
                </button>
              </form>
            </div>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {token ? (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hidden md:inline-flex nav-link"
                >
                  My Dashboard
                </button>
                {/* small-screen user icon that opens dashboard */}
                <button
                  onClick={() => navigate('/dashboard')}
                  className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-hope-gray-100 dark:bg-hope-gray-700 hover:bg-hope-gray-200"
                  aria-label="Open Dashboard"
                  title="Dashboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-hope-gray-700 dark:text-hope-gray-200">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </button>
                <button onClick={handleLogout} className="hidden md:inline-flex text-sm text-hope-gray-600 dark:text-hope-gray-400 hover:text-primary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="nav-link">Sign In</a>
                <a href="/register" className="btn-primary">Join NewRoots</a>
              </>
            )}
          </div>
        </div>

        {/* Mobile Search */}
        {showSearch && (
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearchSubmit} className="search-bar">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-transparent border-none focus:outline-none text-hope-gray-700 dark:text-hope-gray-200"
              />
              <button type="submit" className="px-4 py-2 bg-primary text-white">
                🔍
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
