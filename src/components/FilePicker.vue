<template>
<div class="FilePicker-root panel">
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
    <a class="panel-block is-flex"
        v-for="(entry, index) in topMatchingFiles"
        v-bind:class="{ 'has-background-link-light': index == focusedIndex }"
        @click="selectFile(entry)"
    >
        <span class="is-family-monospace is-flex-grow-1">{{ entry.path }}</span>
        <small class="FilePicker-subdued">{{ formatEditTime(entry.mtime) }}</small>
        <a 
            class="button is-link FilePicker-open-new-tab-button"
            @click.stop=""
            :href="`notes/${ entry.path }`"
            title="Open note in new tab"
        />
    </a>
    <a class="panel-block" v-if="loadError">
        Couldn't load files...
    </a>
</div>
</template>

<script>
import { format, toDate } from 'date-fns';
import * as network from '../lib/network';

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
};
</script>

<style lang="scss">
.FilePicker-root {
    background: white;
}
.FilePicker-subdued {
    color: hsl(0, 0%, 30%);
}
.FilePicker-open-new-tab-button {
    height: 1.4em;
    aspect-ratio: 1;
    margin-left: 0.5em;
    mask: url('../assets/newtab.svg') 0 0/100% 100% no-repeat;
    -webkit-mask: url('../assets/newtab.svg') 0 0/100% 100% no-repeat;
}
</style>
