<template>
<div id="codemirror-container" ref="root"></div>
</template>

<script>
import { EditorState } from '@codemirror/state';
import { basicSetup } from '@codemirror/basic-setup';
import { indentWithTab } from '@codemirror/commands';
import { markdown as langMarkdown } from '@codemirror/lang-markdown';
import { EditorView, keymap } from '@codemirror/view';
import { foldService } from '@codemirror/language';


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
                EditorView.updateListener.of(update => {
                    if (!update.docChanged) return;
                    if (this.ignoreNextDocUpdate) {
                        this.ignoreNextDocUpdate = false;
                        return;
                    }

                    if (this.debounceTimeoutID != null) window.clearTimeout(this.debounceTimeoutID);
                    this.debounceTimeoutID = window.setTimeout(this.commitDocument.bind(this), this.debounce);
                }),
                keymap.of([indentWithTab]),
                foldService.of((state, lineStart, lineEnd) => {
                    const beginning = state.sliceDoc(lineStart, lineStart + 4);
                    if (beginning == '<img') return { from: lineStart, to: lineEnd + 1};
                }),
            ],
        });

        this.editorView = new EditorView({
            state,
            parent: this.$refs.root,
        });
    },
    methods: {
        commitDocument() {
            this.ignoreNextModelUpdate = true;
            this.$emit('update:modelValue', this.editorView.state.doc.toString());
        },
        addOrReplaceImageAtCursor(dataURL) {
            const cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            const line = this.editorView.state.doc.lineAt(cursor);
            this.editorView.dispatch({
                changes: { from: line.from, to: line.to, insert: `<img src="${ dataURL }"/>\n`},
            });
        },
        getImageAtCursor() {
            const cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            const line = this.editorView.state.doc.lineAt(cursor);
            if (!line.text.startsWith('<img')) return null;
            return line.text.slice(10, line.length - 3);
        }
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