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
  // Tenant brand hue, same store as BrandProvider.
  try {
    var brand = JSON.parse(localStorage.getItem('orbit.brand') || 'null')
    var hue = brand && brand.state && Number(brand.state.hue)
    if (hue && hue !== 264 && hue > 0 && hue <= 360)
      root.style.setProperty('--brand-hue', String(hue))
  } catch {
    // Default skin.
  }
})()
