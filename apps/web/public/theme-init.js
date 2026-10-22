/* global localStorage, window, document */
// Applies the saved theme before first paint so light-mode users never see a
// dark flash. Mirrors the "orbit.theme" store read by ThemeProvider.
;(function () {
  var theme = 'system'
  try {
    var stored = JSON.parse(localStorage.getItem('orbit.theme') || 'null')
    if (stored && stored.state && stored.state.theme) theme = stored.state.theme
  } catch {
    theme = 'system'
  }
  var dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  var root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
})()
