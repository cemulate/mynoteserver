import { h } from 'vue/dist/vue.esm-bundler.js';
import { defaultMarkdownRenderer } from '../lib/markdown/markdown.mjs';

export default {
    data: () => ({}),
    props: {
        id: { default: null },
        source: { default: '' },
        fragmentify: { default: false },
        highlight: { default: true },
        wrap: { default: null },
        autoScrollIntoView: { default: false },
        flashOnUpdate: { default: null },
    },
    emits: [
        'click',
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
                el.scrollIntoView({ block: 'center' });
            }

            if (this.flashOnUpdate) {
                el.classList.add(this.flashOnUpdate.class);
                setTimeout(() => el.classList.remove(this.flashOnUpdate.class), this.flashOnUpdate.timeout);
            }
        },
    },
    render() {
        if (this.wrap != null) {
            return h(this.wrap, { innerHTML: this.renderedHtml, onClick: () => this.$emit('click') });
        } else {
            var template = document.createElement('template');
            template.innerHTML = this.renderedHtml;
            let nodes = [];
            for (let node of template.content.children) {
                let vattrs = {};
                for (let attr of node.attributes) {
                    vattrs[attr.nodeName] = attr.nodeValue;
                }
                vattrs.onClick = () => this.$emit('click');
                nodes.push(h(node.tagName, { innerHTML: node.innerHTML, ...vattrs }));
            }
            return nodes;
        }
    },
    updated() {
        if (this.autoScrollIntoView) this.scrollIntoView();
    },
};