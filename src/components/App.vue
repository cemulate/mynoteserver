<template>
<Head>
    <title>{{ documentTitle }}</title>
</Head>
<div class="App-root is-flex is-flex-direction-column">
    <div class="App-mainview is-flex-grow-1 is-flex is-flex-direction-row" @pointermove="gutterDrag">
        <div class="App-codemirror-container" :style="{ 'width': sourceWidthPx + 'px' }">
            <code-mirror 
                v-model="markdownSource"
                ref="codemirror"
                :debounce="500"
                @pasteImage="onPasteImage"
                @openImageAtCursor="toggleDrawing(null)"
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
            <div v-if="!isSlides" ref="renderView" class="rendered-note-content content" v-html="renderedHtml"></div>
            <div v-if="isSlides" class="App-print reveal" ref="reveal">
                <div class="slides">
                    <section
                        v-for="slide in renderedSlides"
                        v-html="slide"
                    />
                </div>
            </div>
        </div>
    </div>
    <div class="App-statusbar is-family-monospace is-flex-grow-0 pt-1 pb-1 pl-2 pr-2">
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
                :class="{ 'is-primary': fragmentsOn }"
                @click="fragmentsOn = !fragmentsOn"
            >
            Fragmented
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
import { markdownRenderer } from '../lib/markdown.mjs';
import * as network from '../lib/network';
import Reveal from 'reveal.js';
import md5sum from 'md5';

import { Head } from '@vueuse/head'
import SketchArea from '../components/SketchArea.vue';
import CodeMirror from '../components/CodeMirror.vue';
import FilePicker from '../components/FilePicker.vue';
import AddMacro from '../components/AddMacro.vue';

const renderMarkdown = markdownRenderer(window?.MathJax);
import demoText from '../lib/demotext.txt';

export default {
    data: () => ({
        markdownSource: demoText,
        renderedHtml: null,

        fragmentsOn: false,
        isDrawingOpen: false,
        openedImage: null,
        openedImageIsNew: false,
        editorDisabled: false,

        isPickerOpen: false,
        curFile: { path: 'demo/demo', mtime: new Date(), md5: '1f9b84a8f34d3d930fbd93d158bde9b7' },

        isAddMacroOpen: false,

        originalContentOnLoad: demoText,
        toast: {
            color: 'black',
            message: '',
            timeout: null,
        },
        showToast: false,
        scrollFollow: true,
        sourceWidthPx: parseInt(window.localStorage?.getItem?.('sourceWidthPx') ?? 0.4 * window.screen.width),
        gutterDragStart: null,
    }),
    computed: {
        isSlides() {
            return this.markdownSource.startsWith('---');
        },
        renderedSlides() {
            return this.renderedHtml.split('<hr>').slice(1).map(x => x.trim());
        },
        staticLink() {
            if (this.curFile == null) return '#';
            return `notes/${ this.curFile.path }`;
        },
        hasContentChanged() {
            return (this.markdownSource != this.originalContentOnLoad);
        },
        documentTitle() {
            if (this.curFile == null) return 'My Notes';
            let base = `${ this.curFile.path.split('/').at(-1) }`;
            return this.hasContentChanged ? base + '*' : base;
        },
    },
    methods: {
        renderContent() {
            let opts = { fragmentifyEnabled: this.fragmentsOn, highlightEnabled: true };
            let { html, styleSheet } = renderMarkdown(this.markdownSource, opts);
            this.renderedHtml = html;
            document.getElementById('mathjax-chtml-styles').textContent = styleSheet;
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
        selectFile(file) {
            if (this.hasContentChanged) {
                let answer = window.confirm('Load another document?\n\nChanges you made will not be saved.');
                if (!answer) return;
            }
            this.curFile = file;
            this.isPickerOpen = false;
            this.persistCurFile();

            if (this.curFile.mtime == null) {
                // If this file doesn't have an mtime,
                // FilePicker wanted to create a new file.
                this.markdownSource = `# ${ this.curFile.path }`;
                // Always compare false as to display the unsaved star
                this.originalContentOnLoad = null;
                this.toast = { color: 'green', message: 'New File', timeout: 3000 };
            } else {
                this.downloadCurFile();
            }
        },
        async downloadCurFile() {
            if (this.curFile == null) return;
            this.editorDisabled = true;
            this.toast = { color: 'gray', message: 'Loading...' };

            let { path, mtime } = this.curFile;
            let response = await network.get(`/api/file/${ path }`);
            if (response?.status == 200) {
                let { content, mtime, md5 } = await response.json();
                this.originalContentOnLoad = content;
                this.markdownSource = content;
                this.curFile = { ...this.curFile, mtime, md5 };
                this.persistCurFile();
                this.toast = { color: 'green', message: 'File loaded', timeout: 3000 };
            } else {
                this.markdownSource = '';
                this.toast = { color: 'red', message: 'Load failed' };
                // Persist curFile but set .md5 = null; Enforce that the
                // app thinks this file is out of date on next load.
                this.persistCurFile(true);
                this.curFile = null;
            }

            this.editorDisabled = false;
            this.$nextTick(() => this.$refs.codemirror?.focus?.());
        },
        updateSourceAndSave() {
            if (this.curFile == null) return;
            // Upon save command, update markdownSource immediately
            // (instead of after debounce) before saving.
            this.$refs?.codemirror?.commitDocument();
            this.$nextTick(() => this.saveCurFile());
        },
        persistCurFile(nullHash) {
            let data = nullHash ? { ...this.curFile, md5: null } : this.curFile;
            window.localStorage.setItem('curFile', JSON.stringify(data));
        },
        async saveCurFile() {
            if (this.curFile == null) return;
            let { path } = this.curFile;
            let response = await network.post(`/api/file/${ path }`, { content: this.markdownSource });
            if (response?.status == 200) {
                let { mtime, md5 } = await response.json();
                this.originalContentOnLoad = this.markdownSource;
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
            if (curFile != null) {
                curFile = JSON.parse(curFile);
            }
            this.curFile = curFile;

            if (window.location.hash.length > 1) {
                let hashPath = window.location.hash.slice(1);
                if (this.curFile.path != hashPath) {
                    this.curFile = { path: hashPath };
                }
            }

            let serverFileData = null;
            let response = await network.get(`/api/stat/${ this.curFile.path }`);
            if (response?.status == 200) {
                serverFileData = await response.json();
            }

            if (serverFileData != null && serverFileData.md5 != this.curFile?.md5) {
                // We affirmatively know that the file is out of date (or we're loading from hash)
                this.downloadCurFile();
            } else {
                // This file isn't out of date or we're offline / can't tell
                let savedBuffer = window.localStorage.getItem('buffer') ?? '';
                this.markdownSource = savedBuffer;
                // Even though we don't have the file content from the server,
                // we can see if the saved buffer differs by computing its md5.
                // If so, ensure that hasContentChanged says true.
                let bufferMd5 = md5sum(savedBuffer);
                let serverMd5 = serverFileData?.md5;
                this.originalContentOnLoad = bufferMd5 == serverMd5 ? savedBuffer : null;

                if (serverFileData == null) this.toast = { color: 'red', message: 'Offline' };
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
        onPasteImage(image) {
            this.toggleDrawing(image);
        },
    },
    async updated() {
        await window.MathJax?.typesetPromise?.([ this.$refs.renderContainer ]);
        if (!this.isSlides && this.scrollFollow) {
            let el = this.$refs.renderView.parentElement;
            el.scrollTop = el.scrollHeight;
        } else {
            if (this.slideDeck == null || this.$refs.codemirror == null) return;
            let slide = this.$refs.codemirror.getCursorRegion('---') ?? this.slideDeck.getHorizontalSlides().length;
            this.slideDeck.slide(slide - 1, 0, 0);
        }
    },
    mounted() {
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
        this.$refs.codemirror?.focus?.();
        window.addEventListener('focus', () => {
            this.$refs.codemirror?.focus?.();
        });
        let r = this.$refs.renderContainer;
        r.addEventListener('scroll', event => {
            let { scrollTop, scrollHeight, clientHeight } = event.target;
            // RHS true iff the rendered content is scrolled to the bottom.
            // if the user scrolls back up, remember to not snap the scroll
            // position to bottom upon render until they scroll back down.
            this.scrollFollow = (scrollHeight - scrollTop - clientHeight) == 0;
        });
        if (this.isSlides) this.initSlides();

        this.renderContent();
    },
    watch: {
        markdownSource(newVal) {
            window.localStorage.setItem('buffer', newVal);
            this.renderContent();
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
        'sketch-area': SketchArea,
        'code-mirror': CodeMirror,
        'file-picker': FilePicker,
        'add-macro': AddMacro,
    },
};
</script>

<style lang="scss" scoped>
@import 'bulma/sass/utilities/mixins.sass';

.App-root {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.App-mainview {
    overflow: auto;
}

.App-statusbar {
    background: #f5f5f5;
    border-top: 2px solid lightgray;
}

.App-codemirror-container {
    @include mobile { display: none; }
    @include tablet { flex-grow: 0; flex-shrink: 0; height: 100% }
    > div {
        height: 100%;
    }
}

.App-gutter {
    width: 8px;
    background: lightgray;
    cursor: col-resize;
}

.App-render-container {
    flex-grow: 1;
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
