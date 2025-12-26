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

    // Create map with default center (NYC as fallback)
    map.current = L.map(mapContainer.current).setView([40.7128, -74.006], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (map.current) {
            map.current.setView([latitude, longitude], 15);
            placeMarker(latitude, longitude);
          }
        },
        () => {
          console.log('Location permission denied or unavailable');
          // Map will use default center
        }
      );
    }

    // Handle map clicks
    map.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Place or update marker
  const placeMarker = async (lat, lng) => {
    if (marker.current) {
      marker.current.setLatLng([lat, lng]);
    } else {
      marker.current = L.marker([lat, lng], {
        draggable: true,
      }).addTo(map.current);

      // Update location when marker is dragged
      marker.current.on('dragend', async () => {
        const { lat: newLat, lng: newLng } = marker.current.getLatLng();
        const addr = await reverseGeocode(newLat, newLng);
        setSelectedLocation({ lat: newLat, lng: newLng, address: addr });
      });
    }

    // Center map on marker
    if (map.current) {
      map.current.setView([lat, lng], 15);
    }

    // Get address from coordinates and update selection
    const addr = await reverseGeocode(lat, lng);
    setSelectedLocation({ lat, lng, address: addr });
    return addr;
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
      const fullAddress = data.address?.road
        ? `${data.address.road}, ${data.address.city || data.address.town || ''}, ${data.address.country || ''}`
        : data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

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
      setSearchResults(data);
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
  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    placeMarker(lat, lng);
    setSearchInput('');
    setSearchResults([]);
  };

  // Use current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Place marker, resolve address, and auto-confirm selection
          placeMarker(latitude, longitude).then((addr) => {
            onSelectLocation({ lat: latitude, lng: longitude, address: addr });
          });
        },
        () => {
          alert('Unable to get your current location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
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
