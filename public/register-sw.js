// Chrome fires beforeinstallprompt once, often before React mounts, so keep it globally.
window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault()
  window.__freejobInstallPrompt = event
  window.dispatchEvent(new Event("freejob:installable"))
})

window.addEventListener("appinstalled", function () {
  window.__freejobInstallPrompt = null
  window.dispatchEvent(new Event("freejob:installed"))
})

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    // The old cache-first worker served stale pages; replace it with /sw.js.
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (registration) {
        var url = (registration.active || registration.waiting || registration.installing || {}).scriptURL || ""
        if (url.indexOf("/service-worker.js") !== -1) registration.unregister()
      })
    })
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {})
  })
}
