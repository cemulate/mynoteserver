import path, { basename, extname, join } from 'node:path';
import { addMacroToMathjaxConfig, getMathjaxConfig, getMathjaxCHTMLStyleSheet } from './utils.mjs';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function routes(server, options) {
    const dir = options.directory;

    server.get('/custom-resource/:name', async (req, res) => {
        const defaultPaths = {
            'config.js': path.join(__dirname, 'resources', 'config-default.js'),
            'reveal-theme.css': path.join(__dirname, 'resources', 'reveal-theme-default.css'),
            'highlight-theme.css': path.join(__dirname, '..', 'node_modules', 'highlight.js', 'styles', 'default.css'),
        };
        const contentType = { '.js': 'text/javascript', '.css': 'text/css' };

        if (!Object.keys(defaultPaths).includes(req.params.name)) throw new Error('No such custom resource');
        let resource = req.params.name;
        let type = contentType[extname(resource)];
        res.header('Content-Type', `${ type }; charset=utf-8`);
        try {
            let content = await dir.readFile([ resource ]);
            return content;
        } catch (error) {
            let path = defaultPaths[resource];
            let content = await fs.readFile(path, { encoding: 'utf-8' });
            return content;
        }
    });
    server.get('/mathjax-chtml-stylesheet.css', async (req, res) => {
        let mathjaxConfig = await getMathjaxConfig(dir);
        let styleSheet = getMathjaxCHTMLStyleSheet(mathjaxConfig);
        res.header('Content-Type', 'text/css; charset=utf-8');
        return styleSheet;
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