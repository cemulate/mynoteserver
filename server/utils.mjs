const APPENDED_START = `
// Added by mynoteserver
window.MathJax = window.MathJax ?? {};
window.MathJax.tex = window.MathJax.tex ?? {};
window.MathJax.tex.macros = window.MathJax.tex.macros ?? {};
`;

function addMacroToMathjaxConfig(mathjaxConfigContent, key, value, arity) {
    let newContent = mathjaxConfigContent;
    let n = mathjaxConfigContent.indexOf(APPENDED_START);
    if (n < 0) newContent += APPENDED_START;
    let escapedValue = value.replace('\\', '\\\\');
    let newLine = `window.MathJax.tex.macros['${ key }'] = ["${ escapedValue }", ${ arity }];\n`;
    newContent += newLine;
    return newContent;
}

export { addMacroToMathjaxConfig };
