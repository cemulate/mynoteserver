<template>
<div class="App-root is-flex is-flex-direction-column">
    <div class="App-mainview is-flex-grow-1 is-flex is-flex-direction-row">
        <div class="App-codemirror-container">
            <code-mirror 
                v-model="markdownSource"
                ref="codemirror"
                :debounce="500"
            />
        </div>
        <div class="App-render-container p-2">
            <div ref="renderView" class="content p-2" v-html="renderedContent"></div>
        </div>
    </div>
    <div class="App-statusbar is-family-monospace is-flex-grow-0 pt-1 pb-1 pl-2 pr-2">
        <div class="is-flex is-align-content-center">
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
            <a class="is-hidden-mobile App-icon App-edit-image-button is-flex-grow-0 ml-4" @click="toggleDrawing"></a>
            <a class="is-hidden-mobile App-icon App-print-button is-flex-grow-0 ml-4" @click="printContent"></a>
            <a class="App-icon App-fullscreen-button is-flex-grow-0 ml-4" @click="toggleFullscreen"></a>
        </div>
    </div>

    <div class="modal" :class="{ 'is-active': isDrawingOpen }">
        <div class="modal-background">
            <!-- Use the v-if to *create* this component upon opening the modal, causing it to 
            read the DOM to set the correct dimensions -->
            <sketch-area class="App-sketch-area-component" ref="sketch" :image="openedImage" v-if="isDrawingOpen" @close="toggleDrawing"></sketch-area>
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
</div>
<!-- The only element on the page for printing: -->
<div class="content App-print-only p-4" v-html="renderedContent"></div>
</template>

<script>
import { render } from '../lib/markdown';
import { toRaw } from 'vue';
import * as network from '../lib/network';

import SketchArea from '../components/SketchArea.vue';
import CodeMirror from '../components/CodeMirror.vue';
import FilePicker from '../components/FilePicker.vue';

export default {
    data: () => ({
        markdownSource: '',
        isDrawingOpen: false,
        openedImage: null,

        isPickerOpen: false,
        curFile: null,

        originalContentOnLoad: null,
        toast: {
            color: 'black',
            message: '',
        },
        showToast: false,
    }),
    computed: {
        renderedContent() {
            return render(this.markdownSource);
        },
        hasContentChanged() {
            return (this.markdownSource != this.originalContentOnLoad);
        },
        documentTitle() {
            if (this.curFile == null) return 'SelfNotes';
            let base = `${ this.curFile.collection }/${ this.curFile.name }`;
            return this.hasContentChanged ? base + '*' : base;
        },
    },
    methods: {
        toggleDrawing() {
            if (!this.isDrawingOpen) {
                // Opening
                this.openedImage = this.$refs.codemirror?.getImageAtCursor();
            } else {
                // Closing
                const image = this.$refs.sketch.getImage();
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
                document.documentElement.requestFullscreen();
            }
        },
        printContent() {
            window.print();
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
                let response = await network.get(`/collection/${ collection }/file/${ name }`);
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
        async saveCurFile() {
            if (this.curFile == null) return;
            let { collection, name } = toRaw(this.curFile);
            let response = await network.post(`/collection/${ collection }/file/${ name }`, { content: this.markdownSource });
            if (response?.status == 200) {
                this.originalContentOnLoad = this.markdownSource;
                this.toast = { color: 'green', message: 'Saved!' };
            } else {
                this.toast = { color: 'red', message: 'Save failed' };
            }
        },
        initializeFromLocalStorage() {
            let curFile = window.localStorage.getItem('curFile');
            if (curFile != null) {
                curFile = JSON.parse(curFile);
                curFile.mtime = new Date(curFile.mtime);
            }
            this.curFile = curFile;
        },
    },
    async updated() {
        await window.MathJax?.typesetPromise?.();
        let el = this.$refs.renderView.parentElement;
        el.scrollTop = el.scrollHeight;
    },
    mounted() {
        this.initializeFromLocalStorage();
        document.addEventListener('keydown', event => {
            if (event.ctrlKey && event.key == ' ') {
                event.preventDefault(); this.toggleDrawing();
            } else if (event.ctrlKey && event.key == 'p') {
                event.preventDefault(); this.togglePicker();
            } else if (event.ctrlKey && event.key == 's') {
                event.preventDefault(); this.saveCurFile();
            } else if (event.ctrlKey && event.key == 'n') {
                event.preventDefault(); this.createNewFile();
            } else if (event.key == 'Escape') {
                event.preventDefault();
                if (this.isPickerOpen) this.togglePicker();
                if (this.isDrawingOpen) this.toggleDrawing();
            }
        });
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
        hasContentChanged(newVal) {
            document.title = this.documentTitle;
        }
    },
    components: {
        'sketch-area': SketchArea,
        'code-mirror': CodeMirror,
        'file-picker': FilePicker,
    },
};
</script>

<!-- Unscoped to apply to dynamically generated html inside .content -->
<style lang="scss">
.content {
    overflow-wrap: break-word;

    p.inline-figure {
        text-align: center;
    }
}
</style>

<style lang="scss" scoped>
@import 'bulma/sass/utilities/mixins.sass';

// Printing 
.App-print-only {
    display: none;
}

@media print {
    .App-print-only {
        display: block;
    }
    body *:not(.App-print-only, .App-print-only *) {
        display: none;
    }
}
// --------

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
    @include tablet { flex-basis: 40%; height: 100% }
    > div {
        height: 100%;
    }
}

.App-render-container {
    @include mobile { flex-grow: 1; }
    @include tablet { flex-basis: 60%; height: 100% }
    overflow-y: auto;
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
    height: 1.5em;
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

.App-print-button {
    background-image: url('../assets/printer.svg');
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
