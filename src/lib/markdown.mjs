// This file is also used on the server for server-side rendering, so it must be named .mjs
import MarkdownIt from 'markdown-it';
import markdownItMath from 'markdown-it-math/dist/markdown-it-math.js';
import markdownItAttrs from 'markdown-it-attrs/index.js';
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

function markdownRenderer(mathjaxConfig) {

    const markdownIt = new MarkdownIt({
        highlight,
        html: true,
    });

    markdownIt.use(markdownItAttrs);

    // Re-write the renderer for "fence" tags
    // This makes the renderer put token.attrs on the <pre> element of a fence, instead of the <code>
    // In particular this makes the following plugin work correctly, since "fragment" will go on the <pre>
    // Also allows the renderer to respect the 'highlightEnabled' option.
    markdownIt.use(markdownItCustomFence);
    markdownIt.use(markdownItFragmentify);

    const mathRenderer = new MathRenderer(mathjaxConfig);

    markdownIt.use(markdownItMath, {
        inlineOpen: '$',
        inlineClose: '$',
        blockOpen: '$$',
        blockClose: '$$',
        inlineRenderer: str => mathRenderer.render(str, false),
        blockRenderer: (str, token) => {
            let attrString = '';
            if (token.attrs != null) attrString = token.attrs.map(([ attr, value ]) => ` ${ attr }="${ value }"`);
            let mathContent = mathRenderer.render(str, true);
            return `<p${ attrString }>\n${ mathContent }\n</p>`;
        },
    });

    return (content, opts = {}) => {
        let { fragmentifyEnabled, highlightEnabled } = opts;
        markdownIt.set({ fragmentifyEnabled, highlightEnabled });

        let html = markdownIt.render(content);

        return { html, styleSheet: mathRenderer.getStyleSheet() };
    }
}

export { markdownRenderer };
