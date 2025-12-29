import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import api from '../api';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [myJobs, setMyJobs] = useState([]);
  const [myHousing, setMyHousing] = useState([]);
  const [housing, setHousing] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [bounds, setBounds] = useState(null);
  const [incomingContacts, setIncomingContacts] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [inboxTab, setInboxTab] = useState('received');
  const [expandedContact, setExpandedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventData, setNewEventData] = useState({ title: '', description: '', date: '', location: { address: '' }, imageUrl: '', imageData: '' });
  const [createEventError, setCreateEventError] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);

  const loadDashboardData = async (force = false) => {
    let earnData = { totals: { total: 0, paid: 0, pending: 0 }, perEvent: [] };
    let myEvData = { events: [], counts: [] };
    let appsData = { applications: [] };
    let incomingAppsData = { applications: [] };
    let houseData = { housing: [] };
    let jobData = { jobs: [] };
    let myJData = { jobs: [] };
    let myHData = { housing: [] };
    let contacts = [];
    let sent = [];

    try {
      // Use centralized api instance; let global response interceptor handle 401s
      const earnRes = await api.get('/api/earnings/me');
      earnData = earnRes.data;

      const myEvRes = await api.get('/api/events/me', { params: force ? { t: Date.now() } : {} });
      myEvData = myEvRes.data;

      const appsRes = await api.get('/api/applications/me');
      appsData = appsRes.data;

      const incomingAppsRes = await api.get('/api/applications/incoming');
      incomingAppsData = incomingAppsRes.data;

      const houseRes = await api.get('/api/housing');
      houseData = houseRes.data;

      const jobRes = await api.get('/api/jobs');
      jobData = jobRes.data;

      const myJRes = await api.get('/api/jobs/me', { params: force ? { t: Date.now() } : {} });
      myJData = myJRes.data;

      const myHRes = await api.get('/api/housing/me', { params: force ? { t: Date.now() } : {} });
      myHData = myHRes.data;

      contacts = (await api.get('/api/contact/me')).data.messages || [];
      sent = (await api.get('/api/contact/sent')).data.messages || [];
    } catch (err) {
      // Global interceptor will redirect on 401. Log other errors and fall back to defaults set above.
      console.error('Failed to load dashboard data', err);
    }

    setEarnings(earnData);
    setMyEvents(myEvData.events || []);
    setMyEventCounts(myEvData.counts || []);
    setMyApplications(appsData.applications || []);
    setIncoming(incomingAppsData.applications || []);
    setHousing(houseData.housing || []);
    setJobs(jobData.jobs || []);
    setMyJobs(myJData.jobs || []);
    setMyHousing(myHData.housing || []);
    setIncomingContacts(contacts);
    setSentMessages(sent);

    // Compute bounds across housing + jobs with coords
    const points = [];
    (houseData.housing || []).forEach(h => { if (h.lat && h.lng) points.push([h.lat, h.lng]); });
    (jobData.jobs || []).forEach(j => { if (j.lat && j.lng) points.push([j.lat, j.lng]); });
    if (points.length) setBounds(L.latLngBounds(points)); else setBounds(null);
  };

  useEffect(() => { loadDashboardData(); }, []);

  // Edit/Delete handlers
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingType, setEditingType] = useState(null); // 'event' | 'job' | 'housing'
  const [editingItem, setEditingItem] = useState(null);
  const [editData, setEditData] = useState({});

  const openEdit = (type, item) => {
    setEditingType(type);
    setEditingItem(item);
    setEditData({ ...item });
    setShowEditModal(true);
  };

  const submitEdit = async () => {
    if (!editingItem) return;
    try {
      const urlBase = editingType === 'event' ? '/api/events' : editingType === 'job' ? '/api/jobs' : '/api/housing';
      // Normalize payload to match backend Joi schemas:
      const payload = { ...editData };
      if (editingType === 'event') {
        // backend expects `location.address`, not top-level `address`
        if (payload.address && (!payload.location || !payload.location.address)) {
          payload.location = { ...(payload.location || {}), address: payload.address };
        }
        delete payload.address;
      } else {
        // jobs/housing expect top-level `address`; move from location.address if present
        if (payload.location && payload.location.address) {
          payload.address = payload.location.address;
        }
        delete payload.location;
      }
      const res = await api.put(`${urlBase}/${editingItem._id}`, payload).catch(async (e) => { throw e; });
      // update local state immediately using returned object when possible
      const data = res.data || {};
      if (editingType === 'event' && data.event) {
        const updated = { ...data.event, image: data.event.image ? `${data.event.image}?t=${Date.now()}` : data.event.image };
        setMyEvents((prev) => prev.map((x) => (x._id === data.event._id ? updated : x)));
      } else if (editingType === 'job' && data.job) {
        const updated = { ...data.job, image: data.job.image ? `${data.job.image}?t=${Date.now()}` : data.job.image };
        setMyJobs((prev) => prev.map((x) => (x._id === data.job._id ? updated : x)));
      } else if (editingType === 'housing' && data.housing) {
        const updated = { ...data.housing, image: data.housing.image ? `${data.housing.image}?t=${Date.now()}` : data.housing.image };
        setMyHousing((prev) => prev.map((x) => (x._id === data.housing._id ? updated : x)));
      } else {
        // fallback to full reload (force bypass cache)
        await loadDashboardData(true);
      }
      // always refresh to ensure image URLs are up-to-date
      await loadDashboardData(true);
      setShowEditModal(false);
    } catch (err) {
      console.error('Edit failed', err);
      const msg = err.response?.data?.error || (err.response?.data ? JSON.stringify(err.response.data) : err.message) || 'Update failed';
      alert(msg);
    }
  };

  const deleteEvent = async (id) => {
    if (!confirm('Delete this event? This will remove all applications.')) return;
    await api.delete(`/api/events/${id}`);
    loadDashboardData();
  };

  const deleteJob = async (id) => {
    if (!confirm('Delete this job?')) return;
    await api.delete(`/api/jobs/${id}`);
    loadDashboardData();
  };

  const deleteHousing = async (id) => {
    if (!confirm('Delete this listing?')) return;
    await api.delete(`/api/housing/${id}`);
    loadDashboardData();
  };

  // file upload handler for edit modal
  const handleEditFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditData((p) => ({ ...p, imageData: reader.result, imageUrl: '' }));
    reader.readAsDataURL(file);
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
      const allContacts = [...(Array.isArray(incomingContacts) ? incomingContacts : []), ...(Array.isArray(sentMessages) ? sentMessages : [])];
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
      const unreadMessages = Array.isArray(incomingContacts)
        ? incomingContacts.filter((c) => c.fromUser?._id === userId && c.status === 'new')
        : [];

      // Mark each unread message as read
      await Promise.all(
        (Array.isArray(unreadMessages) ? unreadMessages : []).map((msg) => api.post(`/api/contact/${msg._id}/read`))
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

  const pendingApprovals = Array.isArray(incoming) ? incoming.filter(a => a.status === 'pending').length : 0;
  const totalApplicants = Array.isArray(myEventCounts)
    ? myEventCounts.reduce((sum, c) => sum + (c?.applicants ?? 0), 0)
    : 0;

  // Helper component to fit bounds after data load
  function FitMarkersBounds({ bounds }) {
    const map = useMap();
    useEffect(() => {
      // Guard against using a map instance that is not mounted
      if (!map || !map._container) return;

      // Ensure map size is correct when the component mounts
      try {
        if (typeof map.invalidateSize === 'function') {
          setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* ignore */ } }, 100);
        }
      } catch (e) {
        // ignore
      }

      if (bounds) {
        // Cap max zoom when fitting bounds to avoid extreme zoom values
        try {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
        } catch (e) {
          console.warn('fitBounds failed', e);
        }
      }

      // Recalculate size after user zooms to avoid blank tiles from transform issues
      const onZoomEnd = () => {
        try {
          if (typeof map.invalidateSize === 'function') {
            setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* ignore */ } }, 50);
          }
        } catch (e) {
          // ignore
        }
      };

      map.on && map.on('zoomend', onZoomEnd);

      return () => {
        map.off && map.off('zoomend', onZoomEnd);
      };
    }, [bounds, map]);
    return null;
  }

  // Create event helpers
  const handleEventFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewEventData((prev) => ({ ...prev, imageData: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const createEvent = async () => {
    setCreateEventError('');
    if (!newEventData.title || newEventData.title.trim().length < 3) {
      setCreateEventError('Title must be at least 3 characters');
      return;
    }
    if (!newEventData.date) {
      setCreateEventError('Please provide a date');
      return;
    }
    const d = new Date(newEventData.date);
    if (Number.isNaN(d.getTime())) { setCreateEventError('Invalid date'); return; }
    if (!newEventData.location || !newEventData.location.address) {
      setCreateEventError('Please provide an address or pick a location');
      return;
    }
    try {
      const payload = {
        title: newEventData.title,
        description: newEventData.description,
        date: newEventData.date,
        location: { address: newEventData.location.address },
        imageUrl: newEventData.imageUrl || undefined,
        imageData: newEventData.imageData || undefined,
      };
      const res = await api.post('/api/events', payload);
      setShowCreateEvent(false);
      setNewEventData({ title: '', description: '', date: '', location: { address: '' }, imageUrl: '', imageData: '' });
      loadDashboardData();
    } catch (err) {
      console.error('Create event failed', err);
      setCreateEventError(err.response?.data?.error || 'Failed to create event');
    }
  };

  return (
    <div className="min-h-screen transition-theme bg-hope-gray-50 dark:bg-hope-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-hope-gray-900 dark:text-hope-gray-100 mb-2">
              My Dashboard
            </h1>
            <p className="text-hope-gray-600 dark:text-hope-gray-400">
              Manage your events, applications, and earnings
            </p>
          </div>
          <div className="ml-4">
            <button
                onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '#/login';
              }}
              className="px-3 py-2 bg-hope-gray-100 dark:bg-hope-gray-800 text-hope-gray-700 dark:text-hope-gray-200 rounded-md hover:bg-hope-gray-200"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Account actions removed from here and placed at bottom of page */}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Earnings"
            value={`$${(Number(earnings?.totals?.total) || 0).toFixed(0)}`}
            subtitle={`$${(Number(earnings?.totals?.paid) || 0).toFixed(2)} paid`}
            icon="💰"
            trend={12}
          />
          <StatCard
            title="Pending Earnings"
            value={`$${(Number(earnings?.totals?.pending) || 0).toFixed(0)}`}
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
                const unreadCount = Array.isArray(incomingContacts) ? incomingContacts.filter(c => c.status === 'new').length : 0;
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
                  {Array.isArray(myApplications) && myApplications.slice(0, 5).map((app) => (
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
                      minZoom={2}
                      maxZoom={18}
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
                      {Array.isArray(housing) && housing.map((h) => (
                        h.lat && h.lng ? (
                          <Marker key={`h-${h._id}`} position={{ lat: h.lat, lng: h.lng }} />
                        ) : null
                      ))}
                      {Array.isArray(jobs) && jobs.map((j) => (
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
                      {Array.isArray(housing) && housing.slice(0, 3).map((h) => (
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
                    {Array.isArray(earnings?.perEvent) && earnings.perEvent.map((e) => (
                      <tr key={e.eventId} className="hover-row">
                        <td className="p-4 text-hope-gray-900 dark:text-hope-gray-100">{e.title}</td>
                        <td className="p-4 text-right text-primary font-semibold">${(Number(e?.paid) || 0).toFixed(2)}</td>
                        <td className="p-4 text-right text-hope-gray-600 dark:text-hope-gray-400">${(Number(e?.pending) || 0).toFixed(2)}</td>
                        <td className="p-4 text-right font-semibold text-hope-gray-900 dark:text-hope-gray-100">${(Number(e?.paid || 0) + Number(e?.pending || 0)).toFixed(2)}</td>
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
              <div className="p-6 border-b border-hope-gray-200 dark:border-hope-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">
                  My Events
                </h2>
                <div>
                  <button
                    onClick={() => setShowCreateEvent(true)}
                    className="px-3 py-1 bg-primary text-white text-sm rounded-md"
                  >
                    New Event
                  </button>
                </div>
              </div>

              {showCreateEvent && (
                <div className="p-4 border-b bg-hope-gray-50 dark:bg-hope-gray-900">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input className="input-fiverr" placeholder="Title" value={newEventData.title} onChange={(e) => setNewEventData((p) => ({ ...p, title: e.target.value }))} />
                    <input type="date" className="input-fiverr" value={newEventData.date} onChange={(e) => setNewEventData((p) => ({ ...p, date: e.target.value }))} />
                    <input className="input-fiverr col-span-2" placeholder="Address" value={newEventData.location.address} onChange={(e) => setNewEventData((p) => ({ ...p, location: { ...p.location, address: e.target.value } }))} />
                    <textarea className="input-fiverr col-span-2" placeholder="Description" value={newEventData.description} onChange={(e) => setNewEventData((p) => ({ ...p, description: e.target.value }))} />
                    <input className="input-fiverr" placeholder="Image URL" value={newEventData.imageUrl} onChange={(e) => setNewEventData((p) => ({ ...p, imageUrl: e.target.value }))} />
                    <div>
                      <label className="text-xs">Or upload an image</label>
                      <input type="file" accept="image/*" onChange={handleEventFileChange} className="mt-1" />
                      {(newEventData.imageUrl || newEventData.imageData) && (
                        <img src={newEventData.imageData || newEventData.imageUrl} alt="preview" className="mt-2 w-40 h-24 object-cover rounded" />
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={createEvent} className="px-4 py-2 bg-primary text-white rounded">Create</button>
                    <button onClick={() => setShowCreateEvent(false)} className="px-4 py-2 bg-hope-gray-200 rounded">Cancel</button>
                      {createEventError && <div className="text-sm text-red-600 mt-2">{createEventError}</div>}
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hope-gray-50 dark:bg-hope-gray-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Image</th>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Title</th>
                      <th className="text-left p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Date</th>
                      <th className="text-center p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Applicants</th>
                        <th className="text-center p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Status</th>
                        <th className="text-center p-4 text-sm font-semibold text-hope-gray-700 dark:text-hope-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                    {Array.isArray(myEvents) && myEvents.map((ev) => {
                      const count = Array.isArray(myEventCounts)
                        ? myEventCounts.find((c) => c.eventId === ev._id)?.applicants ?? 0
                        : 0;
                      return (
                        <tr key={ev._id} className="hover-row">
                          <td className="p-4">
                            {ev.image ? (
                              <img src={ev.image} alt={ev.title} className="w-20 h-12 object-cover rounded" />
                            ) : (
                              <div className="w-20 h-12 bg-hope-gray-100 dark:bg-hope-gray-700 rounded flex items-center justify-center">🎉</div>
                            )}
                          </td>
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
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openEdit('event', ev)} className="px-3 py-1 bg-hope-gray-200 rounded">Edit</button>
                              <button onClick={() => deleteEvent(ev._id)} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* My Jobs Tab */}
          {activeTab === 'my-jobs' && (
            <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-hope-gray-200 dark:border-hope-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">My Jobs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hope-gray-50 dark:bg-hope-gray-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold">Title</th>
                      <th className="text-left p-4 text-sm font-semibold">Company</th>
                      <th className="text-left p-4 text-sm font-semibold">Address</th>
                      <th className="text-center p-4 text-sm font-semibold">Pay</th>
                      <th className="text-center p-4 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                    {Array.isArray(myJobs) && myJobs.map((j) => (
                      <tr key={j._id} className="hover-row">
                        <td className="p-4 font-medium">{j.title}</td>
                        <td className="p-4">{j.company}</td>
                        <td className="p-4">{j.address}</td>
                        <td className="p-4 text-center">{j.pay ? `$${j.pay}` : '—'}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openEdit('job', j)} className="px-3 py-1 bg-hope-gray-200 rounded">Edit</button>
                            <button onClick={() => deleteJob(j._id)} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* My Housing Tab */}
          {activeTab === 'my-housing' && (
            <div className="bg-white dark:bg-hope-gray-800 rounded-xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-hope-gray-200 dark:border-hope-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100">My Housing</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hope-gray-50 dark:bg-hope-gray-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold">Title</th>
                      <th className="text-left p-4 text-sm font-semibold">Image</th>
                      <th className="text-left p-4 text-sm font-semibold">Address</th>
                      <th className="text-center p-4 text-sm font-semibold">Rent</th>
                      <th className="text-center p-4 text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                    {Array.isArray(myHousing) && myHousing.map((h) => (
                      <tr key={h._id} className="hover-row">
                        <td className="p-4 font-medium">{h.title}</td>
                        <td className="p-4">
                          {h.image ? (
                            <img src={h.image} alt={h.title} className="w-24 h-14 object-cover rounded" />
                          ) : (
                            <div className="w-24 h-14 bg-hope-gray-100 dark:bg-hope-gray-700 flex items-center justify-center">🏠</div>
                          )}
                        </td>
                        <td className="p-4">{h.address}</td>
                        <td className="p-4 text-center">${h.rent}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openEdit('housing', h)} className="px-3 py-1 bg-hope-gray-200 rounded">Edit</button>
                            <button onClick={() => deleteHousing(h._id)} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                    {Array.isArray(myApplications) && myApplications.map((a) => (
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
                    {Array.isArray(incoming) && incoming.map((a) => (
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
                            {/* Delete notification for this application */}
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this notification? This will remove the application record.')) return;
                                    try {
                                    try {
                                    await api.delete(`/api/events/${a.event._id || a.event._id}/applications/${a._id}`);
                                  } catch (e) {
                                    // if DELETE specifically returned 404 or is blocked, try POST fallback
                                    if (e.response?.status === 404 || e.response?.status === 405 || !e.response) {
                                      await api.post(`/api/events/${a.event._id}/applications/${a._id}/delete`);
                                    } else {
                                      throw e;
                                    }
                                  }
                                  await loadDashboardData(true);
                                } catch (err) {
                                  console.error('Failed to delete application', err);
                                  const server = err.response?.data;
                                  const msg = server?.error || server?.details || err.message || 'Failed to delete notification';
                                  alert(msg);
                                }
                              }}
                              className="px-3 py-1 bg-hope-gray-200 text-hope-gray-800 rounded"
                            >
                              Delete
                            </button>
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
                  {(Array.isArray(incomingContacts) ? incomingContacts.length : 0) === 0 && (Array.isArray(sentMessages) ? sentMessages.length : 0) === 0 ? (
                    <div className="p-6 text-center text-hope-gray-500">
                      <p className="text-sm">No conversations yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-hope-gray-100 dark:divide-hope-gray-700">
                      {(() => {
                        const conversationMap = new Map();
                        Array.isArray(incomingContacts) && incomingContacts.forEach((contact) => {
                          const userId = contact.fromUser?._id;
                          if (userId) {
                            if (!conversationMap.has(userId) || new Date(contact.createdAt) > new Date(conversationMap.get(userId).createdAt)) {
                              conversationMap.set(userId, { user: contact.fromUser, createdAt: contact.createdAt });
                            }
                          }
                        });
                        Array.isArray(sentMessages) && sentMessages.forEach((contact) => {
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
                            const unreadCount = Array.isArray(incomingContacts)
                              ? incomingContacts.filter(c => String(c.fromUser?._id) === String(userId) && c.status === 'new').length
                              : 0;
                          
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
                    <div className="p-4 border-b border-hope-gray-200 dark:border-hope-gray-700 flex items-center justify-between gap-3">
                      {(() => {
                        const allContacts = [...(Array.isArray(incomingContacts) ? incomingContacts : []), ...(Array.isArray(sentMessages) ? sentMessages : [])];
                        const conversation = allContacts.find(
                          (c) => String(c.fromUser?._id) === String(selectedConversation) || String(c.toUser?._id) === String(selectedConversation)
                        );
                        const otherUser = String(conversation?.fromUser?._id) === String(selectedConversation) ? conversation.fromUser : conversation?.toUser;
                        return (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center font-semibold text-hope-gray-700 dark:text-hope-gray-300">
                                {otherUser?.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-hope-gray-900 dark:text-hope-gray-100">{otherUser?.name}</h3>
                                <p className="text-xs text-hope-gray-500 dark:text-hope-gray-400">{otherUser?.email}</p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            if (!confirm('Clear chat in your dashboard? This will hide messages only for you.')) return;
                            try {
                              // try DELETE first, fall back to POST if server/proxy blocks DELETE
                              try {
                                await api.delete(`/api/contact/clear/${selectedConversation}`);
                              } catch (e) {
                                await api.post('/api/contact/clear', { otherUserId: selectedConversation });
                              }
                              await loadDashboardData(true);
                            } catch (err) {
                              console.error('Failed to clear conversation', err);
                              // show more helpful message to user when available
                              const server = err.response?.data;
                              const msg = server?.error || server?.details || err.message || 'Failed to clear chat';
                              alert(msg);
                            }
                          }}
                          className="px-3 py-1 text-sm rounded bg-hope-gray-100 dark:bg-hope-gray-800 hover:bg-hope-gray-200"
                        >
                          Clear chat
                        </button>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {(() => {
                        const allContacts = [...(Array.isArray(incomingContacts) ? incomingContacts : []), ...(Array.isArray(sentMessages) ? sentMessages : [])];
                        const conversation = Array.isArray(allContacts)
                          ? allContacts
                              .filter((c) => String(c.fromUser?._id) === String(selectedConversation) || String(c.toUser?._id) === String(selectedConversation))
                              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                          : [];

                        if (conversation.length === 0) {
                          return <p className="text-center text-hope-gray-500 mt-8">No messages yet</p>;
                        }

                        return Array.isArray(conversation) ? conversation.map((contact) => {
                          // If fromUser._id matches selectedConversation, message is FROM other user (left)
                          // If toUser._id matches selectedConversation, message is TO other user, FROM me (right)
                          const isFromOtherUser = String(contact.fromUser?._id) === String(selectedConversation);
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
                                  {Array.isArray(contact.replies) && contact.replies.map((reply, idx) => {
                                    const isReplyFromOther = String(reply.fromUser?._id) === String(selectedConversation);
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
                        }) : null;
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

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)} />
            <div className="relative bg-white dark:bg-hope-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl z-10">
              <h3 className="text-lg font-semibold text-hope-gray-900 dark:text-hope-gray-100 mb-4">Edit {editingType}</h3>
              <div className="space-y-3">
                <input
                  className="w-full input-fiverr"
                  placeholder="Title"
                  value={editData.title || ''}
                  onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
                />

                <textarea
                  className="w-full input-fiverr h-24"
                  placeholder="Description"
                  value={editData.description || ''}
                  onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
                />

                {editingType === 'event' && (
                  <input
                    type="date"
                    className="input-fiverr"
                    value={editData.date ? editData.date.split('T')[0] : ''}
                    onChange={(e) => setEditData((p) => ({ ...p, date: e.target.value }))}
                  />
                )}

                {(editingType === 'job' || editingType === 'housing') && (
                  <input
                    className="input-fiverr"
                    placeholder={editingType === 'job' ? 'Company' : 'Address'}
                    value={editingType === 'job' ? (editData.company || '') : (editData.address || editData.location?.address || '')}
                    onChange={(e) => {
                      if (editingType === 'job') setEditData((p) => ({ ...p, company: e.target.value }));
                      else setEditData((p) => ({ ...p, location: { ...(p.location || {}), address: e.target.value }, address: e.target.value }));
                    }}
                  />
                )}

                {editingType === 'job' && (
                  <input
                    className="input-fiverr"
                    placeholder="Pay"
                    value={editData.pay || ''}
                    onChange={(e) => setEditData((p) => ({ ...p, pay: e.target.value }))}
                  />
                )}

                {editingType === 'housing' && (
                  <input
                    className="input-fiverr"
                    placeholder="Rent"
                    value={editData.rent || ''}
                    onChange={(e) => setEditData((p) => ({ ...p, rent: e.target.value }))}
                  />
                )}

                <input
                  className="input-fiverr"
                  placeholder="Image URL"
                  value={editData.imageUrl || ''}
                  onChange={(e) => setEditData((p) => ({ ...p, imageUrl: e.target.value, imageData: '' }))}
                />

                <div>
                  <label className="text-sm text-hope-gray-600">Or upload image</label>
                  <input type="file" accept="image/*" onChange={handleEditFile} className="mt-1" />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-hope-gray-200 rounded">Cancel</button>
                  <button onClick={submitEdit} className="px-4 py-2 bg-primary text-white rounded">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
      {/* Account actions - moved to bottom */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mt-12 border-t pt-6">
          <h2 className="text-lg font-semibold text-hope-gray-800 dark:text-hope-gray-100 mb-3">Account</h2>
          <div className="text-sm text-hope-gray-600 dark:text-hope-gray-400 mb-4">If you delete your account, your profile and data will be removed. This action is irreversible.</div>
          <button
            onClick={async () => {
              if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
              try {
                await api.delete('/api/auth/me');
                // clear token and redirect to login
                localStorage.removeItem('token');
                window.location.href = '#/login';
              } catch (err) {
                alert(err.response?.data?.error || 'Failed to delete account');
              }
            }}
            className="btn-ghost border border-rose-500 text-rose-600 px-4 py-2 rounded"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
