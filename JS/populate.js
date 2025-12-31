// Populate sample activity items with links and popups
import { addActivityItem } from './feeds.js';
import { ApiStatusTracker, createStatusDot, checkEthMensaApi } from './api_status.js';

// Helper: Show a simple popup with custom content
function showPopup(title, content) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  
  const box = document.createElement('div');
  box.className = 'bg-[#1e1e1e] border border-white/[0.12] rounded p-6 max-w-sm w-4/5';
  
  const heading = document.createElement('h2');
  heading.className = 'text-lg font-semibold mb-4';
  heading.textContent = title;
  
  const body = document.createElement('p');
  body.className = 'text-sm text-white/70 mb-4';
  body.textContent = content;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => modal.remove());
  
  box.appendChild(heading);
  box.appendChild(body);
  box.appendChild(closeBtn);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Prevent closing when clicking inside the box
  box.addEventListener('click', (e) => e.stopPropagation());
  
  modal.appendChild(box);
  document.body.appendChild(modal);
}

// Helper: Show API status modal with detailed list
function showApiStatusModal(tracker) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  
  const box = document.createElement('div');
  box.className = 'bg-[#1e1e1e] border border-white/[0.12] rounded p-6 max-w-sm w-4/5 max-h-96 overflow-y-auto';
  
  const heading = document.createElement('h2');
  heading.className = 'text-lg font-semibold mb-4';
  heading.textContent = 'API Status';
  
  const list = document.createElement('ul');
  list.className = 'space-y-2 mb-4';
  
  tracker.getStatuses().forEach(api => {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-3 p-2 rounded bg-white/[0.05]';
    
    // Status dot
    const dot = createStatusDot(api.status);
    
    // API name and status
    const info = document.createElement('div');
    info.className = 'flex-1';
    
    const name = document.createElement('span');
    name.className = 'block text-sm font-medium';
    name.textContent = api.name;
    
    const url = document.createElement('span');
    url.className = 'block text-xs text-white/50';
    url.textContent = api.url;
    
    const status = document.createElement('span');
    status.className = 'block text-xs font-semibold mt-1';
    
    switch (api.status) {
      case 'online':
        status.className += ' text-green-400';
        status.textContent = '✓ Online';
        break;
      case 'offline':
        status.className += ' text-red-400';
        status.textContent = '✗ Offline';
        break;
      case 'timeout':
        status.className += ' text-yellow-400';
        status.textContent = '⏱ Timeout';
        break;
      case 'error':
        status.className += ' text-orange-400';
        status.textContent = '⚠ Error';
        break;
      default:
        status.className += ' text-gray-400';
        status.textContent = '⋯ Pending';
    }
    
    info.appendChild(name);
    info.appendChild(url);
    info.appendChild(status);
    
    li.appendChild(dot);
    li.appendChild(info);
    list.appendChild(li);
  });
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors w-full';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => modal.remove());
  
  box.appendChild(heading);
  box.appendChild(list);
  box.appendChild(closeBtn);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Prevent closing when clicking inside the box
  box.addEventListener('click', (e) => e.stopPropagation());
  
  modal.appendChild(box);
  document.body.appendChild(modal);
}






// Populate with sample data
export async function populateSampleData() {
  const today = new Date().toLocaleDateString();
  
  // Item 1: External link
  addActivityItem(
    'robot_face',
    'GitHub Repository',
    today,
    'Development',
    'Visit project repo',
    'https://github.com'
  );
  
  // Item 2: Popup on click
  addActivityItem(
    'people',
    'Team Discussion',
    today,
    'Meeting',
    'View details',
    () => showPopup('Team Discussion', 'Next team sync is scheduled for tomorrow at 2 PM. Agenda: Q1 planning and feature roadmap.')
  );
  
  // Item 3: Another popup
  addActivityItem(
    'bubbles',
    'Chat Updates',
    today,
    'Communication',
    'New messages',
    () => showPopup('Chat Updates', 'You have 5 unread messages from the team channel.')
  );
  
  // Item 4: Relative link (internal nav)
  addActivityItem(
    'calendar',
    'Schedule Review',
    today,
    'Planning',
    'Check calendar',
    '/calendar'
  );
  
  // Item 5: API Status with live indicator
  const tracker = new ApiStatusTracker();
  
  // Add ETH Mensa using custom checker
  tracker.addApi('ETH Mensa', 'https://idapps.ethz.ch/cookpit-pub-services/v1/weeklyrotas?client-id=ethz-wcms&lang=de');
  tracker.addApi('GitHub API', 'https://api.github.com');
  tracker.addApi('JSONPlaceholder', 'https://jsonplaceholder.typicode.com');
  tracker.addApi('OpenWeather', 'https://api.openweathermap.org');
  
  addActivityItem(
    'card',
    'System Status',
    today,
    'Status',
    'Click me to see details',
    async () => {
      await tracker.checkAll();
      showApiStatusModal(tracker);
    }
  );
  
  // Check all APIs and update the status dots
  await tracker.checkAll();
  updateApiStatusIndicator(tracker);
  
  // Item 6: Popup with custom action
  addActivityItem(
    'flag',
    'Feature Release',
    today,
    'Announcement',
    'v2.0 available',
    () => showPopup('Feature Release', 'This is an updated version. Tester.')
  );
}

// Helper: Update the API status item with live status dots
function updateApiStatusIndicator(tracker) {
  // Wait a tick for DOM to render the items
  setTimeout(() => {
    const items = document.querySelectorAll('li.relative.flex.gap-3.mb-4');
    if (items.length < 5) return; // System Status is 5th item (0-indexed: 4)
    
    const statusItem = items[4];
    const card = statusItem.querySelector('[class*="bg-"]');
    if (!card) return;
    
    const h3 = card.querySelector('h3');
    if (!h3) return;
    
    // Create a container for the dots
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'flex gap-2 ml-2';
    dotsContainer.style.cursor = 'pointer';
    
    // Add dots for each API
    tracker.getStatuses().forEach(api => {
      const dot = createStatusDot(api.status);
      dotsContainer.appendChild(dot);
    });
    
    // Make the dots clickable
    dotsContainer.addEventListener('click', async () => {
      await tracker.checkAll();
      showApiStatusModal(tracker);
    });
    
    // Insert after h3
    h3.parentNode.insertBefore(dotsContainer, h3.nextSibling);
  }, 100);
}

// Export popup helper for use in other modules
export { showPopup };
