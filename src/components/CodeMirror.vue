<template>
<div id="codemirror-container" ref="root"></div>
</template>

<script>
import { EditorState } from '@codemirror/state';
import { basicSetup } from '@codemirror/basic-setup';
import { indentWithTab } from '@codemirror/commands';
import { markdown as langMarkdown } from '@codemirror/lang-markdown';
import { EditorView, keymap } from '@codemirror/view';


export default {
    data: () => ({
        editorView: null,
        debounceTimeoutID: null,
    }),
    props: {
        document: {
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
            doc: this.document,
            extensions: [ 
                basicSetup,
                EditorView.lineWrapping,
                langMarkdown(),
                EditorView.updateListener.of(update => {
                    if (!update.docChanged) return;

                    if (this.debounceTimeoutID != null) window.clearTimeout(this.debounceTimeoutID);
                    this.debounceTimeoutID = window.setTimeout(this.commitDocument.bind(this), this.debounce);
                }),
                keymap.of([indentWithTab]),
            ],
        });

        this.editorView = new EditorView({
            state,
            parent: this.$refs.root,
        });
    },
    methods: {
        commitDocument() {
            this.$emit('update:document', this.editorView.state.doc.toString());
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