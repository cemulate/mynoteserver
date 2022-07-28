import * as vm from 'node:vm';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const MATHJAX_APPENDED_START = `
// Added by mynoteserver
window.MathJax = window.MathJax ?? {};
window.MathJax.tex = window.MathJax.tex ?? {};
window.MathJax.tex.macros = window.MathJax.tex.macros ?? {};
`;

function addMacroToMathjaxConfig(mathjaxConfigContent, key, value, arity) {
    // Instead of attempting to parse/alter the existing file in place (since it could
    // create window.MathJax in any way!), simply use the strategy in MATHJAX_APPENDED_START
    // added at the end of the file.
    let newContent = mathjaxConfigContent;
    if (mathjaxConfigContent.indexOf(MATHJAX_APPENDED_START) < 0) newContent += MATHJAX_APPENDED_START;

    // This needs to go inside a string literal inside the file, replace \ -> \\.
    let escapedValue = value.replace('\\', '\\\\');
    let newLine = `window.MathJax.tex.macros["${ key }"] = ["${ escapedValue }", ${ arity }];\n`;
    newContent += newLine;
    return newContent;
}

async function getMathjaxConfig(customDir) {
    // Normally, window.MathJax is set in config[-default].js, to configure it on the client
    // We need to use the same config file to configure it on the server.
    const context = { window: {} };
    vm.createContext(context);
    let code;
    try {
        code = await customDir.readFile([ 'config.js' ]);
    } catch (error) {
        code = await fs.readFile(join(__dirname, 'resources', 'config-default.js'), { encoding: 'utf-8' });
    }
    vm.runInContext(code, context);
    return context.window.MathJax;
}

export { addMacroToMathjaxConfig, getMathjaxConfig };
