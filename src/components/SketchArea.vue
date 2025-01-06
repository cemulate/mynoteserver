<template>
<div class="SketchArea-root is-flex is-flex-direction-row">
    <div class="whiteboard-container is-flex-grow-1">
        <svg class="whiteboard" ref="whiteboard"
            :class="{ 'no-cursor': exclusivePenInput}"
            @pointerdown.prevent="onPointerDown"
            @pointermove.prevent="onPointerMove"
            @pointerup.prevent="onPointerUp"
            @contextmenu.prevent=""
        >
            <g id="whiteboard-content" ref="whiteboardContentSvgGroup">
                <g class="currentDrawing">
                    <path
                        v-for="(stroke, index) in strokes"
                        :d="stroke.path"
                        :fill="stroke.color"
                        :class="{ 'default-fill': stroke.color == null }"
                        @pointerdown.prevent="possiblyEraseStroke(index)"
                        @pointermove.prevent="possiblyEraseStroke(index)"
                        ref="strokeSvgPaths"
                    ></path>
                    <path
                        :d="curStroke.path"
                        :fill="curStroke.color"
                        :class="{ 'default-fill': curStroke.color == null }"
                    ></path>
                    <!-- a null color means fill will not be set, which defaults
                     to black as desired in a light theme. Such strokes also
                     get the default-fill class, which allows them to change to 
                     white when the app is in a dark theme. -->
                </g>
            </g>
        </svg>
    </div>
    <div class="is-flex-grow-0">
        <div class="toolbar pt-2 pr-2 pb-2 is-flex is-flex-direction-column is-align-content-center">
            <button class="box color-button default-color-button"
                :class="{ 'selected': color == null }"
                @click="color = null"
            />
            <button class="box color-button"
                v-for="c in normalColors"
                :class="{ 'selected': color == c }"
                :style="{ 'background': c }"
                @click="color = c"
            />
            <button class="box color-button eraser-button" 
                :class="{ 'selected': color == 'ERASER' }"
                @click="color = 'ERASER'"
            />
            <button class="icon-button color-button" @click="undo"><UndoIcon/></button>
            <div class="is-flex-grow-1"></div>
            <button class="icon-button color-button" @click="$emit('close')"><DeleteIcon/></button>
        </div>
    </div>
</div>
</template>

<script>
import { getFreehandStrokePathFromPoints } from '../lib/image-utils';

import DeleteIcon from './icons/DeleteIcon.vue';
import UndoIcon from './icons/UndoIcon.vue';

const perfectFreehandOptions = window?.mynoteserver?.perfectFreehandOptions ?? {
    size: 4,
    thinning: 0.8,
    simulatePressure: false,
};

const BUTTONS_ERASER = 32;
const ACTION = {
    NONE: 0,
    DRAWING: 1,
    ERASING: 2,
};

export default {
    data: () => ({
        action: ACTION.NONE,
        color: null,
        colors: [ null, 'blue', 'red', 'green', 'orange', 'ERASER' ],

        exclusivePenInput: false,
        strokes: [],
        undoHistory: [],
        curSamplePoints: [],
    }),
    props: {
        disabled: {
            type: Boolean,
            default: false,
        },
        image: {
            type: String,
            default: '',
        },
    },
    computed: {
        normalColors() {
            return this.colors.filter(c => c != 'ERASER' && c != null);
        },
        curStroke() {
            // This unassuming computed property uses the perfect-freehand library
            // to transform curSamplePoints into a calligraphic stroke.
            const opts = { ...perfectFreehandOptions };
            if (this.exclusivePenInput) opts.simulatePressure = false;
            return { color: this.color, path: getFreehandStrokePathFromPoints(this.curSamplePoints, opts) };
        }
    },
    methods: {
        possiblyEraseStroke(index) {
            if (this.action != ACTION.ERASING) return;
            const erasedStroke = this.strokes[index];
            this.undoHistory.push({ action: ACTION.ERASING, stroke: erasedStroke });
            this.strokes = this.strokes.toSpliced(index, 1);
        },
        onPointerDown(event) {
            if (!this.exclusivePenInput && event.pointerType == 'pen') this.exclusivePenInput = true;
            if (this.exclusivePenInput && event.pointerType != 'pen') return;
            if (this.disabled) return;

            if (event.buttons == BUTTONS_ERASER || this.color == 'ERASER') {
                this.action = ACTION.ERASING;
            } else {
                this.action = ACTION.DRAWING;
                this.curSamplePoints = [[ event.offsetX, event.offsetY, event.pressure ]];
            }
        },
        onPointerMove(event) {
            if (!this.exclusivePenInput && event.pointerType == 'pen') this.exclusivePenInput = true;
            if (this.exclusivePenInput && event.pointerType != 'pen') return;
            if (this.disabled || this.action != ACTION.DRAWING) return;

            if (this.action == ACTION.DRAWING) this.curSamplePoints.push([ event.offsetX, event.offsetY, event.pressure ]);
        },
        onPointerUp(event) {
            if (this.action == ACTION.DRAWING) {
                const newStroke = { ...this.curStroke };
                this.undoHistory.push({ action: ACTION.DRAWING, stroke: newStroke });
                this.strokes.push(newStroke);
                this.curSamplePoints = [];
            }
            this.action = ACTION.NONE;
        },
        undo() {
            if (this.undoHistory.length == 0) return;
            const { action, stroke } = this.undoHistory.pop();
            const index = this.strokes.indexOf(stroke);
            if (action == ACTION.DRAWING && index >= 0) {
                this.strokes = this.strokes.toSpliced(index, 1);
            } else if (action == ACTION.ERASING) {
                this.strokes.push(stroke);
            }
        },
        initializeExistingImage() {
            // the 'image' prop may contain some image that we are annotating.
            // This can be an svg image, such as one originally created from
            // this component; in this case 'image' will be the (text of the) svg
            // It can also be a raster image, in this case 'image' will be the href.
            if (this.image == null || this.image.length == 0) return;

            const { width: boardWidth, height: boardHeight } = this.$refs.whiteboard.getBoundingClientRect();

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.classList.add('existingImage');

            if (this.image.startsWith('<svg')) {
                // The existing image is an SVG, either from a previous drawing,
                // or some svg pasted in directly. In the latter case, we use some
                // vague heuristics to position the svg reasonably within the whiteboard.
                const t = document.createElement('template');
                t.innerHTML = this.image;
                const svg = t.content.firstChild;    

                const svgWidth = svg.getAttribute('width');
                const svgHeight = svg.getAttribute('height');
                const svgViewBox = svg.viewBox.baseVal;

                if (svgWidth != null && svgHeight != null) {
                    // Case 1: the svg tag has a set width and height
                    // This will be the case for drawings created by this component.
                    const width = parseFloat(svgWidth);
                    const height = parseFloat(svgHeight);
                    g.setAttribute('x', ((boardWidth / 2) - (width / 2)).toFixed(2));
                    g.setAttribute('y', ((boardHeight / 2) - (height / 2)).toFixed(2));
                } else if (svgViewBox != null) {
                    // Otherwise, we don't know anything about the SVG.
                    // If it has a viewBox, we can try to put it comfortably in the center.
                    const aspectRatio = svgViewBox.height / svgViewBox.width;
                    const width = boardWidth / 3;
                    const height = width * aspectRatio;
                    g.setAttribute('width', width);
                    g.setAttribute('height', height);
                    g.setAttribute('x', ((boardWidth / 2) - (width / 2)).toFixed(2));
                    g.setAttribute('y', ((boardHeight / 2) - (height / 2)).toFixed(2));
                } else {
                    // What even should happen in this case???
                }

                // "Extract" the path.mns that are previously drawn strokes and
                // convert them to entries in the strokes array; this allows
                // them to be subject to erasing and undo/redo on subsequent edits.
                const oldStrokes = svg.querySelectorAll('path.mns');
                for (const el of oldStrokes) {
                    svg.removeChild(el);
                    const color = el.classList.contains('default-fill') ? null : el.getAttribute('fill');
                    const path = el.getAttribute('d');
                    this.strokes.push({ color, path });
                }

                g.innerHTML = svg.innerHTML;
                this.$refs.whiteboardContentSvgGroup.prepend(g);
            } else {
                // The existing image is a dataURL.
                // "Load" the image to figure out its dimensions, and then
                // include it as an svg <image>
                let img = new Image();
                img.onload = () => {
                    const svgImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    svgImg.setAttribute('width', img.width.toFixed(2));
                    svgImg.setAttribute('height', img.height.toFixed(2));
                    svgImg.setAttribute('x', ((boardWidth / 2) - (img.width / 2)).toFixed(2));
                    svgImg.setAttribute('y', ((boardHeight / 2) - (img.height / 2)).toFixed(2));
                    svgImg.setAttribute('href', this.image);

                    g.innerHTML = svgImg.outerHTML;
                    this.$refs.whiteboardContentSvgGroup.prepend(g);
                }
                img.src = this.image;
            }
        },
        getSvg() {
            const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            s.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            // Upon export, we set the viewBox to the slightly padded bounding
            // box of all the whiteboard content
            const { x, y, width, height } = this.$refs.whiteboard.getBBox();
            const box = [ x - 5, y - 5, width + 10, height + 10 ].map(x => x.toFixed(2)).join(' ');
            s.setAttribute('viewBox', box);
            s.setAttribute('width', width + 10);
            s.setAttribute('height', height + 10);

            // Any content that we were 'drawing over' (the existing image) is in the 
            // appropriately named group; simply copy its children into this svg.
            const existingImageGroup = this.$refs.whiteboardContentSvgGroup.querySelector('g.existingImage');
            if (existingImageGroup != null) {
                for (let el of existingImageGroup.children) s.append(el);
            }
            // Now include our new strokes
            for (let { color, path } of this.strokes) {
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                (color != null) ? p.setAttribute('fill', color) : p.classList.add('default-fill');
                p.setAttribute('d', path);
                // This marks the element as a "stroke" that can be detected and extracted
                // in initializeExistingImage the next time this image is edited.
                p.classList.add('mns'); 
                s.appendChild(p);
            }

            // As to why we can't just get whiteboard.outerHTML, two reasons:
            // * That would result in infinitely nested 'existingImageSvgGroup' groups
            //   when editing an image repeatedly.
            // * Our new strokes would contain vue data attributes which will still
            //   affect the svg even when 'rendered' into the document.
            return s.outerHTML.replace('\n', '');
        },
    },
    async mounted() {
        this.initializeExistingImage();
    },
    components: {
        DeleteIcon,
        UndoIcon,
    },
};
</script>

<style scoped>

.SketchArea-root {
    background: lightgray;
    --color-button-outline-color: 5px solid white;

    [data-theme="dark"] & {
        background: #444;
        --color-button-outline-color: 5px solid black;
    }
}
.whiteboard-container {
    width: 100%;
    height: 100%;
    padding: 0.5rem;
}

.toolbar {
    height: 100%;
}

.color-button {
    width: 0.5in;
    height: 0.5in;
    &.selected {
        outline: var(--color-button-outline-color);
    }
}

.default-color-button {
    background-color: black;
    [data-theme="dark"] & {
        background-color: white;
    }
}

.eraser-button {
    background-color: lightgray;
    background-image:  repeating-linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%, white),
        repeating-linear-gradient(45deg, white 25%, lightgray 25%, lightgray 75%, white 75%, white);
    background-position: 0 0, 10px 10px;
    background-size: 20px 20px;
}

/* .undo-button {
    mask: url('../assets/undo.svg') 0 0/100% 100%;
    background-color: var(--bulma-body-color);
}
.close-button {
    mask: url('../assets/delete.svg') center/60% no-repeat;
    background-color: var(--bulma-body-color);
} */

.whiteboard {
    width: 100%;
    height: 100%;
    background: var(--bulma-body-background-color);
    background-clip: padding-box;
    border-radius: 1rem;
    touch-action: none;
    cursor: crosshair;
    &.no-cursor {
        cursor: none;
    }
}
</style>
