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
        @click="selectFile(entry)">
        <span class="is-family-monospace">{{ entry.collection }}/{{ entry.name }}</span>
        <small class="FilePicker-subdued ml-auto">{{ formatEditTime(entry.mtime) }}</small>
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
            let [ t1, t2 ] = this.searchTerm.split('/');
            let result;
            if (t2 == undefined) {
                result = this.files.filter(f => f.collection.includes(t1) || f.name.includes(t1));
            } else {
                result = this.files.filter(f => f.collection.includes(t1) && f.name.includes(t2));
            }
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
            let response = await network.get('/api/files');
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
            let [ t1, t2 ] = this.searchTerm.split('/');
            // TODO: errors for these cases
            if (t2 == undefined) return;
            if (t1.length == 0 || t2.length == 0) return;

            this.selectFile({ collection: t1, name: t2 });
        },
        clear() {
            this.searchTerm = '';
            this.focusedIndex = -1;
        },
    },
    updated() {
        this.$refs.searchBar.focus();
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
</style>
