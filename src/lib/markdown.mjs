// This file is also used on the server for server-side rendering, so it must be named .mjs
import MarkdownIt from 'markdown-it';
import markdownItMath from 'markdown-it-math/dist/markdown-it-math.js';
import markdownItFragmentify from './markdown-it-fragmentify.mjs';

const markdownIt = new MarkdownIt({
    html: true,
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

markdownIt.use(markdownItFragmentify, {});

const renderer = markdownIt;

export { renderer };
