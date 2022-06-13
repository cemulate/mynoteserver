import { render } from '../src/lib/markdown.mjs';

function printViewForNote(collection, file, content) {
    let renderedContent = render(content);
    return `<!doctype html>
<html>

<head>
    <meta charset="utf-8">
    <title>${ `${ collection }/${ file }` }</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/app/styles.css">
    <script src="/mathjax-config.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>

<body><div class="content p-4">${ renderedContent }</div></body>

</html>
`;

}

export { printViewForNote };
