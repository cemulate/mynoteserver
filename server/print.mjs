import { renderer } from '../src/lib/markdown.mjs';
renderer.set({ fragmentifyEnabled: false, highlightEnabled: false });

function printViewForNote(collection, file, content) {
    let renderedContent = renderer.render(content);
    return `<!doctype html>
<html>

<head>
    <meta charset="utf-8">
    <title>${ `${ collection }/${ file }` }</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/app/styles.css">
    <script src="/custom-resource/mathjax-config.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>

<body class="print-page">
<div class="container"><div class="rendered-note-content print-page content">${ renderedContent }</div></div>
</body>

</html>
`;

}

export { printViewForNote };