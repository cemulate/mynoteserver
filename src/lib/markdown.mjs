// This file is also used on the server for server-side rendering, so it must be named .mjs
import MarkdownIt from 'markdown-it';
import MarkdownItMath from 'markdown-it-math/dist/markdown-it-math.js';

const markdownIt = new MarkdownIt({
    html: true,
});

markdownIt.use(MarkdownItMath, {
    inlineOpen: '$',
    inlineClose: '$',
    blockOpen: '$$',
    blockClose: '$$',
    inlineRenderer: str => `\\(${ str }\\)`,
    blockRenderer: str => `\\[\n${ str }\n\\]`,
});

const render = markdownIt.render.bind(markdownIt);

export { render };
