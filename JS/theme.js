import { AppState } from './localstorage.js';

export function toggleTheme() {
  const html = document.documentElement;
  const themeButton = document.getElementById('theme-toggle');

  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    html.classList.add('light');
    AppState.setString('theme', 'light');
    themeButton && (themeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.75 4.09L15.22 6.03 16.13 9.09 13.5 7.28 10.87 9.09 11.78 6.03 9.25 4.09 12.44 4 13.5 1 14.56 4 17.75 4.09zM21.25 11l-1.88 2.5L19.62 17l-2.5-1.5L14.62 17l.25-3.5L13 11l3.5-.25 1.5-3.5 1.5 3.5 3.5.25zm-9.5 4.5l-1.5 3.5-3.5.25 2.5 2 .25 3.5 2.5-1.5 2.5 1.5.25-3.5 2.5-2-3.5-.25-1.5-3.5z"/></svg>');
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
    AppState.setString('theme', 'dark');
    themeButton && (themeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>');
  }
}

export function initTheme() {
  const savedTheme = AppState.getString('theme', 'dark');
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
}
