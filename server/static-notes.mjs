import { renderer } from '../src/lib/markdown.mjs';
import { format, toDate } from 'date-fns';
renderer.set({ fragmentifyEnabled: false, highlightEnabled: false });

const notePage = (collection, file, renderedContent) => `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>${ `${ collection }/${ file }` }</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/app/styles.css">
    <script src="/api/custom-resource/mathjax-config.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>

<body class="static-page static-note-page">
<div class="container"><div class="rendered-note-content content">${ renderedContent }</div></div>
</body>
</html>
`;

const formatMtime = mtime => format(toDate(mtime), 'LL/dd/yy h:mm aaa');

const fileTableRow = ({ collection, name, mtime }) => `<tr>
<td>
<a class="is-hidden-mobile" href="/notes/${ collection }/${ name }">${ collection } / ${ name }</a>
<a class="is-hidden-tablet" href="/notes/${ collection }/${ name }">${ name }</a>
<br class="is-hidden-tablet"><small class="is-hidden-tablet">${ collection }</small>
</td>
<td class="datecell"><small>${ formatMtime(mtime) }</small></td>
</tr>`;

const listPage = (files) => `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Notes</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/app/styles.css">
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
        let renderedContent = renderer.render(content);
        let html = notePage(req.params.collection, req.params.file, renderedContent);
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
