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
            let content = await dir.readFile([ req.params.name ]);
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
            curContent = await dir.readFile([ 'config.js' ]) ;
        } catch (error) {
            curContent = '';
        }
        let { key, value, arity } = req.body;
        let newContent = addMacroToMathjaxConfig(curContent, key, value, arity);
        await dir.writeFile(newContent, [ 'config.js' ]);
        return {};
    });
    server.get('/ls', async (req, res) => {
        return dir.ls();
    });
    server.get('/file/*', async (req, res) => {
        let path = req.params['*'].split('/');
        return dir.getFileData(true, path);
    });
    server.get('/stat/*', async (req, res) => {
        let path = req.params['*'].split('/');
        return dir.statFile(path);
    });
    server.post('/file/*', async (req, res) => {
        let { content } = req.body;
        let path = req.params['*'].split('/');
        await dir.writeFile(content, path);
        let stats = await dir.statFile(path);
        return stats;
    });
};

export default routes;