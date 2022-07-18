import { snippetCompletion, moveCompletionSelection, acceptCompletion, closeCompletion } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { markdownLanguage } from '@codemirror/lang-markdown';

import builtinTexSnippets from './builtin-tex-snippets';

let mathjaxMacros = window?.MathJax?.tex?.macros ?? {};
let userSnippetData = window?.mynoteserver?.userSnippets ?? {};

let baseSnippets = builtinTexSnippets.map(({ label, snippet }) => snippetCompletion(snippet, { label })).slice(0, 1000);
let texSnippets = Object.entries(mathjaxMacros).map(([ name, value ]) => {
    let hasArgs = !(typeof value == 'string');
    let arity = hasArgs ? value[1] : 0;
    
    // \macroname{#{1}}{#{2}}...{#{n}}
    let snippet = '\\' + name + Array(arity).fill().map((_, i) => '{#{' + (i+1).toString() + '}}').join('');
    // Add another autocomplete placeholder at the end to jump to if the macro has args
    if (hasArgs) snippet += '#{}';

    let label = '\\' + name;
    return snippetCompletion(snippet, { label });
});
let userSnippets = Object.entries(userSnippetData).map(([ name, value ]) => {
    let label = value.prefix;

    let snippet = value.body.join('\n').replaceAll(/\$([1-9])/g, '${$1}').replaceAll('$0', '${}');
    return snippetCompletion(snippet, { label });
});

const markdownTexSnippets = markdownLanguage.data.of({
    autocomplete: [ ...baseSnippets, ...texSnippets, ...userSnippets ],
});

// Autocomplete commands should be highest precedence
// Mainly, bind Tab as well as Enter to "accept completion"
const customAutocompletionKeymap = Prec.highest(keymap.of([
    { key: 'ArrowDown', run: moveCompletionSelection(true) },
    { key: 'ArrowUp', run: moveCompletionSelection(false) },
    { key: 'Tab', run: acceptCompletion },
    { key: 'Enter', run: acceptCompletion },
    { key: 'Escape', run: closeCompletion },
]));

export { markdownTexSnippets, customAutocompletionKeymap };
