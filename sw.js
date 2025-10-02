const CACHE_NAME = 'nepali-news-v1';
const API_CACHE_NAME = 'news-api-v1';
const FEEDS_URL = "https://raw.githubusercontent.com/LaxmanNepal/LaxmanNepalApps/refs/heads/main/News/feeds.json";

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll([
          '/',
          '/styles.css',
          '/app.js'
        ]);
      })
  );
});

// Fetch event - implement cache-first strategy
self.addEventListener('fetch', event => {
  // Handle API requests (news feeds)
  if (event.request.url.includes('api.allorigins.win') || 
      event.request.url.includes('raw.githubusercontent.com')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          // Return cached response if available and not too old
          if (response) {
            const cachedTime = new Date(response.headers.get('sw-cache-time'));
            const now = new Date();
            // Use cache if less than 15 minutes old
            if (now - cachedTime < 15 * 60 * 1000) {
              return response;
            }
          }
          
          // Fetch fresh data
          return fetch(event.request).then(networkResponse => {
            // Clone response to add cache timestamp
            const clonedResponse = networkResponse.clone();
            const headers = new Headers(clonedResponse.headers);
            headers.set('sw-cache-time', new Date().toISOString());
            
            const cachedResponse = new Response(clonedResponse.body, {
              status: clonedResponse.status,
              statusText: clonedResponse.statusText,
              headers: headers
            });
            
            // Cache the fresh response
            cache.put(event.request, cachedResponse);
            return networkResponse;
          }).catch(() => {
            // If network fails, return cached response even if stale
            return response || new Response(JSON.stringify({error: 'Network failed'}), {
              status: 503,
              headers: {'Content-Type': 'application/json'}
            });
          });
        });
      })
    );
  } else {
    // Handle static assets with cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
  }
});

// Background sync for news updates
self.addEventListener('sync', event => {
  if (event.tag === 'news-update') {
    event.waitUntil(
      fetchFeedsInBackground()
    );
  }
});

// Background fetch function
async function fetchFeedsInBackground() {
  try {
    const response = await fetch(FEEDS_URL);
    const feeds = await response.json();
    
    // Pre-fetch all feeds in background
    const feedPromises = feeds.map(feed => 
      fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`)
        .then(response => response.text())
        .then(xmlText => {
          // Parse and store in cache
          const parser = new DOMParser();
          const xml = parser.parseFromString(xmlText, "text/xml");
          return {feed, xml};
        })
    );
    
    await Promise.allSettled(feedPromises);
    
    // Notify main thread about background update
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_UPDATE_COMPLETE',
          timestamp: new Date().toISOString()
        });
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
