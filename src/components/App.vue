<template>
<div id="root">
    <div class="columns is-gapless fullheight">
        <div class="column is-two-fifths">
            <code-mirror 
                v-model:document="markdownSource"
                ref="codemirror"
                class="fullheight"
                :debounce="500"
                @open-image="openDrawingFromContext"
            />
        </div>
        <div class="column is-three-fifths">
            <div class="content" v-html="renderedContent"></div>
        </div>
    </div>
    <div class="modal" :class="{ 'is-active': isDrawingOpen }">
        <div class="modal-background">
            <div class="container is-fullwidth fullheight">
                <div class="box is-fullwidth fullheight">
                    <sketch-pad></sketch-pad>
                </div>
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

import SketchPad from '../components/SketchPad.vue';
import CodeMirror from '../components/CodeMirror.vue';

export default {
    data: () => ({
        markdownSource: 'Hello!',
        isDrawingOpen: false,
    }),
    computed: {
        renderedContent() {
            return markdownIt.render(this.markdownSource);
        },
    },
    methods: {
        toggleDrawing() {
            this.isDrawingOpen = !this.isDrawingOpen;
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
        'sketch-pad': SketchPad,
        'code-mirror': CodeMirror,
    },
};
</script>

<style lang="scss">
.fullheight {
    height: 100%;
}

#root {
    position: relative;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
}
</style>
