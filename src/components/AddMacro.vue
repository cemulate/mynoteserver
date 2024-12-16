<template>
<Teleport to="body">
    <div class="modal" :class="{ 'is-active': isActive }">
        <div class="modal-background" @click="$emit('update:isActive', !isActive)"></div>
        <div class="modal-content">
            <div class="modal-content">
                <div class="box">
                    <h4 class="title is-4">Add MathJax Macro</h4>
                    <div class="field">
                        <label class="label">Command</label>
                        <div class="control">
                            <input class="input is-family-monospace" type="text" ref="commandInput" v-model="command" placeholder="bb">
                        </div>
                    </div>
                    <div class="field">
                        <label class="label">Arity</label>
                        <div class="control">
                            <input class="input is-family-monospace" type="number" v-model="arity" placeholder="arity">
                        </div>
                    </div>
                    <div class="field">
                        <label class="label">Value</label>
                        <div class="control">
                            <input class="input is-family-monospace" type="text" v-model="expansion" placeholder="\mathbb{#1}">
                        </div>
                    </div>
                    <div class="field">
                        <div class="control">
                            <button class="button is-link" :class="{ 'is-loading': submitting }" v-bind:disabled="!valid || submitting" @click="submitMacro">Add Macro</button>
                        </div>
                        <p v-if="submitFailed" class="help is-danger">Failed to add macro</p>
                    </div>
                    <hr>
                    <textarea class="textarea is-family-monospace" rows="1" readonly :value="preview"></textarea>
                </div>
            </div>
        </div>
    </div>
</Teleport>
</template>

<script>
import * as network from '../lib/network';

export default {
    data: () => ({
        command: '',
        arity: 1,
        expansion: '',
        submitting: false,
        submitFailed: false,
    }),
    props: {
        isActive: { type: Boolean },
    },
    emits: [
        'update:isActive',
    ],
    computed: {
        valid() {
            if (!(/^[a-z0-9]+$/.test(this.command))) return false;
            if (this.expansion.length == 0) return false;
            for (let [ match, number ] of this.expansion.matchAll(/#([0-9])/g)) {
                number = parseInt(number);
                if (number == 0 || number > this.arity) return false;
            }
            return true;
        },
        preview() {
            let escapedValue = this.expansion.replace('\\', '\\\\');
            return `window.MathJax.tex.macros["${ this.command }"] = ["${ escapedValue }", ${ this.arity }];`;
        },
    },
    methods: {
        async submitMacro() {
            this.submitFailed = false;
            this.submitting = true;
            let data = { key: this.command, value: this.expansion, arity: this.arity };
            let response = await network.post('/api/add-mathjax-macro', data);
            if (response?.status == 200) {
                this.$emit('update:isActive', false);
            } else {
                this.submitFailed = true;
            }
            this.submitting = false;
        },
    },
    mounted() {
        this.$refs.commandInput.focus();
    },
};
</script>

<style>
</style>
