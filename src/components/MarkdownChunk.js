import { h } from 'vue/dist/vue.esm-bundler.js';
import { defaultMarkdownRenderer } from '../lib/markdown/markdown.mjs';

export default {
    data: () => ({}),
    props: [
        'source',
        'fragmentify',
        'highlight',
        'wrap',
        'autoScrollIntoView',
    ],
    computed: {
        renderedHtml() {
            return defaultMarkdownRenderer.render(this.source, { fragmentifyEnabled: this.fragmentify, highlightEnabled: this.highlight });
        },
    },
    methods: {
        scrollIntoView() {
            let el = this.$el;
            if (el.nodeType != Node.ELEMENT_NODE) el = el?.nextElementSibling;
            if (el == null) return;
            let image = el.querySelector('img');
            if (image != null) {
                image.onload = () => {
                    image.scrollIntoView(true);
                    image.onload = null;
                }
            } else {
                el.scrollIntoView(true);
            }
        }
    },
    render() {
        if (this.wrap != null) {
            return h(this.wrap, { innerHTML: this.renderedHtml });
        } else {
            var template = document.createElement('template');
            template.innerHTML = this.renderedHtml;
            let nodes = [];
            for (let node of template.content.children) {
                nodes.push(h(node.tagName, { innerHTML: node.innerHTML }));
            }
            return nodes;
        }
    },
    updated() {
        if (this.autoScrollIntoView) this.scrollIntoView();
    },
};