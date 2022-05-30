import MarkdownIt from 'markdown-it';
import MarkdownItMath from 'markdown-it-math/dist/markdown-it-math';

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

export { markdownIt };
