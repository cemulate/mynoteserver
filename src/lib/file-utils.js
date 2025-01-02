import * as network from './network';

const LOCAL_SPECIFIER = '@';

export async function loadFile(path) {
    if (path.startsWith(LOCAL_SPECIFIER)) {
        const entry = window.localStorage.getItem(path);
        if (entry != null) {
            return { success: true, isNew: false, content: JSON.parse(entry).content };
        } else {
            return { success: true, isNew: true, content: `# ${ path.slice(1) }` };
        }
    } else {
        const response = await network.get(`/api/file/${ path }`);
        if (response?.status == 200) {
            return { success: true, isNew: false, content: (await response.json()).content };
        } else if (response?.status == 404) {
            return { success: true, isNew: true, content: `# ${ path }` };
        } else {
            return { success: false };
        }
    }
}

export async function listFiles(settings = {}) {
    let fileEntries = Object.keys(window.localStorage).filter(x => x.startsWith(LOCAL_SPECIFIER)).map(path => ({
        path,
        ...JSON.parse(window.localStorage.getItem(path)),
    }));
    const response = await network.get('/api/ls');
    if (response?.status == 200) {
        const networkFiles = await response.json();
        fileEntries = [ ...fileEntries, ...networkFiles ];
    }
    return { localOnly: response?.status != 200, fileEntries };
}

export async function saveFile(path, content) {
    if (path.startsWith(LOCAL_SPECIFIER)) {
        window.localStorage.setItem(path, JSON.stringify({
            mtime: Date.now(),
            content,
        }));
        return true;
    } else {
        let response = await network.post(`/api/file/${ path }`, { content });
        return response?.status == 200;
    }
}
