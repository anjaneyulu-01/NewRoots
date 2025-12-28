import React from 'react';

export default function JobCard({ job, onContact, onApply }) {
  return (
    <div className="gig-card group">
      {/* Image/header */}
      <div className="relative h-32 bg-gradient-to-br from-secondary/10 to-accent/10 overflow-hidden">
        {job.image ? (
          <img src={job.image} alt={job.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30">💼</div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-hope-gray-800 dark:text-hope-gray-100 mb-1 line-clamp-2 group-hover:text-secondary transition-colors">
            {job.title}
          </h3>
          <p className="text-sm font-medium text-hope-gray-600 dark:text-hope-gray-400 mb-1">
            {job.company}
          </p>
          <p className="text-sm text-hope-gray-500 dark:text-hope-gray-500 line-clamp-2">
            {job.description}
          </p>
        </div>

        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center space-x-1 text-hope-gray-600 dark:text-hope-gray-400 truncate">
            <span>📍</span>
            <span className="truncate">{job.address}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-hope-gray-200 dark:border-hope-gray-700">
          {job.pay ? (
            <div className="text-lg font-bold text-secondary">
              ${job.pay}
            </div>
          ) : (
            <div className="text-sm text-hope-gray-500">Salary not listed</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onApply && onApply(job._id)}
              className="px-4 py-1.5 bg-primary hover:bg-hope-green-dark text-white text-sm font-medium rounded-md transition-colors duration-150"
            >
              Apply Now
            </button>
            <button
              onClick={() => onContact && onContact(job._id)}
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
