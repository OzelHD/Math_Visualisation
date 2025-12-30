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
window.toggleSbbSkeletonAnimation = toggleSbbSkeletonAnimation;

let sbbSkeletonTimer = null;
let sbbSkeletonEnabled = true;

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

	// Initialize clock
	updateClock();
	setInterval(updateClock, 100);

	updateSbbAnimationToggleText();
	startSbbBounceLoader();

	// Remove legacy skeleton cards below bounce area
	document.querySelectorAll('[data-sbb-skeleton]').forEach(el => el.remove());

	// Restore last search if available (only when inputs exist)
	const lastSearch = getLastSearch();
	const fromEl = document.getElementById('sbb-from');
	const toEl = document.getElementById('sbb-to');
	const dateEl = document.getElementById('sbb-date');
	const timeEl = document.getElementById('sbb-time');
	if (lastSearch && (fromEl || toEl || dateEl || timeEl)) {
		if (fromEl) fromEl.value = lastSearch.from || '';
		if (toEl) toEl.value = lastSearch.to || '';
		if (lastSearch.datetime) {
			const dt = new Date(lastSearch.datetime);
			if (dateEl) dateEl.value = dt.toISOString().split('T')[0];
			if (timeEl) timeEl.value = dt.toTimeString().slice(0, 5);
		}
	}

	// Calculator page init
	const calcInput = document.getElementById('calc-input');
	const calcKatex = document.getElementById('calc-katex');
	if (calcInput && calcKatex) {
		calcUpdateKaTeX();
		calcInput.addEventListener('input', calcUpdateKaTeX);
	}
});

function startSbbSkeletonRotation() {
	stopSbbSkeletonRotation();
	if (!sbbSkeletonEnabled) return;

	const cards = Array.from(document.querySelectorAll('[data-sbb-skeleton]'));
	if (!cards.length) return;

	const pick = () => {
		cards.forEach(card => card.classList.remove('sbb-skeleton-active'));
		const choice = cards[Math.floor(Math.random() * cards.length)];
		if (choice) choice.classList.add('sbb-skeleton-active');
	};

	pick();
	sbbSkeletonTimer = setInterval(pick, 1800);
}

function stopSbbSkeletonRotation(clearActive = false) {
	if (sbbSkeletonTimer) {
		clearInterval(sbbSkeletonTimer);
		sbbSkeletonTimer = null;
	}

	if (clearActive) {
		document.querySelectorAll('[data-sbb-skeleton]').forEach(card => card.classList.remove('sbb-skeleton-active'));
	}
}

function toggleSbbSkeletonAnimation() {
	sbbSkeletonEnabled = !sbbSkeletonEnabled;
	if (sbbSkeletonEnabled) {
		startSbbBounceLoader();
	} else {
		// Stop but keep area so toggle back On works
		stopSbbBounceLoader(false);
	}
	updateSbbAnimationToggleText();
}

function updateSbbAnimationToggleText() {
	const btn = document.getElementById('sbb-anim-toggle');
	if (!btn) return;
	btn.textContent = sbbSkeletonEnabled ? 'Animation: On' : 'Animation: Off';
	btn.setAttribute('aria-pressed', sbbSkeletonEnabled ? 'true' : 'false');
	btn.classList.toggle('border-blue-500/60', sbbSkeletonEnabled);
	btn.classList.toggle('text-white', sbbSkeletonEnabled);
}

// Bouncing SVG loader
let sbbBounceRAF = null;
const sbbBounceDebug = false;
const sbbBounceState = {
	vx: 2.2,
	vy: 1.8,
	x: 0,
	y: 0,
	size: 80,
	icons: [],
	iconIndex: 0,
	areaEl: null,
	iconEl: null,
    currentFrame: null,
};

function getSbbIcons() {
	const svgs = document.querySelectorAll('#sbb-icon-templates svg');
	return Array.from(svgs).map(el => el.outerHTML);
}

function swapBounceIcon() {
	if (!sbbBounceState.icons.length || !sbbBounceState.iconEl) return;

	// Determine next icon HTML
	sbbBounceState.iconIndex = (sbbBounceState.iconIndex + 1) % sbbBounceState.icons.length;
	const nextHtml = sbbBounceState.icons[sbbBounceState.iconIndex];

	// Create next frame with initial enter styles
	const nextFrame = document.createElement('div');
	nextFrame.className = 'sbb-icon-frame';
	nextFrame.style.position = 'absolute';
	nextFrame.style.inset = '0';
	nextFrame.style.transition = 'opacity 300ms ease, transform 300ms ease';
	nextFrame.style.opacity = '0';
	nextFrame.style.transform = 'translateY(6px)';
	nextFrame.style.pointerEvents = 'none';
	nextFrame.innerHTML = nextHtml || '';

	const svgNext = nextFrame.querySelector('svg');
	if (svgNext) {
		svgNext.style.width = '100%';
		svgNext.style.height = '100%';
	}

	// Ensure container sizing
	sbbBounceState.iconEl.style.width = sbbBounceState.size + 'px';
	sbbBounceState.iconEl.style.height = sbbBounceState.size + 'px';

	// Append next frame and animate transition
	sbbBounceState.iconEl.appendChild(nextFrame);

	// Apply exit transition to current frame, if present
	const prevFrame = sbbBounceState.currentFrame;
	if (prevFrame) {
		prevFrame.style.transition = 'opacity 300ms ease, transform 300ms ease';
		prevFrame.style.opacity = '1';
		prevFrame.style.transform = 'translateY(0)';
	}

	// Force reflow before starting transitions
	void nextFrame.offsetWidth;

	// Start animations: next fades in, previous fades out and moves up
	nextFrame.style.opacity = '1';
	nextFrame.style.transform = 'translateY(0)';
	if (prevFrame) {
		prevFrame.style.opacity = '0';
		prevFrame.style.transform = 'translateY(-6px)';
		prevFrame.addEventListener('transitionend', function handleDone(e) {
			// Only remove once for opacity transition end
			if (e.propertyName === 'opacity') {
				prevFrame.removeEventListener('transitionend', handleDone);
				prevFrame.remove();
			}
		});
	}

	// Set the next frame as current
	sbbBounceState.currentFrame = nextFrame;
}

function startSbbBounceLoader() {
	// Stop any running loop but keep the area in place
	stopSbbBounceLoader(false);
	if (!sbbSkeletonEnabled) return;

	const area = document.getElementById('sbb-bounce-area');
	const icon = document.getElementById('sbb-bounce-icon');
	if (!area || !icon) return;

	// Ensure any previous debug outline is cleared
	area.style.outline = '';

	if (sbbBounceDebug) {
		console.log('[Bounce] init', { areaFound: !!area, iconFound: !!icon });
	}

	sbbBounceState.areaEl = area;
	sbbBounceState.iconEl = icon;
	sbbBounceState.icons = getSbbIcons();
	if (sbbBounceDebug) {
		console.log('[Bounce] icons found:', sbbBounceState.icons.length);
	}
	sbbBounceState.iconIndex = Math.floor(Math.random() * (sbbBounceState.icons.length || 1));
	icon.innerHTML = '';
	icon.style.width = sbbBounceState.size + 'px';
	icon.style.height = sbbBounceState.size + 'px';
	icon.style.pointerEvents = 'none';
	icon.style.willChange = 'transform';

	// Seed initial current frame
	const initialFrame = document.createElement('div');
	initialFrame.className = 'sbb-icon-frame';
	initialFrame.style.position = 'absolute';
	initialFrame.style.inset = '0';
	initialFrame.style.transition = 'opacity 300ms ease, transform 300ms ease';
	initialFrame.style.opacity = '1';
	initialFrame.style.transform = 'translateY(0)';
	initialFrame.style.pointerEvents = 'none';
	initialFrame.innerHTML = sbbBounceState.icons[sbbBounceState.iconIndex] || '';
	const svg0 = initialFrame.querySelector('svg');
	if (svg0) {
		svg0.style.width = '100%';
		svg0.style.height = '100%';
	}
	icon.appendChild(initialFrame);
	sbbBounceState.currentFrame = initialFrame;

	if (!svg0) {
		// Fallback: visible square if SVGs not found
		initialFrame.innerHTML = '<div style="width:100%;height:100%;background:#1F87DD;border-radius:6px"></div>';
		if (sbbBounceDebug) console.warn('[Bounce] No SVG found, using fallback square');
	}

	if (sbbBounceDebug) {
		area.style.outline = '1px dashed #59f';
	}

	const maxX = Math.max(0, area.clientWidth - sbbBounceState.size);
	const maxY = Math.max(0, area.clientHeight - sbbBounceState.size);
	sbbBounceState.x = Math.random() * (maxX || 1);
	sbbBounceState.y = Math.random() * (maxY || 1);

	const step = () => {
		const w = area.clientWidth;
		const h = area.clientHeight;
		const limitX = w - sbbBounceState.size;
		const limitY = h - sbbBounceState.size;

		sbbBounceState.x += sbbBounceState.vx;
		sbbBounceState.y += sbbBounceState.vy;

		let bounced = false;
		if (sbbBounceState.x <= 0 || sbbBounceState.x >= limitX) {
			sbbBounceState.vx *= -1;
			sbbBounceState.x = Math.max(0, Math.min(sbbBounceState.x, limitX));
			bounced = true;
		}
		if (sbbBounceState.y <= 0 || sbbBounceState.y >= limitY) {
			sbbBounceState.vy *= -1;
			sbbBounceState.y = Math.max(0, Math.min(sbbBounceState.y, limitY));
			bounced = true;
		}

		icon.style.transform = 'translate(' + sbbBounceState.x + 'px, ' + sbbBounceState.y + 'px)';
		if (bounced) {
			if (sbbBounceDebug) {
				console.log('[Bounce] edge hit', { x: sbbBounceState.x, y: sbbBounceState.y, vx: sbbBounceState.vx, vy: sbbBounceState.vy });
			}
			swapBounceIcon();
		}
		sbbBounceRAF = requestAnimationFrame(step);
	};

	step();

	window.addEventListener('resize', () => {
		// keep inside bounds on resize
		const limitX = area.clientWidth - sbbBounceState.size;
		const limitY = area.clientHeight - sbbBounceState.size;
		sbbBounceState.x = Math.max(0, Math.min(sbbBounceState.x, limitX));
		sbbBounceState.y = Math.max(0, Math.min(sbbBounceState.y, limitY));
		icon.style.transform = 'translate(' + sbbBounceState.x + 'px, ' + sbbBounceState.y + 'px)';
	});
}

function stopSbbBounceLoader(removeArea = false) {
	if (sbbBounceRAF) {
		cancelAnimationFrame(sbbBounceRAF);
		sbbBounceRAF = null;
	}
	if (removeArea) {
		const area = document.getElementById('sbb-bounce-area');
		if (area) area.remove();
	}
}

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

	stopSbbBounceLoader(true);
	stopSbbSkeletonRotation(true);

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

	// --- Calculator helpers ---
	function calcToKaTeX(src) {
		if (!src) return '';
		let s = src.trim();
		// Basic replacements for KaTeX friendliness, keep parentheses intact
		s = s.replace(/\*/g, ' \\cdot ');
		s = s.replace(/sin\s*\(/g, '\\sin(')
			 .replace(/cos\s*\(/g, '\\cos(')
			 .replace(/tan\s*\(/g, '\\tan(')
			 .replace(/log\s*\(/g, '\\log(')
			 .replace(/ln\s*\(/g, '\\ln(');
		// pi -> \pi
		s = s.replace(/\bpi\b/g, '\\pi');
		// integral(expr, a, b) -> \int_{a}^{b} expr \\; dx
		s = s.replace(/integral\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi,
			(_, expr, a, b) => ` \\int_{${a}}^{${b}} ${expr} \\, dx `);
		// int_...^... -> \int_...^...
		s = s.replace(/\bint(?=\s|_|\^)/g, '\\int');
		// abs(...) -> |...|
		s = s.replace(/abs\s*\(([^)]*)\)/g, function(_, inner){ return '\\left|' + inner + '\\right|'; });
		// sqrt(...) -> \sqrt{...}
		s = s.replace(/sqrt\s*\(/g, '\\sqrt{');
		// exponent group: ^( ... ) -> ^{ ... }
		s = s.replace(/\^\s*\(/g, '^{');
		// Replace matching ')' after introduced '{' for \sqrt{ and ^{ only
		let out = '', openBraces = 0;
		for (let i = 0; i < s.length; i++) {
			if (s.slice(i, i + 7) === '\\sqrt{') { out += '\\sqrt{'; i += 6; openBraces++; continue; }
			if (s.slice(i, i + 2) === '^{') { out += '^{'; i += 1; openBraces++; continue; }
			const ch = s[i];
			if (ch === ')' && openBraces > 0) { out += '}'; openBraces--; continue; }
			out += ch;
		}
		return out;
	}

	function realVal(v) {
		if (v && typeof v === 'object' && 're' in v) return v.re;
		return Number(v);
	}

	function numericIntegral(body, aExpr, bExpr) {
		try {
			const a = realVal(window.math.evaluate(aExpr));
			const b = realVal(window.math.evaluate(bExpr));
			if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
			const compiled = window.math.compile(body);
			const steps = 512;
			const h = (b - a) / steps;
			let acc = 0;
			let x0 = a;
			let y0 = realVal(compiled.evaluate({ x: x0 }));
			for (let i = 0; i < steps; i++) {
				const x1 = a + (i + 1) * h;
				const y1 = realVal(compiled.evaluate({ x: x1 }));
				if (!Number.isFinite(y0) || !Number.isFinite(y1)) return NaN;
				acc += (y0 + y1) * 0.5 * h; // trapezoidal
				x0 = x1;
				y0 = y1;
			}
			return acc;
		} catch (e) {
			return NaN;
		}
	}

	function replaceIntegrals(expr) {
		let out = expr;
		// integral(expr, a, b)
		out = out.replace(/integral\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi, (m, body, a, b) => {
			const val = numericIntegral(body, a, b);
			return Number.isFinite(val) ? '(' + val + ')' : '(NaN)';
		});
		// TeX-like int_{a}^{b} body dx
		out = out.replace(/int\s*_\{([^}]+)\}\s*\^\{([^}]+)\}\s*(.+?)\s*dx/gi, (m, a, b, body) => {
			const val = numericIntegral(body, a, b);
			return Number.isFinite(val) ? '(' + val + ')' : '(NaN)';
		});
		return out;
	}

	let katexReadyTries = 0;
	function calcUpdateKaTeX() {
		const inputEl = document.getElementById('calc-input');
		const katexEl = document.getElementById('calc-katex');
		if (!inputEl || !katexEl) return;
		if (!window.katex) {
			if (katexReadyTries < 20) {
				katexEl.textContent = 'Loading KaTeX…';
				katexReadyTries++;
				setTimeout(calcUpdateKaTeX, 250);
			}
			else {
				katexEl.textContent = 'KaTeX not available.';
			}
			return;
		}
		const expr = inputEl.value || '';
		try {
			const cleaned = calcToKaTeX(expr);
			window.katex.render(cleaned || '\\text{ }', katexEl, { throwOnError: false });
		} catch (e) {
			const cleaned = calcToKaTeX(expr);
			katexEl.textContent = cleaned || expr || '';
		}
	}

	function calcEvaluate() {
		const inputEl = document.getElementById('calc-input');
		const resultEl = document.getElementById('calc-result');
		if (!inputEl || !resultEl || !window.math) return;
		try {
			const rawExpr = inputEl.value.trim();
			if (!rawExpr) { resultEl.textContent = 'Enter an expression.'; return; }
			const expr = replaceIntegrals(rawExpr);
			const isComparison = /(==|!=|<=|>=)/.test(expr);
			const hasEq = expr.includes('=');
			const usesX = /(^|[^A-Za-z_])x([^A-Za-z_]|$)/.test(expr);

			if (hasEq && !isComparison) {
				const idx = expr.indexOf('=');
				const left = expr.slice(0, idx).trim();
				const right = expr.slice(idx + 1).trim();
				if (!left || !right) { resultEl.textContent = 'Invalid equation. Use "left = right".'; return; }
				if (!usesX) {
					const l = window.math.compile(left).evaluate({});
					const r = window.math.compile(right).evaluate({});
					const lv = (l && typeof l === 'object' && 're' in l) ? l.re : l;
					const rv = (r && typeof r === 'object' && 're' in r) ? r.re : r;
					const eq = Math.abs(Number(lv) - Number(rv)) < 1e-9;
					resultEl.textContent = `Equation: ${eq ? 'true' : 'false'} (left=${lv}, right=${rv})`;
					return;
				}
				const fLeft = window.math.compile(left);
				const fRight = window.math.compile(right);
				const f = (x) => {
					let lv = fLeft.evaluate({ x });
					let rv = fRight.evaluate({ x });
					lv = (lv && typeof lv === 'object' && 're' in lv) ? lv.re : lv;
					rv = (rv && typeof rv === 'object' && 're' in rv) ? rv.re : rv;
					return Number(lv) - Number(rv);
				};
				const xMin = -10, xMax = 10, n = 800;
				const xs = [];
				for (let i = 0; i < n; i++) xs.push(xMin + (i * (xMax - xMin)) / (n - 1));
				const ys = xs.map(f);
				const roots = [];
				for (let i = 0; i < xs.length - 1; i++) {
					const y1 = ys[i], y2 = ys[i + 1];
					if (!isFinite(y1) || !isFinite(y2)) continue;
					if (Math.abs(y1) < 1e-6) {
						roots.push(xs[i]);
						continue;
					}
					if (y1 === 0 || y2 === 0 || (y1 < 0 && y2 > 0) || (y1 > 0 && y2 < 0)) {
						let a = xs[i], b = xs[i + 1];
						for (let it = 0; it < 40; it++) {
							const m = (a + b) / 2;
							const fm = f(m);
							if (Math.abs(fm) < 1e-9) { a = b = m; break; }
							if ((f(a) <= 0 && fm >= 0) || (f(a) >= 0 && fm <= 0)) { b = m; } else { a = m; }
						}
						roots.push((a + b) / 2);
					}
				}
				const uniq = [];
				for (const r of roots) {
					if (!uniq.some(u => Math.abs(u - r) < 1e-3)) uniq.push(r);
				}
				if (!uniq.length) { resultEl.textContent = 'No real solutions found in [-10, 10]. Try plotting.'; return; }
				const formatted = uniq.slice(0, 12).map(v => Number(v.toFixed(6)));
				resultEl.textContent = `Solutions (approx): x = ${formatted.join(', ')}`;
				return;
			}

			if (isComparison) {
				if (usesX) { resultEl.textContent = 'Comparison with variable x needs a value. Plot or provide x.'; return; }
				const val = window.math.compile(expr).evaluate({});
				resultEl.textContent = `Result: ${String(val)}`;
				return;
			}

			const compiled = window.math.compile(expr);
			const value = compiled.evaluate({});
			let out;
			if (value && typeof value === 'object' && ('re' in value) && ('im' in value)) {
				out = `${value.re} + ${value.im}i`;
			} else if (Array.isArray(value)) {
				out = JSON.stringify(value);
			} else {
				out = String(value);
			}
			resultEl.textContent = `Result: ${out}`;
		} catch (e) {
			resultEl.textContent = `Error: ${e.message}`;
		}
	}
	window.calcEvaluate = calcEvaluate;

	function calcPlot() {
		const inputEl = document.getElementById('calc-input');
		const plotEl = document.getElementById('calc-plot');
		const resultEl = document.getElementById('calc-result');
		if (!inputEl || !plotEl || !window.math || !window.Plotly) return;
		const rawExpr = inputEl.value.trim();
		if (!rawExpr) { resultEl.textContent = 'Enter an expression to plot.'; return; }
		const expr = replaceIntegrals(rawExpr);
		let usesX = /(^|[^A-Za-z_])x([^A-Za-z_]|$)/.test(expr);
		const isComparison = /(==|!=|<=|>=)/.test(expr);
		const hasEq = expr.includes('=');
		try {
			if (hasEq && !isComparison && usesX) {
				const idx = expr.indexOf('=');
				const left = expr.slice(0, idx).trim();
				const right = expr.slice(idx + 1).trim();
				const fLeft = window.math.compile(left);
				const fRight = window.math.compile(right);
				const xMin = -10, xMax = 10, n = 400;
				const xs = [], yL = [], yR = [];
				for (let i = 0; i < n; i++) {
					const x = xMin + (i * (xMax - xMin)) / (n - 1);
					let lv = fLeft.evaluate({ x });
					let rv = fRight.evaluate({ x });
					lv = (lv && typeof lv === 'object' && 're' in lv) ? lv.re : lv;
					rv = (rv && typeof rv === 'object' && 're' in rv) ? rv.re : rv;
					yL.push(Number(lv));
					yR.push(Number(rv));
					xs.push(x);
				}
				const data = [
					{ x: xs, y: yL, type: 'scatter', mode: 'lines', name: 'left' },
					{ x: xs, y: yR, type: 'scatter', mode: 'lines', name: 'right' }
				];
				const layout = { margin: { t: 10, r: 10, b: 30, l: 40 }, paper_bgcolor: '#2a2a2a', plot_bgcolor: '#2a2a2a', xaxis: { color: '#ddd' }, yaxis: { color: '#ddd' } };
				window.Plotly.newPlot(plotEl, data, layout, { displayModeBar: false });
				resultEl.textContent = 'Plotted left and right sides.';
				return;
			}

			const compiled = window.math.compile(expr);
			if (!usesX) {
				const y = compiled.evaluate({});
				const yv = (yv => (yv && typeof yv === 'object' && 're' in yv) ? yv.re : yv)(y);
				const data = [{ x: [0], y: [Number(yv)], mode: 'markers', name: 'constant' }];
				const layout = { margin: { t: 10, r: 10, b: 30, l: 40 }, paper_bgcolor: '#2a2a2a', plot_bgcolor: '#2a2a2a', xaxis: { color: '#ddd' }, yaxis: { color: '#ddd' } };
				window.Plotly.newPlot(plotEl, data, layout, { displayModeBar: false });
				resultEl.textContent = 'Plotted constant.';
				return;
			}

			const xMin = -10, xMax = 10, n = 400;
			const xs = [], ys = [];
			for (let i = 0; i < n; i++) {
				const x = xMin + (i * (xMax - xMin)) / (n - 1);
				let yVal = compiled.evaluate({ x });
				if (yVal && typeof yVal === 'object' && ('re' in yVal)) yVal = yVal.re;
				ys.push(Number(yVal));
				xs.push(x);
			}
			const data = [{ x: xs, y: ys, type: 'scatter', mode: 'lines', name: 'f(x)' }];
			const layout = { margin: { t: 10, r: 10, b: 30, l: 40 }, paper_bgcolor: '#2a2a2a', plot_bgcolor: '#2a2a2a', xaxis: { color: '#ddd' }, yaxis: { color: '#ddd' } };
			window.Plotly.newPlot(plotEl, data, layout, { displayModeBar: false });
			resultEl.textContent = 'Plotted f(x).';
		} catch (e) {
			resultEl.textContent = `Plot error: ${e.message}`;
		}
	}
	window.calcPlot = calcPlot;

// Clock Update Function
function updateClock() {
	const now = new Date();
	
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
	
	// Update the display elements
	const hourEl = document.getElementById('hour');
	const minutesEl = document.getElementById('minutes');
	const secondsEl = document.getElementById('seconds');
	const ampmEl = document.getElementById('ampm');
	
	if (hourEl) hourEl.textContent = hours;
	if (minutesEl) minutesEl.textContent = minutes;
	if (secondsEl) secondsEl.textContent = seconds;
	if (ampmEl) ampmEl.textContent = ampm;
	
	// Update the pie progress values (0-100)
	// Hours: 0-12 maps to 0-100
	const hourPercent = ((now.getHours() % 12) + now.getMinutes() / 60) * (100 / 12);
	// Minutes: 0-60 maps to 0-100
	const minutePercent = (now.getMinutes() + now.getSeconds() / 60) * (100 / 60);
	// Seconds: 0-60 maps to 0-100
	const secondPercent = (now.getSeconds() + now.getMilliseconds() / 1000) * (100 / 60);
	
	const hourDot = document.getElementById('dot-hour');
	const minuteDot = document.getElementById('dot-minute');
	const secondDot = document.getElementById('dot-second');
	
	if (hourDot) {
		hourDot.style.setProperty('--p', hourPercent.toString());
		// Also update the parent pie element
		const hourPie = hourDot.closest('article');
		if (hourPie) hourPie.style.setProperty('--p', hourPercent.toString());
	}
	
	if (minuteDot) {
		minuteDot.style.setProperty('--p', minutePercent.toString());
		// Also update the parent pie element
		const minutePie = minuteDot.closest('article');
		if (minutePie) minutePie.style.setProperty('--p', minutePercent.toString());
	}
	
	if (secondDot) {
		secondDot.style.setProperty('--p', secondPercent.toString());
		// Also update the parent pie element
		const secondPie = secondDot.closest('article');
		if (secondPie) secondPie.style.setProperty('--p', secondPercent.toString());
	}
}

window.updateClock = updateClock;
