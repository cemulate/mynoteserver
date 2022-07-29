import { h } from 'vue/dist/vue.esm-bundler.js';

export default {
    data: () => ({}),
    props: [
        'source',
        'renderer',
        'fragmentify',
        'highlight',
        'wrap',
        'scrollFollow',
    ],
    computed: {
        renderedHtml() {
            return this.renderer.render(this.source, { fragmentifyEnabled: this.fragmentify, highlightEnabled: this.highlight });
        },
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
        if (!this.scrollFollow) return;

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
    },
};