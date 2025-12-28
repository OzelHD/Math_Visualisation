import { AppState } from './localstorage.js';

export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mainContent = document.getElementById('main-content');

  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
  const isOpen = !sidebar.classList.contains('-translate-x-full');
  AppState.setToggle('navbarOpen', isOpen);

  // Shift content for widths >= 640px (sm and up)
  if (window.innerWidth >= 640) {
    mainContent.style.marginLeft = isOpen ? '256px' : '0px';
  } else {
    mainContent.style.marginLeft = '0px';
  }
}

export function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mainContent = document.getElementById('main-content');

  sidebar.classList.add('-translate-x-full');
  overlay.classList.add('hidden');
  AppState.setToggle('navbarOpen', false);

  // Reset margin on widths >= 640px
  if (window.innerWidth >= 640) {
    mainContent.style.marginLeft = '0px';
  } else {
    mainContent.style.marginLeft = '0px';
  }
}

export function applyLayout() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mainContent = document.getElementById('main-content');
  const isSidebarOpen = !sidebar.classList.contains('-translate-x-full');

  // Auto-close when width is "small" (< 640px)
  if (window.innerWidth < 640) {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    mainContent.style.marginLeft = '0px';
    return;
  }

  // On screens >= 640px, shift content when sidebar is open
  if (window.innerWidth >= 640) {
    mainContent.style.marginLeft = isSidebarOpen ? '256px' : '0px';
  } else {
    mainContent.style.marginLeft = '0px';
  }
}

export function restoreNavbar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mainContent = document.getElementById('main-content');

  if (window.innerWidth >= 640) {
    const navOpen = AppState.getToggle('navbarOpen', false);
    if (navOpen) {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
      mainContent.style.marginLeft = '256px';
    } else {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
      mainContent.style.marginLeft = '0px';
    }
  } else {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    mainContent.style.marginLeft = '0px';
  }
}
