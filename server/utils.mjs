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
    let newLine = `window.MathJax.tex.macros['${ key }'] = ["${ escapedValue }", ${ arity }];\n`;
    newContent += newLine;
    return newContent;
}

export { addMacroToMathjaxConfig };
