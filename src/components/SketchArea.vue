<template>
<canvas id="sketch-area-canvas" ref="sketchCanvas" v-bind:width="pixelWidth" v-bind:height="pixelHeight"></canvas>
<canvas id="overlay-canvas" ref="overlayCanvas" v-bind:width="pixelWidth" v-bind:height="pixelHeight"></canvas>
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

        position: null,
        drawingBounds: {
            minX: 480 + 1,
            minY: 580 + 1,
            maxX: -1,
            maxY: -1,
        },
    }),
    props: {
        color: {
            type: String,
            default: 'black',
        },
        neutralEraserRadius: {
            type: Number,
            default: 40,
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
    methods: {
        getImage() {
            const c = this.$refs.sketchCanvas;
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

            return dest.toDataURL();
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
    },
    mounted() {
        // After these are set, continue initializing canvas in updated()
        const compStyle = window.getComputedStyle(this.$refs.sketchCanvas);
        this.pixelWidth = parseInt(compStyle.getPropertyValue('width').replace('px', ''));
        this.pixelHeight = parseInt(compStyle.getPropertyValue('height').replace('px', ''));
    },
    updated() {
        const sketchCanvas = this.$refs.sketchCanvas;
        const overlayCanvas = this.$refs.overlayCanvas;

        const ctx = sketchCanvas.getContext('2d');
        const overlay = overlayCanvas.getContext('2d');

        ctx.lineCap = 'round';
        ctx.strokeStyle = this.color;

        overlay.strokeStyle = 'black';
        overlay.setLineDash([ 4, 2 ]);
        overlay.lineWidth = 1;

        const lineWidthFromEvent = event => {
            if (event.pressure != 0) {
                return 1 + 2 * event.pressure;
            } else {
                return 3;
            }
        };

        const connect = (pos1, pos2, lineWidth) => {
            ctx.lineWidth = lineWidth;
            let { x: x1, y: y1 } = pos1 != null ? pos1 : pos2;
            let { x: x2, y: y2 } = pos2;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        };

        const erase = pos => {
            let { x, y } = pos;
            let r = this.neutralEraserRadius;

            overlay.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
            overlay.beginPath(); overlay.ellipse(x, y, r, r, 0, 0, 2 * Math.PI); overlay.stroke();

            ctx.beginPath(); ctx.ellipse(x, y, r, r, 0, 0, 2 * Math.PI); ctx.fill();
        };

        const clearEraseTooltip = () => {
            overlay.clearRect(0, 0, this.pixelWidth, this.pixelHeight);
        };

        sketchCanvas.addEventListener('pointerdown', event => {
            event.preventDefault();
            if (this.disabled) return;

            this.updatePosition(event);
            this.updateBounds();

            if (event.buttons == BUTTONS_ERASER) {
                this.action = ACTION.ERASING;
                ctx.globalCompositeOperation = 'destination-out';
                erase(this.position);
            } else {
                this.action = ACTION.DRAWING;
                ctx.globalCompositeOperation = 'source-over';
            }
        });

        sketchCanvas.addEventListener('pointermove', event => {
            event.preventDefault();
            if (this.disabled || this.action == ACTION.NONE) return;
            
            let oldPos = toRaw(this.position);
            this.updatePosition(event);
            this.updateBounds();

            if (this.action == ACTION.DRAWING) {
                connect(oldPos, this.position, lineWidthFromEvent(event));
            } else {
                erase(this.position);
            }
        });

        sketchCanvas.addEventListener('pointerup', event => {
            event.preventDefault();
            this.action = ACTION.NONE;
            clearEraseTooltip();
        });

        if (this.image != null && this.image.length > 0) {
            let img = new Image();
            img.src = this.image;

            let x = Math.floor((this.pixelWidth / 2) - (img.width / 2));
            let y = Math.floor((this.pixelHeight / 2) - (img.height / 2));
            
            this.drawingBounds = { minX: x, minY: y, maxX: x + img.width, maxY: y + img.height };

            img.onload = () => ctx.drawImage(img, x, y);
        }
    }
};
</script>

<style lang="scss">
#sketch-area-canvas, #overlay-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
}

#overlay-canvas {
    pointer-events: none;
}
</style>
