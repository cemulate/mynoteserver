<template>
<div class="SketchArea-root is-flex is-flex-direction-row">
    <div class="whiteboard-container is-flex-grow-1">
        <svg class="whiteboard" ref="whiteboard"
            @pointerdown.prevent="onPointerDown"
            @pointermove.prevent="onPointerMove"
            @pointerup.prevent="onPointerUp"
            @contextmenu.prevent=""
        >
            <g id="whiteboard-content" ref="whiteboardContentSvgGroup">
                <g class="existingImage" ref="existingImageSvgGroup"></g>
                <g class="currentDrawing">
                    <path v-for="stroke in strokes" :d="stroke.path" :fill="stroke.color" ref="strokeSvgPaths"></path>
                    <path :d="curStroke.path" :fill="curStroke.color"></path>
                </g>
            </g>
        </svg>
    </div>
    <div class="is-flex-grow-0">
        <div class="toolbar pt-2 pr-2 pb-2 is-flex is-flex-direction-column is-align-content-center">
            <a class="box color-button"
                v-for="c in normalColors"
                :style="{ 'background': c, 'border': c == color ? '3px solid white' : 'none' }"
                @click="color = c"
            />
            <a class="box color-button eraser-button" 
                :style="{ 'border': color == 'ERASER' ? '3px solid black' : 'none' }"
                @click="color = 'ERASER'"
            />
            <a class="color-button undo-button" @click="undo"></a>
            <div class="is-flex-grow-1"></div>
            <a class="color-button close-button" @click="$emit('close')"></a>
        </div>
    </div>
</div>
</template>

<script>
import { getFreehandStrokePathFromPoints } from '../lib/image-utils';

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
        color: 'black',
        colors: [ 'black', 'blue', 'red', 'green', 'orange', 'ERASER' ],

        exclusivePenInput: false,
        strokes: [],
        deletedStrokes: [],
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
            return this.colors.filter(c => c != 'ERASER');
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
        tryEraseAt(x, y) {
            let i = this.strokes.length - 1;
            const hitTest = (i) => {
                const svgPath = this.$refs.strokeSvgPaths[i];
                return svgPath.isPointInFill(new DOMPoint(x, y));
            }
            while (i >= 0 && !hitTest(i)) i--;
            if (i >= 0) this.strokes = this.strokes.toSpliced(i, 1);
        },
        onPointerDown(event) {
            if (!this.exclusivePenInput && event.pointerType == 'pen') this.exclusivePenInput = true;
            if (this.exclusivePenInput && event.pointerType != 'pen') return;
            
            if (this.disabled) return;

            // Setup to perform the appropriate action;
            // Start a log of the current action in curStroke
            if (event.buttons == BUTTONS_ERASER || this.color == 'ERASER') {
                this.action = ACTION.ERASING;
                this.tryEraseAt(event.offsetX, event.offsetY);
            } else {
                this.action = ACTION.DRAWING;
                this.curSamplePoints = [[ event.offsetX, event.offsetY, event.pressure ]];
            }
        },
        onPointerMove(event) {
            if (!this.exclusivePenInput && event.pointerType == 'pen') this.exclusivePenInput = true;
            if (this.exclusivePenInput && event.pointerType != 'pen') return;

            if (this.disabled || this.action == ACTION.NONE) return;
            
            // Perform the action, and continue the log in curStroke
            if (this.action == ACTION.DRAWING) {
                console.log([ event.offsetX, event.offsetY, event.pressure ]);
                this.curSamplePoints.push([ event.offsetX, event.offsetY, event.pressure ]);
            } else {
                this.tryEraseAt(event.offsetX, event.offsetY);
            }
        },
        onPointerUp(event) {
            this.action = ACTION.NONE;
            
            this.strokes.push({ ...this.curStroke });
            this.curSamplePoints = [];
        },
        undo() {
            if (this.strokes.length == 0) return;
            this.deletedStrokes.push(this.strokes.pop());
        },
        redo() {
            if (this.deletedStrokes.length == 0) return;
            this.strokes.push(this.deletedStrokes.pop());
        },
        initializeExistingImage() {
            // the 'image' prop may contain some image that we are annotating.
            // This can be an svg image, such as one originally created from
            // this component; in this case 'image' will be the (text of the) svg
            // It can also be a raster image, in this case 'image' will be the href.
            if (this.image == null || this.image.length == 0) return;

            const { width: boardWidth, height: boardHeight } = this.$refs.whiteboard.getBoundingClientRect();
            console.log('board', boardWidth, boardHeight);

            if (this.image.startsWith('<svg')) {
                // The existing image is an SVG, either from a previous drawing,
                // or some svg pasted in directly. In the latter case, we use some
                // vague heuristics to position the svg reasonably within the whiteboard.
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.innerHTML = this.image;

                const svgWidth = g.firstChild.getAttribute('width');
                const svgHeight = g.firstChild.getAttribute('height');
                const svgViewBox = g.firstChild.viewBox.baseVal;

                if (svgWidth != null && svgHeight != null) {
                    // Case 1: the svg tag has a set width and height
                    // This will be the case for drawings created by this component.
                    const width = parseFloat(svgWidth);
                    const height = parseFloat(svgHeight);
                    g.firstChild.setAttribute('x', ((boardWidth / 2) - (width / 2)).toFixed(2));
                    g.firstChild.setAttribute('y', ((boardHeight / 2) - (height / 2)).toFixed(2));
                } else if (svgViewBox != null) {
                    // Otherwise, we don't know anything about the SVG.
                    // If it has a viewBox, we can try to put it comfortably in the center.
                    const aspectRatio = svgViewBox.height / svgViewBox.width;
                    const width = boardWidth / 3;
                    const height = width * aspectRatio;
                    g.firstChild.setAttribute('width', width);
                    g.firstChild.setAttribute('height', height);
                    g.firstChild.setAttribute('x', ((boardWidth / 2) - (width / 2)).toFixed(2));
                    g.firstChild.setAttribute('y', ((boardHeight / 2) - (height / 2)).toFixed(2));
                } else {
                    // What even should happen in this case???
                }

                this.$refs.existingImageSvgGroup.innerHTML = g.innerHTML;
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

                    this.$refs.existingImageSvgGroup.innerHTML = svgImg.outerHTML;
                }
                img.src = this.image;
            }
        },
        getSvg(discardUnedited = true) {
            // In this case, the canvas was never drawn on.
            // (but the image might be new / we are not editing an existing image,
            // in which case discardUnedited will be false)
            if (discardUnedited && this.strokes.length == 0) return null;

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
            for (const el of this.$refs.existingImageSvgGroup.children) s.appendChild(el);
            // Now include our new strokes
            for (let { color, path } of this.strokes) {
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p.setAttribute('fill', color);
                p.setAttribute('d', path);
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
};
</script>

<style scoped>

.SketchArea-root {
    background: lightgray;
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
}
.eraser-button {
    background-color: lightgray;
    background-image:  repeating-linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%, white),
        repeating-linear-gradient(45deg, white 25%, lightgray 25%, lightgray 75%, white 75%, white);
    background-position: 0 0, 10px 10px;
    background-size: 20px 20px;
}

.undo-button {
    background: url('../assets/undo.svg');
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-position: center;
}
.close-button {
    background: url('../assets/delete.svg');
    background-repeat: no-repeat;
    background-size: 60% 60%;
    background-position: center;
}

.whiteboard {
    width: 100%;
    height: 100%;
    background: white;
    background-clip: padding-box;
    border-radius: 1rem;
    background: white;
    touch-action: none;
    cursor: crosshair;
}
</style>
