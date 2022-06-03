<template>
<div id="file-picker" class="panel">
    <p class="panel-heading">
        Open
        <span v-if="topMatchingFiles.length == 0">(New)</span>
    </p>
    <div class="panel-block">
        <p class="control">
            <input ref="searchBar" class="input" type="text" placeholder="Search" 
                v-model="searchTerm"
                @keyup="inputKeypress"
            >
        </p>
    </div>
    <a class="panel-block"
        v-for="(entry, index) in topMatchingFiles"
        v-bind:class="{ 'has-background-link-light': index == focusedIndex }"
        @click="selectFile(entry)">
        {{ entry.collection }}/{{ entry.name }}
    </a>
</div>
</template>

<script>
import { compareDesc } from 'date-fns';

export default {
    data: () => ({
        files: [],
        searchTerm: '',

        focusedIndex: -1,
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
            result.sort((a, b) => compareDesc(a.mtime, b.mtime));
            return result.slice(0, 10);
        },
    },
    methods: {
        async getFiles() {
            let result = await fetch('/files');
            let files = await result.json();
            for (let f of files) {
                f.mtime = new Date(f.mtime);
            }
            this.files = files;
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
                event.preventDefault(); this.selectFocusedFile();
            }
        },
        selectFile(file) {
            this.$emit('update:selection', file);
        },
        selectFocusedFile() {
            if (this.focusedIndex >= 0 && this.focusedIndex < this.topMatchingFiles.length) {
                this.selectFile(this.topMatchingFiles[this.focusedIndex]);
            } else {
                // New file
                let [ t1, t2 ] = this.searchTerm.split('/');
                // TODO: errors for these cases
                if (t2 == undefined) return;
                if (t1.length == 0 || t2.length == 0) return;

                this.selectFile({ collection: t1, name: t2 });
            }
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
#file-picker {
    background: white;
}
</style>
