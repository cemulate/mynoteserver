<template>
<div class="FilePicker-root panel is-primary">
    <p class="panel-heading">
        Open
        <span v-if="topMatchingFiles.length == 0">(New)</span>
    </p>
    <div class="panel-block">
        <p class="control">
            <input ref="searchBar" class="input is-family-monospace" type="text" placeholder="Search" 
                v-model="searchTerm"
                @keyup="inputKeypress"
            >
        </p>
    </div>
    <div class="panel-block is-flex"
        v-for="(entry, index) in topMatchingFiles"
        v-bind:class="{ 'focused': index == focusedIndex }"
        @click="selectFile(entry)"
    >
        <span class="is-family-monospace is-flex-grow-1">{{ entry.path }}</span>
        <small>{{ formatEditTime(entry.mtime) }}</small>
        <a 
            class="icon-button ml-2"
            @click.stop=""
            :href="`notes/${ entry.path }`"
            title="Open note in new tab"
        >
            <NewTabIcon/>
        </a>
    </div>
    <a class="panel-block" v-if="loadError">
        Couldn't load files...
    </a>
</div>
</template>

<script>
import { format, toDate } from 'date-fns';
import * as network from '../lib/network';

import NewTabIcon from './icons/NewTabIcon.vue';

export default {
    data: () => ({
        files: [],
        searchTerm: '',
        focusedIndex: -1,
        loadError: false,
    }),
    props: {
        selection: { type: Object },
    },
    computed: {
        topMatchingFiles() {
            let searchParts = this.searchTerm.split('/');
            let fixed = searchParts.slice(0, -1).join('/');
            let result = this.files.filter(f => f.path.startsWith(fixed) && f.path.slice(fixed.length).includes(searchParts.at(-1)));
            result.sort((a, b) => Math.sign(b.mtime - a.mtime));
            return result.slice(0, 10);
        },
        focusedFile() {
            return (this.focusedIndex >= 0 && this.focusedIndex < this.topMatchingFiles.length)
                ? this.topMatchingFiles[this.focusedIndex]
                : null;
        },
    },
    methods: {
        async getFiles() {
            let response = await network.get('/api/ls');
            if (response?.status == 200) {
                let files = await response.json();
                this.files = files;
                this.loadError = false;
            } else {
                this.files = [];
                this.loadError = true;
            }
        },
        formatEditTime(timestamp) {
            let d = toDate(timestamp);
            return format(d, 'LL/dd/yy K:mm aaa');
        },
        changeFocus(inc) {
            let newIndex = this.focusedIndex + inc;
            if (newIndex >= 0 && newIndex < this.topMatchingFiles.length) this.focusedIndex = newIndex;
        },
        inputKeypress(event) {
            if (event.key == 'ArrowDown') {
                event.preventDefault(); this.changeFocus(1);
            } else if (event.key == 'ArrowUp') {
                event.preventDefault(); this.changeFocus(-1);
            } else if (event.key == 'Enter') {
                event.preventDefault();
                if (this.topMatchingFiles.length == 0) {
                    this.selectNewFile();
                } else if (this.topMatchingFiles.length == 1) {
                    // Don't need to arrow down to the only file in the list.
                    this.selectFile(this.topMatchingFiles[0]);
                } else {
                    let f = this.focusedFile;
                    if (f != null) this.selectFile(f);
                }
            }
        },
        selectFile(file) {
            this.$emit('selectFile', file);
        },
        selectNewFile() {
            // New file
            let parts = this.searchTerm.split('/').filter(x => x.length > 0);
            this.selectFile({ path: parts.join('/') });
        },
        reset() {
            this.files = [];
            this.searchTerm = '';
            this.focusedIndex = -1;
            this.getFiles();
        },
    },
    updated() {
        this.$refs.searchBar?.focus?.();
    },
    components: {
        NewTabIcon,
    },
};
</script>

<style scoped>
.FilePicker-root {
    background: var(--bulma-body-background-color);
}
.focused {
    background-color: hsl(0 0 90%);
    [data-theme="dark"] & {
        background-color: hsl(0 0 20%);
    }
}
</style>
