const CACHE_NAME = 'jeu67-v3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon-512.png',
    './Leclick.mp3',
    './squish.mp3',
    './67testycrousty.mp3',
    './teleport.mp3',
    './20-20-20-7.mp3',
    './pouletboum.mp3',
    './boum.mp3',
    './nuke.mp3',
    './tasty.png',
    './Ender_Pearl.png',
    './chiken.png',
    './TNT.png',
    './Rose.png',
    './Romance.mp3',
    './CatDance.mp4',
    './osu.png',
    './ClipOSU.mp4',
    './rickroll.mp4'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).then((response) => {
            // Update cache with fresh version
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
            });
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
