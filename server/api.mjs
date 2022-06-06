import { basename } from 'node:path';

async function routes(server, options) {
    const dir = options.directory;

    server.get('/mathjax-config', async (req, res) => {
        let content = await dir.readFile('mathjax-config.js');
        res.header('Content-Type', 'text/javascript; charset=utf-8');
        return content;
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
    server.post('/collection/:collection/file/:file', async (req, res) => {
        let { content } = req.body;
        let { collection, file } = req.params;
        await dir.writeFile(content, collection, file + '.md');
        return {};
    });
};

export default routes;