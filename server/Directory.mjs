import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import md5sum from 'md5';

class Directory {
    constructor(dir) {
        this.root = path.resolve(dir);
    }

    validateNames(names) {
        if (names.some(p => p.indexOf('\0') >= 0)) {
            throw new Error('Illegal character in file path');
        }
    }

    fullValidatedPath(parts) {
        this.validateNames(parts);
        let fullPath = path.join(this.root, ...parts);
        if (fullPath.indexOf(this.root) != 0) {
            throw new Error('Invalid file path');
        }
        return fullPath;
    }

    async subdirectories() {
        let result = await fs.readdir(this.root, { withFileTypes: true });
        return result.filter(x => x.isDirectory());
    }

    async files(dir, extension = null) {
        let p = this.fullValidatedPath([ dir ]);
        let files = await fs.readdir(p, { withFileTypes: true });
        if (extension != null) files = files.filter(f => path.extname(f.name) == extension);
        return await Promise.all(files.map(async f => {
            let data = await this.getFileData(false, dir, f.name);
            return {
                name: extension == null ? f.name : path.basename(f.name, extension),
                ...data,
            };
        }));
    }

    async getFileData(includeContent, ...parts) {
        let f = this.fullValidatedPath(parts);
        let [ content, stats ] = await Promise.all([ fs.readFile(f, { encoding: 'utf-8' }), fs.stat(f) ]);
        let md5 = md5sum(content);
        return { mtime: stats.mtimeMs, md5, ...(includeContent ? { content } : {}) };
    }

    async statFile(...parts) {
        return this.getFileData(false, ...parts);
    }

    async readFile(...parts) {
        let data = await this.getFileData(true, ...parts);
        return data.content;
    }

    async writeFile(content, ...parts) {
        let f = this.fullValidatedPath(parts);
        let d = this.fullValidatedPath(parts.slice(0, -1));
        await fs.mkdir(d, { recursive: true });
        await fs.writeFile(f, content);
    }
}

export default Directory;