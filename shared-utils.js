// ========================
// SHARED UTILITIES
// ========================

let canvas, ctx;
let originalImage = null;
let currentImage = null;
let editHistory = [];

let filterState = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    vibrance: 0,
    blur: 0,
    sharpen: 0,
    grayscale: false,
    sepia: false,
    invert: false,
    posterize: false
};

let textProperties = {
    fontSize: 32,
    fontFamily: 'Arial',
    fontColor: '#ffffff',
    bold: false,
    opacity: 1,
    alignment: 'center'
};

let currentTool = null;
let overlayText = '';

// Initialize Canvas
function initCanvas() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
}

// Clamp value between 0-255
function clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

// Apply all filters
function applyFilters() {
    if (!originalImage) return;
    editHistory.push(currentImage);

    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i], g = data[i + 1], b = data[i + 2];

            // Brightness
            r += filterState.brightness;
            g += filterState.brightness;
            b += filterState.brightness;

            // Contrast
            if (filterState.contrast !== 0) {
                const factor = (259 * (filterState.contrast + 255)) / (255 * (259 - filterState.contrast));
                r = factor * (r - 128) + 128;
                g = factor * (g - 128) + 128;
                b = factor * (b - 128) + 128;
            }

            // Saturation
            if (filterState.saturation !== 0) {
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                r = gray + (r - gray) * (1 + filterState.saturation / 100);
                g = gray + (g - gray) * (1 + filterState.saturation / 100);
                b = gray + (b - gray) * (1 + filterState.saturation / 100);
            }

            // Grayscale
            if (filterState.grayscale) {
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                r = g = b = gray;
            }

            // Sepia
            if (filterState.sepia) {
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                r = gray * 0.957;
                g = gray * 0.769;
                b = gray * 0.594;
            }

            // Invert
            if (filterState.invert) {
                r = 255 - r;
                g = 255 - g;
                b = 255 - b;
            }

            data[i] = clamp(r);
            data[i + 1] = clamp(g);
            data[i + 2] = clamp(b);
        }

        ctx.putImageData(imageData, 0, 0);
        if (overlayText) drawTextOverlay(overlayText);
        currentImage = canvas.toDataURL();
    };
    img.src = originalImage;
}

// Draw text overlay
function drawTextOverlay(text) {
    if (!text) return;
    ctx.globalAlpha = textProperties.opacity;
    ctx.font = `${textProperties.bold ? 'bold ' : ''}${textProperties.fontSize}px ${textProperties.fontFamily}`;
    ctx.fillStyle = textProperties.fontColor;
    ctx.textAlign = textProperties.alignment;
    ctx.textBaseline = 'middle';

    let x = textProperties.alignment === 'left' ? 30 : 
            textProperties.alignment === 'right' ? canvas.width - 30 : 
            canvas.width / 2;
    const y = canvas.height / 2;

    ctx.strokeStyle = textProperties.fontColor === '#ffffff' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
}

// Reset all filters
function resetFilters() {
    filterState = {
        brightness: 0, contrast: 0, saturation: 0, hue: 0, vibrance: 0,
        blur: 0, sharpen: 0, grayscale: false, sepia: false, invert: false, posterize: false
    };
    overlayText = '';
}

// Download image
function downloadImage(format = 'png') {
    if (!currentImage) return alert('No image to download');
    const link = document.createElement('a');
    let mimeType = 'image/png';
    let filename = 'smart-editor.png';

    if (format === 'jpg') {
        mimeType = 'image/jpeg';
        filename = 'smart-editor.jpg';
    } else if (format === 'webp') {
        mimeType = 'image/webp';
        filename = 'smart-editor.webp';
    }

    link.href = canvas.toDataURL(mimeType);
    link.download = filename;
    link.click();
}

// Load image
function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            originalImage = canvas.toDataURL();
            currentImage = canvas.toDataURL();
            editHistory = [];
            resetFilters();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Apply preset
function applyPreset(preset) {
    resetFilters();
    switch(preset) {
        case 'bw':
            filterState.grayscale = true;
            break;
        case 'sepia':
            filterState.sepia = true;
            break;
        case 'vivid':
            filterState.brightness = 10;
            filterState.contrast = 30;
            filterState.saturation = 40;
            break;
        case 'cool':
            filterState.saturation = -10;
            break;
        case 'warm':
            filterState.saturation = 10;
            break;
        case 'faded':
            filterState.brightness = 15;
            filterState.contrast = -20;
            filterState.saturation = -30;
            break;
    }
    applyFilters();
}

// Apply smart tool
function applySmartTool(tool) {
    resetFilters();
    switch(tool) {
        case 'meme':
            filterState.brightness = 10;
            filterState.contrast = 40;
            filterState.saturation = 30;
            break;
        case 'study':
            filterState.brightness = 20;
            filterState.contrast = 25;
            filterState.saturation = -40;
            filterState.grayscale = true;
            break;
        case 'social':
            filterState.brightness = 5;
            filterState.contrast = 30;
            filterState.saturation = 40;
            break;
        case 'thumbnail':
            filterState.contrast = 35;
            filterState.saturation = 50;
            filterState.brightness = 10;
            break;
    }
    applyFilters();
}

// Rotate image
function rotateImage(degrees) {
    if (!originalImage) return;
    editHistory.push(currentImage);

    const img = new Image();
    img.onload = () => {
        const newCanvas = document.createElement('canvas');
        const newCtx = newCanvas.getContext('2d');

        if (Math.abs(degrees % 180) === 90) {
            newCanvas.width = canvas.height;
            newCanvas.height = canvas.width;
        } else {
            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height;
        }

        newCtx.translate(newCanvas.width / 2, newCanvas.height / 2);
        newCtx.rotate((degrees * Math.PI) / 180);
        newCtx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.width = newCanvas.width;
        canvas.height = newCanvas.height;
        ctx.drawImage(newCanvas, 0, 0);

        originalImage = canvas.toDataURL();
        currentImage = canvas.toDataURL();
        applyFilters();
    };
    img.src = originalImage;
}

// Flip image
function flipImage(direction) {
    if (!originalImage) return;
    editHistory.push(currentImage);

    const img = new Image();
    img.onload = () => {
        ctx.save();
        if (direction === 'h') {
            ctx.scale(-1, 1);
            ctx.drawImage(img, -canvas.width, 0);
        } else {
            ctx.scale(1, -1);
            ctx.drawImage(img, 0, -canvas.height);
        }
        ctx.restore();
        originalImage = canvas.toDataURL();
        currentImage = canvas.toDataURL();
        applyFilters();
    };
    img.src = originalImage;
}

// Crop image
function cropImage(width, height) {
    if (!originalImage || !width || !height) return alert('Please enter valid dimensions');
    editHistory.push(currentImage);

    const img = new Image();
    img.onload = () => {
        canvas.width = width;
        canvas.height = height;

        const cropX = (img.width - width) / 2;
        const cropY = (img.height - height) / 2;

        ctx.drawImage(img, cropX, cropY, width, height, 0, 0, width, height);
        originalImage = canvas.toDataURL();
        currentImage = canvas.toDataURL();
        resetFilters();
        applyFilters();
    };
    img.src = originalImage;
}
