import React from 'react';

export default function EventCard({ event, onApply }) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="gig-card group">
      {/* Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">
          🎉
        </div>
        {event.status && (
          <div className="absolute top-3 right-3">
            <span className={`badge ${event.status === 'upcoming' ? 'badge-info' : 'badge-success'}`}>
              {event.status}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-hope-gray-800 dark:text-hope-gray-100 mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          <p className="text-sm text-hope-gray-600 dark:text-hope-gray-400 line-clamp-2">
            {event.description || 'Join us for this amazing community event'}
          </p>
        </div>

        <div className="flex items-center justify-between mb-3 text-sm text-hope-gray-600 dark:text-hope-gray-400">
          <div className="flex items-center space-x-1">
            <span>📅</span>
            <span>{formatDate(event.date)}</span>
          </div>
          {event.location?.address && (
            <div className="flex items-center space-x-1 truncate max-w-[140px]">
              <span>📍</span>
              <span className="truncate text-xs">{event.location.address}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-hope-gray-200 dark:border-hope-gray-700">
          <div className="text-sm text-hope-gray-600 dark:text-hope-gray-400">
            {event.creator?.name || 'Community Event'}
          </div>
          <button
            onClick={() => onApply && onApply(event._id)}
            className="px-4 py-1.5 bg-primary hover:bg-hope-green-dark text-white text-sm font-medium rounded-md transition-colors duration-150"
          >
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
}
