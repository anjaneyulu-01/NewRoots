import React, { useState } from 'react';
import api from '../api';

export default function ContactModal({ resourceType, resourceId, ownerId, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getCurrentUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const obj = JSON.parse(decodeURIComponent(escape(json)));
      return obj.id || obj._id || obj.sub || obj.userId || (obj.user && (obj.user.id || obj.user._id)) || null;
    } catch (e) {
      return null;
    }
  };

  const currentUserId = getCurrentUserIdFromToken();
  const isSelf = ownerId && currentUserId && ownerId.toString() === currentUserId.toString();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/contact', {
        resourceType,
        resourceId,
        message,
      });
      setMessage('');
      onSuccess && onSuccess(res.data.contact);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const resourceLabel = {
    Event: 'Event Creator',
    Job: 'Job Poster',
    Housing: 'Property Owner',
  }[resourceType] || 'User';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-hope-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-hope-gray-800 dark:text-hope-gray-100">
            Contact {resourceLabel}
          </h3>
          <button 
            onClick={onClose}
            className="text-hope-gray-500 hover:text-hope-gray-700 dark:hover:text-hope-gray-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSelf ? (
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm">
              You cannot send a message to yourself.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message... (max 2000 characters)"
                maxLength={2000}
                rows={5}
                className="input-fiverr text-sm resize-none"
                required
              />
              <div className="text-xs text-hope-gray-500 mt-1">
                {message.length}/2000
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isSelf}
              className="flex-1 btn-primary disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
