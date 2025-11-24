if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/novo-projeto/scripts/sw.js")
      .then((registration) => {
        console.log("[Freejob] Service Worker registrado com sucesso:", registration.scope)
      })
      .catch((error) => {
        console.log("[Freejob] Falha ao registrar Service Worker:", error)
      })
  })
}
