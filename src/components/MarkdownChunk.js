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
        async scrollIntoView() {
            // Scrolling an edited image into view needs to be done in onload,
            // which makes this method (possibly) async.
            // Returns the element that was actually scrolled, so the client
            // can perform further tweaks based on its positioning.
            let el = this.$el;
            if (el.nodeType != Node.ELEMENT_NODE) el = el?.nextElementSibling;
            if (el == null) return;
            let image = el.querySelector('img');

            if (this.flashOnUpdate != null) this.flash(...this.flashOnUpdate);

            if (image == null) {
                el.scrollIntoView({ block: 'end' });
                return Promise.resolve(el);
            } else {
                return new Promise((resolve, reject) => {
                    image.onload = () => {
                        image.scrollIntoView({ block: 'end' });
                        image.onload = null;
                        resolve(image);
                    }
                });
            }
        },
        flash(cls, timeout) {
            let el = this.$el;
            if (el.nodeType != Node.ELEMENT_NODE) el = el?.nextElementSibling;
            if (el == null) return;
            el.classList.add(cls);
            setTimeout(() => el.classList.remove(cls), timeout);
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