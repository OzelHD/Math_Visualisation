// Hub that wires up feature modules and exposes needed globals for inline handlers
import { toggleSidebar, closeSidebar, applyLayout, restoreNavbar } from './navbar.js';
import { toggleSection, restoreSections } from './sections.js';
import { toggleTheme, initTheme } from './theme.js';
import { addActivityItem, addDemoItems, refreshActivityLines } from './feeds.js';

// Expose functions for existing inline onclick handlers in HTML
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toggleSection = toggleSection;
window.toggleTheme = toggleTheme;
window.addActivityItem = addActivityItem;
window.addDemoItems = addDemoItems;

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
});
