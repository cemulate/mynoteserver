// This file is also used on the server for server-side rendering, so it must be named .mjs
import MarkdownIt from 'markdown-it';
import markdownItMath from 'markdown-it-math/dist/markdown-it-math.js';
import { markdownItFragmentify, markdownItCustomFence, markdownItTargetBlank } from './markdown-it-plugins.mjs';
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

const markdownIt = new MarkdownIt({
    html: true,
    highlight,
});

markdownIt.use(markdownItMath, {
    inlineOpen: '$',
    inlineClose: '$',
    blockOpen: '$$',
    blockClose: '$$',
    inlineRenderer: str => `\\(${ str }\\)`,
    blockRenderer: (str, token) => {
        let attrString = '';
        if (token.attrs != null) attrString = token.attrs.map(([ attr, value ]) => ` ${ attr }="${ value }"`);
        return `<p${ attrString }>\n\\[\n${ str }\n\\]\n</p>`;
    },
});

// Re-write the renderer for "fence" tags
// This makes the renderer put token.attrs on the <pre> element of a fence, instead of the <code>
// In particular this makes the following plugin work correctly, since "fragment" will go on the <pre>
// Also allows the renderer to respect the 'highlightEnabled' option.
markdownIt.use(markdownItCustomFence);

markdownIt.use(markdownItFragmentify);
markdownIt.use(markdownItTargetBlank);

const renderer = markdownIt;

export { renderer };
