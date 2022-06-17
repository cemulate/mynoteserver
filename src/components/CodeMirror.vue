<template>
<div class="CodeMirror-root" ref="root" @paste="onPaste"></div>
</template>

<script>
import { EditorView, minimalSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { keymap, scrollPastEnd, lineNumbers, highlightActiveLineGutter, drawSelection, highlightActiveLine } from '@codemirror/view';
import { indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { foldGutter, foldKeymap, defaultHighlightStyle, syntaxHighlighting, bracketMatching } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { markdown as langMarkdown } from '@codemirror/lang-markdown';


import { hideLinesByPrefixField } from '../lib/codemirror-utils';
import { getImageDataURLFromClipboardEvent } from '../lib/image-utils';

const IMAGE_LINE_START = `<p class="inline-figure"><img src="`;
const IMAGE_LINE_END = `"/></p>`;

export default {
    data: () => ({
        editorView: null,
        debounceTimeoutID: null,
        ignoreNextDocUpdate: false,
        ignoreNextModelUpdate: false,
    }),
    props: {
        modelValue: {
            type: String,
            default: 'Hello, world!',
        },
        debounce: {
            type: Number,
            default: 500,
        },
    },
    mounted() {
        this.editorView = new EditorView({
            doc: this.modelValue,
            extensions: [ 
                minimalSetup,
                lineNumbers(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                history(),
                foldGutter(),
                drawSelection(),
                EditorState.allowMultipleSelections.of(true),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                bracketMatching(),
                closeBrackets(),
                search(),
                highlightSelectionMatches(),
                keymap.of([
                    indentWithTab,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...closeBracketsKeymap,
                    ...searchKeymap,
                ]),

                EditorView.lineWrapping,
                scrollPastEnd(),
                langMarkdown(),
                hideLinesByPrefixField(IMAGE_LINE_START, 'Figure'),
                EditorView.updateListener.of(this.onDocumentUpdate.bind(this)),
                EditorView.domEventHandlers({ click: this.onClick.bind(this) }),
            ],
            parent: this.$refs.root,
        });
    },
    methods: {
        onDocumentUpdate(update) {
            if (!update.docChanged) return;
            if (this.ignoreNextDocUpdate) {
                this.ignoreNextDocUpdate = false;
                return;
            }

            if (this.debounceTimeoutID != null) window.clearTimeout(this.debounceTimeoutID);
            this.debounceTimeoutID = window.setTimeout(this.commitDocument.bind(this), this.debounce);
        },
        commitDocument() {
            this.ignoreNextModelUpdate = true;
            this.$emit('update:modelValue', this.editorView.state.doc.toString());
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
        onClick(event) {
            let el = event.target;
            if (!el.classList.contains('cm-badge-widget')) return;
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
        modelValue(newVal, oldVal) {
            if (this.ignoreNextModelUpdate) {
                this.ignoreNextModelUpdate = false;
                return;
            }
            
            this.ignoreNextDocUpdate = true;
            this.editorView.dispatch({
                changes: { from: 0, to: this.editorView.state.doc.length, insert: newVal },
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