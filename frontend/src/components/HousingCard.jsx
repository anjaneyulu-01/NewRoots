import React from 'react';

export default function HousingCard({ housing, onContact }) {
  return (
    <div className="gig-card group">
      {/* Header with icon */}
      <div className="relative h-40 bg-gradient-to-br from-accent/10 to-primary/10 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">
          🏠
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-hope-gray-800 dark:text-hope-gray-100 mb-1 line-clamp-2 group-hover:text-accent transition-colors">
            {housing.title}
          </h3>
          <p className="text-sm text-hope-gray-600 dark:text-hope-gray-400 line-clamp-2">
            {housing.description || 'Comfortable housing available'}
          </p>
        </div>

        <div className="flex items-center space-x-1 text-sm text-hope-gray-600 dark:text-hope-gray-400 mb-3 truncate">
          <span>📍</span>
          <span className="truncate">{housing.address}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-hope-gray-200 dark:border-hope-gray-700">
          <div className="text-xl font-bold text-primary">
            ${housing.rent}
            <span className="text-sm font-normal text-hope-gray-500">/mo</span>
          </div>
          <button
            onClick={() => onContact && onContact(housing._id)}
            className="px-4 py-1.5 bg-accent hover:bg-orange-600 text-white text-sm font-medium rounded-md transition-colors duration-150"
          >
            Contact
          </button>
        </div>
      </div>
    </div>
  );
}
