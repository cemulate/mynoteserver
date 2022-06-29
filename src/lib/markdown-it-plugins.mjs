import { escapeHtml, unescapeAll } from 'markdown-it/lib/common/utils.js';

// Add class "fragment" to 'vertical' elements;
// in a reveal.js presentation, this means you'll automatically "step through" each slide.
function markdownItFragmentify(markdownIt, options) {
    let defaults = { ...markdownIt.renderer.rules };

    for (let name of [ 'paragraph_open', 'list_item_open', 'blockquote_open', 'math_block', 'heading_open', 'html_block', 'fence', 'code_block' ]) {
        markdownIt.renderer.rules[name] = (tokens, idx, options, env, self) => {
            // Perform functionality by default (if this option is not present) or otherwise respect the option value
            if (options.fragmentifyEnabled ?? true) {
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

function markdownItCustomFence(markdownIt, options) {
    markdownIt.renderer.rules.fence = (tokens, idx, options, env, self) => {
        let token = tokens[idx];
        let info = token.info ? unescapeAll(token.info).trim() : '';
        let langName, langAttrs;
        if (info != null) {
            let parts = info.split(/(\s+)/g);
            langName = parts[0];
            langAttrs = parts.slice(2).join('');
        }

        let shouldHighlight = options.highlightEnabled ?? true;

        let highlighted = shouldHighlight
            ? options?.highlight?.(token.content, langName, langAttrs) ?? escapeHtml(token.content)
            : escapeHtml(token.content);

        let codeAttrString = (info != null && shouldHighlight)
            ? ` class="hljs ${ options.langPrefix + langName }"`
            : '';

        let tokenAttrs = token.attrs ?? [];
        let preAttrString = tokenAttrs.map(([ key, value ]) => ` ${ key }="${ value }"`);

        return `<pre${ preAttrString }><code${ codeAttrString }>${ highlighted }</code></pre>`;
    };
}

function markdownItTargetBlank(markdownIt, options) {
    const defaultRender = markdownIt.renderer.rules.link_open || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
    };

    markdownIt.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        const aIndex = tokens[idx].attrIndex('target');

        if (aIndex < 0) {
            tokens[idx].attrPush(['target', '_blank']); // add new attribute
        } else {
            tokens[idx].attrs[aIndex][1] = '_blank';    // replace value of existing attr
        }
        // pass token to default renderer.
        return defaultRender(tokens, idx, options, env, self);
    };
}

export { markdownItCustomFence, markdownItFragmentify, markdownItTargetBlank };
