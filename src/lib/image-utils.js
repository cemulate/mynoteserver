import { getStroke } from 'perfect-freehand';

async function getImageDataURLFromClipboardEvent(event) {
    if (event.clipboardData == null) return null;
    for (let item of event.clipboardData.items) {
        if (item.type.startsWith('image')) {
            event.preventDefault();

            const blob = item.getAsFile();
            const image = new Image();
            image.src = window.URL.createObjectURL(blob);

            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            const c = document.createElement('canvas');
            c.width = image.width;
            c.height = image.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const dataURL = c.toDataURL('image/webp');
            return dataURL;
        }
    }
}

function getFreehandStrokePathFromPoints(rawPoints, freehandOptions) {
    const points = getStroke(rawPoints, freehandOptions);

    const len = points.length;

    if (len < 4) return ``;

    let a = points[0];
    let b = points[1];
    const c = points[2];

    const avg = (a, b) => (a + b) / 2;
    let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} `;
    result += `Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${avg(b[0], c[0]).toFixed(2)},${avg(b[1],c[1]).toFixed(2)} T`;
    for (let i = 2; i < len - 1; i++) {
        a = points[i];
        b = points[i + 1];
        result += `${avg(a[0], b[0]).toFixed(2)},${avg(a[1], b[1]).toFixed(2)} `;
    }
    if (closed) result += 'Z';

    return result;
}

export { getImageDataURLFromClipboardEvent, getFreehandStrokePathFromPoints };
