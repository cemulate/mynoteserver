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
            <span v-if="curFile != null">
                🗋 &nbsp; {{ curFile.collection }} / {{ curFile.name }}
            </span>
            <span v-else>No file selected</span>

            <span v-if="hasContentChanged"> (*)</span>
            <span style="color: green" v-if="showSaveMessage"> Saved!</span>
            <strong style="color: red" v-if="lastSaveFailed"> Save Failed</strong>
        </p>
    </div>

    <div class="modal" :class="{ 'is-active': isDrawingOpen }">
        <div class="modal-background">
            <div class="sketch-area-container" v-if="isDrawingOpen">
                <sketch-area ref="sketch" :image="openedImage"></sketch-area>
            </div>
        </div>
        <div class="modal-content">
            <button class="modal-close is-large" aria-label="close" @click="isDrawingOpen = false"></button>
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
        showSaveMessage: false,
        lastSaveFailed: false,
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
                this.openedImage = this.$refs.codemirror.getImageAtCursor();
            } else {
                const image = this.$refs.sketch.getImage();
                if (image != null) this.$refs.codemirror.addOrReplaceImageAtCursor(image);
            }
        },
        togglePicker() {
            this.isPickerOpen = !this.isPickerOpen;
            if (this.isPickerOpen && this.$refs.picker != null) {
                this.$refs.picker.getFiles();
                this.$refs.picker.clear();
            }
        },
        async loadCurFile() {
            if (this.curFile == null) return;
            let { collection, name, mtime } = toRaw(this.curFile);
            if (mtime == null) {
                // If it doesn't have an mtime, this file doesn't exist yet.
                this.markdownSource = `# ${ name }`;
                // Always compare false as to display the unsaved star
                this.originalContentOnLoad = null;
            } else {
                let response = await fetch(`/collection/${ collection }/file/${ name }`);
                let result = await response.json();
                this.markdownSource = result.content;
                this.originalContentOnLoad = result.content;
            }
            this.$refs.codemirror.focus();
        },
        async saveCurFile() {
            if (this.curFile == null) return;
            let { collection, name } = toRaw(this.curFile);
            let response = await fetch(`/collection/${ collection }/file/${ name }`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: this.markdownSource }),
            });
            if (response.status == 200) {
                this.originalContentOnLoad = this.markdownSource;
                this.lastSaveFailed = false;
                this.showSaveMessage = true;
            } else {
                this.lastSaveFailed = true;
            }
        },
    },
    async updated() {
        await window.MathJax.typesetPromise();
        let el = this.$refs.renderView.parentElement;
        el.scrollTop = el.scrollHeight;
    },
    mounted() {
        document.addEventListener('keydown', event => {
            if (event.ctrlKey && event.key == ' ') {
                event.preventDefault(); this.toggleDrawing();
            } else if (event.ctrlKey && event.key == 'p') {
                event.preventDefault(); this.togglePicker();
            } else if (event.ctrlKey && event.key == 's') {
                event.preventDefault(); this.saveCurFile();
            } else if (event.ctrlKey && event.key == 'n') {
                event.preventDefault(); this.createNewFile();
            }
        });
    },
    watch: {
        curFile(newVal) {
            this.loadCurFile();
        },
        showSaveMessage(newVal) {
            if (newVal) window.setTimeout(() => this.showSaveMessage = false, 4000);
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
            flex-basis: 40%;
            height: 100%;

            > * {
                height: 100%;
            }
        }

        > :last-child {
            flex-basis: 60%;
            height: 100%;

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

.sketch-area-container {
    background: white;
    padding: 10px;
    border: 5px solid gray;
    width: 100%;
    height: 100%;
    > * {
        width: 100%;
        height: 100%;
    }
}
</style>
