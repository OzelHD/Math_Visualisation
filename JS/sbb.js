// SBB (Schweizerische Bundesbahnen) Transport API integration
// Endpoint: https://transport.opendata.ch/v1/connections

import { AppState } from './localstorage.js';

// Get user's current geolocation
export async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        resolve({ latitude, longitude });
      },
      (err) => {
        reject(new Error(`Geolocation error: ${err.message}`));
      }
    );
  });
}

// Get nearby stations from coordinates (uses SBB API)
// Returns array of { id, name, coordinate: { x, y } }
export async function getNearbyStations(latitude, longitude, radius = 5) {
  try {
    // SBB API doesn't have a "nearby stations" endpoint, so we'll use a placeholder
    // or query a specific station name. For now, return a mock or suggest user input
    // In production, you might use a separate geolocation service like Nominatim
    
    console.log(`Searching for stations near: ${latitude}, ${longitude}`);
    
    // For now, return coordinates as-is for direct query
    return {
      lat: latitude,
      lon: longitude,
      formatted: `${latitude.toFixed(4)},${longitude.toFixed(4)}`
    };
  } catch (err) {
    throw new Error(`Failed to get nearby stations: ${err.message}`);
  }
}

// Query SBB connections endpoint
// from: "47.3769,8.5417" or station name
// to: station name or coordinates
// datetime: ISO string or "2025-12-29T14:30:00"
export async function searchConnections(from, to, datetime = null, limit = 10) {
  try {
    const url = new URL('https://transport.opendata.ch/v1/connections');
    
    url.searchParams.append('from', from);
    url.searchParams.append('to', to);
    
    if (datetime) {
      // Format: YYYY-MM-DDTHH:mm:SS
      const dt = new Date(datetime);
      const isoStr = dt.toISOString().split('.')[0]; // Remove milliseconds
      url.searchParams.append('datetime', isoStr);
    }
    
    url.searchParams.append('limit', limit);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data; // { connections: [...], stations: [...] }
  } catch (err) {
    throw new Error(`SBB API call failed: ${err.message}`);
  }
}

// Format a connection for display
export function formatConnection(connection) {
  // Safety checks
  if (!connection || !connection.from || !connection.to) {
    throw new Error('Invalid connection object');
  }
  
  const fromTime = new Date(connection.from.departure);
  const toTime = new Date(connection.to.arrival);
  const duration = (toTime - fromTime) / (1000 * 60); // minutes

  // Handle missing sections (direct connections show as 0 transfers)
  // Count only non-walk sections that require transfers
  let transfers = 0;
  if (connection.sections && Array.isArray(connection.sections)) {
    // Count transitions between journey sections (exclude walk)
    transfers = connection.sections.filter(s => s.journey).length - 1;
    transfers = Math.max(0, transfers);
  }

  return {
    from: connection.from.station?.name || 'Unknown',
    to: connection.to.station?.name || 'Unknown',
    departure: fromTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
    arrival: toTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
    duration: `${Math.floor(duration / 60)}h ${duration % 60 | 0}m`,
    transfers: transfers,
    platform: connection.from.platform || '?',
    raw: connection
  };
}

// Save search history to localStorage
export function saveSearchHistory(from, to, datetime) {
  const history = AppState.get('sbb:history', []) || [];
  history.unshift({ from, to, datetime, timestamp: new Date().toISOString() });
  // Keep only last 10
  history.splice(10);
  AppState.set('sbb:history', history);
}

// Get search history
export function getSearchHistory() {
  return AppState.get('sbb:history', []) || [];
}

// Get last search parameters
export function getLastSearch() {
  return AppState.get('sbb:lastSearch', null);
}

// Save last search
export function saveLastSearch(from, to, datetime) {
  AppState.set('sbb:lastSearch', { from, to, datetime, timestamp: new Date().toISOString() });
}

// Format detailed section information
export function formatSectionDetails(connection) {
  if (!connection || !connection.sections || !Array.isArray(connection.sections)) {
    return [];
  }

  return connection.sections.map((section, idx) => {
    const dept = new Date(section.departure.departure);
    const arrv = new Date(section.arrival.arrival);
    const deptTime = dept.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    const arvTime = arrv.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    
    // Handle walk segments vs. journey segments
    const isWalk = !section.journey;
    let journeyName = 'Walk';
    if (!isWalk && section.journey) {
      // Format: "Category Number" (e.g., "IC 5", "S 12")
      const cat = section.journey.category || '';
      const num = section.journey.number || '';
      journeyName = cat && num ? `${cat} ${num}` : (section.journey.name || 'Unknown');
    }
    const journeyCapacity = !isWalk && section.journey ? (section.journey.capacity2nd || 0) : 0;
    
    return {
      index: idx,
      isWalk: isWalk,
      name: journeyName,
      from: section.departure.station?.name || 'Unknown',
      to: section.arrival.station?.name || 'Unknown',
      departure: deptTime,
      departureTime: dept,
      departPlatform: section.departure.platform || '?',
      departDelay: section.departure.delay || 0,
      arrival: arvTime,
      arrivalTime: arrv,
      arrivalPlatform: section.arrival.platform || '?',
      arrivalDelay: section.arrival.delay || 0,
      duration: Math.round((arrv - dept) / (1000 * 60)),
      capacity2nd: journeyCapacity,
      raw: section
    };
  });
}
