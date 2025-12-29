import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/LocationPicker.css';

// Fix Leaflet marker icons (Vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function LocationPicker({ onSelectLocation, onCancel, initialLocation }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize map on mount
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // helper: check if container is visible (avoid display:none issues)
    const isContainerVisible = () => {
      try {
        return !!(mapContainer.current && mapContainer.current.offsetWidth && mapContainer.current.offsetHeight);
      } catch (e) {
        return false;
      }
    };

    // Create map with default center (NYC as fallback)
    try {
      map.current = L.map(mapContainer.current).setView([40.7128, -74.006], 13);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map.current);

      // Invalidate size shortly after creation to avoid _leaflet_pos issues
      setTimeout(() => {
        if (map.current && isContainerVisible() && typeof map.current.invalidateSize === 'function') {
          try {
            map.current.invalidateSize();
          } catch (e) {
            console.warn('invalidateSize failed', e);
          }
        }
      }, 200);

      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (map.current && isContainerVisible()) {
              try {
                map.current.setView([latitude, longitude], 15);
                placeMarker(latitude, longitude);
              } catch (e) {
                console.warn('Map setView/placeMarker skipped:', e);
              }
            }
          },
          () => {
            console.log('Location permission denied or unavailable');
            // Map will use default center
          }
        );
      }

      // Handle map clicks (guarded)
      if (map.current && typeof map.current.on === 'function') {
        map.current.on('click', (e) => {
          if (!map.current) return;
          const { lat, lng } = e.latlng || {};
          if (lat && lng) placeMarker(lat, lng);
        });
      }
    } catch (err) {
      console.error('Leaflet map init error:', err);
      if (map.current) {
        try {
          map.current.remove();
        } catch (e) {
          // ignore
        }
        map.current = null;
      }
    }

    return () => {
      if (map.current) {
        try {
          map.current.off();
        } catch (e) {
          // ignore
        }
        try {
          map.current.remove();
        } catch (e) {
          // ignore
        }
        map.current = null;
      }
    };
  }, []);

  // Place or update marker
  const placeMarker = async (lat, lng) => {
    try {
      if (marker.current) {
        try {
          marker.current.setLatLng([lat, lng]);
        } catch (e) {
          console.warn('marker.setLatLng failed', e);
        }
      } else {
        if (!map.current) {
          // create a temporary marker without adding to map if map isn't available
          marker.current = L.marker([lat, lng], { draggable: true });
        } else {
          marker.current = L.marker([lat, lng], { draggable: true }).addTo(map.current);

          // Update location when marker is dragged
          marker.current.on('dragend', async () => {
            try {
              if (!marker.current) return;
              const pos = marker.current.getLatLng();
              if (!pos) return;
              const { lat: newLat, lng: newLng } = pos;
              const addr = await reverseGeocode(newLat, newLng);
              setSelectedLocation({ lat: newLat, lng: newLng, address: addr });
            } catch (e) {
              console.warn('marker dragend handler error', e);
            }
          });
        }
      }

      // Center map on marker if map is visible
      if (map.current) {
        try {
          if (mapContainer.current && mapContainer.current.offsetWidth && mapContainer.current.offsetHeight) {
            map.current.setView([lat, lng], 15);
          }
        } catch (e) {
          console.warn('map.setView failed', e);
        }
      }

      // Get address from coordinates and update selection (guarded)
      const addr = await reverseGeocode(lat, lng);
      setSelectedLocation({ lat, lng, address: addr });
      return addr;
    } catch (err) {
      console.error('placeMarker error:', err);
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setSelectedLocation({ lat, lng, address: fallback });
      return fallback;
    }
  };

  // Reverse geocode coordinates to address using Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) throw new Error('Reverse geocoding failed');

      const data = await response.json();
      const street = data?.address?.road || data?.address?.pedestrian || data?.address?.path || '';
      const locality = data?.address?.city || data?.address?.town || data?.address?.village || '';
      const country = data?.address?.country || '';
      const fullAddress = street
        ? `${street}${locality ? `, ${locality}` : ''}${country ? `, ${country}` : ''}`
        : data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      setAddress(fullAddress);
      setSelectedLocation({ lat, lng, address: fullAddress });
      return fullAddress;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddress(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  };

  // Search for address using Nominatim
  const searchAddress = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      // Ensure array and guard fields used in UI
      const list = Array.isArray(data) ? data : [];
      setSearchResults(
        list.map((item) => ({
          lat: item?.lat,
          lon: item?.lon,
          display_name: item?.display_name || item?.name || '',
          name: item?.name || item?.display_name || '',
          raw: item,
        }))
      );
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (value.length > 2) {
      searchAddress(value);
    } else {
      setSearchResults([]);
    }
  };

  // Select a search result
  const handleSelectResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    await placeMarker(lat, lng);
    setSearchInput('');
    setSearchResults([]);
    // do NOT auto-confirm here — let the user explicitly confirm or use
  };

  // Use current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    // Use Permissions API when available to provide clearer guidance
    const ask = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'denied') {
            alert('Location access is blocked for this site. Please enable location permission in your browser settings and try again.');
            return;
          }
          // if 'prompt' or 'granted', proceed to request location which will show browser prompt when necessary
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            // Place marker, resolve address, and auto-confirm selection
            placeMarker(latitude, longitude).then((addr) => {
              onSelectLocation({ lat: latitude, lng: longitude, address: addr });
            });
          },
          (err) => {
            console.error('Geolocation error:', err);
            if (err.code === 1) {
              alert('Location permission denied. Please enable location permission in your browser settings.');
            } else if (err.code === 2) {
              alert('Unable to determine your location. Try again or pick a location on the map.');
            } else if (err.code === 3) {
              alert('Location request timed out. Try again.');
            } else {
              alert('Unable to get your current location. Please enable location services.');
            }
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } catch (e) {
        console.error('Permission API error:', e);
        // fallback to direct request which will trigger browser prompt if allowed
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            placeMarker(latitude, longitude).then((addr) => {
              onSelectLocation({ lat: latitude, lng: longitude, address: addr });
            });
          },
          () => alert('Unable to get your current location. Please enable location services.'),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    };

    ask();
  };

  // Confirm and return location
  const handleConfirm = () => {
    if (!selectedLocation || !selectedLocation.lat || !selectedLocation.lng) {
      alert('Please select a location by clicking on the map or searching for an address.');
      return;
    }

    const locationData = {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: address || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`,
    };

    onSelectLocation(locationData);
  };

  return (
    <div className="location-picker-wrapper">
      <div className="location-picker-container">
        {/* Header */}
        <div className="location-picker-header">
          <h3 className="location-picker-title">Select Location</h3>
          <button onClick={onCancel} className="location-picker-close">
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="location-picker-search">
          <input
            type="text"
            placeholder="Search for an address..."
            value={searchInput}
            onChange={handleSearchChange}
            className="location-picker-input"
          />
          {isSearching && <div className="location-picker-loading">Searching...</div>}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="location-picker-results">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="location-picker-result-item"
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="location-picker-result-icon">📍</div>
                  <div className="location-picker-result-text">
                    <div className="location-picker-result-name">{result.name}</div>
                    <div className="location-picker-result-address">{result.display_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div ref={mapContainer} className="location-picker-map" />

        {/* Address Display */}
        {address && (
          <div className="location-picker-address">
            <label>Selected Address:</label>
            <div className="location-picker-address-value">{address}</div>
            <div className="location-picker-address-actions">
              <button
                type="button"
                className="location-picker-btn-primary"
                onClick={() => {
                  if (!selectedLocation) return;
                  onSelectLocation({ lat: selectedLocation.lat, lng: selectedLocation.lng, address });
                }}
              >
                Use This Location
              </button>
            </div>
          </div>
        )}

        {/* Coordinates Display */}
        {selectedLocation && (
          <div className="location-picker-coords">
            <span>Lat: {selectedLocation.lat.toFixed(6)}</span>
            <span>Lng: {selectedLocation.lng.toFixed(6)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="location-picker-actions">
          <button onClick={handleUseCurrentLocation} className="location-picker-btn-secondary">
            📍 Use My Location
          </button>
          <button onClick={handleConfirm} className="location-picker-btn-primary" disabled={loading}>
            {loading ? 'Loading...' : '✓ Confirm Location'}
          </button>
        </div>
      </div>
    </div>
  );
}
