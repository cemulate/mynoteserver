<template>
<div id="root">
    <div class="columns is-gapless fullheight">
        <div class="column is-two-fifths">
            <code-mirror 
                v-model:document="markdownSource"
                ref="codemirror"
                class="fullheight"
                :debounce="500"
            />
        </div>
        <div class="column is-three-fifths">
            <div class="content" v-html="renderedContent"></div>
        </div>
    </div>
    <div class="modal" :class="{ 'is-active': isDrawingOpen }">
        <div class="modal-background">
            <div class="sketch-area-container is-fullwidth fullheight" v-if="isDrawingOpen">
                <sketch-area ref="sketch" class="fullwidth fullheight" :image="openedImage"></sketch-area>
            </div>
        </div>
        <div class="modal-content">
            <button class="modal-close is-large" aria-label="close" @click="isDrawingOpen = false"></button>
        </div>
    </div>
</div>
</template>

<script>
import { markdownIt } from '../lib/markdown';

import SketchArea from '../components/SketchArea.vue';
import CodeMirror from '../components/CodeMirror.vue';

export default {
    data: () => ({
        markdownSource: 'Hello!',
        isDrawingOpen: false,
        openedImage: null,
    }),
    computed: {
        renderedContent() {
            return markdownIt.render(this.markdownSource);
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
    },
    async updated() {
        return window.MathJax.typesetPromise();
    },
    mounted() {
        document.addEventListener('keydown', event => {
            if (!event.ctrlKey || event.key != ' ') return;
            this.toggleDrawing();
        });
    },
    components: {
        'sketch-area': SketchArea,
        'code-mirror': CodeMirror,
    },
};
</script>

<style lang="scss">
.fullheight {
    height: 100%;
}

.fullwidth {
    width: 100%;
}

#root {
    position: relative;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}

.sketch-area-container {
    background: white;
    padding: 10px;
    border: 5px solid gray;
}
</style>
