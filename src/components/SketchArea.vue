<template>
<div class="sketch-area-root">
    <div>
        <div class="canvas-container">
            <canvas id="main-canvas" ref="mainCanvas"
                :width="pixelWidth"
                :height="pixelHeight"
                @pointerdown.prevent="onPointerDown"
                @pointermove.prevent="onPointerMove"
                @pointerup.prevent="onPointerUp"
            />
            <canvas id="overlay-canvas" ref="overlayCanvas" :width="pixelWidth" :height="pixelHeight"></canvas>
        </div>
    </div>
    <div>
        <div class="toolbar">
            <a class="box color-button"
                v-for="c in normalColors"
                :style="{ 'background': c, 'border': c == color ? '3px solid white' : 'none' }"
                @click="color = c"
            />
            <a class="box color-button eraser-button" 
                :style="{ 'border': color == 'ERASER' ? '3px solid black' : 'none' }"
                @click="color = 'ERASER'"
            />
            <div class="is-flex-grow-1"></div>
            <a class="close-button" @click="$emit('close')"></a>
        </div>
    </div>
</div>
</template>

<script>
import { toRaw } from 'vue';

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
        drawingBounds: {
            minX: 480 + 1,
            minY: 580 + 1,
            maxX: -1,
            maxY: -1,
        },
    }),
    props: {
        neutralEraserRadius: {
            type: Number,
            default: 40,
        },
        lineWidthRange: {
            type: Array,
            default: [1, 4],
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
            const c = this.$refs.mainCanvas;
            const ctx = c.getContext('2d');

            // In this case, the canvas was never drawn on.
            if (this.drawingBounds.maxX < 0) return null;

            let width = this.drawingBounds.maxX - this.drawingBounds.minX;
            let height = this.drawingBounds.maxY - this.drawingBounds.minY;

            let crop = ctx.getImageData(this.drawingBounds.minX, this.drawingBounds.minY, width, height);

            let dest = document.createElement('canvas');
            dest.width = width;
            dest.height = height;
            const destCtx = dest.getContext('2d');
            destCtx.putImageData(crop, 0, 0);

            return dest.toDataURL('image/webp');
        },
        updatePosition(event) {
            let rect = event.target.getBoundingClientRect();
            this.position = {
                x: (event.clientX - rect.left) * (this.pixelWidth / rect.width),
                y: (event.clientY - rect.top) * (this.pixelHeight / rect.height),
            };
        },
        updateBounds() {
            if (this.position == null) return;
            this.drawingBounds.minX = Math.min(this.drawingBounds.minX, Math.max(0, this.position.x - 5));
            this.drawingBounds.minY = Math.min(this.drawingBounds.minY, Math.max(0, this.position.y - 5));
            this.drawingBounds.maxX = Math.max(this.drawingBounds.maxX, Math.min(this.pixelWidth, this.position.x + 5));
            this.drawingBounds.maxY = Math.max(this.drawingBounds.maxY, Math.min(this.pixelHeight, this.position.y + 5));
        },
        lineWidthFromEvent(event) {
            const [ min, max ] = this.lineWidthRange;
            if (event.pressure == 0) return (min + max) / 2;
            
            return min + (max - min) * event.pressure;
        },
        erase(pos) {
            const ctx = this.$refs.mainCanvas.getContext('2d');
            const overlay = this.$refs.overlayCanvas.getContext('2d');

            let { x, y } = pos;
            let r = this.neutralEraserRadius;

            overlay.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
            overlay.beginPath(); overlay.ellipse(x, y, r, r, 0, 0, 2 * Math.PI); overlay.stroke();

            ctx.beginPath(); ctx.ellipse(x, y, r, r, 0, 0, 2 * Math.PI); ctx.fill();
        },
        clearEraseTooltip() {
            const overlay = this.$refs.overlayCanvas.getContext('2d');
            overlay.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
        },
        connect(pos1, pos2, lineWidth) {
            const ctx = this.$refs.mainCanvas.getContext('2d');
            ctx.lineWidth = lineWidth; ctx.strokeStyle = this.color;
            let { x: x1, y: y1 } = pos1 != null ? pos1 : pos2;
            let { x: x2, y: y2 } = pos2;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        },
        onPointerDown(event) {
            if (this.disabled) return;
            const ctx = this.$refs.mainCanvas.getContext('2d');

            this.updatePosition(event);
            this.updateBounds();

            if (event.buttons == BUTTONS_ERASER || this.color == 'ERASER') {
                this.action = ACTION.ERASING;
                ctx.globalCompositeOperation = 'destination-out';
                this.erase(this.position);
            } else {
                this.action = ACTION.DRAWING;
                ctx.globalCompositeOperation = 'source-over';
            }
        },
        onPointerMove(event) {
            if (this.disabled || this.action == ACTION.NONE) return;
            
            let oldPos = toRaw(this.position);
            this.updatePosition(event);
            this.updateBounds();

            if (this.action == ACTION.DRAWING) {
                this.connect(oldPos, this.position, this.lineWidthFromEvent(event));
            } else {
                this.erase(this.position);
            }
        },
        onPointerUp(event) {
            this.action = ACTION.NONE;
            this.clearEraseTooltip();
        },
    },
    mounted() {
        this.initialized = false;
        // After these are set, continue initializing canvas in updated()
        const compStyle = window.getComputedStyle(this.$refs.mainCanvas);
        this.pixelWidth = parseInt(compStyle.getPropertyValue('width').replace('px', ''));
        this.pixelHeight = parseInt(compStyle.getPropertyValue('height').replace('px', ''));
    },
    updated() {
        if (this.initialized) return;

        const ctx = this.$refs.mainCanvas.getContext('2d');
        const overlay = this.$refs.overlayCanvas.getContext('2d');

        ctx.lineCap = 'round';
        overlay.strokeStyle = 'black';
        overlay.setLineDash([ 4, 2 ]);
        overlay.lineWidth = 1;

        if (this.image != null && this.image.length > 0) {
            let img = new Image();
            img.src = this.image;

            let x = Math.floor((this.pixelWidth / 2) - (img.width / 2));
            let y = Math.floor((this.pixelHeight / 2) - (img.height / 2));
            
            this.drawingBounds = { minX: x, minY: y, maxX: x + img.width, maxY: y + img.height };

            img.onload = () => ctx.drawImage(img, x, y);
        }

        this.initialized = true;
    }
};
</script>

<style lang="scss" scoped>
.sketch-area-root {
    display: flex;
    flex-direction: row;

    > :first-child {
        flex-grow: 1;
        background: lightgray;
        padding: 0.5rem;

        > .canvas-container {
            position: relative;
            width: 100%;
            height: 100%;
        }
    }

    > :last-child {
        flex-grow: 0;
        
        background: lightgray;

        > .toolbar {
            padding: 0.5rem 0.5rem 0.5rem 0;
            height: 100%;

            display: flex;
            align-items: center;
            flex-direction: column;
        }
    }
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

.close-button {
    width: 0.4in;
    height: 0.4in;
    border: 0px solid transparent;
    border-radius: 10px;
    background-color: lightgray;
    /* A very cursed 'X' close button */
    /* 0.566 = diagonal length = d, 0.255 = 0.45d, 0.311 = 0.55d */
    background: repeating-linear-gradient( -45deg, transparent 0 0.255in, black 0.255in 0.311in, transparent 0.311in 0.566in ),
        repeating-linear-gradient( 45deg, transparent 0 0.255in, black 0.255in 0.311in, transparent 0.311in 0.566in ),
}

.canvas-container canvas {
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

#overlay-canvas {
    background: none;
    pointer-events: none;
}
</style>
