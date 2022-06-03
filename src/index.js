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

app.mount('body');
