// ============================================================================
// SMART MODES - COMPLETE CANVAS-BASED IMAGE PROCESSING IMPLEMENTATION
// ============================================================================

// ============================================================================
// 1. UTILITY FUNCTIONS - Color Space Conversion
// ============================================================================

function rgbToHsv(r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    
    let h = 0;
    if (d !== 0) {
        if (max === r) h = 60 * (((g - b) / d + 6) % 6);
        else if (max === g) h = 60 * ((b - r) / d + 2);
        else h = 60 * ((r - g) / d + 4);
    }
    
    const s = max === 0 ? 0 : d / max;
    const v = max;
    
    return {h: h || 0, s, v};
}

function hsvToRgb(h, s, v) {
    const c = v * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs(hp % 2 - 1));
    
    let r = 0, g = 0, b = 0;
    if (hp >= 0 && hp < 1) {r = c; g = x; b = 0;}
    else if (hp >= 1 && hp < 2) {r = x; g = c; b = 0;}
    else if (hp >= 2 && hp < 3) {r = 0; g = c; b = x;}
    else if (hp >= 3 && hp < 4) {r = 0; g = x; b = c;}
    else if (hp >= 4 && hp < 5) {r = x; g = 0; b = c;}
    else {r = c; g = 0; b = x;}
    
    const m = v - c;
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

function rgbToGray(r, g, b) {
    // Luminosity method
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ============================================================================
// 2. GAUSSIAN BLUR - Used for Sharpening and Vignetting
// ============================================================================

function createGaussianKernel(radius) {
    const kernel = [];
    const sigma = radius / 2;
    const size = radius * 2 + 1;
    
    let sum = 0;
    for (let y = 0; y < size; y++) {
        kernel[y] = [];
        for (let x = 0; x < size; x++) {
            const dx = x - radius;
            const dy = y - radius;
            const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
            kernel[y][x] = value;
            sum += value;
        }
    }
    
    // Normalize
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            kernel[y][x] /= sum;
        }
    }
    
    return kernel;
}

function gaussianBlur(imageData, width, height, radius) {
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    const kernel = createGaussianKernel(Math.floor(radius));
    const ksize = kernel.length;
    const koffset = Math.floor(ksize / 2);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            
            for (let ky = 0; ky < ksize; ky++) {
                for (let kx = 0; kx < ksize; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx - koffset));
                    const py = Math.min(height - 1, Math.max(0, y + ky - koffset));
                    const idx = (py * width + px) * 4;
                    const weight = kernel[ky][kx];
                    
                    r += data[idx] * weight;
                    g += data[idx + 1] * weight;
                    b += data[idx + 2] * weight;
                    a += data[idx + 3] * weight;
                }
            }
            
            const idx = (y * width + x) * 4;
            newData[idx] = r;
            newData[idx + 1] = g;
            newData[idx + 2] = b;
            newData[idx + 3] = a;
        }
    }
    
    return {data: newData, width, height};
}

// ============================================================================
// 3. UNSHARP MASK - Sharpening Algorithm
// ============================================================================

function unsharpMask(imageData, width, height, amount = 0.5, radius = 1) {
    const data = imageData.data;
    const blurred = gaussianBlur(imageData, width, height, radius);
    const blurredData = blurred.data;
    
    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            const original = data[i + j];
            const blur = blurredData[i + j];
            const difference = original - blur;
            
            data[i + j] = Math.min(255, Math.max(0, original + difference * amount));
        }
    }
}

// ============================================================================
// 4. STUDY NOTES MODE
// ============================================================================

function contrastStretch(data, amount) {
    // Find min and max values
    let min = 255, max = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i+1] + data[i+2]) / 3;
        min = Math.min(min, gray);
        max = Math.max(max, gray);
    }
    
    const range = max - min || 1;
    const factor = amount / 50;
    
    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            let pixel = data[i + j];
            pixel = ((pixel - min) / range) * 255 * factor;
            data[i + j] = Math.min(255, Math.max(0, pixel));
        }
    }
}

function localHistogramEqualization(imageData, width, height, blockSize = 16) {
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    for (let by = 0; by < height; by += blockSize) {
        for (let bx = 0; bx < width; bx += blockSize) {
            // Get block boundaries
            const x1 = bx;
            const y1 = by;
            const x2 = Math.min(bx + blockSize, width);
            const y2 = Math.min(by + blockSize, height);
            
            // Calculate histogram for block
            const histogram = new Uint32Array(256);
            for (let y = y1; y < y2; y++) {
                for (let x = x1; x < x2; x++) {
                    const idx = (y * width + x) * 4;
                    const gray = Math.round((data[idx] + data[idx+1] + data[idx+2]) / 3);
                    histogram[gray]++;
                }
            }
            
            // Calculate CDF (Cumulative Distribution Function)
            const cdf = new Float32Array(256);
            let sum = 0;
            const pixelCount = (x2 - x1) * (y2 - y1);
            for (let i = 0; i < 256; i++) {
                sum += histogram[i];
                cdf[i] = (sum / pixelCount) * 255;
            }
            
            // Apply equalization to block
            for (let y = y1; y < y2; y++) {
                for (let x = x1; x < x2; x++) {
                    const idx = (y * width + x) * 4;
                    const gray = Math.round((data[idx] + data[idx+1] + data[idx+2]) / 3);
                    const newGray = cdf[gray];
                    
                    newData[idx] = newData[idx+1] = newData[idx+2] = newGray;
                }
            }
        }
    }
    
    return newData;
}

function applyStudyNotesMode(canvas, settings) {
    const ctx = canvas.getContext('2d');
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    
    // Auto-brightness detection if brightness is 0
    let brightnessAdjust = settings.brightness;
    if (brightnessAdjust === 0) {
        brightnessAdjust = detectOptimalBrightness(data);
        console.log('Auto-detected optimal brightness:', brightnessAdjust);
    }
    
    // SIMPLE, CLEAN APPROACH - No artifacts:
    // Step 1: Apply brightness
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + brightnessAdjust));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + brightnessAdjust));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + brightnessAdjust));
    }
    
    // Step 2: Apply contrast stretching (simple linear)
    const contrastFactor = (settings.contrast - 50) / 50;
    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            let pixel = data[i + j];
            pixel = (pixel - 128) * (1 + contrastFactor * 0.02) + 128;
            data[i + j] = Math.min(255, Math.max(0, pixel));
        }
    }
    
    // Step 3: Selective desaturation of noise (reduce color noise)
    if (settings.noise > 0) {
        const noiseThreshold = (100 - settings.noise) * 2.55; // 0-255
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            const colorVariance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
            
            // If color variance is low (likely noise), convert toward grayscale
            if (colorVariance < noiseThreshold * 0.5) {
                const gray = (r + g + b) / 3;
                const ratio = settings.noise / 100;
                data[i] = Math.round(r * (1 - ratio * 0.3) + gray * (ratio * 0.3));
                data[i+1] = Math.round(g * (1 - ratio * 0.3) + gray * (ratio * 0.3));
                data[i+2] = Math.round(b * (1 - ratio * 0.3) + gray * (ratio * 0.3));
            }
        }
    }
    
    // Step 4: Moderate sharpening only
    if (settings.clarity > 0) {
        const tempImageData = ctx.createImageData(canvas.width, canvas.height);
        tempImageData.data.set(data);
        unsharpMask(tempImageData, canvas.width, canvas.height, settings.clarity / 100 * 0.5, 0.3);
        data = tempImageData.data;
    }
    
    // Put back
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
}


function detectOptimalBrightness(data) {
    let totalBrightness = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
        pixelCount++;
    }
    
    const avgBrightness = totalBrightness / pixelCount;
    
    // If too dark (below 100), brighten it
    if (avgBrightness < 100) {
        return Math.floor((100 - avgBrightness) * 0.3);
    }
    // If too bright (above 180), darken it slightly
    else if (avgBrightness > 180) {
        return Math.floor((180 - avgBrightness) * 0.2);
    }
    
    // Otherwise, keep as is
    return 0;
}

function simpleNoiseReduction(data, width, height, radius = 1) {
    const newData = new Uint8ClampedArray(data);
    
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            const idx = (y * width + x) * 4;
            
            for (let c = 0; c < 3; c++) {
                const values = [];
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const pidx = ((y + dy) * width + (x + dx)) * 4 + c;
                        values.push(data[pidx]);
                    }
                }
                
                values.sort((a, b) => a - b);
                const median = values[Math.floor(values.length / 2)];
                newData[idx + c] = median;
            }
        }
    }
    
    return newData;
}

// ============================================================================
// 5. THUMBNAIL MODE
// ============================================================================

function createSCurve(intensity) {
    const curve = new Uint8ClampedArray(256);
    for (let x = 0; x < 256; x++) {
        let normalized = x / 255;
        const k = intensity / 10;
        normalized = 1 / (1 + Math.exp(-k * (normalized - 0.5)));
        curve[x] = Math.round(normalized * 255);
    }
    return curve;
}

function thumbnailContrast(data, amount) {
    const curve = createSCurve(amount);
    
    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            data[i + j] = curve[data[i + j]];
        }
    }
}

function applyVibrance(data, amount) {
    for (let i = 0; i < data.length; i += 4) {
        const {h, s, v} = rgbToHsv(data[i], data[i+1], data[i+2]);
        
        // Selective saturation boost
        let newS = s + (amount / 100) * (1 - s);
        
        const sBoost = Math.sin(s * Math.PI) * amount / 100;
        newS = Math.min(1, s + sBoost);
        
        const {r, g, b} = hsvToRgb(h, newS, v);
        data[i] = r;
        data[i+1] = g;
        data[i+2] = b;
    }
}

function applyVignette(data, width, height, strength) {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    
    for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let vignette = 1 - (distance / maxDistance);
        vignette = Math.pow(vignette, strength / 20);
        
        for (let j = 0; j < 3; j++) {
            data[i + j] *= vignette;
        }
    }
}

function applyExposure(data, exposureValue) {
    if (exposureValue === 0) return;
    
    const factor = 1 + (exposureValue / 100);
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * factor);     // R
        data[i + 1] = Math.min(255, data[i + 1] * factor); // G
        data[i + 2] = Math.min(255, data[i + 2] * factor); // B
    }
}

function renderThumbnailText(canvas, text, options) {
    if (!text || text.trim() === '') return;
    
    const ctx = canvas.getContext('2d');
    const fontSize = options.textSize || 48;
    const color = options.textColor || '#FFFFFF';
    const position = options.textPosition || 'center';
    const padding = 20;
    
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    
    // Add shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    let x = canvas.width / 2;
    let y = canvas.height / 2;
    
    switch(position) {
        case 'top-center':
            y = padding + fontSize / 2;
            break;
        case 'top-left':
            ctx.textAlign = 'left';
            x = padding;
            y = padding + fontSize / 2;
            break;
        case 'top-right':
            ctx.textAlign = 'right';
            x = canvas.width - padding;
            y = padding + fontSize / 2;
            break;
        case 'center':
            break;
        case 'bottom-center':
            y = canvas.height - padding - fontSize / 2;
            break;
        case 'bottom-left':
            ctx.textAlign = 'left';
            x = padding;
            y = canvas.height - padding - fontSize / 2;
            break;
        case 'bottom-right':
            ctx.textAlign = 'right';
            x = canvas.width - padding;
            y = canvas.height - padding - fontSize / 2;
            break;
    }
    
    ctx.fillText(text, x, y);
}

function applyThumbnailMode(canvas, settings) {
    const ctx = canvas.getContext('2d');
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    
    // Step 1: S-curve contrast
    thumbnailContrast(data, settings.enhancement);
    
    // Step 2: Vibrance
    applyVibrance(data, settings.vibrance);
    
    // Step 3: Sharpen
    const tempImageData = ctx.createImageData(canvas.width, canvas.height);
    tempImageData.data.set(data);
    unsharpMask(tempImageData, canvas.width, canvas.height, 0.8, 1);
    data = tempImageData.data;
    
    // Step 4: Vignette (with dynamic strength)
    const vignetteStrength = settings.vignette !== undefined ? settings.vignette : 5;
    applyVignette(data, canvas.width, canvas.height, vignetteStrength);
    
    // Step 5: Exposure adjustment
    if (settings.exposure) {
        applyExposure(data, settings.exposure);
    }
    
    // Put back
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
    
    // Step 6: Text overlay (drawn on top)
    if (settings.textOverlay && settings.textOverlay.trim() !== '') {
        renderThumbnailText(canvas, settings.textOverlay, settings);
    }
}

// ============================================================================
// 6. SOCIAL MEDIA MODE
// ============================================================================

const PLATFORM_RATIOS = {
    instagram: {portrait: 9/16, landscape: 16/9, square: 1/1},
    facebook: {portrait: 4/5, landscape: 16/9, square: 1/1},
    tiktok: {portrait: 9/16, landscape: 16/9, square: 9/16},
    linkedin: {portrait: 4/5, landscape: 1200/627, square: 1/1},
    twitter: {portrait: 3/4, landscape: 16/9, square: 1/1}
};

function fitToAspectRatio(canvas, platform, orientation) {
    const targetRatio = PLATFORM_RATIOS[platform][orientation];
    const currentRatio = canvas.width / canvas.height;
    
    let newWidth = canvas.width;
    let newHeight = canvas.height;
    
    if (currentRatio > targetRatio) {
        newHeight = Math.round(canvas.width / targetRatio);
    } else {
        newWidth = Math.round(canvas.height * targetRatio);
    }
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    
    // Scale image to fill entire new canvas (no padding)
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
}

function applyColorGrading(data, warmth, preset) {
    const presets = {
        warm: {r: 1.1, g: 1.05, b: 0.9},
        cool: {r: 0.9, g: 1.0, b: 1.15},
        vibrant: {r: 1.2, g: 1.0, b: 1.0},
        cinematic: {r: 1.05, g: 0.95, b: 1.1}
    };
    
    const factor = presets[preset] || {r: 1, g: 1, b: 1};
    
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // Apply warmth shift
        if (warmth > 0) {
            r += warmth * 2;
            g += warmth * 0.5;
        } else {
            b -= warmth * 2;
        }
        
        // Apply preset
        r *= factor.r;
        g *= factor.g;
        b *= factor.b;
        
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
    }
}

function toneMapForMobileScreen(data, intensity) {
    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            let pixel = data[i + j];
            const normalized = pixel / 255;
            const adjusted = Math.pow(normalized, 0.85) * 255;
            data[i + j] = pixel + (adjusted - pixel) * (intensity / 100);
        }
    }
}

function applySocialMediaMode(canvas, settings) {
    // Step 1: Fit aspect ratio
    fitToAspectRatio(canvas, settings.platform, settings.orientation);
    
    // Step 2: Get image data
    const ctx = canvas.getContext('2d');
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    
    // Step 3: Color grading
    applyColorGrading(data, settings.warmth, settings.preset);
    
    // Step 4: Sharpen
    const tempImageData = ctx.createImageData(canvas.width, canvas.height);
    tempImageData.data.set(data);
    unsharpMask(tempImageData, canvas.width, canvas.height, 0.6);
    data = tempImageData.data;
    
    // Step 5: Tone map
    toneMapForMobileScreen(data, settings.intensity);
    
    // Put back
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
}

// ============================================================================
// 7. MEME MODE
// ============================================================================

function detectBackgroundBrightness(data, width, height, region = 'top') {
    const sampleHeight = Math.floor(height * 0.2);
    const startY = region === 'top' ? 0 : height - sampleHeight;
    
    let totalBrightness = 0;
    let pixelCount = 0;
    
    for (let y = startY; y < startY + sampleHeight; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            totalBrightness += brightness;
            pixelCount++;
        }
    }
    
    return totalBrightness / pixelCount;
}

function getOptimalTextColor(brightness) {
    return brightness < 128 ? '#FFFFFF' : '#000000';
}

function getOptimalOutlineColor(textColor) {
    return textColor === '#FFFFFF' ? '#000000' : '#FFFFFF';
}

function enhanceForMeme(data, intensity) {
    // Improved enhancement: add saturation, vibrance, contrast, and slight sharpness
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        const {h, s, v} = rgbToHsv(r, g, b);
        
        // Boost saturation more aggressively
        let newS = Math.min(1, s + (intensity / 100) * 0.45);
        
        // Boost vibrance (especially for muted colors)
        let newV = v + (intensity / 100) * 0.25;
        
        // Add contrast: darken darks, lighten lights
        const contrast = (intensity / 100) * 0.35;
        if (newV < 0.5) {
            newV = Math.max(0, newV - contrast);
        } else {
            newV = Math.min(1, newV + contrast);
        }
        
        newV = Math.max(0, Math.min(1, newV));
        
        const {r: newR, g: newG, b: newB} = hsvToRgb(h, newS, newV);
        
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
    }
}

function renderMemeText(canvas, topText, bottomText, fontSize, settings) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Determine text colors based on user settings
    let topTextColor, topOutlineColor, bottomTextColor, bottomOutlineColor;
    
    if (settings && settings.useAutoColor !== false) {
        // Auto detect background colors
        const topBrightness = detectBackgroundBrightness(data, canvas.width, canvas.height, 'top');
        const bottomBrightness = detectBackgroundBrightness(data, canvas.width, canvas.height, 'bottom');
        
        topTextColor = getOptimalTextColor(topBrightness);
        topOutlineColor = getOptimalOutlineColor(topTextColor);
        bottomTextColor = getOptimalTextColor(bottomBrightness);
        bottomOutlineColor = getOptimalOutlineColor(bottomTextColor);
    } else {
        // Use custom color from picker
        const customColor = settings?.textColor || '#FFFFFF';
        topTextColor = customColor;
        bottomTextColor = customColor;
        
        // Determine outline color based on custom color brightness
        const rgb = parseInt(customColor.substring(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        topOutlineColor = brightness > 128 ? '#000000' : '#FFFFFF';
        bottomOutlineColor = brightness > 128 ? '#000000' : '#FFFFFF';
    }
    
    // Use custom font or default to Impact
    const fontFamily = settings?.fontFamily || 'Impact';
    const fontStr = `bold ${fontSize}px ${fontFamily}`;
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'round';
    
    // Top text
    if (topText) {
        const outlineWidth = fontSize / 8;
        ctx.lineWidth = outlineWidth;
        ctx.strokeStyle = topOutlineColor;
        ctx.strokeText(topText, canvas.width / 2, fontSize * 1.5);
        ctx.fillStyle = topTextColor;
        ctx.fillText(topText, canvas.width / 2, fontSize * 1.5);
    }
    
    // Bottom text
    if (bottomText) {
        const outlineWidth = fontSize / 8;
        ctx.lineWidth = outlineWidth;
        ctx.strokeStyle = bottomOutlineColor;
        ctx.strokeText(bottomText, canvas.width / 2, canvas.height - fontSize / 2);
        ctx.fillStyle = bottomTextColor;
        ctx.fillText(bottomText, canvas.width / 2, canvas.height - fontSize / 2);
    }
}

function applyMemeMode(canvas, topText, bottomText, settings) {
    const ctx = canvas.getContext('2d');
    
    // Step 1: Enhance for meme
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    enhanceForMeme(data, settings.enhancement);
    ctx.putImageData(imageData, 0, 0);
    
    // Step 2: Render text
    renderMemeText(canvas, topText, bottomText, settings.fontSize, settings);
}

// Enhanced preview function for live preview (lower intensity for preview)
function enhanceMemePreview(imageData, intensity, scaleFactor = 1) {
    const data = imageData.data;
    const adjustedIntensity = intensity * scaleFactor;
    
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        const {h, s, v} = rgbToHsv(r, g, b);
        
        let newS = Math.min(1, s + (adjustedIntensity / 100) * 0.45);
        let newV = v + (adjustedIntensity / 100) * 0.25;
        
        const contrast = (adjustedIntensity / 100) * 0.35;
        if (newV < 0.5) {
            newV = Math.max(0, newV - contrast);
        } else {
            newV = Math.min(1, newV + contrast);
        }
        
        newV = Math.max(0, Math.min(1, newV));
        
        const {r: newR, g: newG, b: newB} = hsvToRgb(h, newS, newV);
        
        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
    }
}

// Preview text rendering function
function renderMemeTextPreview(canvas, topText, bottomText, settings) {
    const ctx = canvas.getContext('2d');
    
    // Determine text colors
    let topTextColor, topOutlineColor, bottomTextColor, bottomOutlineColor;
    
    if (settings && settings.useAutoColor !== false) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const topBrightness = detectBackgroundBrightness(data, canvas.width, canvas.height, 'top');
        const bottomBrightness = detectBackgroundBrightness(data, canvas.width, canvas.height, 'bottom');
        
        topTextColor = getOptimalTextColor(topBrightness);
        topOutlineColor = getOptimalOutlineColor(topTextColor);
        bottomTextColor = getOptimalTextColor(bottomBrightness);
        bottomOutlineColor = getOptimalOutlineColor(bottomTextColor);
    } else {
        const customColor = settings?.textColor || '#FFFFFF';
        topTextColor = customColor;
        bottomTextColor = customColor;
        
        const rgb = parseInt(customColor.substring(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        topOutlineColor = brightness > 128 ? '#000000' : '#FFFFFF';
        bottomOutlineColor = brightness > 128 ? '#000000' : '#FFFFFF';
    }
    
    const fontFamily = settings?.fontFamily || 'Impact';
    const fontSize = Math.max(settings?.fontSize || 50, canvas.height / 6); // Scale down for preview
    const fontStr = `bold ${fontSize}px ${fontFamily}`;
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'round';
    
    // Top text
    if (topText) {
        const outlineWidth = fontSize / 8;
        ctx.lineWidth = outlineWidth;
        ctx.strokeStyle = topOutlineColor;
        ctx.strokeText(topText, canvas.width / 2, fontSize * 1.5);
        ctx.fillStyle = topTextColor;
        ctx.fillText(topText, canvas.width / 2, fontSize * 1.5);
    }
    
    // Bottom text
    if (bottomText) {
        const outlineWidth = fontSize / 8;
        ctx.lineWidth = outlineWidth;
        ctx.strokeStyle = bottomOutlineColor;
        ctx.strokeText(bottomText, canvas.width / 2, canvas.height - fontSize / 2);
        ctx.fillStyle = bottomTextColor;
        ctx.fillText(bottomText, canvas.width / 2, canvas.height - fontSize / 2);
    }
}

// ============================================================================
// EXPORT FUNCTIONS FOR MAIN APP
// ============================================================================

window.SmartModes = {
    applyStudyNotesMode,
    applyThumbnailMode,
    applySocialMediaMode,
    applyMemeMode,
    enhanceMemePreview,
    renderMemeTextPreview,
    PLATFORM_RATIOS
};
