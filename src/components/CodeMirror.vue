<template>
<div id="codemirror-container" ref="root"></div>
</template>

<script>
import { EditorState } from '@codemirror/state';
import { basicSetup } from '@codemirror/basic-setup';
import { indentWithTab } from '@codemirror/commands';
import { markdown as langMarkdown } from '@codemirror/lang-markdown';
import { EditorView, keymap, WidgetType, Decoration, ViewPlugin } from '@codemirror/view';

import { hideLinesPlugin } from '../lib/codemirror-utils';

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
        const state = EditorState.create({
            doc: this.modelValue,
            extensions: [ 
                basicSetup,
                EditorView.lineWrapping,
                langMarkdown(),
                EditorView.updateListener.of(this.onDocumentUpdate.bind(this)),
                keymap.of([indentWithTab]),
                hideLinesPlugin(IMAGE_LINE_START, 'Figure'),
            ],
        });

        this.editorView = new EditorView({
            state,
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
            this.editorView.dispatch({
                changes: { from: line.from, to: line.to, insert: IMAGE_LINE_START + dataURL + IMAGE_LINE_END + '\n'},
            });
        },
        getImageAtCursor() {
            const cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            const line = this.editorView.state.doc.lineAt(cursor);
            if (!line.text.startsWith(IMAGE_LINE_START)) return null;
            return line.text.slice(IMAGE_LINE_START.length, line.length - IMAGE_LINE_END.length);
        },
        focus() {
            this.editorView.focus();
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
#codemirror-container {
    > .cm-editor {
        height: 100%;
    }
}
</style>