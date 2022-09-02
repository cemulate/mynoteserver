// This file is also used on the server for server-side rendering, so it must be named .mjs
import MarkdownIt from 'markdown-it';
import markdownItMath from 'markdown-it-math/dist/markdown-it-math.js';
import markdownItAttrs from 'markdown-it-attrs/index.js';
import { colorPlugin as markdownItColor } from 'markdown-it-color/dist/index.js';
import { markdownItFragmentify, markdownItCustomFence } from './markdown-it-plugins.mjs';
import { MathRenderer } from './mathjax.mjs';
import hljs from 'highlight.js';

const highlight = (str, language) => {
    if (language != null && hljs.getLanguage(language) != null) {
        try {
            return hljs.highlight(str, { language }).value;
        } catch (error) {
            return null;
        }
    }
    return null;
}

class MarkdownRenderer {
    constructor(mathjaxConfig) {
        this.markdownIt = new MarkdownIt({
            highlight,
            html: true,
        });
    
        this.mathRenderer = new MathRenderer(mathjaxConfig);
    
        this.markdownIt.use(markdownItMath, {
            inlineOpen: '$',
            inlineClose: '$',
            blockOpen: '$$',
            blockClose: '$$',
            inlineRenderer: str => this.mathRenderer.render(str, false),
            blockRenderer: (str, token) => {
                let attrString = '';
                if (token.attrs != null) attrString = token.attrs.map(([ attr, value ]) => ` ${ attr }="${ value }"`);
                let mathContent = this.mathRenderer.render(str, true);
                return `<p${ attrString }>\n${ mathContent }\n</p>`;
            },
        });

        this.markdownIt.use(markdownItColor, { inline: true });
        this.markdownIt.use(markdownItAttrs);
    
        // Re-write the renderer for "fence" tags
        // This makes the renderer put token.attrs on the <pre> element of a fence, instead of the <code>
        // In particular this makes the following plugin work correctly, since "fragment" will go on the <pre>
        // Also allows the renderer to respect the 'highlightEnabled' option.
        this.markdownIt.use(markdownItCustomFence);
        this.markdownIt.use(markdownItFragmentify);
    }

    render(content, opts) {
        let { fragmentifyEnabled, highlightEnabled } = opts;
        this.markdownIt.set({ fragmentifyEnabled, highlightEnabled });

        return this.markdownIt.render(content);
    }

    getStyleSheet() {
        return this.mathRenderer.getStyleSheet();
    }
}

const defaultMarkdownRenderer = new MarkdownRenderer(globalThis?.MathJax);

export { MarkdownRenderer, defaultMarkdownRenderer };
