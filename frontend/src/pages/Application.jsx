import React, { useEffect, useState } from 'react';
import api from '../api';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import EventCard from '../components/EventCard.jsx';
import JobCard from '../components/JobCard.jsx';
import HousingCard from '../components/HousingCard.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import ContactModal from '../components/ContactModal.jsx';
import { compressImage, getBase64SizeMB } from '../utils/imageCompressor';

// centralized `api` imported above

export default function Application() {
  const [events, setEvents] = useState([]);
  const [housing, setHousing] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyTarget, setApplyTarget] = useState(null); // { type: 'events'|'jobs'|'housing', id }
  const [applyForm, setApplyForm] = useState({ fullName: '', phone: '', dob: '', details: '', amount: '' });
  const [applyError, setApplyError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationPickerMode, setLocationPickerMode] = useState(null); // 'event', 'job', 'housing'
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactModal, setContactModal] = useState({ resourceType: null, resourceId: null });

  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: null, imageUrl: '', imageData: '' });
  const [newJob, setNewJob] = useState({ title: '', description: '', company: '', address: '', pay: '', location: null, imageUrl: '', imageData: '' });
  const [newHousing, setNewHousing] = useState({ title: '', description: '', address: '', rent: '', location: null, imageUrl: '', imageData: '' });
  const [createError, setCreateError] = useState('');
  const [createMode, setCreateMode] = useState(null); // 'event', 'job', 'housing', or null

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ev, house, jb] = await Promise.all([
      api.get('/api/events').then((r) => r.data?.events ?? []),
      api.get('/api/housing').then((r) => r.data?.housing ?? []),
      api.get('/api/jobs').then((r) => r.data?.jobs ?? []),
    ]);
    setEvents(ev ?? []);
    setHousing(house ?? []);
    setJobs(jb ?? []);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newEvent.title || newEvent.title.trim().length < 3) { setCreateError('Title must be at least 3 characters'); return; }
    if (!newEvent.date) { setCreateError('Please pick a date for the event'); return; }
    const eventDate = new Date(newEvent.date);
    if (Number.isNaN(eventDate.getTime())) { setCreateError('Invalid date'); return; }
    if (!newEvent.location) { setCreateError('Please pick a location on the map for the event'); return; }
    const payload = {
      title: newEvent.title,
      description: newEvent.description,
      date: eventDate,
      location: {
        address: newEvent.location.address,
        lat: newEvent.location.lat,
        lng: newEvent.location.lng,
      },
      imageUrl: newEvent.imageUrl || undefined,
      imageData: newEvent.imageData || undefined,
    };
    try {
      const res = await api.post('/api/events', payload);
      setEvents((prev) => [res.data.event, ...prev]);
      setNewEvent({ title: '', description: '', date: '' });
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create event');
    }
  };

  const createJob = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newJob.title || newJob.title.trim().length < 3) { setCreateError('Job title must be at least 3 characters'); return; }
    if (newJob.pay && Number(newJob.pay) < 0) { setCreateError('Pay must be a positive number'); return; }
    if (!newJob.location) { setCreateError('Please pick a location on the map for the job'); return; }
    const payload = {
      title: newJob.title,
      description: newJob.description,
      company: newJob.company,
      address: newJob.location.address,
      lat: newJob.location.lat,
      lng: newJob.location.lng,
      pay: newJob.pay ? Number(newJob.pay) : undefined,
      imageUrl: newJob.imageUrl || undefined,
      imageData: newJob.imageData || undefined,
    };
    try {
      const res = await api.post('/api/jobs', payload);
      setJobs((prev) => [res.data.job, ...prev]);
      setNewJob({ title: '', description: '', company: '', address: '', pay: '' });
      setShowCreateModal(false);
      setCreateMode(null);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to post job');
    }
  };

  const createHousing = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newHousing.title || newHousing.title.trim().length < 3) { setCreateError('Title must be at least 3 characters'); return; }
    if (!newHousing.rent || Number(newHousing.rent) < 0) { setCreateError('Rent must be a positive number'); return; }
    if (!newHousing.location) { setCreateError('Please pick a location on the map for the housing'); return; }
    const payload = {
      title: newHousing.title,
      description: newHousing.description,
      address: newHousing.location.address,
      lat: newHousing.location.lat,
      lng: newHousing.location.lng,
      rent: newHousing.rent ? Number(newHousing.rent) : undefined,
      imageUrl: newHousing.imageUrl || undefined,
      imageData: newHousing.imageData || undefined,
    };
    try {
      const res = await api.post('/api/housing', payload);
      setHousing((prev) => [res.data.housing, ...prev]);
      setNewHousing({ title: '', description: '', address: '', rent: '' });
      setShowCreateModal(false);
      setCreateMode(null);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to list housing');
    }
  };

  // File input handlers convert selected file to base64 data URL
  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleEventFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const compressed = await compressImage(f, { maxSizeMB: 1, maxWidthOrHeight: 1920, quality: 0.75 });
      const sizeMB = getBase64SizeMB(compressed);
      console.log(`Event image compressed to ${sizeMB.toFixed(2)}MB`);
      setNewEvent((p) => ({ ...p, imageData: compressed, imageUrl: '' }));
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('Failed to process image. Please try a different image.');
    }
  };

  const handleJobFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const compressed = await compressImage(f, { maxSizeMB: 1, maxWidthOrHeight: 1920, quality: 0.75 });
      const sizeMB = getBase64SizeMB(compressed);
      console.log(`Job image compressed to ${sizeMB.toFixed(2)}MB`);
      setNewJob((p) => ({ ...p, imageData: compressed, imageUrl: '' }));
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('Failed to process image. Please try a different image.');
    }
  };

  const handleHousingFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const compressed = await compressImage(f, { maxSizeMB: 1, maxWidthOrHeight: 1920, quality: 0.75 });
      const sizeMB = getBase64SizeMB(compressed);
      console.log(`Housing image compressed to ${sizeMB.toFixed(2)}MB`);
      setNewHousing((p) => ({ ...p, imageData: compressed, imageUrl: '' }));
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('Failed to process image. Please try a different image.');
    }
  };

  const openApplyModal = (type, id, ownerId = null) => {
    setApplyTarget({ type, id, ownerId });
    setApplyForm({ fullName: '', phone: '', dob: '', details: '', amount: '' });
    setApplyError('');
    setShowApplyModal(true);
  };

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

  const submitApplication = async (e) => {
    e.preventDefault();
    setApplyError('');
    if (!applyForm.fullName || applyForm.fullName.trim().length < 2) { setApplyError('Full name required'); return; }
    if (!applyForm.phone || applyForm.phone.trim().length < 6) { setApplyError('Phone number required'); return; }
    try {
      const currentUserId = getCurrentUserIdFromToken();
      if (applyTarget?.ownerId && currentUserId && applyTarget.ownerId.toString() === currentUserId.toString()) {
        setApplyError('You cannot apply to your own listing');
        return;
      }
      const payload = { form: { fullName: applyForm.fullName, phone: applyForm.phone, dob: applyForm.dob, details: applyForm.details }, amount: applyForm.amount ? Number(applyForm.amount) : 0 };
      // support applying to events, jobs, and housing
      const targetType = applyTarget?.type || 'events';
      const targetId = applyTarget?.id || null;
      if (!targetId) throw new Error('No target selected for application');
      await api.post(`/api/${targetType}/${targetId}/apply`, payload);
      setShowApplyModal(false);
      alert('Application submitted — the event owner will see it in their applications.');
    } catch (err) {
      setApplyError(err.response?.data?.error || 'Failed to submit application');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query.toLowerCase());
  };

  // Location picker handler
  const handleLocationSelected = (location) => {
    if (locationPickerMode === 'event') {
      setNewEvent({ ...newEvent, location });
    } else if (locationPickerMode === 'job') {
      setNewJob({ ...newJob, location, address: location.address });
    } else if (locationPickerMode === 'housing') {
      setNewHousing({ ...newHousing, location, address: location.address });
    }
    setShowLocationPicker(false);
    setLocationPickerMode(null);
  };

  const openLocationPicker = (mode) => {
    setLocationPickerMode(mode);
    setShowLocationPicker(true);
  };

  const handleContactClick = (resourceId, resourceType, ownerId) => {
    setContactModal({ resourceType, resourceId, ownerId });
    setShowContactModal(true);
  };

  const filteredEvents = searchQuery 
    ? events.filter(e => e.title.toLowerCase().includes(searchQuery) || e.description?.toLowerCase().includes(searchQuery))
    : events;
  
  const filteredJobs = searchQuery 
    ? jobs.filter(j => j.title.toLowerCase().includes(searchQuery) || j.company?.toLowerCase().includes(searchQuery))
    : jobs;
  
  const filteredHousing = searchQuery 
    ? housing.filter(h => h.title.toLowerCase().includes(searchQuery) || h.address?.toLowerCase().includes(searchQuery))
    : housing;

  return (
    <div className="min-h-screen transition-theme bg-hope-gray-50 dark:bg-hope-gray-900">
      <Navbar showSearch={true} onSearch={handleSearch} />
      
      <Hero />

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-hope-gray-800 dark:text-hope-gray-100 mb-6">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div onClick={() => setActiveTab('events')}>
            <CategoryCard icon="🎉" title="Events" count={events.length} color="primary" />
          </div>
          <div onClick={() => setActiveTab('jobs')}>
            <CategoryCard icon="💼" title="Jobs" count={jobs.length} color="secondary" />
          </div>
          <div onClick={() => setActiveTab('housing')}>
            <CategoryCard icon="🏠" title="Housing" count={housing.length} color="accent" />
          </div>
          <div onClick={() => setActiveTab('all')}>
            <CategoryCard icon="✨" title="View All" color="primary" />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-8 border-b border-hope-gray-200 dark:border-hope-gray-700">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('events')}
              className={activeTab === 'events' ? 'tab-active' : 'tab'}
            >
              Events ({filteredEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={activeTab === 'jobs' ? 'tab-active' : 'tab'}
            >
              Jobs ({filteredJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('housing')}
              className={activeTab === 'housing' ? 'tab-active' : 'tab'}
            >
              Housing ({filteredHousing.length})
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            + Create New
          </button>
        </div>

        {/* Events Grid */}
        {(activeTab === 'events' || activeTab === 'all') && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-hope-gray-800 dark:text-hope-gray-100 mb-6">
              Community Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEvents.map((event) => (
                <EventCard 
                  key={event._id} 
                  event={event} 
                    onApply={(id, ownerId) => openApplyModal('events', id, ownerId)}
                  onContact={(id, ownerId) => handleContactClick(id, 'Event', ownerId)}
                />
              ))}
            </div>
            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-hope-gray-500">
                No events found. {searchQuery && 'Try a different search.'}
              </div>
            )}
          </section>
        )}

        {/* Jobs Grid */}
        {(activeTab === 'jobs' || activeTab === 'all') && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-hope-gray-800 dark:text-hope-gray-100 mb-6">
              Job Opportunities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredJobs.map((job) => (
                <JobCard 
                  key={job._id} 
                  job={job}
                  onApply={(id, ownerId) => openApplyModal('jobs', id, ownerId)}
                  onContact={(id, ownerId) => handleContactClick(id, 'Job', ownerId)}
                />
              ))}
            </div>
            {filteredJobs.length === 0 && (
              <div className="text-center py-12 text-hope-gray-500">
                No jobs found. {searchQuery && 'Try a different search.'}
              </div>
            )}
          </section>
        )}

        {/* Housing Grid */}
        {(activeTab === 'housing' || activeTab === 'all') && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-hope-gray-800 dark:text-hope-gray-100 mb-6">
              Available Housing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredHousing.map((house) => (
                <HousingCard 
                  key={house._id} 
                  housing={house}
                  onApply={(id, ownerId) => openApplyModal('housing', id, ownerId)}
                  onContact={(id, ownerId) => handleContactClick(id, 'Housing', ownerId)}
                />
              ))}
            </div>
            {filteredHousing.length === 0 && (
              <div className="text-center py-12 text-hope-gray-500">
                No housing found. {searchQuery && 'Try a different search.'}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowCreateModal(false); setCreateMode(null); }}>
          <div className="bg-white dark:bg-hope-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-hope-gray-800 dark:text-hope-gray-100 mb-4">
              Create New
            </h3>
            
            {!createMode ? (
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setCreateMode('event')}
                  className="w-full text-left p-4 rounded-lg border-2 border-hope-gray-200 dark:border-hope-gray-700 hover:border-primary transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🎉</span>
                    <div>
                      <div className="font-semibold text-hope-gray-800 dark:text-hope-gray-100">Create Event</div>
                      <div className="text-sm text-hope-gray-600 dark:text-hope-gray-400">Host a community gathering</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setCreateMode('job')}
                  className="w-full text-left p-4 rounded-lg border-2 border-hope-gray-200 dark:border-hope-gray-700 hover:border-secondary transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">💼</span>
                    <div>
                      <div className="font-semibold text-hope-gray-800 dark:text-hope-gray-100">Post a Job</div>
                      <div className="text-sm text-hope-gray-600 dark:text-hope-gray-400">Share employment opportunities</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setCreateMode('housing')}
                  className="w-full text-left p-4 rounded-lg border-2 border-hope-gray-200 dark:border-hope-gray-700 hover:border-accent transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🏠</span>
                    <div>
                      <div className="font-semibold text-hope-gray-800 dark:text-hope-gray-100">List Housing</div>
                      <div className="text-sm text-hope-gray-600 dark:text-hope-gray-400">Share affordable housing</div>
                    </div>
                  </div>
                </button>
              </div>
            ) : null}

            {/* Event Form */}
            {createMode === 'event' && (
              <div className="border-t border-hope-gray-200 dark:border-hope-gray-700 pt-4">
                <h4 className="font-semibold mb-3 text-hope-gray-700 dark:text-hope-gray-300">Create Event</h4>
                <form onSubmit={createEvent} className="space-y-3">
                  <input
                    className="input-fiverr text-sm"
                    placeholder="Event Title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    required
                  />
                  <textarea
                    className="input-fiverr text-sm"
                    placeholder="Description"
                    rows="2"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                  <input
                    className="input-fiverr text-sm"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => openLocationPicker('event')}
                    className="w-full p-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium"
                  >
                    {newEvent.location ? `📍 Location: ${newEvent.location.address}` : '📍 Pick Location on Map'}
                  </button>
                  <button type="submit" className="btn-primary w-full">Create Event</button>
                  {createError && <div className="text-sm text-red-600 mt-2">{createError}</div>}
                  <div className="mt-2">
                    <input className="input-fiverr text-sm" placeholder="Image URL (optional)" value={newEvent.imageUrl} onChange={(e) => setNewEvent({ ...newEvent, imageUrl: e.target.value, imageData: '' })} />
                    <div className="mt-2">
                      <label className="text-xs">Or upload image</label>
                      <input type="file" accept="image/*" onChange={handleEventFile} className="mt-1" />
                      {(newEvent.imageUrl || newEvent.imageData) && (
                        <img src={newEvent.imageData || newEvent.imageUrl} alt="preview" className="mt-2 w-40 h-24 object-cover rounded" />
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Job Form */}
            {createMode === 'job' && (
              <div className="border-t border-hope-gray-200 dark:border-hope-gray-700 pt-4">
                <h4 className="font-semibold mb-3 text-hope-gray-700 dark:text-hope-gray-300">Post Job</h4>
                <form onSubmit={createJob} className="space-y-3">
                  <input
                    className="input-fiverr text-sm"
                    placeholder="Job Title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    required
                  />
                  <textarea
                    className="input-fiverr text-sm"
                    placeholder="Description"
                    rows="2"
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  />
                  <input
                    className="input-fiverr text-sm"
                    placeholder="Company"
                    value={newJob.company}
                    onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                  />
                  <input
                    className="input-fiverr text-sm"
                    placeholder="Address"
                    value={newJob.address}
                    onChange={(e) => setNewJob({ ...newJob, address: e.target.value })}
                  />
                  <input
                    className="input-fiverr text-sm"
                    placeholder="Pay ($)"
                    type="number"
                    value={newJob.pay}
                    onChange={(e) => setNewJob({ ...newJob, pay: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => openLocationPicker('job')}
                    className="w-full p-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium"
                  >
                    {newJob.location ? `📍 Location: ${newJob.location.address}` : '📍 Pick Location on Map'}
                  </button>
                  <button type="submit" className="btn-primary w-full">Post Job</button>
                  {createError && <div className="text-sm text-red-600 mt-2">{createError}</div>}
                  <div className="mt-2">
                    <input className="input-fiverr text-sm" placeholder="Image URL (optional)" value={newJob.imageUrl} onChange={(e) => setNewJob({ ...newJob, imageUrl: e.target.value, imageData: '' })} />
                    <div className="mt-2">
                      <label className="text-xs">Or upload image</label>
                      <input type="file" accept="image/*" onChange={handleJobFile} className="mt-1" />
                      {(newJob.imageUrl || newJob.imageData) && (
                        <img src={newJob.imageData || newJob.imageUrl} alt="preview" className="mt-2 w-40 h-24 object-cover rounded" />
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Housing Form */}
            {createMode === 'housing' && (
              <div className="border-t border-hope-gray-200 dark:border-hope-gray-700 pt-4">
                <h4 className="font-semibold mb-3 text-hope-gray-700 dark:text-hope-gray-300">List Housing</h4>
                <form onSubmit={createHousing} className="space-y-3">
                  <input
                    className="input-fiverr text-sm"
                    placeholder="Housing Title"
                    value={newHousing.title}
                    onChange={(e) => setNewHousing({ ...newHousing, title: e.target.value })}
                    required
                  />
                  <textarea
                    className="input-fiverr text-sm"
                    placeholder="Description"
                    rows="2"
                    value={newHousing.description}
                    onChange={(e) => setNewHousing({ ...newHousing, description: e.target.value })}
                  />
                  <input
                    className="input-fiverr text-sm"
                    placeholder="Address"
                    value={newHousing.address}
                    onChange={(e) => setNewHousing({ ...newHousing, address: e.target.value })}
                    required
                  />
                  <input
                    className="input-fiverr text-sm"
                    placeholder="Monthly Rent ($)"
                    type="number"
                    value={newHousing.rent}
                    onChange={(e) => setNewHousing({ ...newHousing, rent: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => openLocationPicker('housing')}
                    className="w-full p-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium"
                  >
                    {newHousing.location ? `📍 Location: ${newHousing.location.address}` : '📍 Pick Location on Map'}
                  </button>
                  <button type="submit" className="btn-primary w-full">List Housing</button>
                  {createError && <div className="text-sm text-red-600 mt-2">{createError}</div>}
                  <div className="mt-2">
                    <input className="input-fiverr text-sm" placeholder="Image URL (optional)" value={newHousing.imageUrl} onChange={(e) => setNewHousing({ ...newHousing, imageUrl: e.target.value, imageData: '' })} />
                    <div className="mt-2">
                      <label className="text-xs">Or upload image</label>
                      <input type="file" accept="image/*" onChange={handleHousingFile} className="mt-1" />
                      {(newHousing.imageUrl || newHousing.imageData) && (
                        <img src={newHousing.imageData || newHousing.imageUrl} alt="preview" className="mt-2 w-40 h-24 object-cover rounded" />
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )}

            <button
              onClick={() => { 
                if (createMode) {
                  setCreateMode(null);
                } else {
                  setShowCreateModal(false);
                }
              }}
              className="mt-4 w-full btn-secondary"
            >
              {createMode ? 'Back' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowApplyModal(false)}>
          <div className="bg-white dark:bg-hope-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Apply to Event</h3>
            {(() => {
              const currentUserId = getCurrentUserIdFromToken();
              const isSelfApply = applyTarget?.ownerId && currentUserId && applyTarget.ownerId.toString() === currentUserId.toString();
              return isSelfApply ? (
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded mb-3 text-sm">You cannot apply to your own listing.</div>
              ) : null;
            })()}
            <form onSubmit={submitApplication} className="space-y-3">
              <input className="input-fiverr" placeholder="Full name" value={applyForm.fullName} onChange={(e) => setApplyForm({ ...applyForm, fullName: e.target.value })} required />
              <input className="input-fiverr" placeholder="Phone" value={applyForm.phone} onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })} required />
              <input className="input-fiverr" type="date" placeholder="Date of birth (optional)" value={applyForm.dob} onChange={(e) => setApplyForm({ ...applyForm, dob: e.target.value })} />
              <textarea className="input-fiverr" placeholder="Details / cover note" rows={3} value={applyForm.details} onChange={(e) => setApplyForm({ ...applyForm, details: e.target.value })} />
              <input className="input-fiverr" placeholder="Offer amount (optional)" type="number" value={applyForm.amount} onChange={(e) => setApplyForm({ ...applyForm, amount: e.target.value })} />
              {applyError && <div className="text-sm text-red-600">{applyError}</div>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary" disabled={applyTarget?.ownerId && getCurrentUserIdFromToken() && applyTarget.ownerId.toString() === getCurrentUserIdFromToken().toString()}>Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onSelectLocation={handleLocationSelected}
          onCancel={() => {
            setShowLocationPicker(false);
            setLocationPickerMode(null);
          }}
          initialLocation={
            locationPickerMode === 'event' ? newEvent.location :
            locationPickerMode === 'job' ? newJob.location :
            locationPickerMode === 'housing' ? newHousing.location : null
          }
        />
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          resourceType={contactModal.resourceType}
          resourceId={contactModal.resourceId}
          ownerId={contactModal.ownerId}
          onClose={() => setShowContactModal(false)}
          onSuccess={() => alert('Message sent successfully!')}
        />
      )}
    </div>
  );
}
