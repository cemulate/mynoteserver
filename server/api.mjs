import { basename } from 'node:path';
import { printViewForNote } from './print.mjs';

async function routes(server, options) {
    const dir = options.directory;

    server.get('/mathjax-config.js', async (req, res) => {
        let content = await dir.readFile('mathjax-config.js');
        res.header('Content-Type', 'text/javascript; charset=utf-8');
        return content;
    });
    server.get('/reveal-theme.css', async (req, res) => {
        try {
            let content = await dir.readFile('reveal-theme.css');
            res.header('Content-Type', 'text/css; charset=utf-8');
            return content;
        } catch (error) {
            res.redirect(303, '/app/reveal-theme-white.css');
        }
    });
    server.get('/collections', async (req, res) => {
        let result = await dir.subdirectories();
        return result.map(d => d.name);
    });
    server.get('/files', async (req, res) => {
        let dirs = await dir.subdirectories();
        let entries = await Promise.all(dirs.map(async d => {
            let files = await dir.files(d.name, '.md');
            return files.map(f => ({ ...f, collection: d.name }));
        }));
        return entries.flat();
    });
    server.get('/collection/:collection', async (req, res) => {
        let result = await dir.files(req.params.collection, '.md');
        return result.map(f => basename(f.name, '.md'));
    });
    server.get('/collection/:collection/file/:file', async (req, res) => {
        let content = await dir.readFile(req.params.collection, req.params.file + '.md');
        return { content };
    });
    server.get('/collection/:collection/file/:file/print', async (req, res) => {
        let content = await dir.readFile(req.params.collection, req.params.file + '.md');
        let html = printViewForNote(req.params.collection, req.params.file, content);
        res.header('Content-Type', 'text/html; charset=utf-8');
        return html;
    });
    server.post('/collection/:collection/file/:file', async (req, res) => {
        let { content } = req.body;
        let { collection, file } = req.params;
        await dir.writeFile(content, collection, file + '.md');
        return {};
    });
};

export default routes;