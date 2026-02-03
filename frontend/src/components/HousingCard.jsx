import React from 'react';
import resolveImageUrl from '../utils/resolveImageUrl.js';

export default function HousingCard({ housing, onContact, onApply }) {
  const ownerId = housing.poster?._id || housing.postedBy || housing.poster;
  const imageUrl = resolveImageUrl(housing.image);

  return (
    <div className="gig-card group">
      {/* Image/header */}
      <div className="relative h-32 bg-gradient-to-br from-accent/10 to-primary/10 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={housing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30">🏠</div>
        )}
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
          <div className="flex gap-2">
            <button
              onClick={() => onApply && onApply(housing._id, ownerId)}
              className="px-4 py-1.5 bg-primary hover:bg-hope-green-dark text-white text-sm font-medium rounded-md transition-colors duration-150"
            >
              Apply Now
            </button>
              <button
                onClick={() => onContact && onContact(housing._id, ownerId)}
                className="px-4 py-1.5 bg-hope-gray-800 hover:bg-hope-gray-900 text-white text-sm font-medium rounded-md transition-colors duration-150 dark:bg-hope-gray-700 dark:hover:bg-hope-gray-600"
              >
                Contact
              </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}
