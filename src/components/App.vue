<template>
<Head>
    <title>{{ documentTitle }}</title>
</Head>
<div class="App-root" :style="{ '--source-width-px': sourceWidthPx + 'px' }" @pointermove="gutterDrag">
    <div class="App-codemirror-container">
        <code-mirror 
            v-model:chunks="markdownChunks"
            v-model:isSlides="isSlides"
            ref="codemirror"
            :debounce="500"
            @pasteImage="image => toggleDrawing(image)"
            @openImageAtCursor="toggleDrawing(null)"
            @edited="documentEdited"
            :disabled="editorDisabled"
            :style="{ 'opacity': editorDisabled ? '0.5' : '1' }"
        />
    </div>
    <div class="App-gutter"
        @pointerdown.prevent="event => gutterDragStart = { x: event.clientX, width: sourceWidthPx }"
        @pointerup.prevent="gutterDragStart = null"
        @dblclick.prevent="resetSourceWidthPx"
    />
    <div class="App-render-container p-2" ref="renderContainer">
        <p v-if="initialRender" style="opacity: 0.5">Initial render...</p>
        <div v-if="!isSlides" ref="renderView" class="rendered-note-content content">
            <markdown-chunk
                v-for="chunk in markdownChunks"
                ref="markdownChunks"
                :key="chunk.id"
                :id="chunk.id"
                :source="chunk.content"
                :fragmentify="fragmentify"
                :highlight="true"
                @click="scrollEditorToPos(chunk.sourcePos)"
            />
        </div>
        <div v-if="isSlides" class="App-print reveal" ref="reveal">
            <div class="slides">
                <markdown-chunk
                    v-for="chunk in markdownChunks"
                    ref="markdownChunks"
                    :key="chunk.id"
                    :id="chunk.id"
                    :source="chunk.content"
                    :fragmentify="fragmentify"
                    :highlight="true"
                    :wrap="'section'"
                    @click="scrollEditorToPos(chunk.sourcePos)"
                />
            </div>
        </div>
    </div>
    <div class="App-statusbar is-family-monospace pt-1 pb-1 pl-2 pr-2">
        <div class="is-flex is-align-items-center">
            <button class="button is-black App-icon App-open-file-indicator" @click="togglePicker"></button>
            <span class="is-flex-grow-1 ml-2">
                <a class="has-text-black" @click="togglePicker">
                    <span v-if="curFile != null">
                    {{ curFile.path }}{{ hasContentChanged ? '*' : '' }}
                    </span>
                    <span v-else>Select file</span>
                </a>
                <Transition name="App-fadeout">
                    <strong class="ml-3" :style="{ 'color': toast.color }" v-if="showToast">{{ toast.message }}</strong>
                </Transition>
            </span>
            <a class="is-hidden-mobile button is-black App-icon App-edit-image-button ml-4"
                @click="toggleDrawing(null)" title="Insert/edit image"></a>
            <a class="button is-black App-icon App-fullscreen-button ml-4" @click="toggleFullscreen"
                :title="isSlides ? 'Present' : 'Toggle fullscreen editor'"></a>
            <button v-if="isSlides"
                class="button is-small is-rounded ml-4"
                :class="{ 'is-primary': fragmentify }"
                @click="toggleFragmentify"
                title="Make presentation proceed step-by-step through all block elements"
            >
            Auto Pause
            </button>
            <a target="_blank" class="is-hidden-mobile button is-link App-icon App-static-link-button ml-4" :href="staticLink"
                title="Open print view in new tab"></a>
        </div>
    </div>
</div>
<div class="modal" :class="{ 'is-active': isDrawingOpen }">
    <div class="modal-background">
        <!-- Use the v-if to *create* this component upon opening the modal, causing it to 
        read the DOM to set the correct dimensions -->
        <sketch-area class="App-sketch-area-component"
            ref="sketch"
            :image="openedImage"
            v-if="isDrawingOpen"
            @close="toggleDrawing"
        />
    </div>
    <div class="modal-content">
    </div>
</div>
<div class="modal" :class="{ 'is-active': isPickerOpen }">
    <div class="modal-background" @click="togglePicker"></div>
    <div class="modal-content">
        <file-picker ref="picker" @selectFile="selectFile"></file-picker>
    </div>
</div>
<div class="modal" :class="{ 'is-active': isAddMacroOpen }">
    <div class="modal-background" @click="isAddMacroOpen = false"></div>
    <div class="modal-content">
        <add-macro v-if="isAddMacroOpen" @close="isAddMacroOpen = false"></add-macro>
    </div>
</div>
</template>

<script>
import { MarkdownRenderer } from '../lib/markdown/markdown.mjs';
import * as network from '../lib/network';
import Reveal from 'reveal.js';
import md5sum from 'md5';

import { Head } from '@vueuse/head'
import MarkdownChunk from './MarkdownChunk.js';
import SketchArea from '../components/SketchArea.vue';
import CodeMirror from '../components/CodeMirror.vue';
import FilePicker from '../components/FilePicker.vue';
import AddMacro from '../components/AddMacro.vue';

export default {
    data: () => ({
        initialRender: true,
        markdownChunks: [],
        isSlides: false,
        hasContentChanged: false,

        fragmentify: false,
        isDrawingOpen: false,
        openedImage: null,
        openedImageIsNew: false,
        editorDisabled: true,

        isPickerOpen: false,
        curFile: null,

        isAddMacroOpen: false,

        originalContentOnLoad: null,
        toast: {
            color: 'black',
            message: '',
            timeout: null,
        },
        showToast: false,
        sourceWidthPx: parseInt(window.localStorage?.getItem?.('sourceWidthPx') ?? 0.4 * window.screen.width),
        gutterDragStart: null,
    }),
    computed: {
        renderedSlides() {
            return this.renderedHtml.split('<hr>').slice(1).map(x => x.trim());
        },
        staticLink() {
            if (this.curFile == null) return '#';
            return `notes/${ this.curFile.path }`;
        },
        documentTitle() {
            if (this.curFile == null) return 'My Notes';
            let base = `${ this.curFile.path.split('/').at(-1) }`;
            return this.hasContentChanged ? base + '*' : base;
        },
    },
    methods: {
        toggleFragmentify() {
            this.fragmentify = !this.fragmentify;
        },
        toggleDrawing(initialImage) {
            this.isDrawingOpen = !this.isDrawingOpen;
            if (this.isDrawingOpen) {
                // Opening
                if (this.$refs.codemirror == null) return;
                let { valid, image: existingImage } = this.$refs.codemirror.checkCursorForImage();
                // Cursor is not in a spot where an image could go, or on/in an image.
                if (!valid) return;
                // Take the given image (upon paste) or the image that was under the cursor as
                // the SketchArea's image; this may ultimately still be null.
                this.openedImage = initialImage ?? existingImage;
                this.openedImageIsNew = initialImage != null;
            } else {
                // Closing
                // if the opened image was new (pasted), we still want to retrieve the image
                // even if the user didn't edit it - so discardUnedited = false
                const image = this.$refs.sketch?.getImage?.(!this.openedImageIsNew);
                if (image != null) this.$refs.codemirror?.addOrReplaceImageAtCursor(image);
                this.$refs.codemirror?.focus?.();
            }
        },
        togglePicker() {
            this.isPickerOpen = !this.isPickerOpen;
            if (this.isPickerOpen) this.$refs.picker?.reset?.();
            if (!this.isPickerOpen) this.$refs.codemirror?.focus?.();
        },
        toggleFullscreen() {
            if (document.fullscreenElement != null) {
                document.exitFullscreen();
            } else {
                if (!this.isSlides) {
                    document.documentElement.requestFullscreen();
                } else {
                    this.$refs.reveal.requestFullscreen();
                }
            }
            this.$refs.codemirror?.focus?.();
        },
        gutterDrag(event) {
            if (this.gutterDragStart == null) return;
            this.sourceWidthPx = this.gutterDragStart.width + (event.clientX - this.gutterDragStart.x);
        },
        resetSourceWidthPx() {
            this.sourceWidthPx = 0.4 * window.screen.width;
        },
        scrollEditorToPos(n) {
            this.$refs.codemirror.setCursorAtPos(n);
            this.$refs.codemirror.focus();
        },
        selectFile(file) {
            if (this.hasContentChanged) {
                let answer = window.confirm('Load another document?\n\nChanges you made will not be saved.');
                if (!answer) return;
            }

            this.markdownChunks = [];
            this.curFile = file;
            this.isPickerOpen = false;
            this.persistCurFile();

            if (this.curFile.mtime == null) {
                // If this file doesn't have an mtime,
                // FilePicker wanted to create a new file.
                this.setDocument(`# ${ this.curFile.path }`);
                // Assume "edited"
                this.hasContentChanged = true;
                this.toast = { color: 'green', message: 'New File', timeout: 3000 };
            } else {
                this.downloadCurFile();
            }
        },
        documentEdited(editedChunkIndex) {
            this.hasContentChanged = true;
            this.persistBuffer();
            this.$nextTick(async () => {
                if (this.isSlides) {
                    // In this case, editedChunkIndex is the slide number.
                    this.slideDeck.sync();
                    let slide = editedChunkIndex ?? this.slideDeck.getHorizontalSlides().length - 1;
                    this.slideDeck.slide(slide, 0, 0);
                } else {
                    // refs on a v-for are not necessarily in the same order as the source array :(
                    if (this.markdownChunks.length == 0) return;
                    let chunkIndex = editedChunkIndex ?? this.markdownChunks.length - 1;
                    let id = this.markdownChunks[chunkIndex].id;
                    let chunk = this.$refs.markdownChunks.find(x => x.id == id);

                    const r = this.$refs.renderContainer;
                    let oldScrollTop = r.scrollTop;
                    let el = await chunk.scrollIntoView();
                    let offset = Math.round(r.clientHeight * 0.3);
                    // To scroll the full offset would assume that scrollIntoView() actually aligned the bottom
                    // of the element to the bottom of the render container, which doesn't happen for elements
                    // near the top.
                    let realOffset = Math.max(0, offset - (r.clientHeight - el.getBoundingClientRect().bottom));
                    r.scroll(0, r.scrollTop + realOffset);
                    let delta = r.scrollTop - oldScrollTop;
                    if (Math.abs(delta) > 0.5 * r.clientHeight) chunk.flash('markdown-chunk-update-flash', 500);
                }
            });
        },
        async downloadCurFile() {
            if (this.curFile == null) return;
            this.editorDisabled = true;
            this.toast = { color: 'gray', message: 'Loading...' };

            let { path, mtime } = this.curFile;
            let response = await network.get(`/api/file/${ path }`);
            if (response?.status == 200) {
                let { content, mtime, md5 } = await response.json();
                this.setDocument(content);
                this.curFile = { ...this.curFile, mtime, md5 };
                this.persistCurFile();
                this.toast = { color: 'green', message: 'File loaded', timeout: 3000 };
            } else {
                this.setDocument('');
                this.toast = { color: 'red', message: 'Load failed' };
                // Persist curFile but set .md5 = null; Enforce that the
                // app thinks this file is out of date on next load.
                this.persistCurFile(true);
                this.curFile = null;
            }

            this.persistBuffer();
            this.hasContentChanged = false;
            this.editorDisabled = false;
            this.$nextTick(() => this.$refs.codemirror?.focus?.());
        },
        setDocument(document) {
            // Set the whole document to something new
            this.initialRender = true;
            this.$refs.codemirror.setDocument(document);
        },
        updateSourceAndSave() {
            if (this.curFile == null) return;
            this.saveCurFile();
        },
        persistCurFile(nullHash) {
            let data = nullHash ? { ...this.curFile, md5: null } : this.curFile;
            window.localStorage.setItem('curFile', JSON.stringify(data));
        },
        persistBuffer() {
            let buffer = this.$refs.codemirror.getDocument();
            window.localStorage.setItem('buffer', buffer);
        },
        async saveCurFile() {
            if (this.curFile == null) return;
            let { path } = this.curFile;
            let content = this.$refs.codemirror.getDocument();
            let response = await network.post(`/api/file/${ path }`, { content });
            if (response?.status == 200) {
                let { mtime, md5 } = await response.json();
                this.hasContentChanged = false;
                this.curFile.mtime = mtime;
                this.curFile.md5 = md5;
                this.persistCurFile();
                this.toast = { color: 'green', message: 'Saved!', timeout: 3000 };
            } else {
                this.toast = { color: 'red', message: 'Save failed' };
            }
        },
        async initializeCurFile() {
            let curFile = window.localStorage.getItem('curFile');
            if (curFile != null) curFile = JSON.parse(curFile);
            this.curFile = curFile;

            if (window.location.hash.length > 1) {
                let hashPath = window.location.hash.slice(1);
                if (this.curFile.path != hashPath) {
                    this.curFile = { path: hashPath };
                }
            }

            let serverFileData = null;
            if (this.curFile != null) {
                let response = await network.get(`/api/stat/${ this.curFile.path }`);
                if (response?.status == 200) serverFileData = await response.json();
            }

            if (serverFileData != null && serverFileData.md5 != this.curFile?.md5) {
                // We affirmatively know that the file is out of date (or we're loading from hash)
                this.downloadCurFile();
            } else {
                // This file isn't out of date or we're offline / can't tell
                let savedBuffer = window.localStorage.getItem('buffer') ?? '';
                this.setDocument(savedBuffer);
                // Even though we don't have the file content from the server,
                // we can see if the saved buffer differs by computing its md5.
                // If so, ensure that hasContentChanged says true.
                let bufferMd5 = md5sum(savedBuffer);
                let serverMd5 = serverFileData?.md5;
                this.hasContentChanged = bufferMd5 != serverMd5;

                if (this.curFile != null && serverFileData == null) this.toast = { color: 'red', message: 'Offline' };
                this.editorDisabled = false;
            }
        },
        initSlides() {
            this.slideDeck = new Reveal(this.$refs.reveal, {
                embedded: true,
                width: 1920 - 0.04 * 1920,
                height: 1080 - 0.04 * 1080,
                margin: 0.04,
                keyboardCondition: 'focused',
                help: false,
            });
            this.slideDeck.initialize();
        },
    },
    mounted() {
        this.initializeCurFile();
        document.addEventListener('keydown', event => {
            if (event.ctrlKey && event.key == ' ') {
                event.preventDefault(); this.toggleDrawing();
            } else if (event.ctrlKey && event.key == 'p') {
                event.preventDefault(); this.togglePicker();
            } else if (event.ctrlKey && event.key == 's') {
                event.preventDefault(); this.updateSourceAndSave();
            } else if (event.ctrlKey && event.altKey && event.key == 'm') {
                event.preventDefault(); this.isAddMacroOpen = true;
            } else if (event.key == 'Escape') {
                event.preventDefault();
                if (this.isPickerOpen) this.togglePicker();
                if (this.isDrawingOpen) this.toggleDrawing();
                if (this.isAddMacroOpen) this.isAddMacroOpen = false;
            }
        });
        window.addEventListener('beforeunload', (event) => {
            if (!this.hasContentChanged) return;
            event.preventDefault(); event.returnValue = 1;
        });
        this.$refs.codemirror?.focus?.(100);
        window.addEventListener('focus', () => this.$refs.codemirror?.focus?.(10));
        if (this.isSlides) this.initSlides();
    },
    watch: {
        markdownChunks(newVal) {
            if (!this.initialRender) return false;
            // First update of chunks after loading a new document; scroll to bottom
            this.initialRender = false;
            this.$nextTick(() => this.$refs.renderView?.lastElementChild?.scrollIntoView?.(true));
        },
        toast(newVal) {
            if (newVal == null) return;
            this.showToast = true;
            if (newVal.timeout != null) window.setTimeout(() => this.showToast = false, newVal.timeout);
        },
        sourceWidthPx(newVal) {
            window.localStorage.setItem('sourceWidthPx', newVal);
        },
        isSlides(newVal) {
            if (newVal) this.$nextTick(() => this.initSlides());
        },
    },
    components: {
        Head,
        'markdown-chunk': MarkdownChunk,
        'sketch-area': SketchArea,
        'code-mirror': CodeMirror,
        'file-picker': FilePicker,
        'add-macro': AddMacro,
    },
};
</script>

<style scoped>

.App-root {
    width: 100vw;
    height: 100vh;
    display: grid;
    grid-template-columns: var(--source-width-px) 8px 1fr;
    grid-template-rows: calc(100vh - 2.5em) 2.5em;
}

.App-statusbar {
    background: #f5f5f5;
    border-top: 2px solid lightgray;
    grid-area: 2 / 1 / 3 / 4;
}

.App-codemirror-container {
    grid-area: 1 / 1 / 2 / 2;
    & >div {
        height: 100%;
    }
}

.App-gutter {
    grid-area: 1 / 2 / 2 / 3;
    background: lightgray;
    cursor: col-resize;
}

.App-render-container {
    grid-area: 1 / 3 / 2 / 4;
    height: 100%;
    overflow-y: auto;
}

.reveal {
    width: 100%;
    height: unset;
    aspect-ratio: 16/9;
}

.App-sketch-area-component {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.App-icon {
    height: 1.8em;
    aspect-ratio: 1;
}
.App-fullscreen-button {
    mask: url('../assets/maximize.svg') 0 0/100% 100%;
    -webkit-mask: url('../assets/maximize.svg') 0 0/100% 100%;
}

.App-open-file-indicator {
    mask: url('../assets/folder.svg') 0 0/100% 100%;
    -webkit-mask: url('../assets/folder.svg') 0 0/100% 100%;
}

.App-static-link-button {
    mask: url('../assets/journal-page.svg') 0 0/100% 100% no-repeat;
    -webkit-mask: url('../assets/journal-page.svg') 0 0/100% 100% no-repeat;
}

.App-edit-image-button {
    mask: url('../assets/image.svg') 0 0/100% 100%;
    -webkit-mask: url('../assets/image.svg') 0 0/100% 100%;
}

.App-fadeout-leave-active {
    transition: opacity 0.5s ease;
}

.App-fadeout-leave-to {
    opacity: 0;
}
</style>
