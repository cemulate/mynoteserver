// Add class "fragment" to 'vertical' elements;
// in a reveal.js presentation, this means you'll automatically "step through" each slide.
function markdownItFragmentify(markdownIt, options) {
    let defaults = { ...markdownIt.renderer.rules };

    for (let name of [ 'paragraph_open', 'list_item_open', 'blockquote_open', 'math_block', 'heading_open', 'html_block' ]) {
        markdownIt.renderer.rules[name] = (tokens, idx, options, env, self) => {
            // Perform functionality by default (if this option is not present) or otherwise respect the option value
            if (options.fragmentify ?? true) {
                let token = tokens[idx];
                if (name != 'html_block') {
                    // Normally, just add class="fragment" to the token's attrs, and 
                    // pass to the base renderer.
                    var aIndex = token.attrIndex('class');
                    if (aIndex >= 0) {
                        let existing = token.attrs[aIndex][1]
                        token.attrs[aIndex][1] = existing + ' fragment';
                    } else {
                        token.attrPush([ 'class', 'fragment' ]);
                    }
                } else {
                    // Token is raw HTML; wrap with a fragment div.
                    token.content = `<div class="fragment">${ token.content }</div>`;
                }
            }
            if (name in defaults) return defaults[name](tokens, idx, options, env, self);
            return self.renderToken(tokens, idx, options);
        };
    }
}

export default markdownItFragmentify;
