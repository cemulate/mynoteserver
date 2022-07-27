import { markdownRenderer } from '../src/lib/markdown/markdown.mjs';
import { format, toDate } from 'date-fns';
import { dirname, basename, join } from 'node:path';
import * as fs from 'node:fs/promises';
import * as vm from 'node:vm';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const HEADER = `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <base href="/" target="_blank">
`;

const notePage = (path, renderedContent, styleSheet) => `<!doctype html>
<html>
<head>
    ${ HEADER }
    <title>${ `${ path }` }</title>
    <link rel="stylesheet" href="app/styles.css">
    <link rel="stylesheet" href="api/custom-resource/highlight-theme.css">
    <script src="api/custom-resource/config.js"></script>
    <style>${ styleSheet }</style>
</head>

<body class="static-page static-note-page">
<div class="container"><div class="rendered-note-content content">${ renderedContent }</div></div>
</body>
</html>
`;

const revealSlides = rawHtml => rawHtml.split('<hr>').slice(1).map(x => '<section>\n' + x + '\n</section>').join('');

const slidesPage = (path, renderedContent, styleSheet) => `<!doctype html>
<html>
<head>
    ${ HEADER }
    <title>${ `${ path }` }</title>
    <link rel="stylesheet" href="app/styles.css">
    <link rel="stylesheet" href="api/custom-resource/highlight-theme.css">
    <link rel="stylesheet" href="app/resources/reveal.css">
    <link rel="stylesheet" href="api/custom-resource/reveal-theme.css">
    <script src="api/custom-resource/config.js"></script>
    <style>${ styleSheet }</style>
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

const fileTableRow = ({ path, mtime }) => `<tr>
<td>
<a class="is-hidden-mobile" href="notes/${ path }">${ path }</a>
<a class="is-hidden-tablet" href="notes/${ path }">${ basename(path) }</a>
<br class="is-hidden-tablet"><small class="is-hidden-tablet">${ dirname(path) }</small>
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

async function getMathjaxConfig(customDir) {
    // Normally, window.MathJax is set in config[-default].js, to configure it on the client
    // We need to use the same config file to configure it on the server.
    const context = { window: {} };
    vm.createContext(context);
    let code;
    try {
        code = await customDir.readFile([ 'config.js' ]);
    } catch (error) {
        code = await fs.readFile(join(__dirname, 'resources', 'config-default.js'), { encoding: 'utf-8' });
    }
    vm.runInContext(code, context);
    return context.window.MathJax;
}

async function routes(server, options) {
    const dir = options.directory;

    server.get('/*', async (req, res) => {
        // Do this on every request to ensure we're respecting new config files
        let mathjaxConfig = await getMathjaxConfig(dir);
        const renderMarkdown = markdownRenderer(mathjaxConfig);

        let path = req.params['*'].split('/');
        let content = await dir.readFile(path);
        let isSlides = content.startsWith('---');
        let fragmentifyEnabled = isSlides && req.query.fragmentify != null;
        let { html: renderedContent, styleSheet } = renderMarkdown(content, { fragmentifyEnabled, highlightEnabled: true });
        let args = [ path.join('/'), renderedContent, styleSheet ];
        let html =  isSlides ? slidesPage(...args) : notePage(...args);
        res.header('Content-Type', 'text/html; charset=utf-8');
        return html;
    });

    server.get('/', async (req, res) => {
        let entries = await dir.ls();
        entries.sort((a, b) => Math.sign(b.mtime - a.mtime));
        let html = listPage(entries);
        res.header('Content-Type', 'text/html; charset=utf-8');
        return html;
    });
}

export default routes;
