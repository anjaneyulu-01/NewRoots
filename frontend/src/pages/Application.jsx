import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import EventCard from '../components/EventCard.jsx';
import JobCard from '../components/JobCard.jsx';
import HousingCard from '../components/HousingCard.jsx';
import CategoryCard from '../components/CategoryCard.jsx';

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function Application() {
  const [events, setEvents] = useState([]);
  const [housing, setHousing] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '' });
  const [newJob, setNewJob] = useState({ title: '', description: '', company: '', address: '', pay: '' });
  const [newHousing, setNewHousing] = useState({ title: '', description: '', address: '', rent: '' });
  const [createMode, setCreateMode] = useState(null); // 'event', 'job', 'housing', or null

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ev, house, jb] = await Promise.all([
      axios.get('/api/events').then((r) => r.data.events),
      axios.get('/api/housing').then((r) => r.data.housing),
      axios.get('/api/jobs').then((r) => r.data.jobs),
    ]);
    setEvents(ev);
    setHousing(house);
    setJobs(jb);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    const payload = { ...newEvent, date: new Date(newEvent.date) };
    const res = await api.post('/api/events', payload);
    setEvents((prev) => [res.data.event, ...prev]);
    setNewEvent({ title: '', description: '', date: '' });
    setShowCreateModal(false);
  };

  const createJob = async (e) => {
    e.preventDefault();
    const payload = { ...newJob, pay: newJob.pay ? Number(newJob.pay) : undefined };
    const res = await api.post('/api/jobs', payload);
    setJobs((prev) => [res.data.job, ...prev]);
    setNewJob({ title: '', description: '', company: '', address: '', pay: '' });
    setShowCreateModal(false);
    setCreateMode(null);
  };

  const createHousing = async (e) => {
    e.preventDefault();
    const payload = { ...newHousing, rent: newHousing.rent ? Number(newHousing.rent) : undefined };
    const res = await api.post('/api/housing', payload);
    setHousing((prev) => [res.data.housing, ...prev]);
    setNewHousing({ title: '', description: '', address: '', rent: '' });
    setShowCreateModal(false);
    setCreateMode(null);
  };

  const applyToEvent = async (eventId) => {
    try {
      await api.post(`/api/events/${eventId}/apply`, { note: '', amount: 0 });
      alert('Successfully applied to event! Check your dashboard for updates.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query.toLowerCase());
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
                <EventCard key={event._id} event={event} onApply={applyToEvent} />
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
                <JobCard key={job._id} job={job} />
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
                <HousingCard key={house._id} housing={house} />
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
                  <button type="submit" className="btn-primary w-full">Create Event</button>
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
                  <button type="submit" className="btn-primary w-full">Post Job</button>
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
                  <button type="submit" className="btn-primary w-full">List Housing</button>
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
    </div>
  );
}
