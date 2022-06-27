import { snippetCompletion, moveCompletionSelection, acceptCompletion } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import builtinTexSnippets from './builtin-tex-snippets';

function addTexAutocompleteToLanguage(language) {
    let macros = window?.MathJax?.config?.tex?.macros ?? {};
    
    let baseSnippets = builtinTexSnippets.map(({ label, snippet }) => snippetCompletion(snippet, { label }));
    let userSnippets = Object.entries(macros).map(([ name, value ]) => {
        let hasArgs = !(typeof value == 'string');
        let arity = hasArgs ? value[1] : 0;
        
        // \macroname{#{1}}{#{2}}...{#{n}}
        let snippet = '\\' + name + Array(arity).fill().map((_, i) => '{#{' + (i+1).toString() + '}}').join('');
        // Add another autocomplete placeholder at the end to jump to if the macro has args
        if (hasArgs) snippet += '#{}';

        let label = '\\' + name;
        console.log(snippet, label);
        return snippetCompletion(snippet, { label });
    });

    return language.data.of({
        autocomplete: [ ...baseSnippets, ...userSnippets ],
    });
}

// Autocomplete commands should be highest precedence
const customAutocompletionKeymap = Prec.highest(keymap.of([
    { key: 'ArrowDown', run: moveCompletionSelection(true) },
    { key: 'ArrowUp', run: moveCompletionSelection(false) },
    { key: 'Tab', run: acceptCompletion },
]));

export { addTexAutocompleteToLanguage, customAutocompletionKeymap };
