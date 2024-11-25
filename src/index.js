import './styles/theme.css';
import { createHead } from '@vueuse/head';

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        await navigator.serviceWorker.register('app/service-worker.js');
        console.log('Service worker successfully registered');
    });
}

import App from './components/App.vue';
import { createApp } from 'vue';

const app = createApp(App);
app.use(createHead());

app.mount('body');
