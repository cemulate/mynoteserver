import { renderer } from '../src/lib/markdown.mjs';
import { format, toDate } from 'date-fns';
renderer.set({ fragmentifyEnabled: false, highlightEnabled: true });

const HEADER = `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <base href="/" target="_blank">
`;

const notePage = (collection, file, renderedContent) => `<!doctype html>
<html>
<head>
    ${ HEADER }
    <title>${ `${ collection }/${ file }` }</title>
    <link rel="stylesheet" href="app/styles.css">
    <link rel="stylesheet" href="api/custom-resource/highlight-theme.css">
    <script src="api/custom-resource/config.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
</head>

<body class="static-page static-note-page">
<div class="container"><div class="rendered-note-content content">${ renderedContent }</div></div>
</body>
</html>
`;

const revealSlides = rawHtml => rawHtml.split('<hr>').slice(1).map(x => '<section>\n' + x + '\n</section>').join('');

const slidesPage = (collection, file, renderedContent) => `<!doctype html>
<html>
<head>
    ${ HEADER }
    <title>${ `${ collection }/${ file }` }</title>
    <link rel="stylesheet" href="app/styles.css">
    <link rel="stylesheet" href="api/custom-resource/highlight-theme.css">
    <link rel="stylesheet" href="app/resources/reveal.css">
    <link rel="stylesheet" href="api/custom-resource/reveal-theme.css">
    <script src="api/custom-resource/config.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
</head>

<body class="static-page static-slides-page">
<div class="reveal">
<div class="slides">
${ revealSlides(renderedContent) }
</slides>
</div>
<script src="/app/resources/reveal.js"></script>
<script>Reveal.initialize({ width: 1920 - 0.04 * 1920, height: 1080 - 0.04 * 1080, margin: 0.04 });</script>
</body>
</html>
`;

const formatMtime = mtime => format(toDate(mtime), 'LL/dd/yy h:mm aaa');

const fileTableRow = ({ collection, name, mtime }) => `<tr>
<td>
<a class="is-hidden-mobile" href="notes/${ collection }/${ name }">${ collection } / ${ name }</a>
<a class="is-hidden-tablet" href="notes/${ collection }/${ name }">${ name }</a>
<br class="is-hidden-tablet"><small class="is-hidden-tablet">${ collection }</small>
</td>
<td class="datecell"><small>${ formatMtime(mtime) }</small></td>
</tr>`;

const listPage = (files) => `<!doctype html>
<html>
<head>
    ${ HEADER }
    <title>Notes</title>
    <link rel="stylesheet" href="app/styles.css">
</head>

<body class="static-page">
<div class="container is-max-desktop">
<table class="table is-fullwidth">
<tbody>
<thead><tr><th>Name</th><th>Modified ⇧</th></tr></thead>
${ files.map(fileTableRow).join('\n') }
</tbody>
</table>
</div>
</body>
</html>
`;

async function routes(server, options) {
    const dir = options.directory;

    server.get('/:collection/:file', async (req, res) => {
        let content = await dir.readFile(req.params.collection, req.params.file + '.md');
        let isSlides = content.startsWith('---');
        let fragmentifyEnabled = isSlides && req.query.fragmentify != null;
        renderer.set({ fragmentifyEnabled });
        let renderedContent = renderer.render(content);
        let args = [ req.params.collection, req.params.file, renderedContent ];
        let html =  isSlides ? slidesPage(...args) : notePage(...args);
        res.header('Content-Type', 'text/html; charset=utf-8');
        return html;
    });

    server.get('/', async (req, res) => {
        let dirs = await dir.subdirectories();
        let entries = await Promise.all(dirs.map(async d => {
            let files = await dir.files(d.name, '.md');
            return files.map(f => ({ ...f, collection: d.name }));
        }));
        entries = entries.flat();
        entries.sort((a, b) => Math.sign(b.mtime - a.mtime));
        let html = listPage(entries);
        res.header('Content-Type', 'text/html; charset=utf-8');
        return html;
    });
}

export default routes;
