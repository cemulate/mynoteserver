import { StateEffect, StateField } from '@codemirror/state';
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

const addHiddenBadge = StateEffect.define();

const hiddenField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(hiddens, tr) {
        hiddens = hiddens.map(tr.changes);
        for (let e of tr.effects) {
            if (e.is(addHiddenBadge)) {
                // let d = Decoration.replace({ widget: new BadgeWidget('test') });
                let d = e.value.decoration;
                hiddens = hiddens.update({
                    add: [ e.value.decoration.range(e.value.from, e.value.to) ],
                });
            }
        }
        return hiddens;
    },
    provide: f => EditorView.decorations.from(f),
});

function prefixLineHider(prefix, replacement) {
    const decoration = Decoration.replace({ widget: new BadgeWidget(replacement) });
    return view => {
        let effects = [];
        let pos = 0;
        while (pos <= view.state.doc.length) {
            let line = view.state.doc.lineAt(pos);
            if (line.text.startsWith(prefix)) {
                effects.push(addHiddenBadge.of({ from: line.from, to: line.to, decoration }));
            }
            pos = line.to + 1;
        }
        view.dispatch({ effects });
    }
}

export { BadgeWidget, hiddenField, prefixLineHider };
