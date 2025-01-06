<template>
<Head>
    <title>{{ documentTitle }}</title>
    <html :data-theme="useDarkTheme ? 'dark' : 'light'"></html>
    <meta v-if="useDarkTheme" name="color-scheme" content="dark">
    <meta v-if="!useDarkTheme" name="color-scheme" content="light">
</Head>
<div class="App-root" :style="{ '--source-width-px': sourceWidthPx + 'px' }" @pointermove="gutterDrag"
>
    <div class="codemirror-container">
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
            :useDarkTheme="useDarkTheme"
        />
    </div>
    <div class="gutter"
        @pointerdown.prevent="event => gutterDragStart = { x: event.clientX, width: sourceWidthPx }"
        @pointerup.prevent="gutterDragStart = null"
        @dblclick.prevent="resetSourceWidthPx"
    />
    <div class="render-container p-2" ref="renderContainer">
        <p v-if="initialRender && offline" style="opacity: 0.5">Couldn't load file</p>
        <p v-if="initialRender && !offline" style="opacity: 0.5">Loading...</p>
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
        <div v-if="isSlides" class="print reveal" ref="reveal">
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
    <div class="statusbar is-family-monospace pt-1 pb-1 pl-2 pr-2">
        <div class="is-flex is-align-items-center">
            <file-picker
                v-model:isActive="isPickerOpen"
                v-model:curFile="curFile"
                v-model:offline="offline"
                :hasContentChanged="hasContentChanged"
                @update:curFile="loadCurFile"
            ></file-picker>
            <Transition name="fadeout">
                <strong class="ml-3" :style="{ 'color': toast.color }" v-if="showToast">{{ toast.message }}</strong>
            </Transition>
            <div class="is-flex-grow-1"></div>
            <button class="icon-button ml-4" @click="toggleDrawing(null)" title="Insert/edit image"><ImageIcon/></button>
            <button class="icon-button ml-4" :class="{ 'is-active': !useDarkTheme }" @click="useDarkTheme = false"><SunIcon/></button>
            <button class="icon-button" :class="{ 'is-active': useDarkTheme }" @click="useDarkTheme = true"><MoonIcon/></button>
            <button class="icon-button ml-4"
                @click="toggleFullscreen"
                :title="isSlides ? 'Present' : 'Toggle fullscreen editor'"
            >
                <MaximizeIcon/>
            </button>
            <button v-if="isSlides"
                class="button is-small ml-4"
                :class="{ 'is-primary': fragmentify }"
                @click="fragmentify = !fragmentify"
                title="Make presentation proceed step-by-step through all block elements"
            >
            Auto Pause
            </button>
            <a class="icon-button ml-4" target="_blank" :href="staticLink" title="Open print view in new tab">
                <JournalPageIcon/>
            </a>
        </div>
    </div>
</div>
<div class="modal" :class="{ 'is-active': isDrawingOpen }">
    <div class="modal-background">
        <!-- Use the v-if to *create* this component upon opening the modal, causing it to 
        read the DOM to set the correct dimensions -->
        <sketch-area class="sketch-area-component"
            ref="sketch"
            :image="openedImage"
            v-if="isDrawingOpen"
            @close="toggleDrawing"
        />
    </div>
    <div class="modal-content">
    </div>
</div>
<add-macro v-model:isActive="isAddMacroOpen"></add-macro>
</template>

<script>
import * as fileUtil from '../lib/file-utils.js';
import Reveal from 'reveal.js';

import { Head } from '@unhead/vue/components';
import MarkdownChunk from './MarkdownChunk.js';
import SketchArea from '../components/SketchArea.vue';
import CodeMirror from '../components/CodeMirror.vue';
import FilePicker from '../components/FilePicker.vue';
import AddMacro from '../components/AddMacro.vue';

import JournalPageIcon from '../components/icons/JournalPageIcon.vue';
import MaximizeIcon from '../components/icons/MaximizeIcon.vue';
import ImageIcon from '../components/icons/ImageIcon.vue';
import SunIcon from '../components/icons/SunIcon.vue';
import MoonIcon from '../components/icons/MoonIcon.vue';

export default {
    data: () => ({
        useDarkTheme: window.matchMedia('(prefers-color-scheme: dark)').matches,
        sourceWidthPx: parseInt(window.localStorage?.getItem?.('sourceWidthPx') ?? 0.4 * window.screen.width),
        gutterDragStart: null,

        editorDisabled: true,
        initialRender: true,
        markdownChunks: [],
        isSlides: false,
        hasContentChanged: false,
        fragmentify: false,

        isDrawingOpen: false,
        openedImage: null,
        openedImageIsNew: false,

        isPickerOpen: false,
        curFile: null,

        isAddMacroOpen: false,

        toast: { color: 'black', message: '', timeout: null },
        showToast: false,
        offline: !navigator.onLine,
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
            let base = `${ this.curFile.split('/').at(-1) }`;
            return this.hasContentChanged ? base + '*' : base;
        },
    },
    methods: {
        toggleDrawing(initialImage) {
            const newStatus = !this.isDrawingOpen;
            if (newStatus) {
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
                const image = this.$refs.sketch?.getSvg?.();
                if (image != null) this.$refs.codemirror?.addOrReplaceImageAtCursor(image);
                this.$refs.codemirror?.focus?.();
            }
            this.isDrawingOpen = newStatus;
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
        documentEdited(editedChunkIndex) {
            this.hasContentChanged = true;
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
        async loadCurFile() {
            if (this.curFile == null) return;

            this.editorDisabled = true;
            this.toast = { color: 'gray', message: 'Loading...' };

            const { success, isNew, content } = await fileUtil.loadFile(this.curFile);
            if (success) {
                this.offline = false;
                this.hasContentChanged = isNew;
                this.replaceDocument(content);
                this.editorDisabled = false;
                this.toast = { color: 'green', message: 'File loaded', timeout: 3000 };
            } else {
                this.toast = { color: 'red', message: 'Load failed', timeout: 3000 };
                this.offline = true;
            }

            this.$nextTick(() => this.$refs.codemirror?.focus?.());
        },
        replaceDocument(document) {
            // This is a function solely to set this flag
            this.initialRender = true;
            this.$refs.codemirror.setDocument(document);
        },
        async saveCurFile() {
            if (this.curFile == null) return;
            let content = this.$refs.codemirror.getDocument();
            
            const success = await fileUtil.saveFile(this.curFile, content);
            this.toast = success
                ? { color: 'green', message: 'Saved', timeout: 3000 }
                : { color: 'red', message: 'Save failed', timeout: 3000 };
            if (success) this.hasContentChanged = false;
            this.offline = !success;
        },
        async initializeCurFile() {
            const hash = window.location.hash.slice(1);
            this.curFile = hash.length > 0 ? hash : (window.localStorage.getItem('curFile') ?? null);
            this.loadCurFile();
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
                event.preventDefault(); this.isPickerOpen = !this.isPickerOpen;
            } else if (event.ctrlKey && event.key == 's') {
                event.preventDefault(); this.saveCurFile();
            } else if (event.ctrlKey && event.altKey && event.key == 'm') {
                event.preventDefault(); this.isAddMacroOpen = true;
            } else if (event.key == 'Escape') {
                event.preventDefault();
                if (this.isPickerOpen) this.isPickerOpen = !this.isPickerOpen;
                if (this.isDrawingOpen) this.toggleDrawing();
                if (this.isAddMacroOpen) this.isAddMacroOpen = false;
            }
        });
        window.addEventListener('beforeunload', (event) => {
            if (!this.hasContentChanged) return;
            event.preventDefault(); event.returnValue = 1;
        });
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => this.useDarkTheme = e.matches);
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
        curFile(newVal) {
            window.localStorage.setItem('curFile', newVal);
        }
    },
    components: {
        Head,
        'markdown-chunk': MarkdownChunk,
        'sketch-area': SketchArea,
        'code-mirror': CodeMirror,
        'file-picker': FilePicker,
        'add-macro': AddMacro,

        JournalPageIcon,
        MaximizeIcon,
        ImageIcon,
        SunIcon,
        MoonIcon,
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

    --app-statusbar-background: #f5f5f5;
    --app-gutter-background: #d3d3d3;
    --app-border: 2px solid lightgray;
    [data-theme="dark"] & {
        --app-statusbar-background: #222;
        --app-gutter-background: #3e3e3e;
        --app-border: 2px solid black;
    }
}

.statusbar {
    background: var(--app-statusbar-background);
    border-top: var(--app-border);
    grid-area: 2 / 1 / 3 / 4;
    .icon-button {
        height: 1.8em;
    }
}

.codemirror-container {
    grid-area: 1 / 1 / 2 / 2;
    & >div {
        height: 100%;
    }
}

.gutter {
    grid-area: 1 / 2 / 2 / 3;
    background: var(--app-gutter-background);
    cursor: col-resize;
}

.render-container {
    grid-area: 1 / 3 / 2 / 4;
    height: 100%;
    overflow-y: auto;
}

.reveal {
    width: 100%;
    height: unset;
    aspect-ratio: 16/9;
}

.sketch-area-component {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.fadeout-leave-active {
    transition: opacity 0.5s ease;
}

.fadeout-leave-to {
    opacity: 0;
}
</style>
