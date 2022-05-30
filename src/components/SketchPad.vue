<template>
<canvas ref="canvas" v-bind:width="pixelWidth" v-bind:height="pixelHeight"></canvas>
</template>

<script>
export default {
    data: () => ({
        pixelWidth: 480,
        pixelHeight: 580,
        drawing: false,
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
    },
    methods: {
        getEncodedImage() {
            const c = this.$refs.canvas;
            let dataUrl = c.toDataURL();
            return dataUrl.replace('data:image/png;base64,', '');
        },
    },
    mounted() {
        const c = this.$refs.canvas;
        const ctx = c.getContext('2d');
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.color;

        let lastPosition = null;

        const findPosition = (event, element) => {
            let rect = element.getBoundingClientRect();
            return {
                x: (event.clientX - rect.left) * (this.pixelWidth / rect.width),
                y: (event.clientY - rect.top) * (this.pixelHeight / rect.height),
            };
        };

        const connectPoints = (ctx, a, b) => {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        };

        c.addEventListener('pointerdown', event => {
            event.preventDefault();
            if (this.disabled) return;

            let pos = findPosition(event, event.target);
            lastPosition = pos;
            connectPoints(ctx, pos, pos);
            this.drawing = true;
        });

        c.addEventListener('pointermove', event => {
            event.preventDefault();
            if (this.disabled || !this.drawing) return;
            
            let newPos = findPosition(event, event.target);
            let oldPos = lastPosition != null ? lastPosition : newPos;
            connectPoints(ctx, oldPos, newPos);
            lastPosition = newPos;
        });

        c.addEventListener('pointerup', event => {
            event.preventDefault();
            this.drawing = false;
        });
    },
};
</script>

<style lang="scss" scoped>
canvas {
    border: 1px solid black;
}
</style>
