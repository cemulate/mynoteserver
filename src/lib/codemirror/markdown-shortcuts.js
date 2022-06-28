import { keymap } from '@codemirror/view';

const insertOnBothSides = insert => view => {
    let changes = [];
    for (let { from, to } of view.state.selection.ranges) {
        changes.push({ from, insert });
        changes.push({ from: to, insert });
    }
    view.dispatch({ changes });
}

const markdownStyleShortcutsKeymap = keymap.of([
    { key: 'Ctrl-b', run: insertOnBothSides('**') },
    { key: 'Ctrl-i', run: insertOnBothSides('_') },
    { key: 'Ctrl-l', preventDefault: true, run: insertOnBothSides('~~') },
]);

export { markdownStyleShortcutsKeymap };
