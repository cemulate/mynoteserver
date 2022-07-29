<template>
<div class="CodeMirror-root" ref="root" @paste="onPaste"></div>
</template>

<script>
import { EditorView, minimalSetup } from 'codemirror';
import { EditorState, EditorSelection, Prec, Compartment, Text } from '@codemirror/state';
import { keymap, scrollPastEnd, lineNumbers, highlightActiveLineGutter, drawSelection, highlightActiveLine } from '@codemirror/view';
import { indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { foldGutter, foldKeymap, defaultHighlightStyle, syntaxHighlighting, bracketMatching, syntaxTree, ensureSyntaxTree } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion, snippetKeymap } from '@codemirror/autocomplete';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { markdown as langMarkdown, markdownLanguage } from '@codemirror/lang-markdown';

import { hideLinesByPrefixField } from '../lib/codemirror/hide-lines-by-prefix';
import {
    InlineMathConfig,
    BlockMathConfig,
    markdownTexHighlightStyle,
    markdownBrackets,
    customCloseBrackets,
} from '../lib/codemirror/markdown-language-ext.js';
import { markdownTexSnippets, customAutocompletionKeymap } from '../lib/codemirror/tex-snippets';
import { customShortcutsKeymap } from '../lib/codemirror/shortcuts';
import { getImageDataURLFromClipboardEvent } from '../lib/image-utils';

const IMAGE_LINE_START = `![](`;
const IMAGE_LINE_END = `)`;

const SLIDE_BOUNDARY = '---';

export default {
    data: () => ({
        editorView: null,
        debounceTimeoutID: null,
        ignoreNextDocUpdate: false,
        firstCommit: false,
        editableCompartment: null,
    }),
    props: {
        debounce: {
            type: Number,
            default: 500,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    emits: [
        'update:chunks',
        'update:isSlides',
        'edited',
    ],
    mounted() {
        this.editableCompartment = new Compartment();
        this.editorView = new EditorView({
            doc: 'Initializing...',
            extensions: [
                minimalSetup,
                lineNumbers(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                history(),
                foldGutter(),
                drawSelection(),
                EditorState.allowMultipleSelections.of(true),
                syntaxHighlighting(defaultHighlightStyle),
                bracketMatching(),
                customCloseBrackets,
                autocompletion({ defaultKeymap: false }),
                search(),
                highlightSelectionMatches(),
                keymap.of([
                    indentWithTab,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...searchKeymap,
                    snippetKeymap,
                ]),
                Prec.high(keymap.of(closeBracketsKeymap)), // boost precedence
                customAutocompletionKeymap,
                Prec.high(customShortcutsKeymap),

                EditorView.lineWrapping,
                scrollPastEnd(),
                langMarkdown({
                    base: markdownLanguage,
                    extensions: [ InlineMathConfig, BlockMathConfig ],
                }),
                markdownTexSnippets,
                markdownBrackets,
                syntaxHighlighting(markdownTexHighlightStyle),
                hideLinesByPrefixField([
                    { prefix: IMAGE_LINE_START, replacement: 'Figure' },
                    { prefix: '<svg', replacement: 'SVG' },
                ]),
                this.editableCompartment.of(EditorView.editable.of(!this.disabled)),
                EditorView.updateListener.of(this.onDocumentUpdate.bind(this)),
                EditorView.domEventHandlers({ click: this.onClick.bind(this) }),
            ],
            parent: this.$refs.root,
        });
    },
    methods: {
        onDocumentUpdate(update) {
            if (!update.docChanged) return;
            if (this.ignoreNextDocUpdate) return false;

            if (this.debounceTimeoutID != null) window.clearTimeout(this.debounceTimeoutID);
            this.debounceTimeoutID = window.setTimeout(this.commitChunks.bind(this), this.debounce);
        },
        async commitChunks() {
            const isSlides = this.editorView.state.doc.line(1).text.startsWith(SLIDE_BOUNDARY);
            let chunks = [];
            const cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            let editedChunkIndex = null;

            if (!isSlides) {
                const t = ensureSyntaxTree(this.editorView.state, this.editorView.state.doc.length, 5000);
                let node = t.topNode.firstChild;
                while (node != null) {
                    chunks.push(this.editorView.state.sliceDoc(node.from, node.to));
                    if (cursor >= node.from && cursor < node.to) editedChunkIndex = chunks.length - 1;
                    node = node.nextSibling;
                }
            } else {
                let pos = this.editorView.state.doc.line(1).to + 1;
                let curStart = pos;
                while (pos < this.editorView.state.doc.length) {
                    let line = this.editorView.state.doc.lineAt(pos);
                    if (line.text.startsWith(SLIDE_BOUNDARY)) {
                        chunks.push(this.editorView.state.sliceDoc(curStart, line.from).trim());
                        if (cursor >= curStart && cursor < line.from) editedChunkIndex = chunks.length - 1;
                        curStart = line.to + 1;
                    }
                    pos = line.to + 1;
                }
            }
            
            if (!this.firstCommit) this.$emit('edited', editedChunkIndex);
            this.firstCommit = false;
            this.$emit('update:isSlides', isSlides);
            this.$emit('update:chunks', chunks);
        },
        async setDocument(newSource) {
            this.ignoreNextDocUpdate = true;
            this.firstCommit = true;
            this.editorView.dispatch({
                changes: { from: 0, to: this.editorView.state.doc.length, insert: newSource },
                selection: EditorSelection.range(newSource.length, newSource.length),
                effects: [ EditorView.scrollIntoView(newSource.length) ],
            });
            this.$nextTick(() => this.ignoreNextDocUpdate = false);

            // All this is to ensure that, on a new (perhaps large) document change,
            // The UI will satisfy this desirable property:
            // The editor/CodeMirror buffer will load once the syntax is fully parsed, but
            // will not be blocked by the large render resulting from commitChunks(); the rendered
            // content will appear later when THAT is done.
            return new Promise((resolve, reject) => {
                const t = ensureSyntaxTree(this.editorView.state, this.editorView.state.doc.length, 5000);
                if (t == null) reject();
                resolve();
            }).then(() => {
                setTimeout(() => this.commitChunks(), 0);
            });
        },
        getDocument() {
            return this.editorView.state.doc.toString();
        },
        addOrReplaceImageAtCursor(dataURL) {
            let cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            let line = this.editorView.state.doc.lineAt(cursor);
            let content = IMAGE_LINE_START + dataURL + IMAGE_LINE_END;
            let shouldReplace = line.length == 0 || line.text.startsWith(IMAGE_LINE_START);
            let changes = shouldReplace
                ? { from: line.from, to: line.to, insert: content }
                : { from: cursor, insert: '\n' + content };
            this.editorView.dispatch({ changes });
        },
        checkCursorForImage() {
            const cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            const line = this.editorView.state.doc.lineAt(cursor);
            if (cursor != line.to) return { valid: false, image: null };
            if (!line.text.startsWith(IMAGE_LINE_START)) return { valid: true, image: null };
            let image = line.text.slice(IMAGE_LINE_START.length, line.length - IMAGE_LINE_END.length);
            return { valid: true, image };
        },
        getCursorRegion(regionPrefix) {
            const cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            const cursorLine = this.editorView.state.doc.lineAt(cursor);
            let region = 0, line = 1;
            for (let content of this.editorView.state.doc.iterLines(1)) {
                if (content.startsWith(regionPrefix)) region += 1;
                line += 1;
                if (line > cursorLine.number) break;
            }
            return region;
        },
        onClick(event, view) {
            let el = event.target;
            if (!(el.classList.contains('cm-badge-widget') && el.innerHTML == 'Figure')) return;
            let n = view.posAtDOM(el);
            let line = view.state.doc.lineAt(n);
            this.editorView.dispatch({
                selection: EditorSelection.cursor(line.to),
            });
            this.$emit('openImageAtCursor');
        },
        focus() {
            this.editorView.focus();
        },
        async onPaste(event) {
            let image = await getImageDataURLFromClipboardEvent(event);
            if (image != null) this.$emit('pasteImage', image);
        },
    },
    watch: {
        disabled(newVal) {
            this.editorView.dispatch({
                effects: this.editableCompartment.reconfigure(EditorView.editable.of(!newVal)),
            });
        },
    },
};
</script>

<style lang="scss">
.CodeMirror-root {
    > .cm-editor {
        height: 100%;
    }
}
</style>