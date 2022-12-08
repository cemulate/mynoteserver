import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import md5sum from 'md5';
import { dirname } from 'node:path';

async function* walk(p, extension = null, prefix = []) {
    for await (let d of await fs.opendir(p)) {
        let nextDir = path.join(p, d.name);
        let nextPrefix = [ ...prefix, d.name ];
        if (d.isDirectory()) yield* walk(nextDir, extension, nextPrefix);
        else if (d.isFile() && (extension == null || path.extname(d.name) == extension)) yield nextPrefix;
    }
}

function pathParts(p) {
    let dirname = path.dirname(p);
    let basename = path.basename(p);
    let extname = path.extname(basename);
    return { dirname, basename, extname };
}

class Directory {
    constructor(dir) {
        this.root = path.resolve(dir);
    }

    ensureExt(p, ext) {
        let { dirname, basename, extname } = pathParts(p);
        if (ext != null && extname != ext) basename += ext;
        return path.join(dirname, basename);
    }

    dropExt(p) {
        let { dirname, basename, extname } = pathParts(p);
        if (extname != '') basename = basename.slice(0, -extname.length);
        return path.join(dirname, basename);
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

    async ls(ext = null) {
        let p = this.fullValidatedPath([]);

        let results = [];
        for await (let path of walk(p, ext)) {
            let data = await this.getFileData(false, path);
            results.push(data);
        }
        return results;
    }

    async getFileData(includeContent, parts, implicitExt = null) {
        let f = this.fullValidatedPath(parts);
        if (implicitExt != null) f = this.ensureExt(f, implicitExt);
        let [ content, stats ] = await Promise.all([ fs.readFile(f, { encoding: 'utf-8' }), fs.stat(f) ]);
        let md5 = md5sum(content);
        let p = this.dropExt(path.join(...parts));
        return { path: p, mtime: stats.mtimeMs, md5, ...(includeContent ? { content } : {}) };
    }

    async statFile(parts, implicitExt = null) {
        return this.getFileData(false, parts, implicitExt);
    }

    async readFile(parts, implicitExt = null) {
        let data = await this.getFileData(true, parts, implicitExt);
        return data.content;
    }

    async writeFile(content, parts, implicitExt = null) {
        let f = this.fullValidatedPath(parts);
        if (implicitExt != null) f = this.ensureExt(f, implicitExt);
        let d = path.dirname(f);
        await fs.mkdir(d, { recursive: true });
        await fs.writeFile(f, content);
    }
}

export default Directory;