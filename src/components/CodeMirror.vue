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
import MurmurHash3 from 'imurmurhash';

const IMAGE_LINE_START = '![';
const SVG_LINE_START = '<svg';
const IMAGE_LINE_END = ')';
const MARKDOWN_IMAGE_REGEX = /(?<alt>!\[[^\]]*\])\((?<href>.*?)(?=\"|\))\)/;

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
                    { prefix: IMAGE_LINE_START, replacement: 'Image' },
                    { prefix: '<svg', replacement: 'SVG Figure' },
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
            const state = this.editorView.state;
            const isSlides = state.doc.line(1).text.startsWith(SLIDE_BOUNDARY);
            let chunks = [];
            let contentHistory = {};
            const cursor = state.selection.ranges.map(r => r.head)[0];
            let editedChunkIndex = null;

            // We need to give each chunk some sort of unique id; this allows Vue's
            // v-for to be smarter about moving existing elements and only re-rendering
            // inserted/changed elements (otherwise, a new chunk in the middle causes all
            // chunks after to re-render).
            // We use a hash of the chunk's content, but it may very well be that multiple
            // chunks have the exact same text content, so we maintain a history and append
            // the hash with a simple counting postfix on duplicates.
            // This does introduce some edge cases when a document contains identical chunks,
            // in particular multiple of them may get re-rendered and they may shuffle amongst 
            // themselves. But this is not a problem if you rely on editedChunkIndex to scroll
            // the updated chunk into view.
            const makeChunkId = content => {
                let hash = MurmurHash3(content).result().toString();
                let count = (hash in contentHistory) ? contentHistory[hash] + 1 : 0;
                contentHistory[hash] = count;
                return hash + '-' + count.toString();
            }

            if (!isSlides) {
                const t = ensureSyntaxTree(state, state.doc.length, 5000);
                let node = t.topNode.firstChild;
                while (node != null) {
                    let content = state.sliceDoc(node.from, node.to);
                    let id = makeChunkId(content);
                    // let id = (contentHistory.size << 16) + count;
                    chunks.push({ id, sourcePos: node.from, content });
                    let nextStart = node.nextSibling?.from ?? state.doc.length;
                    if (cursor >= node.from && cursor <= nextStart) editedChunkIndex = chunks.length - 1;
                    node = node.nextSibling;
                }
            } else {
                let pos = state.doc.line(1).to + 1;
                let curStart = pos;
                while (pos < state.doc.length) {
                    let line = state.doc.lineAt(pos);
                    if (line.text.startsWith(SLIDE_BOUNDARY)) {
                        let content = state.sliceDoc(curStart, line.from).trim();
                        let id = makeChunkId(content);
                        chunks.push({ id, sourcePos: curStart, content });
                        if (cursor >= curStart && cursor < line.from) editedChunkIndex = chunks.length - 1;
                        curStart = line.to + 1;
                    }
                    pos = line.to + 1;
                }
                let content = state.sliceDoc(curStart, state.doc.length).trim();
                let id = makeChunkId(content);
                chunks.push({ id, sourcePos: curStart, content });
                if (cursor >= curStart) editedChunkIndex = chunks.length - 1;
            }
            
            this.$emit('update:isSlides', isSlides);
            this.$emit('update:chunks', chunks);
            if (!this.firstCommit) this.$emit('edited', editedChunkIndex);
            this.firstCommit = false;
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
        addOrReplaceImageAtCursor(svgText) {
            let cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            let line = this.editorView.state.doc.lineAt(cursor);
            let shouldReplace = line.length == 0 || line.text.startsWith(IMAGE_LINE_START) || line.text.startsWith(SVG_LINE_START);
            let changes = shouldReplace
                ? { from: line.from, to: line.to, insert: svgText }
                : { from: cursor, insert: '\n' + svgText };
            this.editorView.dispatch({ changes });
        },
        checkCursorForImage() {
            const cursor = this.editorView.state.selection.ranges.map(r => r.head)[0];
            const line = this.editorView.state.doc.lineAt(cursor);
            if (line.text.startsWith('<svg')) {
                // Return the whole svg tag
                return { valid: true, image: line.text };    
            } else if (line.text.startsWith(IMAGE_LINE_START)) {
                // Return the href of the markdown image
                const groups = MARKDOWN_IMAGE_REGEX.exec(line.text);
                return { valid: true, image: groups.href };
            } else if (line.length == 0) {
                // This is a valid place for an image, but there is not one currently. 
                return { valid: true, image: null };
            } else {
                console.log('invalid image place');
                return { valid: false, image: null };
            }
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
        setCursorAtPos(n) {
            this.editorView.dispatch({
                selection: EditorSelection.cursor(n),
                effects: [ EditorView.scrollIntoView(n, { y: 'center' }) ],
            });
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
        focus(timeout = null) {
            // The timeout is used to prevent a rare edge case with Chrome on Windows,
            // where the element's focus may be lost after setting it immediately,
            // only after alt-tabbing back from another full-screen window.
            // It can also be used (a bit more generously) to focus on page load.
            let f = () => this.editorView.focus();
            return timeout == null ? f() : setTimeout(f, timeout);
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

<style>
.CodeMirror-root {
    & > .cm-editor {
        height: 100%;
    }
}
</style>