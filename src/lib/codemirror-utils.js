import { EditorState } from '@codemirror/state';
import { basicSetup } from '@codemirror/basic-setup';
import { indentWithTab } from '@codemirror/commands';
import { markdown as langMarkdown } from '@codemirror/lang-markdown';
import { EditorView, keymap, WidgetType, Decoration, ViewPlugin } from '@codemirror/view';


class BadgeWidget extends WidgetType {
    constructor(text) {
        super()
        this.text = text;
    }

    eq(other) { return this.text == other.text }

    toDOM() {
        let el = document.createElement('span');
        el.classList.add('tag');
        el.classList.add('is-link');
        el.innerHTML = this.text;
        return el;
    }
}

function hideLines(view, prefix, replacement) {
    let decs = [];
    for (let { from, to } of view.visibleRanges) {
        let startLine = view.state.doc.lineAt(from);
        let endLine = view.state.doc.lineAt(to);
        for (let i = startLine.number; i <= endLine.number; i++) {
            let line = view.state.doc.line(i);
            if (line.text.startsWith(prefix)) {
                let d = Decoration.replace({ widget: new BadgeWidget(replacement) });
                decs.push(d.range(line.from, line.to));
            }
        }
    }
    return Decoration.set(decs);
}

const hideLinesPlugin = (prefix, replacement) => ViewPlugin.fromClass(class {
    constructor(view) {
        this.decorations = hideLines(view, prefix, replacement);
    }

    update(update) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = hideLines(update.view, prefix, replacement);
        }
    }
}, {
    decorations: v => v.decorations,
});

export { BadgeWidget, hideLinesPlugin };
