<template>
<div id="root" style="height: 100vh">
    <div class="columns" style="height: 100%">
        <div class="column is-two-fifths">
            <vue-codemirror
                v-model="markdownSource"
                placeholder="Hello, world!"
                :style="{ height: '100%', display: 'block' }"
                :autofocus="true"
                :indent-with-tab="true"
                :tab-size="4"
                @ready="initCodemirror"
            />
        </div>
        <div class="column is-three-fifths">
            <div class="content" v-html="renderedContent"></div>
        </div>
    </div>
</div>
</template>

<script>
import { markdownIt } from '../lib/markdown';

export default {
    data: () => ({
        markdownSource: '',
        debounceTimeoutID: null,
        renderedContent: '',
    }),
    methods: {
        render() {
            this.renderedContent = markdownIt.render(this.markdownSource);
        },
    },
    async updated() {
        return window.MathJax.typesetPromise();
    },
    created() {
        this.render();
    },
    watch: {
        markdownSource(newVal) {
            if (this.debounceTimeoutID != null) window.clearTimeout(this.debounceTimeoutID);
            this.debounceTimeoutID = window.setTimeout(this.render.bind(this), 500);
        },
    },
};
</script>

<style lang="scss">
</style>
