import React from 'react';

export default function Card({ title, className = '', children, headerRight }) {
  return (
    <div className={`bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft border border-hope-gray-100 dark:border-hope-gray-700 overflow-hidden transition-all duration-200 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-hope-gray-200 dark:border-hope-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">
            {title}
          </h2>
          {headerRight}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
