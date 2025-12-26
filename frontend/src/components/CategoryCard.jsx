import React from 'react';

export default function CategoryCard({ icon, title, count, color = 'primary' }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 hover:border-primary',
    secondary: 'from-secondary/10 to-secondary/5 hover:border-secondary',
    accent: 'from-accent/10 to-accent/5 hover:border-accent',
  };

  return (
    <div className={`category-card bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-hope-gray-800 dark:text-hope-gray-100 mb-1">
        {title}
      </h3>
      {count !== undefined && (
        <p className="text-sm text-hope-gray-600 dark:text-hope-gray-400">
          {count} available
        </p>
      )}
    </div>
  );
}
