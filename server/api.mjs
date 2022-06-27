import { basename, extname } from 'node:path';
import { addMacroToMathjaxConfig } from './utils.mjs';

async function routes(server, options) {
    const dir = options.directory;

    server.get('/custom-resource/:name', async (req, res) => {
        const allowed = [ 'mathjax-config.js', 'reveal-theme.css', 'highlight-theme.css', 'snippets.json' ];
        if (!allowed.includes(req.params.name)) throw new Error('No such custom resource');
        try {
            let ext = extname(req.params.name);
            const type = { '.js': 'text/javascript', '.css': 'text/css' };
            let content = await dir.readFile(req.params.name);
            res.header('Content-Type', `${ type[ext] }; charset=utf-8`);
            return content;
        } catch (error) {
            if (req.params.name == 'reveal-theme.css') {
                res.redirect(303, '/app/reveal-theme-default.css');
            } else if (req.params.name == 'highlight-theme.css') {
                res.redirect(303, '/app/highlight-theme-default.css');
            } else {
                throw error;
            }
        }
    });
    server.post('/add-mathjax-macro', async (req, res) => {
        let curContent;
        try {
            curContent = await dir.readFile('mathjax-config.js') ;
        } catch (error) {
            curContent = '';
        }
        let { key, value, arity } = req.body;
        let newContent = addMacroToMathjaxConfig(curContent, key, value, arity);
        await dir.writeFile(newContent, 'mathjax-config.js');
        return {};
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
        let [ content, mtime ] = await Promise.all([
            dir.readFile(req.params.collection, req.params.file + '.md'),
            dir.getFileMtime(req.params.collection, req.params.file + '.md'),
        ]);
        return { content, mtime };
    });
    server.post('/collection/:collection/file/:file', async (req, res) => {
        let { content } = req.body;
        let { collection, file } = req.params;
        await dir.writeFile(content, collection, file + '.md');
        let mtime = await dir.getFileMtime(collection, file + '.md');
        return { mtime };
    });
};

export default routes;