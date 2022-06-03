import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import cliOptions from './cli-options.mjs';

const DIR = cliOptions.directory;

async function routes(server, options) {
    server.get('/collections', async (req, res) => {
        let result = await fs.readdir(DIR, { withFileTypes: true });
        return result.filter(d => d.isDirectory()).map(d => d.name);
    });
    server.get('/files', async (req, res) => {
        let topList = await fs.readdir(DIR, { withFileTypes: true });
        let dirs = topList.filter(x => x.isDirectory());
        let results = await Promise.all(dirs.map(async (d) => {
            let files = await fs.readdir(path.join(DIR, d.name), { withFileTypes: true });
            files = files.filter(f => path.extname(f.name) == '.md');

            return await Promise.all(files.map(async (f) => {
                let stats = await fs.stat(path.join(DIR, d.name, f.name));
                return { name: path.basename(f.name, '.md'), collection: d.name, mtime: stats.mtime };
            }));
        }));
        return results.flat();
    });
    server.get('/collection/:collection', async (req, res) => {
        let result = await fs.readdir(path.join(DIR, req.params.collection), { withFileTypes: true });
        return result.filter(path.extname(d.name) == '.md').map(d => path.basename(d.name, '.md'));
    });
    server.get('/collection/:collection/file/:file', async (req, res) => {
        let content = await fs.readFile(
            path.join(DIR, req.params.collection, req.params.file + '.md'),
            { encoding: 'utf-8' },
        );
        return { content };
    });
    server.post('/collections', async (req, res) => {
        let { name } = req.body;
        await fs.mkdir(path.join(DIR, name), { recursive: true });
        return {};
    });
    server.post('/collection/:collection/file/:file', async (req, res) => {
        let { content } = req.body;
        let dest = path.join(DIR, req.params.collection, req.params.file + '.md');
        await fs.writeFile(dest, content);
        return {};
    });
};

export default routes;