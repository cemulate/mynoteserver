function pixelIndex(imData, x, y, test) {
    return (4 * x) + y * (4 * imData.width);
}

function pixelIsNontrivial(imData, x, y) {
    let i = pixelIndex(imData, x, y);
    let d = imData.data;
    return (d[i] > 0 || d[i+1] > 0 || d[i+2] > 0 || d[i+3] > 0);
}

// Find bounds to "crop to content" for image data from a canvas
function getCropBoundsFromImageData(imData) {
    let { width, height } = imData;
    let minX, maxX, minY, maxY = null;

    for (let y = 0; y < height; y ++) {
        for (let x = 0; x < width; x ++) {
            if (pixelIsNontrivial(imData, x, y)) { minY = y; break; }
        }
        if (minY != null) break;
    }

    // There's nothing on the image
    if (minY == null) return null;

    for (let y = height - 1; y >= 0; y --) {
        for (let x = 0; x < width; x ++) {
            if (pixelIsNontrivial(imData, x, y)) { maxY = y; break; }
        }
        if (maxY != null) break;
    }

    for (let x = 0; x < width; x ++) {
        for (let y = 0; y < height; y ++) {
            if (pixelIsNontrivial(imData, x, y)) { minX = x; break; }
        }
        if (minX != null) break;
    }

    for (let x = width - 1; x >= 0; x --) {
        for (let y = 0; y < height; y ++) {
            if (pixelIsNontrivial(imData, x, y)) { maxX = x; break; }
        }
        if (maxX != null) break;
    }

    // Pad it a little
    return {
        minX: Math.max(minX - 5, 0),
        minY: Math.max(minY - 5, 0),
        maxX: Math.min(maxX + 5, width),
        maxY: Math.min(maxY + 5, height),
    };
}

export { getCropBoundsFromImageData };