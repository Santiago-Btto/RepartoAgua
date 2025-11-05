// v6: Cachea assets estáticos y sincroniza Firestore con la interfaz de usuario.
const CACHE = 'agua-nologin-v6'; // Incrementamos la versión de la caché.
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-config.v1.js',
  './manifest.webmanifest',
  './images/icons/*'  // Si tienes iconos o imágenes que también quieras cachear, agrégalas aquí.
];

// Instalar el Service Worker y almacenar en caché los archivos estáticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(SHELL);  // Cacheamos todos los archivos esenciales.
    })
  );
});

// Activar el Service Worker, eliminar cachés antiguas y actualizar a la versión más reciente
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)) // Borrar cachés antiguas.
      )
    )
  );
});

// Interceptar las solicitudes de la red
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Excluir Firestore y Firebase de la caché (es necesario para evitar problemas de sincronización)
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('firebaseio.com')) {
    return; // Pasar directamente las solicitudes de Firestore.
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      // Si encontramos la solicitud en caché, devolverla.
      return (
        cached ||
        fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone)); // Cachear la respuesta para futuras solicitudes.
          return res;
        }).catch(() => cached) // En caso de error, devolver lo que haya en caché.
      );
    })
  );
});
