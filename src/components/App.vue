<template>
<div class="root">
    <div>
        <div>
            <code-mirror 
                v-model="markdownSource"
                ref="codemirror"
                :debounce="500"
            />
        </div>
        <div class="">
            <div class="render-container">
                <div ref="renderView" class="content p-2" v-html="renderedContent"></div>
            </div>
        </div>
    </div>
    <div>
        <p class="is-family-monospace mt-1 mb-1 pl-2">
            <a class="has-text-black" v-if="curFile != null" @click="togglePicker">
                🗋 {{ curFile.collection }} / {{ curFile.name }}
            </a>
            <span v-else>No file selected</span>

            <span v-if="hasContentChanged"> (*)</span>
            <Transition name="fade">
                <strong class="ml-3" :style="{ 'color': toast.color }" v-if="showToast">{{ toast.message }}</strong>
            </Transition>
        </p>
    </div>

    <div class="modal" :class="{ 'is-active': isDrawingOpen }">
        <div class="modal-background">
            <!-- Use the v-if to *create* this component upon opening the modal, causing it to 
            read the DOM to set the correct dimensions -->
            <sketch-area id="sketch-area-component" ref="sketch" :image="openedImage" v-if="isDrawingOpen" @close="toggleDrawing"></sketch-area>
        </div>
        <div class="modal-content">
        </div>
    </div>
    <div class="modal" :class="{ 'is-active': isPickerOpen }">
        <div class="modal-background"></div>
        <div class="modal-content">
            <file-picker ref="picker" v-model:selection="curFile" @update:selection="isPickerOpen = false"></file-picker>
        </div>
    </div>
</div>
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
    },
    methods: {
        toggleDrawing() {
            this.isDrawingOpen = !this.isDrawingOpen;
            if (this.isDrawingOpen) {
                this.openedImage = this.$refs.codemirror?.getImageAtCursor();
            } else {
                const image = this.$refs.sketch.getImage();
                if (image != null) this.$refs.codemirror?.addOrReplaceImageAtCursor(image);
            }
        },
        togglePicker() {
            this.isPickerOpen = !this.isPickerOpen;
            if (this.isPickerOpen) {
                this.$refs.picker?.getFiles();
                this.$refs.picker?.clear();
            }
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
        curFile(newVal) {
            window.localStorage.setItem('curFile', JSON.stringify(newVal));
            this.loadCurFile();
        },
    },
    components: {
        'sketch-area': SketchArea,
        'code-mirror': CodeMirror,
        'file-picker': FilePicker,
    },
};
</script>

<style lang="scss" scoped>
@import 'bulma/sass/utilities/mixins.sass';

.content {
    overflow-wrap: break-word;
}

.root {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;

    display: flex;
    flex-direction: column;

    > :first-child {
        flex-grow: 1;
        display: flex;
        flex-direction: row;

        /* Important!! */
        overflow: auto;

        > :first-child {
            @include mobile {
                display: none;
            }

            @include tablet {
                flex-basis: 40%;
                height: 100%;   
            }

            > * {
                height: 100%;
            }
        }

        > :last-child {
            @include mobile {
                flex-grow: 1;
            }

            @include tablet {
                flex-basis: 60%;
                height: 100%;
            }

            > .render-container {
                height: 100%;
                overflow-y: auto;
                padding: 0.5rem;
            }
        }
    }

    > :nth-child(2) {
        flex-grow: 0;
        
        border-top: 1px dotted gray;
        background: #f5f5f5;
    }
}

#sketch-area-component {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-leave-to {
    opacity: 0;
}
</style>
