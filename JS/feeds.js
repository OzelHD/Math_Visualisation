// Activity Feed utilities: add formatted items with selectable icon
const SVG_NS = 'http://www.w3.org/2000/svg';

// Minimal, license-safe icon shapes for common symbols
// Keys: 'menu', 'calendar', 'people', 'bubbles', 'robot_face', 'robot_arm', 'flag'
const ICONS = {
  card:
     '<path d="M17.765 17.757l-5.765 3.243l-8 -4.5v-9l2.236 -1.258m2.57 -1.445l3.194 -1.797l8 4.5v8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M14.561 10.559l5.439 -3.059" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M12 12v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M12 12l-8 -4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  menu: '<path d="M3 6h18v2H3z"/><path d="M3 11h18v2H3z"/><path d="M3 16h18v2H3z"/>',
  calendar:
    '<path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>',
  people:
    // Tabler Users icon
    '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M21 21v-2a4 4 0 0 0 -3 -3.85" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  bubbles:
    // Tabler Message Chatbot icon
    '<path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M9.5 9h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M14.5 9h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M9.5 13a3.5 3.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  robot_face:
    // Tabler Robot Face icon
    '<path d="M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M9 16c1 .667 2 1 3 1s2 -.333 3 -1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M9 7l-1 -4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M15 7l1 -4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M9 12v-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M15 12v-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  robot_arm:
    // Tabler Chart Dots 3 icon
    '<path d="M5 7m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M16 15m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M6 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M9 17l5 -1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M6.5 8.5l7.81 5.37" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M7 7l8 -1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  flag:
    // Tabler Pennant icon
    '<path d="M8 21l4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M10 21l0 -18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M10 4l9 4l-9 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
};

function createSvg(iconName) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('class', 'w-5 h-5 text-blue-800');

  const markup = ICONS[iconName] || ICONS.menu;
  // Safe: markup is from fixed dictionary; no user input injected
  svg.innerHTML = markup;
  return svg;
}

function getToolsListElement() {
  // Prefer the existing list inside section-tools; create one if missing
  const section = document.getElementById('section-tools');
  if (!section) return null;
  let ul = section.querySelector('ul');
  if (!ul) {
    ul = document.createElement('ul');
    ul.className = 'space-y-0';
    section.appendChild(ul);
  }
  return ul;
}

function createLineDiv() {
  const vline = document.createElement('div');
  vline.className = 'w-px flex-1 bg-white/[0.12] mt-2';
  return vline;
}

function removeSkeletons(ul) {
  if (!ul) return;
  const skeletons = ul.querySelectorAll('[data-skeleton="true"]');
  skeletons.forEach(el => el.remove());
}

export function refreshActivityLines() {
  const ul = getToolsListElement();
  if (!ul) return;
  const items = Array.from(ul.children).filter(el => el.tagName && el.tagName.toLowerCase() === 'li');
  items.forEach((li, idx) => {
    const leftCol = li.querySelector('.flex.flex-col.items-center.pt-1');
    if (!leftCol) return;
    let vline = leftCol.querySelector('div.w-px.flex-1.mt-2');
    const isLast = idx === items.length - 1;
    if (!isLast) {
      if (!vline) {
        vline = createLineDiv();
        leftCol.appendChild(vline);
      }
      vline.style.display = '';
    } else {
      if (vline) vline.style.display = 'none';
    }
  });
}

export function addDemoItems() {
  const iconNames = ['card', 'menu', 'calendar', 'people', 'bubbles', 'robot_face', 'robot_arm', 'flag'];
  const today = new Date().toLocaleDateString();
  iconNames.forEach(name => {
    addActivityItem(name, `Name ${name}`, today, 'Demo Category', 'Sample Activity');
  });
}

export function addActivityItem(symbolName, text1, dateStr, text2, text3) {
  const ul = getToolsListElement();
  if (!ul) return;

  removeSkeletons(ul);

  const li = document.createElement('li');
  li.className = 'relative flex gap-3 mb-4';

  // Left column: avatar + timeline line
  const leftCol = document.createElement('div');
  leftCol.className = 'flex flex-col items-center pt-1';

  const avatar = document.createElement('div');
  avatar.className = 'w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0';
  avatar.appendChild(createSvg(symbolName));

  const vline = document.createElement('div');
  vline.className = 'w-px flex-1 bg-white/[0.12] mt-2';

  leftCol.appendChild(avatar);
  leftCol.appendChild(vline);

  // Right column: content
  const rightCol = document.createElement('div');
  rightCol.className = 'flex-1 min-w-0';

  const headerRow = document.createElement('div');
  headerRow.className = 'flex items-baseline justify-between mb-2';

  const h3 = document.createElement('h3');
  h3.className = 'text-sm font-normal';
  h3.textContent = text1 || '';

  const dateSpan = document.createElement('span');
  dateSpan.className = 'text-xs opacity-60';
  dateSpan.textContent = dateStr || '';

  headerRow.appendChild(h3);
  headerRow.appendChild(dateSpan);

  const card = document.createElement('div');
  card.className = 'bg-[#1e1e1e] border border-white/[0.12] rounded p-4 hover:bg-[#252525] cursor-pointer';

  const p = document.createElement('p');
  p.className = 'text-xs opacity-60 mb-1';
  p.textContent = text2 || '';

  const h3b = document.createElement('h3');
  h3b.className = 'text-base font-semibold';
  h3b.textContent = text3 || '';

  card.appendChild(p);
  card.appendChild(h3b);

  rightCol.appendChild(headerRow);
  rightCol.appendChild(card);

  li.appendChild(leftCol);
  li.appendChild(rightCol);

  ul.appendChild(li);
  // Ensure only non-last items show a connector line
  refreshActivityLines();
}
