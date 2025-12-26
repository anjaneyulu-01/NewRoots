import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function StatCard({ title, value, subtitle, icon, trend }) {
  return (
    <div className="stats-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-hope-gray-600 dark:text-hope-gray-400 mb-1">
            {title}
          </div>
          <div className="text-3xl font-bold text-hope-gray-900 dark:text-hope-gray-100 mb-1">
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-hope-gray-500 dark:text-hope-gray-500">
              {subtitle}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-75">{icon}</div>
        )}
      </div>
      {trend && (
        <div className={`mt-3 text-sm font-medium ${trend > 0 ? 'text-primary' : 'text-red-500'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [earnings, setEarnings] = useState({ totals: { total: 0, paid: 0, pending: 0 }, perEvent: [] });
  const [myEvents, setMyEvents] = useState([]);
  const [myEventCounts, setMyEventCounts] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [housing, setHousing] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [bounds, setBounds] = useState(null);
  const [incomingContacts, setIncomingContacts] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [inboxTab, setInboxTab] = useState('received');
  const [expandedContact, setExpandedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Initialize map center using user's geolocation if available
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setMapCenter({ lat: latitude, lng: longitude });
        },
        () => {
          // If permission denied or unavailable, keep default center
        }
      );
    }
  }, []);

  const loadDashboardData = async () => {
    const [earn, myEv, apps, incomingApps, house, job, contacts, sent] = await Promise.all([
      api.get('/api/earnings/me').then((r) => r.data),
      api.get('/api/events/me').then((r) => r.data),
      api.get('/api/applications/me').then((r) => r.data),
      api.get('/api/applications/incoming').then((r) => r.data),
      axios.get('/api/housing').then((r) => r.data),
      axios.get('/api/jobs').then((r) => r.data),
      api.get('/api/contact/me').then((r) => r.data.messages).catch(() => []),
      api.get('/api/contact/sent').then((r) => r.data.messages).catch(() => []),
    ]);
    setEarnings(earn);
    setMyEvents(myEv.events);
    setMyEventCounts(myEv.counts);
    setMyApplications(apps.applications);
    setIncoming(incomingApps.applications);
    setHousing(house.housing);
    setJobs(job.jobs);
    setIncomingContacts(contacts);
    setSentMessages(sent);
    // Compute bounds across housing + jobs with coords
    const points = [];
    house.housing.forEach(h => { if (h.lat && h.lng) points.push([h.lat, h.lng]); });
    job.jobs.forEach(j => { if (j.lat && j.lng) points.push([j.lat, j.lng]); });
    if (points.length) {
      setBounds(L.latLngBounds(points));
    } else {
      setBounds(null);
    }
  };

  const handleApprove = async (application) => {
    await api.post(`/api/events/${application.event._id}/applications/${application._id}/approve`);
    setIncoming((prev) => prev.map((x) => (x._id === application._id ? { ...x, status: 'approved' } : x)));
  };

  const handleReject = async (application) => {
    await api.post(`/api/events/${application.event._id}/applications/${application._id}/reject`);
    setIncoming((prev) => prev.map((x) => (x._id === application._id ? { ...x, status: 'rejected' } : x)));
  };

  const handleReply = async (contactId) => {
    if (!replyText.trim()) return;
    try {
      const res = await api.post(`/api/contact/${contactId}/reply`, { message: replyText });
      
      // Reload messages from server to get the updated state
      const [contacts, sent] = await Promise.all([
        api.get('/api/contact/me').then((r) => r.data.messages),
        api.get('/api/contact/sent').then((r) => r.data.messages)
      ]);
      
      setIncomingContacts(contacts);
      setSentMessages(sent);
      setReplyText('');
      setExpandedContact(null);
    } catch (err) {
      console.error('Failed to send reply', err);
    }
  };

  const handleNewMessage = async () => {
    if (!replyText.trim() || !selectedConversation) return;
    try {
      // Get the conversation with selected user
      const allContacts = [...incomingContacts, ...sentMessages];
      const conversation = allContacts.find(
        (c) => c.fromUser?._id === selectedConversation || c.toUser?._id === selectedConversation
      );

      if (conversation) {
        // Reply to existing conversation
        handleReply(conversation._id);
      } else {
        // This shouldn't happen - user should be in contact list
        console.error('No conversation found with selected user');
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Mark messages as read when conversation is opened
  const markMessagesAsRead = async (userId) => {
    try {
      const unreadMessages = incomingContacts.filter(
        (c) => c.fromUser?._id === userId && c.status === 'new'
      );

      // Mark each unread message as read
      await Promise.all(
        unreadMessages.map((msg) => api.post(`/api/contact/${msg._id}/read`))
      );

      // Update local state
      setIncomingContacts((prev) =>
        prev.map((c) =>
          c.fromUser?._id === userId && c.status === 'new'
            ? { ...c, status: 'read' }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to mark messages as read', err);
    }
  };

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      markMessagesAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  // Fix Leaflet marker icon paths for Vite
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });

  const pendingApprovals = incoming.filter(a => a.status === 'pending').length;
  const totalApplicants = myEventCounts.reduce((sum, c) => sum + c.applicants, 0);

  // Helper component to fit bounds after data load
  function FitMarkersBounds({ bounds }) {
    const map = useMap();
    useEffect(() => {
      if (bounds) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }, [bounds, map]);
    return null;
  }

  return (
    <div className="min-h-screen transition-theme bg-hope-gray-50 dark:bg-hope-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-hope-gray-900 dark:text-hope-gray-100 mb-2">
            My Dashboard
          </h1>
          <p className="text-hope-gray-600 dark:text-hope-gray-400">
            Manage your events, applications, and earnings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Earnings"
            value={`$${earnings.totals.total.toFixed(0)}`}
            subtitle={`$${earnings.totals.paid.toFixed(2)} paid`}
            icon="💰"
            trend={12}
          />
          <StatCard
            title="Pending Earnings"
            value={`$${earnings.totals.pending.toFixed(0)}`}
            subtitle="Awaiting approval"
            icon="⏳"
          />
          <StatCard
            title="My Events"
            value={myEvents.length}
            subtitle={`${totalApplicants} total applicants`}
            icon="🎉"
          />
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals}
            subtitle="Need your review"
            icon="📋"
          />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft mb-6">
          <div className="flex overflow-x-auto border-b border-hope-gray-200 dark:border-hope-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={activeTab === 'overview' ? 'tab-active' : 'tab'}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={activeTab === 'earnings' ? 'tab-active' : 'tab'}
            >
              Earnings
            </button>
            <button
              onClick={() => setActiveTab('my-events')}
              className={activeTab === 'my-events' ? 'tab-active' : 'tab'}
            >
              My Events
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={activeTab === 'applications' ? 'tab-active' : 'tab'}
            >
              My Applications
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={activeTab === 'approvals' ? 'tab-active' : 'tab'}
            >
              Approvals {pendingApprovals > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-accent text-white text-xs rounded-full">
                  {pendingApprovals}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={activeTab === 'inbox' ? 'tab-active' : 'tab'}
            >
              Inbox {(() => {
                const unreadCount = incomingContacts.filter(c => c.status === 'new').length;
                return unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-secondary text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                );
              })()}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft p-6">
                <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100 mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {myApplications.slice(0, 5).map((app) => (
                    <div key={app._id} className="flex items-center justify-between py-3 border-b border-hope-gray-100 dark:border-hope-gray-700 last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl">
                          🎉
                        </div>
                        <div>
                          <div className="font-medium text-hope-gray-900 dark:text-hope-gray-100">
                            {app.event?.title}
                          </div>
                          <div className="text-sm text-hope-gray-600 dark:text-hope-gray-400">
                            Applied {new Date(app.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className={`badge ${
                        app.status === 'approved' ? 'badge-success' : 
                        app.status === 'pending' ? 'badge-pending' : 
                        'badge-warning'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft overflow-hidden">
                  <div className="p-4 border-b border-hope-gray-200 dark:border-hope-gray-700">
                    <h3 className="font-semibold text-hope-gray-900 dark:text-hope-gray-100">
                      Opportunities Near You
                    </h3>
                  </div>
                  <div style={{ height: 300 }}>
                    <MapContainer
                      center={mapCenter}
                      zoom={12}
                      zoomControl={true}
                      zoomSnap={0.5}
                      zoomDelta={0.5}
                      scrollWheelZoom={true}
                      style={{ height: '100%', width: '100%' }}
                    >
                      {bounds && <FitMarkersBounds bounds={bounds} />}
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="© OpenStreetMap contributors"
                      />
                      {housing.map((h) => (
                        h.lat && h.lng ? (
                          <Marker key={`h-${h._id}`} position={{ lat: h.lat, lng: h.lng }} />
                        ) : null
                      ))}
                      {jobs.map((j) => (
                        j.lat && j.lng ? (
                          <Marker key={`j-${j._id}`} position={{ lat: j.lat, lng: j.lng }} />
                        ) : null
                      ))}
                    </MapContainer>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft p-6">
                    <h3 className="font-semibold text-hope-gray-900 dark:text-hope-gray-100 mb-4">
                      Housing ({housing.length})
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {housing.slice(0, 3).map((h) => (
                        <div key={h._id} className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-hope-gray-800 dark:text-hope-gray-200 text-sm">
                              {h.title}
                            </div>
                            <div className="text-xs text-hope-gray-600 dark:text-hope-gray-400">
                              {h.address}
                            </div>
                          </div>
                          <div className="text-primary font-bold text-sm">${h.rent}/mo</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-hope-gray-200 dark:border-hope-gray-700">
                <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">
                  Earnings Breakdown
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hope-gray-50 dark:bg-hope-gray-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Event</th>
                      <th className="text-right p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Paid</th>
                      <th className="text-right p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Pending</th>
                      <th className="text-right p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                    {earnings.perEvent.map((e) => (
                      <tr key={e.eventId} className="hover-row">
                        <td className="p-4 text-hope-gray-900 dark:text-hope-gray-100">{e.title}</td>
                        <td className="p-4 text-right text-primary font-semibold">${e.paid.toFixed(2)}</td>
                        <td className="p-4 text-right text-hope-gray-600 dark:text-hope-gray-400">${e.pending.toFixed(2)}</td>
                        <td className="p-4 text-right font-semibold text-hope-gray-900 dark:text-hope-gray-100">${(e.paid + e.pending).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* My Events Tab */}
          {activeTab === 'my-events' && (
            <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-hope-gray-200 dark:border-hope-gray-700">
                <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">
                  My Events
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hope-gray-50 dark:bg-hope-gray-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Title</th>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Date</th>
                      <th className="text-center p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Applicants</th>
                      <th className="text-center p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                    {myEvents.map((ev) => {
                      const count = myEventCounts.find((c) => c.eventId === ev._id)?.applicants || 0;
                      return (
                        <tr key={ev._id} className="hover-row">
                          <td className="p-4 font-medium text-hope-gray-900 dark:text-hope-gray-100">{ev.title}</td>
                          <td className="p-4 text-hope-gray-600 dark:text-hope-gray-400">{new Date(ev.date).toLocaleDateString()}</td>
                          <td className="p-4 text-center">
                            <span className="px-3 py-1 rounded-full bg-hope-blue-light dark:bg-secondary text-secondary dark:text-white font-semibold">
                              {count}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`badge ${ev.status === 'upcoming' ? 'badge-info' : 'badge-success'}`}>
                              {ev.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* My Applications Tab */}
          {activeTab === 'applications' && (
            <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-hope-gray-200 dark:border-hope-gray-700">
                <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">
                  My Applications
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hope-gray-50 dark:bg-hope-gray-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Event</th>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Date Applied</th>
                      <th className="text-center p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Status</th>
                      <th className="text-center p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                    {myApplications.map((a) => (
                      <tr key={a._id} className="hover-row">
                        <td className="p-4 font-medium text-hope-gray-900 dark:text-hope-gray-100">{a.event?.title}</td>
                        <td className="p-4 text-hope-gray-600 dark:text-hope-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-center">
                          <span className={`badge ${
                            a.status === 'approved' ? 'badge-success' : 
                            a.status === 'pending' ? 'badge-pending' : 
                            'badge-warning'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`badge ${
                            a.paymentStatus === 'paid' ? 'badge-success' : 'badge-pending'
                          }`}>
                            {a.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approvals Tab */}
          {activeTab === 'approvals' && (
            <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-hope-gray-200 dark:border-hope-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">
                    Pending Approvals
                  </h2>
                  {pendingApprovals > 0 && (
                    <span className="px-3 py-1 rounded-full bg-accent/10 text-accent font-semibold text-sm">
                      {pendingApprovals} pending
                    </span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hope-gray-50 dark:bg-hope-gray-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Applicant</th>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Event</th>
                      <th className="text-center p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Status</th>
                      <th className="text-right p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                    {incoming.map((a) => (
                      <tr key={a._id} className="hover-row">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-semibold text-hope-gray-700 dark:text-hope-gray-300">
                              {a.applicant?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-medium text-hope-gray-900 dark:text-hope-gray-100">
                              {a.applicant?.name}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-hope-gray-900 dark:text-hope-gray-100">{a.event?.title}</td>
                        <td className="p-4 text-center">
                          <span className={`badge ${
                            a.status === 'approved' ? 'badge-success' : 
                            a.status === 'pending' ? 'badge-pending' : 
                            'badge-warning'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            {a.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(a)}
                                  className="px-4 py-1.5 bg-primary hover:bg-hope-green-dark text-white text-sm font-medium rounded-md transition-colors duration-150"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(a)}
                                  className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors duration-150"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {incoming.length === 0 && (
                  <div className="p-12 text-center text-hope-gray-500">
                    No pending approvals at this time
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inbox Tab - WhatsApp Style */}
          {activeTab === 'inbox' && (
            <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft overflow-hidden flex h-[600px]">
              {/* Conversations List Panel */}
              <div className="w-72 border-r border-hope-gray-200 dark:border-hope-gray-700 flex flex-col">
                <div className="p-4 border-b border-hope-gray-200 dark:border-hope-gray-700">
                  <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">💬 Messages</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {incomingContacts.length === 0 && sentMessages.length === 0 ? (
                    <div className="p-6 text-center text-hope-gray-500">
                      <p className="text-sm">No conversations yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                      {(() => {
                        const conversationMap = new Map();
                        incomingContacts.forEach((contact) => {
                          const userId = contact.fromUser?._id;
                          if (userId) {
                            if (!conversationMap.has(userId) || new Date(contact.createdAt) > new Date(conversationMap.get(userId).createdAt)) {
                              conversationMap.set(userId, { user: contact.fromUser, createdAt: contact.createdAt });
                            }
                          }
                        });
                        sentMessages.forEach((contact) => {
                          const userId = contact.toUser?._id;
                          if (userId) {
                            if (!conversationMap.has(userId) || new Date(contact.createdAt) > new Date(conversationMap.get(userId).createdAt)) {
                              conversationMap.set(userId, { user: contact.toUser, createdAt: contact.createdAt });
                            }
                          }
                        });
                        const sorted = Array.from(conversationMap.entries())
                          .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));
                        
                        return sorted.map(([userId, { user }]) => {
                          // Count unread messages from this user
                          const unreadCount = incomingContacts.filter(c => 
                            c.fromUser?._id === userId && c.status === 'new'
                          ).length;
                          
                          return (
                            <div
                              key={userId}
                              onClick={() => setSelectedConversation(userId)}
                              className={`p-4 cursor-pointer transition-colors ${
                                selectedConversation === userId
                                  ? 'bg-primary/10 dark:bg-primary/20'
                                  : 'hover:bg-hope-gray-50 dark:hover:bg-hope-gray-700'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center font-semibold text-hope-gray-700 dark:text-hope-gray-300 flex-shrink-0 text-lg relative">
                                  {user?.name?.charAt(0).toUpperCase()}
                                  {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-xs rounded-full flex items-center justify-center">
                                      {unreadCount}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className={`text-sm truncate ${unreadCount > 0 ? 'font-bold text-hope-gray-900 dark:text-hope-gray-100' : 'font-semibold text-hope-gray-900 dark:text-hope-gray-100'}`}>
                                  {user?.name}
                                </h3>
                                <p className="text-xs text-hope-gray-500 dark:text-hope-gray-400 truncate">
                                  {user?.email}
                                </p>
                              </div>
                            </div>
                          </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Panel */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-hope-gray-200 dark:border-hope-gray-700 flex items-center gap-3">
                      {(() => {
                        const allContacts = [...incomingContacts, ...sentMessages];
                        const conversation = allContacts.find(
                          (c) => c.fromUser?._id === selectedConversation || c.toUser?._id === selectedConversation
                        );
                        const otherUser = conversation?.fromUser?._id === selectedConversation ? conversation.fromUser : conversation?.toUser;
                        return (
                          <>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center font-semibold text-hope-gray-700 dark:text-hope-gray-300">
                              {otherUser?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-hope-gray-900 dark:text-hope-gray-100">{otherUser?.name}</h3>
                              <p className="text-xs text-hope-gray-500 dark:text-hope-gray-400">{otherUser?.email}</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {(() => {
                        const allContacts = [...incomingContacts, ...sentMessages];
                        const conversation = allContacts
                          .filter((c) => c.fromUser?._id === selectedConversation || c.toUser?._id === selectedConversation)
                          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                        if (conversation.length === 0) {
                          return <p className="text-center text-hope-gray-500 mt-8">No messages yet</p>;
                        }

                        return conversation.map((contact) => {
                          // If fromUser._id matches selectedConversation, message is FROM other user (left)
                          // If toUser._id matches selectedConversation, message is TO other user, FROM me (right)
                          const isFromOtherUser = contact.fromUser?._id === selectedConversation;
                          return (
                            <div key={contact._id} className="space-y-2">
                              {/* Main Message */}
                              <div className={`flex ${isFromOtherUser ? 'justify-start' : 'justify-end'} gap-2`}>
                                {isFromOtherUser && (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center font-semibold text-hope-gray-700 dark:text-hope-gray-300 text-xs flex-shrink-0">
                                    {contact.fromUser?.name?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div
                                  onClick={() => setExpandedContact(contact._id)}
                                  className={`max-w-xs px-4 py-2 rounded-lg cursor-pointer transition-all ${
                                    isFromOtherUser
                                      ? 'bg-hope-gray-100 dark:bg-hope-gray-700 text-hope-gray-900 dark:text-hope-gray-100 hover:bg-hope-gray-200 dark:hover:bg-hope-gray-600'
                                      : 'bg-primary text-white hover:bg-hope-green-dark'
                                  } ${expandedContact === contact._id ? 'ring-2 ring-secondary' : ''}`}
                                >
                                  <p className="text-sm break-words">{contact.message}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(contact.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>

                              {/* Replies */}
                              {contact.replies && contact.replies.length > 0 && (
                                <div className="space-y-2">
                                  {contact.replies.map((reply, idx) => {
                                    const isReplyFromOther = reply.fromUser?._id === selectedConversation;
                                    return (
                                      <div key={idx} className={`flex ${isReplyFromOther ? 'justify-start' : 'justify-end'} gap-2 ml-4`}>
                                        {isReplyFromOther && (
                                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center font-semibold text-hope-gray-700 dark:text-hope-gray-300 text-xs flex-shrink-0">
                                            {reply.fromUser?.name?.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div
                                          className={`max-w-xs px-3 py-1.5 rounded-lg text-sm ${
                                            isReplyFromOther
                                              ? 'bg-hope-gray-100 dark:bg-hope-gray-700 text-hope-gray-900 dark:text-hope-gray-100'
                                              : 'bg-primary/80 text-white'
                                          }`}
                                        >
                                          <p className="break-words">{reply.message}</p>
                                          <p className="text-xs opacity-70 mt-0.5">
                                            {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Reply Input */}
                    <div className="p-4 border-t border-hope-gray-200 dark:border-hope-gray-700 bg-hope-gray-50 dark:bg-hope-gray-800">
                      <div className="flex gap-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type a message..."
                          maxLength={2000}
                          rows={1}
                          className="input-fiverr flex-1 text-sm resize-none"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                              e.preventDefault();
                              handleNewMessage();
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            handleNewMessage();
                          }}
                          disabled={!replyText.trim()}
                          className="px-4 py-2 bg-primary hover:bg-hope-green-dark text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Send
                        </button>
                      </div>
                      {!expandedContact && replyText.trim() && (
                        <p className="text-xs text-hope-gray-500 mt-2">💬 Press Enter or click Send to reply</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-hope-gray-500 text-center">
                    <div>
                      <p className="text-lg font-medium">Select a conversation to chat</p>
                      <p className="text-sm">Choose from the list on the left</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
