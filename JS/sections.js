import { AppState } from './localstorage.js';

export function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const arrowId = 'arrow-' + sectionId.replace('section-', '');
  const arrow = document.getElementById(arrowId);

  if (section.classList.contains('hidden')) {
    section.classList.remove('hidden');
    arrow && arrow.classList.add('rotate-180');
  } else {
    section.classList.add('hidden');
    arrow && arrow.classList.remove('rotate-180');
  }

  const expanded = !section.classList.contains('hidden');
  AppState.setToggle(`section:${sectionId}`, expanded);
}

export function restoreSections() {
  document.querySelectorAll('.section-content').forEach(section => {
    const id = section.id;
    if (!id) return;
    const defaultExpanded = !section.classList.contains('hidden');
    const expanded = AppState.getToggle(`section:${id}`, defaultExpanded);
    const arrowId = 'arrow-' + id.replace('section-', '');
    const arrow = document.getElementById(arrowId);

    if (expanded) {
      section.classList.remove('hidden');
      arrow && arrow.classList.add('rotate-180');
    } else {
      section.classList.add('hidden');
      arrow && arrow.classList.remove('rotate-180');
    }
  });
}
