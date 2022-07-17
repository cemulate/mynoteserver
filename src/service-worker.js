import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';


precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new RegExp('/api/custom-resource/.*'), new NetworkFirst());

registerRoute(new RegExp('https://fonts.googleapis.com/.*'), new CacheFirst());
