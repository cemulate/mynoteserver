import { StateField } from '@codemirror/state';
import { EditorView, WidgetType, Decoration } from '@codemirror/view';


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

function hideLinesByPrefixField(prefix, replacement) {
    const rep = Decoration.replace({ widget: new BadgeWidget(replacement) });
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
                let duplicate = false;
                // Set duplicate if there is already a range on this line
                hiddens.between(line.from, line.to, () => duplicate = true);
                if (!duplicate && line.text.startsWith(prefix)) {
                    newHiddens.push(rep.range(line.from, line.to));
                }
                pos = line.to + 1;
            }
            return hiddens.update({ add: newHiddens });
        },
        provide: f => EditorView.decorations.from(f),
    });
}

export { BadgeWidget, hideLinesByPrefixField };
