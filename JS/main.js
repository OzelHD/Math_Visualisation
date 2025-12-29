// Hub that wires up feature modules and exposes needed globals for inline handlers
import { toggleSidebar, closeSidebar, applyLayout, restoreNavbar } from './navbar.js';
import { toggleSection, restoreSections } from './sections.js';
import { toggleTheme, initTheme } from './theme.js';
import { addActivityItem, addDemoItems, refreshActivityLines } from './feeds.js';
import { populateSampleData } from './populate.js';
import { 
  getUserLocation, 
  getNearbyStations, 
  searchConnections, 
  formatConnection,
  formatSectionDetails,
  saveSearchHistory,
  saveLastSearch,
  getLastSearch
} from './sbb.js';

// Expose functions for existing inline onclick handlers in HTML
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toggleSection = toggleSection;
window.toggleTheme = toggleTheme;
window.addActivityItem = addActivityItem;
window.addDemoItems = addDemoItems;
window.populateSampleData = populateSampleData;

// SBB Journey Planner handlers
window.sbbGetLocation = sbbGetLocation;
window.sbbSearch = sbbSearch;

// Hard refresh
function hardRefresh() {
	const url = new URL(window.location.href);
	url.searchParams.set('_reload', Date.now().toString());
	window.location.replace(url.toString());
}
window.hardRefresh = hardRefresh;

document.addEventListener('DOMContentLoaded', () => {
	// Initialize theme and restore UI states
	initTheme();
	restoreSections();
	restoreNavbar();
	// Keep timeline connectors accurate on load
	refreshActivityLines();
  
	// Apply responsive layout and keep it updated on resize
	applyLayout();
	window.addEventListener('resize', applyLayout);
	
	// Set default date to today for SBB
	const today = new Date().toISOString().split('T')[0];
	const dateInput = document.getElementById('sbb-date');
	if (dateInput) dateInput.value = today;
	
	// Restore last search if available
	const lastSearch = getLastSearch();
	if (lastSearch) {
		document.getElementById('sbb-from').value = lastSearch.from || '';
		document.getElementById('sbb-to').value = lastSearch.to || '';
		if (lastSearch.datetime) {
			const dt = new Date(lastSearch.datetime);
			document.getElementById('sbb-date').value = dt.toISOString().split('T')[0];
			document.getElementById('sbb-time').value = dt.toTimeString().slice(0, 5);
		}
	}
});

// SBB Journey Planner: Get user's current location
async function sbbGetLocation() {
	const statusEl = document.getElementById('sbb-status');
	const fromInput = document.getElementById('sbb-from');
	
	statusEl.textContent = '📍 Locating...';
	
	try {
		const loc = await getUserLocation();
		const coords = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
		fromInput.value = coords;
		statusEl.textContent = `✓ Located: ${coords}`;
		
		// Try to reverse geocode to station name (optional enhancement)
		// For now, we'll let the API handle coordinate queries
	} catch (err) {
		statusEl.textContent = `❌ ${err.message}`;
	}
}

// SBB Journey Planner: Search connections
async function sbbSearch() {
	const fromInput = document.getElementById('sbb-from');
	const toInput = document.getElementById('sbb-to');
	const dateInput = document.getElementById('sbb-date');
	const timeInput = document.getElementById('sbb-time');
	const statusEl = document.getElementById('sbb-status');
	const resultsEl = document.getElementById('sbb-results');
	
	const from = fromInput.value.trim();
	const to = toInput.value.trim();
	const date = dateInput.value;
	const time = timeInput.value || '09:00';
	
	if (!from || !to) {
		statusEl.textContent = '❌ Please enter both From and To stations';
		return;
	}
	
	statusEl.textContent = 'Searching...';
	
	// Remove skeleton cards on first search
	document.querySelectorAll('[data-sbb-skeleton]').forEach(el => el.remove());
	resultsEl.innerHTML = '';
	
	try {
		// Combine date and time into ISO format
		const datetime = new Date(`${date}T${time}:00`).toISOString().split('.')[0];
		
		const data = await searchConnections(from, to, datetime, 10);
		
		// Debug log to help diagnose issues
		console.log('SBB API Response:', data);
		
		// Save to history
		saveLastSearch(from, to, datetime);
		
		// Validate response structure
		if (!data) {
			statusEl.textContent = '❌ Empty response from API';
			return;
		}
		
		if (!data.connections || !Array.isArray(data.connections) || data.connections.length === 0) {
			statusEl.textContent = 'ℹ️ No connections found';
			return;
		}
		
		statusEl.textContent = `✓ Found ${data.connections.length} connections`;
		
		// Render results
		data.connections.forEach((conn, idx) => {
			try {
				if (!conn || !conn.from || !conn.to) {
					console.warn('Skipping malformed connection:', conn);
					return;
				}
				
				const formatted = formatConnection(conn);
				
				const card = document.createElement('div');
				card.className = 'bg-[#2a2a2a] border border-white/[0.12] rounded p-3 text-sm cursor-pointer hover:bg-[#333333] hover:border-blue-500/50 transition-all';
				card.innerHTML = `
					<div class="flex justify-between items-start mb-2">
						<strong>${formatted.departure}</strong>
						<span class="text-white/50">${formatted.duration}</span>
					</div>
					<div class="flex items-center gap-2 mb-2">
						<div class="flex-1">
							<div class="text-white/70 mb-1">${formatted.from}</div>
							<div class="text-white/70">${formatted.to}</div>
						</div>
						<div class="text-right">
							<div class="text-white/70 mb-1">→ ${formatted.arrival}</div>
							<div class="text-white/50">${formatted.transfers} ${formatted.transfers === 1 ? 'transfer' : 'transfers'}</div>
						</div>
					</div>
					<div class="text-white/50 text-xs">Platform: ${formatted.platform}</div>
					<div class="text-blue-400 text-xs mt-2">Click for details →</div>
				`;
				
				// Make card clickable
				card.addEventListener('click', () => showConnectionDetails(conn));
				resultsEl.appendChild(card);
			} catch (cardErr) {
				console.error('Error rendering connection card:', cardErr, conn);
			}
		});
	} catch (err) {
		console.error('SBB search error:', err);
		statusEl.textContent = `❌ ${err.message}`;
	}
}

// Show detailed connection information in modal
function showConnectionDetails(connection) {
	// Debug: log the connection structure
	console.log('Full connection object:', connection);
	console.log('Connection.sections:', connection.sections);
	
	const sections = formatSectionDetails(connection);
	
	// Create modal overlay
	const modal = document.createElement('div');
	modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto';
	
	const box = document.createElement('div');
	box.className = 'bg-[#1e1e1e] border border-white/[0.12] rounded-lg p-6 max-w-2xl w-full my-auto';
	
	// Header
	const header = document.createElement('div');
	header.className = 'mb-6 pb-4 border-b border-white/[0.12]';
	
	// Parse duration (format: PT2H15M)
	const durationStr = connection.duration || '';
	const durationMatch = durationStr.match(/PT(\d+H)?(\d+M)?/);
	let durationDisplay = '—';
	if (durationMatch) {
		const hours = durationMatch[1] ? parseInt(durationMatch[1]) + 'h ' : '';
		const mins = durationMatch[2] ? parseInt(durationMatch[2]) + 'm' : '';
		durationDisplay = (hours + mins).trim();
	}
	
	header.innerHTML = `
		<h2 class="text-xl font-semibold mb-2">Connection Details</h2>
		<p class="text-white/70 text-sm">
			${connection.from?.station?.name || 'Unknown'} → ${connection.to?.station?.name || 'Unknown'}
		</p>
		<!--<p class="text-white/50 text-xs mt-2">
			${connection.from?.departure || '?'} → ${connection.to?.arrival || '?'} · ${durationDisplay}
		</p> -->
		<p class="text-white/50 text-xs mt-1">
			<strong>Transport:</strong> ${connection.products ? connection.products.join(', ') : 'Unknown'}
		</p>
	`;
	
	box.appendChild(header);
	
	// Sections container
	const sectionsContainer = document.createElement('div');
	sectionsContainer.className = 'max-h-96 overflow-y-auto -mx-4 px-4 mb-4';
	
	// Sections section
	if (sections.length > 0) {
		sections.forEach((section, idx) => {
			const sectionCard = document.createElement('div');
			sectionCard.className = `bg-[#2a2a2a] border border-white/[0.12] rounded p-3 mb-2 ${section.isWalk ? 'opacity-75' : ''}`;
			
			const delayClass = section.departDelay > 0 || section.arrivalDelay > 0 ? 'text-red-400' : '';
			const delayText = section.departDelay > 0 ? ` <span class="text-red-400">+${section.departDelay}'</span>` : '';
			const arrDelayText = section.arrivalDelay > 0 ? ` <span class="text-red-400">+${section.arrivalDelay}'</span>` : '';
			
			// Build occupancy indicator: filled dots for capacity, outlined for empty
			let capacityHtml = '';
			if (section.capacity2nd > 0) {
				const filled = '●'.repeat(section.capacity2nd);
				const empty = '○'.repeat(3 - section.capacity2nd);
				capacityHtml = `<div class="text-xs mt-1" title="Expected occupancy 2nd class"><span class="text-yellow-400">${filled}</span><span class="text-white/30">${empty}</span></div>`;
			}
			
			sectionCard.innerHTML = `
				<div class="flex items-start justify-between mb-2">
					<div>
						<div class="text-blue-400 font-semibold text-sm">${section.name}</div>
						<div class="text-white/70 text-xs">${section.duration} min</div>
						${capacityHtml}
					</div>
				</div>
				
				<div class="space-y-1 text-sm">
					<div class="flex justify-between">
						<div class="text-white/70">
							<strong>${section.from}</strong>
							<div class="text-xs text-white/50">Platform ${section.departPlatform}${delayText}</div>
						</div>
						<div class="text-white/70 text-right">
							<strong>${section.departure}</strong>
							<div class="text-xs text-white/50">Depart</div>
						</div>
					</div>
					
					<div class="border-t border-white/[0.12] my-1"></div>
					
					<div class="flex justify-between">
						<div class="text-white/70">
							<strong>${section.to}</strong>
							<div class="text-xs text-white/50">Platform ${section.arrivalPlatform}${arrDelayText}</div>
						</div>
						<div class="text-white/70 text-right">
							<strong>${section.arrival}</strong>
							<div class="text-xs text-white/50">Arrive</div>
						</div>
					</div>
				</div>
			`;
			
			sectionsContainer.appendChild(sectionCard);
			
			// Add transfer indicator if not last section
			if (idx < sections.length - 1) {
				const transfer = document.createElement('div');
				transfer.className = 'text-center text-yellow-400 text-xs font-semibold my-2';
				transfer.textContent = '↓ CHANGE TRAIN ↓';
				sectionsContainer.appendChild(transfer);
			}
		});
		
		box.appendChild(sectionsContainer);
	} else {
		// Fallback: show raw connection info if no sections
		const noSections = document.createElement('div');
		noSections.className = 'bg-[#2a2a2a] border border-white/[0.12] rounded p-4 mb-4';
		
		const summary = document.createElement('div');
		summary.className = 'text-white/70 text-sm space-y-2';
		summary.innerHTML = `
			<p><strong>From:</strong> ${connection.from?.station?.name || '?'}</p>
			<p><strong>To:</strong> ${connection.to?.station?.name || '?'}</p>
			<p><strong>Departure:</strong> ${connection.from?.departure || '?'}</p>
			<p><strong>Arrival:</strong> ${connection.to?.arrival || '?'}</p>
			<p><strong>Departure Platform:</strong> ${connection.from?.platform || '?'}</p>
			<p><strong>Arrival Platform:</strong> ${connection.to?.platform || '?'}</p>
			<p class="text-xs text-white/50 mt-4">
				<em>Note: Detailed section information not available in API response. Check browser console for full connection data.</em>
			</p>
		`;
		
		noSections.appendChild(summary);
		box.appendChild(noSections);
	}
	
	// Close button
	const closeBtn = document.createElement('button');
	closeBtn.className = 'w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors';
	closeBtn.textContent = 'Close';
	closeBtn.addEventListener('click', () => modal.remove());
	box.appendChild(closeBtn);
	
	// Close on outside click
	modal.addEventListener('click', (e) => {
		if (e.target === modal) modal.remove();
	});
	
	// Prevent closing on inside click
	box.addEventListener('click', (e) => e.stopPropagation());
	
	modal.appendChild(box);
	document.body.appendChild(modal);
}
