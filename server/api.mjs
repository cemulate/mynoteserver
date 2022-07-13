import { basename, extname } from 'node:path';
import { addMacroToMathjaxConfig } from './utils.mjs';

async function routes(server, options) {
    const dir = options.directory;

    server.get('/custom-resource/:name', async (req, res) => {
        const allowed = [ 'config.js', 'reveal-theme.css', 'highlight-theme.css' ];
        if (!allowed.includes(req.params.name)) throw new Error('No such custom resource');
        try {
            let ext = extname(req.params.name);
            const type = { '.js': 'text/javascript', '.css': 'text/css' };
            let content = await dir.readFile(req.params.name);
            res.header('Content-Type', `${ type[ext] }; charset=utf-8`);
            return content;
        } catch (error) {
            if (req.params.name == 'reveal-theme.css') {
                res.redirect(303, '/app/resources/reveal-theme-default.css');
            } else if (req.params.name == 'highlight-theme.css') {
                res.redirect(303, '/app/resources/highlight-theme-default.css');
            } else if (req.params.name == 'config.js') {
                res.redirect(303, '/app/resources/config-default.js');
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
    server.get('/collection/:collection/file/:fileName', async (req, res) => {
        let statOnly = req.query.stat != null;
        let { collection, fileName } = req.params;
        let file = fileName + '.md';

        let data = await dir.getFileData(!statOnly, collection, file);
        return data;
    });
    server.post('/collection/:collection/file/:file', async (req, res) => {
        let { content } = req.body;
        let { collection, file } = req.params;
        await dir.writeFile(content, collection, file + '.md');
        let stats = await dir.statFile(collection, file + '.md');
        return stats;
    });
};

export default routes;