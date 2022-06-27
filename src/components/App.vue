<template>
<div class="App-root is-flex is-flex-direction-column">
    <div class="App-mainview is-flex-grow-1 is-flex is-flex-direction-row" @pointermove="gutterDrag">
        <div class="App-codemirror-container" :style="{ 'width': sourceWidthPx + 'px' }">
            <code-mirror 
                v-model="markdownSource"
                ref="codemirror"
                :debounce="500"
                @pasteImage="onPasteImage"
                @openImageAtCursor="toggleDrawing(null)"
            />
        </div>
        <div class="App-gutter"
            @pointerdown.prevent="event => gutterDragStart = { x: event.clientX, width: sourceWidthPx }"
            @pointerup.prevent="gutterDragStart = null"
            @dblclick.prevent="resetSourceWidthPx"
        />
        <div class="App-render-container p-2" ref="renderContainer">
            <div v-if="!isSlides" ref="renderView" class="rendered-note-content content" v-html="renderedContent"></div>
            <div v-if="isSlides" class="App-print reveal reveal-custom" ref="reveal">
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
            <a class="App-icon App-open-file-indicator" @click="togglePicker"></a>
            <span class="is-flex-grow-1 ml-2">
                <a class="has-text-black" @click="togglePicker">
                    <span v-if="curFile != null">
                    {{ curFile.collection }} / {{ curFile.name }}{{ hasContentChanged ? '*' : '' }}
                    </span>
                    <span v-else>Select file</span>
                </a>
                <Transition name="App-fadeout">
                    <strong class="ml-3" :style="{ 'color': toast.color }" v-if="showToast">{{ toast.message }}</strong>
                </Transition>
            </span>
            <a class="is-hidden-mobile App-icon App-edit-image-button is-flex-grow-0 ml-4" @click="toggleDrawing(null)"></a>
            <a target="_blank" class="is-hidden-mobile App-icon App-static-link-button is-flex-grow-0 ml-4" :href="staticLink"></a>
            <a class="App-icon App-fullscreen-button is-flex-grow-0 ml-4" @click="toggleFullscreen"></a>
            <button v-if="isSlides"
                class="button is-small is-rounded ml-4"
                :class="{ 'is-primary': fragmentsOn }"
                @click="fragmentsOn = !fragmentsOn"
            >
            Fragmented
            </button>
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
            <file-picker ref="picker" v-model:selection="curFile" @update:selection="isPickerOpen = false"></file-picker>
        </div>
    </div>
    <div class="modal" :class="{ 'is-active': isAddMacroOpen }">
        <div class="modal-background" @click="isAddMacroOpen = false"></div>
        <div class="modal-content">
            <add-macro v-if="isAddMacroOpen" @close="isAddMacroOpen = false"></add-macro>
        </div>
    </div>
</div>
</template>

<script>
import { renderer } from '../lib/markdown.mjs';
import * as network from '../lib/network';
import Reveal from 'reveal.js';

import SketchArea from '../components/SketchArea.vue';
import CodeMirror from '../components/CodeMirror.vue';
import FilePicker from '../components/FilePicker.vue';
import AddMacro from '../components/AddMacro.vue';

export default {
    data: () => ({
        markdownSource: '',
        fragmentsOn: false,
        isDrawingOpen: false,
        openedImage: null,
        openedImageIsNew: false,

        isPickerOpen: false,
        curFile: null,

        isAddMacroOpen: false,

        originalContentOnLoad: null,
        toast: {
            color: 'black',
            message: '',
        },
        showToast: false,
        scrollFollow: true,
        sourceWidthPx: parseInt(window.localStorage?.getItem?.('sourceWidthPx') ?? 0.4 * window.screen.width),
        gutterDragStart: null,
    }),
    computed: {
        renderedContent() {
            renderer.set({ fragmentifyEnabled: this.fragmentsOn, highlightEnabled: true });
            return renderer.render(this.markdownSource);
        },
        isSlides() {
            return this.markdownSource.startsWith('---');
        },
        renderedSlides() {
            return this.renderedContent.split('<hr>').slice(1).map(x => x.trim());
        },
        staticLink() {
            if (this.curFile == null) return '#';
            return `/notes/${ this.curFile.collection }/${ this.curFile.name }`;
        },
        hasContentChanged() {
            return (this.markdownSource != this.originalContentOnLoad);
        },
        documentTitle() {
            if (this.curFile == null) return 'My Notes';
            let base = `${ this.curFile.collection }/${ this.curFile.name }`;
            return this.hasContentChanged ? base + '*' : base;
        },
    },
    methods: {
        toggleDrawing(initialImage) {
            if (!this.isDrawingOpen) {
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
            }
            this.isDrawingOpen = !this.isDrawingOpen;
        },
        togglePicker() {
            this.isPickerOpen = !this.isPickerOpen;
            if (this.isPickerOpen) {
                this.$refs.picker?.getFiles();
                this.$refs.picker?.clear();
            }
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
        },
        gutterDrag(event) {
            if (this.gutterDragStart == null) return;
            this.sourceWidthPx = this.gutterDragStart.width + (event.clientX - this.gutterDragStart.x);
        },
        resetSourceWidthPx() {
            this.sourceWidthPx = 0.4 * window.screen.width;
        },
        async loadCurFile() {
            if (this.curFile == null) return;
            let { collection, name, mtime } = this.curFile;
            if (mtime == null) {
                // If it doesn't have an mtime, this file doesn't exist yet.
                this.markdownSource = `# ${ name }`;
                // Always compare false as to display the unsaved star
                this.originalContentOnLoad = null;
                this.toast = { color: 'green', message: 'New File' };
            } else {
                let response = await network.get(`/api/collection/${ collection }/file/${ name }`);
                if (response?.status == 200) {
                    let result = await response.json();
                    this.originalContentOnLoad = result.content;
                    this.markdownSource = result.content;
                    this.toast = { color: 'green', message: 'File loaded' };
                } else {
                    this.markdownSource = '';
                    this.curFile = null;
                    this.toast = { color: 'red', message: 'Load failed' };
                }
            }
            this.$refs.codemirror?.focus();
        },
        updateSourceAndSave() {
            if (this.curFile == null) return;
            // Upon save command, update markdownSource immediately
            // (instead of after debounce) before saving.
            this.$refs?.codemirror?.commitDocument();
            this.$nextTick(() => this.saveCurFile());
        },
        async saveCurFile() {
            if (this.curFile == null) return;
            let { collection, name } = this.curFile;
            let response = await network.post(`/api/collection/${ collection }/file/${ name }`, { content: this.markdownSource });
            if (response?.status == 200) {
                let { mtime } = await response.json();
                this.originalContentOnLoad = this.markdownSource;
                window.localStorage.setItem('curFile', JSON.stringify({ ...this.curFile, mtime }));
                this.toast = { color: 'green', message: 'Saved!' };
            } else {
                this.toast = { color: 'red', message: 'Save failed' };
            }
        },
        initializeFromLocalStorage() {
            let curFile = window.localStorage.getItem('curFile');
            if (curFile != null) {
                curFile = JSON.parse(curFile);
            }
            this.curFile = curFile;
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
            let slide = this.$refs.codemirror?.getCursorRegion?.('---') ?? this.slideDeck.getHorizontalSlides().length;
            this.slideDeck.slide(slide - 1, 0, 0);
        }
    },
    mounted() {
        this.initializeFromLocalStorage();
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
        let r = this.$refs.renderContainer;
        r.addEventListener('scroll', event => {
            let { scrollTop, scrollHeight, clientHeight } = event.target;
            // RHS true iff the rendered content is scrolled to the bottom.
            // if the user scrolls back up, remember to not snap the scroll
            // position to bottom upon render until they scroll back down.
            this.scrollFollow = (scrollHeight - scrollTop - clientHeight) == 0;
        });
        if (this.isSlides) this.initSlides();
    },
    watch: {
        toast(newVal) {
            if (newVal) {
                this.showToast = true;
                window.setTimeout(() => this.showToast = false, 5000);
            }
        },
        async curFile(newVal) {
            window.localStorage.setItem('curFile', JSON.stringify(newVal));
            await this.loadCurFile();
            document.title = this.documentTitle;
        },
        sourceWidthPx(newVal) {
            console.log(newVal);
            window.localStorage.setItem('sourceWidthPx', newVal);
        },
        hasContentChanged(newVal) {
            document.title = this.documentTitle;
        },
        isSlides(newVal) {
            if (newVal) this.$nextTick(() => this.initSlides());
        },
    },
    components: {
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
    border-top: 1px dotted gray;
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
    display: inline-block;
    height: 1.8em;
    aspect-ratio: 1;
    background-repeat: no-repeat;
    background-position: center;
}
.App-fullscreen-button {
    background-image: url('../assets/maximize.svg');
    background-size: 100% 100%;
}

.App-open-file-indicator {
    background-image: url('../assets/folder.svg');
    background-size: 80% 80%;
}

.App-static-link-button {
    background-image: url('../assets/link.svg');
    background-size: 100% 100%;
}

.App-edit-image-button {
    background-image: url('../assets/image.svg');
    background-size: 100% 100%;
}

.App-fadeout-leave-active {
    transition: opacity 0.5s ease;
}

.App-fadeout-leave-to {
    opacity: 0;
}
</style>
