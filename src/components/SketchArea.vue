<template>
<canvas id="sketch-area-canvas" ref="canvas" v-bind:width="pixelWidth" v-bind:height="pixelHeight"></canvas>
</template>

<script>
import { toRaw } from 'vue';

export default {
    data: () => ({
        initialized: false,
        pixelWidth: 480,
        pixelHeight: 580,
        drawing: false,

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
        disabled: {
            type: Boolean,
            default: false,
        },
        image: {
            type: String,
            default: '',
        }
    },
    methods: {
        getImage() {
            const c = this.$refs.canvas;
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
        const c = this.$refs.canvas;

        const compStyle = window.getComputedStyle(c);
        this.pixelWidth = parseInt(compStyle.getPropertyValue('width').replace('px', ''));
        this.pixelHeight = parseInt(compStyle.getPropertyValue('height').replace('px', ''));
    },
    updated() {
        const c = this.$refs.canvas;

        const ctx = c.getContext('2d');
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.color;

        const lineWidthFromEvent = (event) => {
            if (event.pressure != 0) {
                return 1 + 2 * event.pressure;
            } else {
                return 3;
            }
        }

        c.addEventListener('pointerdown', event => {
            event.preventDefault();
            if (this.disabled) return;

            this.updatePosition(event);
            this.updateBounds();

            this.drawing = true;
        });

        c.addEventListener('pointermove', event => {
            event.preventDefault();
            if (this.disabled || !this.drawing) return;
            
            let oldPos = toRaw(this.position);
            this.updatePosition(event);
            this.updateBounds();

            let ctx = this.$refs.canvas.getContext('2d');
            ctx.lineWidth = lineWidthFromEvent(event);
            let { x: x1, y: y1 } = oldPos != null ? oldPos : this.position;
            let { x: x2, y: y2 } = this.position;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        });

        c.addEventListener('pointerup', event => {
            event.preventDefault();
            this.drawing = false;
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
#sketch-area-canvas {
    touch-action: none;
}
</style>
