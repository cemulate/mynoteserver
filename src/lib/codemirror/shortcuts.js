import { keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

const insertOnBothSides = insert => view => {
    let changes = [];
    for (let { from, to } of view.state.selection.ranges) {
        changes.push({ from, insert });
        changes.push({ from: to, insert });
    }
    view.dispatch({ changes });
}

const multiSelectVertical = dir => view => {
    let selection = view.state.selection;
    for (let range of view.state.selection.ranges) {
        if (!range.empty) continue;
        
        let line = view.state.doc.lineAt(range.anchor);
        let offset = range.anchor - line.from;
        
        let adjLineNumber = line.number + (dir == 'up' ? -1 : 1);
        if (adjLineNumber < 0 || adjLineNumber > view.state.doc.lines) continue;
        let adjLine = view.state.doc.line(adjLineNumber);
        let pos = adjLine.from + offset;
        
        selection = selection.addRange(EditorSelection.range(pos, pos));
    }
    view.dispatch({ selection });
};

const markdownStyleShortcutsKeymap = keymap.of([
    { key: 'Ctrl-b', run: insertOnBothSides('**') },
    { key: 'Ctrl-i', run: insertOnBothSides('_') },
    { key: 'Ctrl-l', preventDefault: true, run: insertOnBothSides('~~') },
    { key: 'Ctrl-Alt-ArrowUp', run: multiSelectVertical('up') },
    { key: 'Ctrl-Alt-ArrowDown', run: multiSelectVertical('down') },
]);

export { markdownStyleShortcutsKeymap };
