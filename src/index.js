import './styles/theme.scss';

import { MathJax } from './lib/mathjax_config';
window.MathJax = MathJax;

var script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
script.async = true;
document.head.appendChild(script);

import App from './components/App.vue';
import { createApp } from 'vue';

const app = createApp(App);

const body = document.getElementsByTagName('body')[0];
const container = document.createElement('div');
container.setAttribute('id', 'app');
body.insertBefore(container, body.firstChild);

app.mount('#app');
