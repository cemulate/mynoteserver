<template>
<div class="SketchArea-root is-flex is-flex-direction-row">
    <div class="SketchArea-canvas-container is-flex-grow-1 p-2">
        <div>
            <canvas id="SketchArea-main-canvas" ref="mainCanvas"
                :width="pixelWidth"
                :height="pixelHeight"
                @pointerdown.prevent="onPointerDown"
                @pointermove.prevent="onPointerMove"
                @pointerup.prevent="onPointerUp"
                @contextmenu.prevent=""
            />
            <canvas id="SketchArea-overlay-canvas" ref="overlayCanvas" :width="pixelWidth" :height="pixelHeight"></canvas>
        </div>
    </div>
    <div class="is-flex-grow-0">
        <div class="SketchArea-toolbar pt-2 pr-2 pb-2 is-flex is-flex-direction-column is-align-content-center">
            <a class="box SketchArea-color-button"
                v-for="c in normalColors"
                :style="{ 'background': c, 'border': c == color ? '3px solid white' : 'none' }"
                @click="color = c"
            />
            <a class="box SketchArea-color-button SketchArea-eraser-button" 
                :style="{ 'border': color == 'ERASER' ? '3px solid black' : 'none' }"
                @click="color = 'ERASER'"
            />
            <a class="SketchArea-color-button SketchArea-undo-button" @click="undo"></a>
            <div class="is-flex-grow-1"></div>
            <a class="SketchArea-color-button SketchArea-close-button" @click="$emit('close')"></a>
        </div>
    </div>
</div>
</template>

<script>
import { toRaw } from 'vue';
import { getCropBoundsFromImageData } from '../lib/image-utils';

const BUTTONS_ERASER = 32;
const ACTION = {
    NONE: 0,
    DRAWING: 1,
    ERASING: 2,
};

export default {
    data: () => ({
        initialized: false,
        pixelWidth: 480,
        pixelHeight: 580,
        action: ACTION.NONE,
        color: 'black',
        colors: [ 'black', 'blue', 'red', 'green', 'orange', 'ERASER' ],

        position: null,
        context: null,
        initialImageData: null,
        strokes: [],
        curStroke: [],
    }),
    props: {
        neutralEraserRadius: {
            type: Number,
            default: 30,
        },
        lineWidthRange: {
            type: Array,
            default: [0.8, 3],
        },
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
    },
    methods: {
        getImage() {
            // In this case, the canvas was never drawn on.
            if (this.strokes.length == 0) return null;

            let raw = this.context.getImageData(0, 0, this.pixelWidth, this.pixelHeight);
            let bounds = getCropBoundsFromImageData(raw);

            // canvas is empty
            if (bounds == null) return null;

            let width = bounds.maxX - bounds.minX;
            let height = bounds.maxY - bounds.minY;
            let crop = this.context.getImageData(bounds.minX, bounds.minY, width, height);

            let dest = document.createElement('canvas');
            dest.width = width;
            dest.height = height;
            const destCtx = dest.getContext('2d');
            destCtx.putImageData(crop, 0, 0);

            return dest.toDataURL('image/webp');
        },
        updatePosition(event) {
            // This works since the dimensions of the canvas are set based
            // on the computed style at creation
            this.position = { x: event.offsetX, y: event.offsetY };
        },
        lineWidthFromEvent(event) {
            const [ min, max ] = this.lineWidthRange;
            if (event.pressure == 0) return (min + max) / 2;
            
            return min + (max - min) * event.pressure;
        },
        erase(pos, showEraser = true) {
            let { x, y } = pos;
            let r = this.neutralEraserRadius;

            if (showEraser) {
                this.overlayContext.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
                this.overlayContext.beginPath();
                this.overlayContext.ellipse(x, y, r, r, 0, 0, 2 * Math.PI);
                this.overlayContext.stroke();
            }

            this.context.beginPath(); this.context.ellipse(x, y, r, r, 0, 0, 2 * Math.PI); this.context.fill();
        },
        clearEraseTooltip() {
            this.overlayContext.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
        },
        connect(pos1, pos2, lineWidth) {
            this.context.lineWidth = lineWidth;
            let { x: x1, y: y1 } = pos1 != null ? pos1 : pos2;
            let { x: x2, y: y2 } = pos2;
            this.context.beginPath(); this.context.moveTo(x1, y1); this.context.lineTo(x2, y2); this.context.stroke();
        },
        onPointerDown(event) {
            if (this.disabled) return;

            this.updatePosition(event);

            // Setup to perform the appropriate action;
            // Start a log of the current action in curStroke
            if (event.buttons == BUTTONS_ERASER || this.color == 'ERASER') {
                this.action = ACTION.ERASING;
                this.context.globalCompositeOperation = 'destination-out';
                this.erase(this.position);

                this.curStroke.push({ action: ACTION.ERASING });
                this.curStroke.push(this.position);
            } else {
                this.action = ACTION.DRAWING;
                this.context.globalCompositeOperation = 'source-over';
                this.context.strokeStyle = this.color;

                this.curStroke.push({ action: ACTION.DRAWING, color: this.color });
                this.curStroke.push([ this.position, 0 ]);
            }
        },
        onPointerMove(event) {
            if (this.disabled || this.action == ACTION.NONE) return;
            
            let oldPos = toRaw(this.position);
            this.updatePosition(event);

            // Perform the action, and continue the log in curStroke
            if (this.action == ACTION.DRAWING) {
                let width = this.lineWidthFromEvent(event);
                this.connect(oldPos, this.position, width);
                this.curStroke.push([ this.position, width ]);
            } else {
                this.erase(this.position);
                this.curStroke.push(this.position);
            }
        },
        onPointerUp(event) {
            this.action = ACTION.NONE;
            this.clearEraseTooltip();

            this.strokes.push(this.curStroke);
            this.curStroke = [];
        },
        undo() {
            // Delete last stroke, and replay everything back
            this.strokes.pop();
            this.context.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
            this.drawInitialImage();
            this.redrawStrokes();  
        },
        drawInitialImage() {
            if (this.initialImageData == null) return;
            let { width, height } = this.initialImageData;
            let x = Math.floor((this.pixelWidth / 2) - (width / 2));
            let y = Math.floor((this.pixelHeight / 2) - (height / 2));
            this.context.putImageData(this.initialImageData, x, y);
        },
        redrawStrokes() {
            for (let [ { action, ...params }, ...data ] of this.strokes) {
                if (action == ACTION.ERASING) {
                    this.context.globalCompositeOperation = 'destination-out';
                    for (let p of data) {
                        this.erase(p, false);
                    }
                } else if (action == ACTION.DRAWING) {
                    this.context.globalCompositeOperation = 'source-over';
                    this.context.strokeStyle = params.color;
                    for (let i = 1; i < data.length; i ++) {
                        let [ pos1 ] = data[i-1];
                        let [ pos2, width ] = data[i];
                        this.connect(pos1, pos2, width);
                    }
                }
            }
        },
    },
    mounted() {
        this.initialized = false;
        // These update the actual 'width' and 'height' of the canvases,
        // which resets the context. Continue initializing in updated()
        const compStyle = window.getComputedStyle(this.$refs.mainCanvas);

        // Using these values guarantees that event.offset[X|Y] is actually the correct coordinate.
        let borderWidth = parseInt(compStyle.getPropertyValue('border-width').replace('px', ''));
        this.pixelWidth = parseInt(compStyle.getPropertyValue('width').replace('px', '')) - 2 * borderWidth;
        this.pixelHeight = parseInt(compStyle.getPropertyValue('height').replace('px', '')) - 2 * borderWidth;
    },
    updated() {
        if (this.initialized) return;

        const ctx = this.$refs.mainCanvas.getContext('2d');
        const overlay = this.$refs.overlayCanvas.getContext('2d');

        ctx.lineCap = 'butt';
        overlay.strokeStyle = 'black';
        overlay.setLineDash([ 4, 2 ]);
        overlay.lineWidth = 1;

        if (this.image != null && this.image.length > 0) {
            let img = new Image();
            img.src = this.image;

            let x = Math.floor((this.pixelWidth / 2) - (img.width / 2));
            let y = Math.floor((this.pixelHeight / 2) - (img.height / 2));

            img.onload = () => {
                this.context.drawImage(img, x, y);
                // Save this as ImageData for re-drawing later.
                this.initialImageData = this.context.getImageData(x, y, img.width, img.height);
            }
        }

        this.context = ctx;
        this.overlayContext = overlay;
        this.initialized = true;
    }
};
</script>

<style lang="scss" scoped>

.SketchArea-root {
    background: lightgray;
}
.SketchArea-canvas-container {
    > div {
        position: relative;
        width: 100%;
        height: 100%;
    }
}

.SketchArea-toolbar {
    height: 100%;
}

.SketchArea-color-button {
    width: 0.5in;
    height: 0.5in;
}
.SketchArea-eraser-button {
    background-color: lightgray;
    background-image:  repeating-linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%, white),
        repeating-linear-gradient(45deg, white 25%, lightgray 25%, lightgray 75%, white 75%, white);
    background-position: 0 0, 10px 10px;
    background-size: 20px 20px;
}

.SketchArea-undo-button {
    background: url('../assets/undo.svg');
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-position: center;
}
.SketchArea-close-button {
    background: url('../assets/delete.svg');
    background-repeat: no-repeat;
    background-size: 60% 60%;
    background-position: center;
}

.SketchArea-canvas-container canvas {
    position: absolute;
    top: 0; 
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    background-clip: padding-box;
    border: 0.5rem solid transparent;
    border-radius: 1rem;
    background: white;
    touch-action: none;
}

#SketchArea-overlay-canvas {
    background: none;
    pointer-events: none;
}
</style>
