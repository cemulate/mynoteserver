import { StateField } from '@codemirror/state';
import { EditorView, WidgetType, Decoration } from '@codemirror/view';


class BadgeWidget extends WidgetType {
    constructor(text) {
        super()
        this.text = text;
    }

    eq(other) { return this.text == other.text }

    toDOM() {
        let el = document.createElement('a');
        el.classList.add('tag');
        el.classList.add('is-link');
        el.classList.add('cm-badge-widget');
        el.innerHTML = this.text;
        return el;
    }

    ignoreEvent() { return false }
}

function hideLinesByPrefixField(replacementInfo) {
    const replacements = replacementInfo.map(entry => {
        return { ...entry, decoration: Decoration.replace({ widget: new BadgeWidget(entry.replacement) })}
    });
    return StateField.define({
        create() {
            return Decoration.none;
        },
        update(hiddens, tr) {
            hiddens = hiddens.map(tr.changes);
            let pos = 0;
            let newHiddens = [];
            while (pos < tr.newDoc.length) {
                let line = tr.newDoc.lineAt(pos);
                // See if there is already a range on this line
                let duplicate = false;
                hiddens.between(line.from, line.to, () => duplicate = true);

                // Skip/don't check if duplicate
                for (let { prefix, decoration } of duplicate ? [] : replacements) {
                    if (line.text.startsWith(prefix)) {
                        newHiddens.push(decoration.range(line.from, line.to));
                        break;
                    }
                }
                pos = line.to + 1;
            }
            return hiddens.update({ add: newHiddens });
        },
        provide: f => EditorView.decorations.from(f),
    });
}

export { BadgeWidget, hideLinesByPrefixField };
