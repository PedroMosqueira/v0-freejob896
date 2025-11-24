if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[Freejob] Service Worker registrado:', registration);
      })
      .catch((error) => {
        console.log('[Freejob] Erro ao registrar Service Worker:', error);
      });
  });
}

// Pedir permissão para notificações
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().then((permission) => {
    console.log('[Freejob] Permissão de notificação:', permission);
  });
}
