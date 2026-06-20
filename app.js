document.addEventListener('DOMContentLoaded', function() {
    console.log('=== Smart Image Editor Initializing ===');
    
    // =============================================
    // STATE VARIABLES
    // =============================================
    let imageLoaded = false;
    let currentImageData = null;
    let originalImageData = null;
    let fullyOriginalImageData = null; // Backup to restore after crop
    
    // Zoom state
    let zoomLevel = 1;
    const minZoom = 0.1;
    const maxZoom = 5;
    const zoomStep = 0.1;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    
    // =============================================
    // DOM ELEMENTS
    // =============================================
    const canvas = document.getElementById('canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const canvasWrapper = document.getElementById('canvasWrapper');
    const landingPage = document.getElementById('landingPage');
    const editorPage = document.getElementById('editorPage');
    const uploadZone = document.getElementById('uploadZone');
    const selectImageBtn = document.getElementById('selectImageBtn');
    const imageInput = document.getElementById('imageInput');
    const backToHome = document.getElementById('backToHome');
    const downloadImage = document.getElementById('downloadImage');
    const authButtons = document.getElementById('authButtons');
    const zoomControls = document.getElementById('zoomControls');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    
    console.log('Canvas:', !!canvas, 'selectImageBtn:', !!selectImageBtn, 'imageInput:', !!imageInput);
    
    // =============================================
    // NAVIGATION & TOOL SELECTION
    // =============================================
    
    // Get all tool panels
    const adjustTool = document.getElementById('adjustTool');
    const effectsTool = document.getElementById('effectsTool');
    const textTool = document.getElementById('textTool');
    const transformTool = document.getElementById('transformTool');
    const memeTool = document.getElementById('memeTool');
    const socialTool = document.getElementById('socialTool');
    const cropToolStandalone = document.getElementById('cropToolStandalone');
    const studyTool = document.getElementById('studyTool');
    const thumbnailTool = document.getElementById('thumbnailTool');
    
    // Get navigation elements
    const headerToolLinks = document.querySelectorAll('.header-tool-link');
    const dropdownLinks = document.querySelectorAll('.dropdown-link');
    const toolsDropdownBtn = document.querySelector('.tools-dropdown-btn');
    const toolsDropdownWrapper = document.querySelector('.tools-dropdown-wrapper');
    
    // =============================================
    // MOBILE MENU TOGGLE
    // =============================================
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const headerNav = document.getElementById('headerNav');
    
    if (mobileMenuToggle && headerNav) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            headerNav.classList.toggle('active');
            document.body.classList.toggle('menu-open');
            mobileMenuToggle.setAttribute('aria-expanded', headerNav.classList.contains('active'));
        });
        
        // Close menu when clicking on a tool link
        headerToolLinks.forEach(link => {
            link.addEventListener('click', function() {
                headerNav.classList.remove('active');
                document.body.classList.remove('menu-open');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.header-wrapper')) {
                headerNav.classList.remove('active');
                document.body.classList.remove('menu-open');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // Function to show/hide tool panels
    function selectTool(toolName) {
        console.log('Selecting tool:', toolName);
        
        // Check if image is loaded
        if (!imageLoaded && toolName !== 'none') {
            alert('Please upload an image first');
            return;
        }
        
        // Hide all tool panels
        const allTools = [adjustTool, effectsTool, textTool, transformTool, memeTool, socialTool, 
                         cropToolStandalone, studyTool, thumbnailTool];
        allTools.forEach(tool => {
            if (tool) tool.style.display = 'none';
        });
        
        // Show selected tool
        switch(toolName) {
            case 'adjust':
                if (adjustTool) adjustTool.style.display = 'block';
                break;
            case 'effects':
                if (effectsTool) effectsTool.style.display = 'block';
                break;
            case 'text':
                if (textTool) textTool.style.display = 'block';
                break;
            case 'transform':
                if (transformTool) transformTool.style.display = 'block';
                break;
            case 'meme':
                if (memeTool) memeTool.style.display = 'block';
                break;
            case 'social':
                if (socialTool) socialTool.style.display = 'block';
                updateSocialPreview();
                break;
            case 'crop':
                if (cropToolStandalone) cropToolStandalone.style.display = 'block';
                break;
            case 'study':
                if (studyTool) studyTool.style.display = 'block';
                break;
            case 'thumbnail':
                if (thumbnailTool) thumbnailTool.style.display = 'block';
                break;
        }
    }
    
    // Handle header navigation link clicks
    headerToolLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tool = this.getAttribute('data-tool');
            selectTool(tool);
            // Close dropdown if open
            if (toolsDropdownWrapper) {
                toolsDropdownWrapper.classList.remove('active');
            }
        });
    });
    
    // Handle MORE TOOLS dropdown button
    if (toolsDropdownBtn && toolsDropdownWrapper) {
        toolsDropdownBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toolsDropdownWrapper.classList.toggle('active');
            console.log('Dropdown toggled');
        });
    }
    
    // Handle dropdown link clicks
    dropdownLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tool = this.getAttribute('data-tool');
            selectTool(tool);
            if (toolsDropdownWrapper) {
                toolsDropdownWrapper.classList.remove('active');
            }
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (toolsDropdownWrapper && !toolsDropdownWrapper.contains(e.target) && 
            toolsDropdownBtn && !toolsDropdownBtn.contains(e.target)) {
            toolsDropdownWrapper.classList.remove('active');
        }
    });
    
    // =============================================
    // IMAGE UPLOAD - FILE INPUT HANDLING
    // =============================================
    
    // Click "Choose Image" button to open file dialog
    if (selectImageBtn && imageInput) {
        selectImageBtn.addEventListener('click', function(e) {
            console.log('Choose Image button clicked');
            e.preventDefault();
            imageInput.click();
        });
    }
    
    // Handle file selection from dialog
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            console.log('File selected from dialog');
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                loadImage(file);
            }
        });
    }
    
    // Drag and drop functionality
    if (uploadZone) {
        uploadZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
        });
        
        uploadZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadZone.style.backgroundColor = '';
        });
        
        uploadZone.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.style.backgroundColor = '';
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                console.log('Image dropped:', file.name);
                loadImage(file);
            }
        });
    }
    
    // =============================================
    // MAIN IMAGE LOADING FUNCTION
    // =============================================
    
    function loadImage(file) {
        console.log('Loading image:', file.name, 'Size:', file.size);
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                console.log('Image loaded to memory:', img.width, 'x', img.height);
                
                // Store image reference
                currentImageData = img;
                imageLoaded = true;
                
                // Set canvas size to match image
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Draw image to canvas
                ctx.drawImage(img, 0, 0);
                console.log('Image drawn to canvas');
                
                // Store original image data for reset functionality
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                fullyOriginalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                console.log('Original image data stored');
                
                // Switch to editor view
                if (landingPage && editorPage) {
                    landingPage.classList.remove('active');
                    editorPage.classList.add('active');
                    if (authButtons) authButtons.style.display = 'none';
                    if (backToHome) backToHome.style.display = 'inline-flex';
                    if (downloadImage) downloadImage.style.display = 'inline-flex';
                    if (zoomControls) zoomControls.style.display = 'flex';
                }
                
                console.log('View switched to editor');
            };
            
            img.onerror = function() {
                console.error('Failed to load image');
                alert('Failed to load image. Please try another file.');
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            console.error('Failed to read file');
            alert('Failed to read file. Please try again.');
        };
        
        reader.readAsDataURL(file);
    }
    
    // =============================================
    // ZOOM & PAN FUNCTIONALITY
    // =============================================
    
    function updateZoomDisplay() {
        if (zoomLevelDisplay) zoomLevelDisplay.textContent = Math.round(zoomLevel * 100) + '%';
    }
    
    function applyZoom() {
        if (!canvas) return;
        canvas.style.transform = `scale(${zoomLevel})`;
        canvas.style.transformOrigin = 'top center';
        updateZoomDisplay();
    }
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            zoomLevel = Math.min(maxZoom, zoomLevel + zoomStep);
            applyZoom();
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            zoomLevel = Math.max(minZoom, zoomLevel - zoomStep);
            applyZoom();
        });
    }
    
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', function() {
            zoomLevel = 1;
            applyZoom();
            if (canvasWrapper) {
                canvasWrapper.scrollLeft = 0;
                canvasWrapper.scrollTop = 0;
            }
        });
    }
    
    // Mouse wheel zoom with Ctrl
    if (canvasWrapper) {
        canvasWrapper.addEventListener('wheel', function(e) {
            if (e.ctrlKey) {
                e.preventDefault();
                const direction = e.deltaY > 0 ? -1 : 1;
                zoomLevel = Math.min(maxZoom, Math.max(minZoom, zoomLevel + (direction * zoomStep)));
                applyZoom();
            }
        }, {passive: false});
    }
    
    // Pan functionality (drag to move around when zoomed)
    if (canvas) {
        canvas.addEventListener('mousedown', function(e) {
            if (zoomLevel > 1) {
                isPanning = true;
                panStartX = e.clientX;
                panStartY = e.clientY;
                canvas.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mousemove', function(e) {
            if (isPanning && canvasWrapper) {
                const dx = panStartX - e.clientX;
                const dy = panStartY - e.clientY;
                canvasWrapper.scrollLeft += dx;
                canvasWrapper.scrollTop += dy;
                panStartX = e.clientX;
                panStartY = e.clientY;
            }
        });
        
        document.addEventListener('mouseup', function() {
            isPanning = false;
            if (canvas && zoomLevel <= 1) {
                canvas.style.cursor = 'default';
            } else if (canvas) {
                canvas.style.cursor = 'grab';
            }
        });
    }
    
    // Keyboard shortcuts for zoom
    document.addEventListener('keydown', function(e) {
        if (imageLoaded) {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    zoomLevel = Math.min(maxZoom, zoomLevel + zoomStep);
                    applyZoom();
                } else if (e.key === '-') {
                    e.preventDefault();
                    zoomLevel = Math.max(minZoom, zoomLevel - zoomStep);
                    applyZoom();
                } else if (e.key === '0') {
                    e.preventDefault();
                    zoomLevel = 1;
                    applyZoom();
                    if (canvasWrapper) {
                        canvasWrapper.scrollLeft = 0;
                        canvasWrapper.scrollTop = 0;
                    }
                }
            }
        }
    });
    
    // =============================================
    // BACK TO HOME
    // =============================================
    
    if (backToHome) {
        backToHome.addEventListener('click', function() {
            console.log('Back to home clicked');
            imageLoaded = false;
            currentImageData = null;
            originalImageData = null;
            zoomLevel = 1;
            applyZoom();
            landingPage.classList.add('active');
            editorPage.classList.remove('active');
            if (authButtons) authButtons.style.display = 'flex';
            backToHome.style.display = 'none';
            downloadImage.style.display = 'none';
            if (zoomControls) zoomControls.style.display = 'none';
        });
    }
    
    // =============================================
    // DOWNLOAD
    // =============================================
    
    if (downloadImage) {
        downloadImage.addEventListener('click', function() {
            console.log('Download clicked');
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'edited-image.png';
            link.click();
        });
    }
    
    // =============================================
    // STUDY NOTES MODE
    // =============================================
    
    const studyContrastSlider = document.getElementById('studyContrastSlider');
    const studyContrastValue = document.getElementById('studyContrastValue');
    const studyClaritySlider = document.getElementById('studyClaritySlider');
    const studyClarityValue = document.getElementById('studyClarityValue');
    const studyNoiseSlider = document.getElementById('studyNoiseSlider');
    const studyNoiseValue = document.getElementById('studyNoiseValue');
    const studyBrightnessSlider = document.getElementById('studyBrightnessSlider');
    const studyBrightnessValue = document.getElementById('studyBrightnessValue');
    const applyStudyMode = document.getElementById('applyStudyMode');
    const resetStudyMode = document.getElementById('resetStudyMode');
    
    if (studyContrastSlider) {
        studyContrastSlider.addEventListener('input', function(e) {
            if (studyContrastValue) studyContrastValue.textContent = e.target.value;
        });
    }
    
    if (studyClaritySlider) {
        studyClaritySlider.addEventListener('input', function(e) {
            if (studyClarityValue) studyClarityValue.textContent = e.target.value;
        });
    }
    
    if (studyNoiseSlider) {
        studyNoiseSlider.addEventListener('input', function(e) {
            if (studyNoiseValue) studyNoiseValue.textContent = e.target.value;
        });
    }
    
    if (studyBrightnessSlider) {
        studyBrightnessSlider.addEventListener('input', function(e) {
            const value = parseInt(e.target.value);
            if (studyBrightnessValue) {
                studyBrightnessValue.textContent = value === 0 ? 'Auto' : value;
            }
        });
    }
    
    if (applyStudyMode) {
        applyStudyMode.addEventListener('click', function() {
            if (!originalImageData) {
                alert('Please upload an image first');
                return;
            }
            
            console.log('Applying Study Notes Mode');
            
            // Restore original
            ctx.putImageData(originalImageData, 0, 0);
            
            // Get settings
            const settings = {
                contrast: parseInt(studyContrastSlider?.value || 50),
                clarity: parseInt(studyClaritySlider?.value || 40),
                noise: parseInt(studyNoiseSlider?.value || 15),
                brightness: parseInt(studyBrightnessSlider?.value || 0)
            };
            
            console.log('Study Notes settings:', settings);
            
            // Apply effect
            if (window.SmartModes && window.SmartModes.applyStudyNotesMode) {
                window.SmartModes.applyStudyNotesMode(canvas, settings);
                console.log('Study Notes Mode applied successfully');
            } else {
                console.error('SmartModes not available');
            }
        });
    }
    
    if (resetStudyMode) {
        resetStudyMode.addEventListener('click', function() {
            if (originalImageData) {
                ctx.putImageData(originalImageData, 0, 0);
                if (studyContrastSlider) studyContrastSlider.value = 50;
                if (studyClaritySlider) studyClaritySlider.value = 40;
                if (studyNoiseSlider) studyNoiseSlider.value = 15;
                if (studyBrightnessSlider) studyBrightnessSlider.value = 0;
                if (studyContrastValue) studyContrastValue.textContent = '50';
                if (studyClarityValue) studyClarityValue.textContent = '40';
                if (studyNoiseValue) studyNoiseValue.textContent = '15';
                if (studyBrightnessValue) studyBrightnessValue.textContent = 'Auto';
                console.log('Study Notes Mode reset');
            }
        });
    }
    
    // =============================================
    // THUMBNAIL MODE
    // =============================================
    
    // THUMBNAIL MODE COMPLETE IMPLEMENTATION
    const thumbEnhanceSlider = document.getElementById('thumbEnhanceSlider');
    const thumbEnhanceValue = document.getElementById('thumbEnhanceValue');
    const thumbVibranceSlider = document.getElementById('thumbVibranceSlider');
    const thumbVibranceValue = document.getElementById('thumbVibranceValue');
    const thumbVignetteSlider = document.getElementById('thumbVignetteSlider');
    const thumbVignetteValue = document.getElementById('thumbVignetteValue');
    const thumbExposureSlider = document.getElementById('thumbExposureSlider');
    const thumbExposureValue = document.getElementById('thumbExposureValue');
    const thumbTextInput = document.getElementById('thumbTextInput');
    const thumbTextPosition = document.getElementById('thumbTextPosition');
    const thumbTextSizeSlider = document.getElementById('thumbTextSizeSlider');
    const thumbTextSizeValue = document.getElementById('thumbTextSizeValue');
    const thumbTextColor = document.getElementById('thumbTextColor');
    const thumbPlatform = document.getElementById('thumbPlatform');
    const thumbPreviewCanvas = document.getElementById('thumbPreviewCanvas');
    const applyThumbnail = document.getElementById('applyThumbnail');
    const resetThumbnail = document.getElementById('resetThumbnail');
    const toggleBeforeAfter = document.getElementById('toggleBeforeAfter');
    
    let thumbnailPreviewCtx = thumbPreviewCanvas ? thumbPreviewCanvas.getContext('2d') : null;
    let showingBeforeAfter = false;
    let beforeAfterCanvas = null;
    let presetValues = {
        default: { enhancement: 60, vibrance: 70, vignette: 5, exposure: 0 },
        gaming: { enhancement: 85, vibrance: 90, vignette: 8, exposure: 10 },
        educational: { enhancement: 70, vibrance: 60, vignette: 3, exposure: 5 },
        professional: { enhancement: 75, vibrance: 65, vignette: 4, exposure: 0 }
    };

    function updateThumbnailPreview() {
        if (!originalImageData || !thumbPreviewCanvas || !thumbnailPreviewCtx) return;
        
        // Create a temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Put original image data
        tempCtx.putImageData(originalImageData, 0, 0);
        
        // Get settings
        const settings = {
            enhancement: parseInt(thumbEnhanceSlider?.value || 60),
            vibrance: parseInt(thumbVibranceSlider?.value || 70),
            vignette: parseInt(thumbVignetteSlider?.value || 5),
            exposure: parseInt(thumbExposureSlider?.value || 0),
            textOverlay: thumbTextInput?.value || '',
            textPosition: thumbTextPosition?.value || 'center',
            textSize: parseInt(thumbTextSizeSlider?.value || 48),
            textColor: thumbTextColor?.value || '#FFFFFF',
            previewScale: 0.25
        };
        
        // Apply thumbnail mode to temp canvas
        if (window.SmartModes && window.SmartModes.applyThumbnailMode) {
            window.SmartModes.applyThumbnailMode(tempCanvas, settings);
        }
        
        // Scale to preview size
        thumbnailPreviewCtx.clearRect(0, 0, thumbPreviewCanvas.width, thumbPreviewCanvas.height);
        thumbnailPreviewCtx.drawImage(tempCanvas, 0, 0, thumbPreviewCanvas.width, thumbPreviewCanvas.height);
    }

    // Preset buttons
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const preset = this.dataset.preset;
            const values = presetValues[preset];
            
            if (thumbEnhanceSlider) {
                thumbEnhanceSlider.value = values.enhancement;
                if (thumbEnhanceValue) thumbEnhanceValue.textContent = values.enhancement;
            }
            if (thumbVibranceSlider) {
                thumbVibranceSlider.value = values.vibrance;
                if (thumbVibranceValue) thumbVibranceValue.textContent = values.vibrance;
            }
            if (thumbVignetteSlider) {
                thumbVignetteSlider.value = values.vignette;
                if (thumbVignetteValue) thumbVignetteValue.textContent = values.vignette;
            }
            if (thumbExposureSlider) {
                thumbExposureSlider.value = values.exposure;
                if (thumbExposureValue) thumbExposureValue.textContent = values.exposure;
            }
            
            presetButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            updateThumbnailPreview();
        });
    });
    
    // All slider event listeners with live preview
    [thumbEnhanceSlider, thumbVibranceSlider, thumbVignetteSlider, thumbExposureSlider].forEach((slider) => {
        if (slider) {
            slider.addEventListener('input', function(e) {
                const value = e.target.value;
                if (slider === thumbEnhanceSlider && thumbEnhanceValue) thumbEnhanceValue.textContent = value;
                else if (slider === thumbVibranceSlider && thumbVibranceValue) thumbVibranceValue.textContent = value;
                else if (slider === thumbVignetteSlider && thumbVignetteValue) thumbVignetteValue.textContent = value;
                else if (slider === thumbExposureSlider && thumbExposureValue) thumbExposureValue.textContent = value;
                
                // Clear active preset when manually adjusting
                presetButtons.forEach(b => b.classList.remove('active'));
                
                updateThumbnailPreview();
            });
        }
    });
    
    // Text input updates
    if (thumbTextInput) {
        thumbTextInput.addEventListener('input', updateThumbnailPreview);
    }
    if (thumbTextPosition) {
        thumbTextPosition.addEventListener('change', updateThumbnailPreview);
    }
    if (thumbTextSizeSlider) {
        thumbTextSizeSlider.addEventListener('input', function(e) {
            if (thumbTextSizeValue) thumbTextSizeValue.textContent = e.target.value;
            updateThumbnailPreview();
        });
    }
    if (thumbTextColor) {
        thumbTextColor.addEventListener('input', updateThumbnailPreview);
    }
    
    // Before/After Toggle
    if (toggleBeforeAfter) {
        toggleBeforeAfter.addEventListener('click', function() {
            if (!originalImageData) {
                alert('Please upload an image first');
                return;
            }
            
            showingBeforeAfter = !showingBeforeAfter;
            
            if (showingBeforeAfter) {
                // Show before (original)
                beforeAfterCanvas = document.createElement('canvas');
                beforeAfterCanvas.width = canvas.width;
                beforeAfterCanvas.height = canvas.height;
                beforeAfterCanvas.getContext('2d').putImageData(originalImageData, 0, 0);
                ctx.putImageData(originalImageData, 0, 0);
                this.textContent = '👁️ Click for After';
            } else {
                // Show after (enhanced)
                updateThumbnailPreview();
                this.textContent = '👁️ Click for Before';
            }
        });
    }
    
    if (applyThumbnail) {
        applyThumbnail.addEventListener('click', function() {
            if (!originalImageData) {
                alert('Please upload an image first');
                return;
            }
            
            console.log('Applying Thumbnail Mode');
            
            // Restore original
            ctx.putImageData(originalImageData, 0, 0);
            
            // Get settings
            const settings = {
                enhancement: parseInt(thumbEnhanceSlider?.value || 60),
                vibrance: parseInt(thumbVibranceSlider?.value || 70),
                vignette: parseInt(thumbVignetteSlider?.value || 5),
                exposure: parseInt(thumbExposureSlider?.value || 0),
                textOverlay: thumbTextInput?.value || '',
                textPosition: thumbTextPosition?.value || 'center',
                textSize: parseInt(thumbTextSizeSlider?.value || 48),
                textColor: thumbTextColor?.value || '#FFFFFF'
            };
            
            console.log('Thumbnail settings:', settings);
            
            // Apply effect
            if (window.SmartModes && window.SmartModes.applyThumbnailMode) {
                window.SmartModes.applyThumbnailMode(canvas, settings);
                console.log('Thumbnail Mode applied successfully');
            }
        });
    }
    
    if (resetThumbnail) {
        resetThumbnail.addEventListener('click', function() {
            if (originalImageData) {
                ctx.putImageData(originalImageData, 0, 0);
                if (thumbEnhanceSlider) thumbEnhanceSlider.value = 60;
                if (thumbVibranceSlider) thumbVibranceSlider.value = 70;
                if (thumbVignetteSlider) thumbVignetteSlider.value = 5;
                if (thumbExposureSlider) thumbExposureSlider.value = 0;
                if (thumbTextInput) thumbTextInput.value = '';
                if (thumbEnhanceValue) thumbEnhanceValue.textContent = '60';
                if (thumbVibranceValue) thumbVibranceValue.textContent = '70';
                if (thumbVignetteValue) thumbVignetteValue.textContent = '5';
                if (thumbExposureValue) thumbExposureValue.textContent = '0';
                if (thumbTextSizeSlider) thumbTextSizeSlider.value = 48;
                if (thumbTextSizeValue) thumbTextSizeValue.textContent = '48';
                presetButtons.forEach(b => b.classList.remove('active'));
                presetButtons[0]?.classList.add('active');
                showingBeforeAfter = false;
                if (toggleBeforeAfter) toggleBeforeAfter.textContent = '👁️ Toggle Before/After';
                console.log('Thumbnail Mode reset');
                updateThumbnailPreview();
            }
        });
    }
    
    // Initialize preview when image loads
    const originalApplyThumbnail = applyThumbnail?.onclick;
    document.addEventListener('imageLoaded', updateThumbnailPreview);
    
    // =============================================
    // SOCIAL MEDIA MODE
    // =============================================
    
    const platformSelect = document.getElementById('socialPlatform');
    const orientationBtns = document.querySelectorAll('.orientation-btn');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const socialIntensitySlider = document.getElementById('socialIntensitySlider');
    const socialIntensityValue = document.getElementById('socialIntensityValue');
    const socialWarmthSlider = document.getElementById('socialWarmthSlider');
    const socialWarmthValue = document.getElementById('socialWarmthValue');
    const applySocial = document.getElementById('applySocial');
    const resetSocial = document.getElementById('resetSocial');
    const socialDimensions = document.getElementById('socialDimensions');
    const socialPreviewCanvas = document.getElementById('socialPreviewCanvas');
    
    // Platform dimensions
    const PLATFORM_DIMENSIONS = {
        instagram: {portrait: {w: 1080, h: 1350}, landscape: {w: 1350, h: 1080}, square: {w: 1080, h: 1080}},
        facebook: {portrait: {w: 1200, h: 1500}, landscape: {w: 1200, h: 628}, square: {w: 1200, h: 1200}},
        tiktok: {portrait: {w: 1080, h: 1920}, landscape: {w: 1920, h: 1080}, square: {w: 1080, h: 1080}},
        linkedin: {portrait: {w: 1200, h: 1500}, landscape: {w: 1200, h: 627}, square: {w: 1200, h: 1200}},
        twitter: {portrait: {w: 1200, h: 1500}, landscape: {w: 1200, h: 675}, square: {w: 1200, h: 1200}}
    };
    
    function updateSocialPreview() {
        if (!originalImageData || !socialPreviewCanvas) return;
        
        const platform = platformSelect?.value || 'instagram';
        const activeOrientation = document.querySelector('.orientation-btn.active');
        const orientation = activeOrientation?.getAttribute('data-orientation') || 'portrait';
        
        const dims = PLATFORM_DIMENSIONS[platform]?.[orientation];
        if (!dims) return;
        
        // Update dimensions display
        if (socialDimensions) {
            socialDimensions.textContent = `${dims.w} × ${dims.h} pixels`;
        }
        
        // Create preview (scaled down for display)
        const prevCtx = socialPreviewCanvas.getContext('2d');
        const scale = Math.min(200 / dims.w, 200 / dims.h);
        socialPreviewCanvas.width = dims.w * scale;
        socialPreviewCanvas.height = dims.h * scale;
        
        // Draw semi-transparent guide
        prevCtx.fillStyle = 'rgba(200, 200, 200, 0.2)';
        prevCtx.fillRect(0, 0, socialPreviewCanvas.width, socialPreviewCanvas.height);
        
        // Draw border
        prevCtx.strokeStyle = '#667eea';
        prevCtx.lineWidth = 2;
        prevCtx.strokeRect(0, 0, socialPreviewCanvas.width, socialPreviewCanvas.height);
        
        // Draw platform name
        prevCtx.fillStyle = '#667eea';
        prevCtx.font = 'bold 12px Arial';
        prevCtx.fillText(`${platform.toUpperCase()} - ${orientation}`, 8, 20);
    }
    
    // Update preview on changes
    if (platformSelect) {
        platformSelect.addEventListener('change', updateSocialPreview);
    }
    
    orientationBtns.forEach(btn => {
        btn.addEventListener('click', updateSocialPreview);
    });
    
    // Set initial active state for orientation and preset buttons
    if (orientationBtns.length > 0) {
        orientationBtns[0]?.classList.add('active');
    }
    if (presetBtns.length > 0) {
        presetBtns[0]?.classList.add('active');
    }
    
    if (socialIntensitySlider) {
        socialIntensitySlider.addEventListener('input', function(e) {
            if (socialIntensityValue) socialIntensityValue.textContent = e.target.value;
        });
    }
    
    if (socialWarmthSlider) {
        socialWarmthSlider.addEventListener('input', function(e) {
            if (socialWarmthValue) socialWarmthValue.textContent = e.target.value;
        });
    }
    
    orientationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            orientationBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    presetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            presetBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    if (applySocial) {
        applySocial.addEventListener('click', function() {
            if (!originalImageData) {
                alert('Please upload an image first');
                return;
            }
            
            console.log('Applying Social Media Mode');
            
            // Restore original
            ctx.putImageData(originalImageData, 0, 0);
            
            // Get settings
            const activeOrientation = document.querySelector('.orientation-btn.active');
            const activePreset = document.querySelector('.preset-btn.active');
            
            const settings = {
                platform: platformSelect?.value || 'instagram',
                orientation: activeOrientation?.getAttribute('data-orientation') || 'square',
                preset: activePreset?.getAttribute('data-preset') || 'warm',
                intensity: parseInt(socialIntensitySlider?.value || 50),
                warmth: parseInt(socialWarmthSlider?.value || 0)
            };
            
            console.log('Social Media settings:', settings);
            
            // Apply effect
            if (window.SmartModes && window.SmartModes.applySocialMediaMode) {
                window.SmartModes.applySocialMediaMode(canvas, settings);
                console.log('Social Media Mode applied successfully');
            }
        });
    }
    
    if (resetSocial) {
        resetSocial.addEventListener('click', function() {
            if (originalImageData) {
                // Reset canvas dimensions to original
                canvas.width = originalImageData.width;
                canvas.height = originalImageData.height;
                // Restore original image
                ctx.putImageData(originalImageData, 0, 0);
                if (platformSelect) platformSelect.value = 'instagram';
                orientationBtns.forEach((btn, idx) => {
                    btn.classList.toggle('active', idx === 0);
                });
                presetBtns.forEach((btn, idx) => {
                    btn.classList.toggle('active', idx === 0);
                });
                if (socialIntensitySlider) socialIntensitySlider.value = 50;
                if (socialWarmthSlider) socialWarmthSlider.value = 0;
                if (socialIntensityValue) socialIntensityValue.textContent = '50';
                if (socialWarmthValue) socialWarmthValue.textContent = '0';
                console.log('Social Media Mode reset');
            }
        });
    }
    
    // =============================================
    // MEME MODE
    // =============================================
    
    const memeTopText = document.getElementById('memeTopText');
    const memeBottomText = document.getElementById('memeBottomText');
    const memeFontFamily = document.getElementById('memeFontFamily');
    const memeTextSizeSlider = document.getElementById('memeTextSizeSlider');
    const memeTextSizeValue = document.getElementById('memeTextSizeValue');
    const memeEnhanceSlider = document.getElementById('memeEnhanceSlider');
    const memeEnhanceValue = document.getElementById('memeEnhanceValue');
    const memeTextColorPicker = document.getElementById('memeTextColorPicker');
    const memeAutoColor = document.getElementById('memeAutoColor');
    const memePreviewCanvas = document.getElementById('memePreviewCanvas');
    const applyMeme = document.getElementById('applyMeme');
    const resetMeme = document.getElementById('resetMeme');
    
    // Set meme preview canvas size
    function updateMemePreviewSize() {
        if (memePreviewCanvas && imageLoaded && canvas.width && canvas.height) {
            const containerWidth = memePreviewCanvas.parentElement.offsetWidth - 4; // Account for border
            memePreviewCanvas.width = containerWidth;
            memePreviewCanvas.height = (canvas.height / canvas.width) * containerWidth;
        }
    }
    
    // Live preview for meme
    function updateMemePreview() {
        if (!memePreviewCanvas || !imageLoaded || !originalImageData) return;
        
        const previewCtx = memePreviewCanvas.getContext('2d');
        if (!previewCtx) return;
        
        updateMemePreviewSize();
        
        // Draw original image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(originalImageData, 0, 0);
        
        // Draw to preview canvas with scaling
        previewCtx.drawImage(tempCanvas, 0, 0, memePreviewCanvas.width, memePreviewCanvas.height);
        
        // Get settings for preview
        const topText = (memeTopText?.value || '').toUpperCase();
        const bottomText = (memeBottomText?.value || '').toUpperCase();
        const fontSize = parseInt(memeTextSizeSlider?.value || 50);
        const useAutoColor = memeAutoColor?.checked !== false;
        const customColor = memeTextColorPicker?.value || '#FFFFFF';
        const fontFamily = memeFontFamily?.value || 'Impact';
        
        const settings = {
            fontSize,
            enhancement: parseInt(memeEnhanceSlider?.value || 60),
            fontFamily,
            useAutoColor,
            textColor: customColor
        };
        
        // Apply light enhancement for preview
        const previewImageData = previewCtx.getImageData(0, 0, memePreviewCanvas.width, memePreviewCanvas.height);
        if (window.SmartModes && window.SmartModes.enhanceMemePreview) {
            window.SmartModes.enhanceMemePreview(previewImageData, settings.enhancement, 0.3); // Scale down intensity for preview
            previewCtx.putImageData(previewImageData, 0, 0);
        }
        
        // Render preview text
        if (window.SmartModes && window.SmartModes.renderMemeTextPreview) {
            window.SmartModes.renderMemeTextPreview(memePreviewCanvas, topText, bottomText, settings);
        }
    }
    
    // Event listeners for real-time preview updates
    if (memeTopText) {
        memeTopText.addEventListener('input', updateMemePreview);
    }
    
    if (memeBottomText) {
        memeBottomText.addEventListener('input', updateMemePreview);
    }
    
    if (memeTextSizeSlider) {
        memeTextSizeSlider.addEventListener('input', function(e) {
            if (memeTextSizeValue) memeTextSizeValue.textContent = e.target.value;
            updateMemePreview();
        });
    }
    
    if (memeEnhanceSlider) {
        memeEnhanceSlider.addEventListener('input', function(e) {
            if (memeEnhanceValue) memeEnhanceValue.textContent = e.target.value;
            updateMemePreview();
        });
    }
    
    if (memeFontFamily) {
        memeFontFamily.addEventListener('change', updateMemePreview);
    }
    
    if (memeTextColorPicker) {
        memeTextColorPicker.addEventListener('change', updateMemePreview);
    }
    
    if (memeAutoColor) {
        memeAutoColor.addEventListener('change', updateMemePreview);
    }
    
    if (applyMeme) {
        applyMeme.addEventListener('click', function() {
            if (!originalImageData) {
                alert('Please upload an image first');
                return;
            }
            
            console.log('Applying Meme Mode');
            
            // Restore original
            ctx.putImageData(originalImageData, 0, 0);
            
            // Get settings
            const topText = (memeTopText?.value || '').toUpperCase();
            const bottomText = (memeBottomText?.value || '').toUpperCase();
            const useAutoColor = memeAutoColor?.checked !== false;
            const customColor = memeTextColorPicker?.value || '#FFFFFF';
            const fontFamily = memeFontFamily?.value || 'Impact';
            
            const settings = {
                fontSize: parseInt(memeTextSizeSlider?.value || 50),
                enhancement: parseInt(memeEnhanceSlider?.value || 60),
                fontFamily,
                useAutoColor,
                textColor: customColor
            };
            
            console.log('Meme settings:', settings, 'Top:', topText, 'Bottom:', bottomText);
            
            // Apply effect
            if (window.SmartModes && window.SmartModes.applyMemeMode) {
                window.SmartModes.applyMemeMode(canvas, topText, bottomText, settings);
                console.log('Meme Mode applied successfully');
            }
            
            // Update preview too
            updateMemePreview();
        });
    }
    
    if (resetMeme) {
        resetMeme.addEventListener('click', function() {
            if (originalImageData) {
                ctx.putImageData(originalImageData, 0, 0);
                if (memeTopText) memeTopText.value = '';
                if (memeBottomText) memeBottomText.value = '';
                if (memeFontFamily) memeFontFamily.value = 'Impact';
                if (memeTextSizeSlider) memeTextSizeSlider.value = 50;
                if (memeEnhanceSlider) memeEnhanceSlider.value = 60;
                if (memeTextColorPicker) memeTextColorPicker.value = '#FFFFFF';
                if (memeAutoColor) memeAutoColor.checked = true;
                if (memeTextSizeValue) memeTextSizeValue.textContent = '50';
                if (memeEnhanceValue) memeEnhanceValue.textContent = '60';
                console.log('Meme Mode reset');
                updateMemePreview();
            }
        });
    }
    
    // Update preview when tool is selected
    const originalSelectTool = window.selectTool;
    if (typeof originalSelectTool !== 'undefined') {
        window.selectTool = function(toolName) {
            originalSelectTool.call(this, toolName);
            if (toolName === 'meme') {
                setTimeout(updateMemePreview, 100);
            }
        };
    }
    
    
    // =============================================
    // ADJUST TOOL HANDLERS
    // =============================================
    
    const brightSlider = document.getElementById('brightSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    const saturSlider = document.getElementById('saturSlider');
    const hueSlider = document.getElementById('hueSlider');
    const vibranceSlider = document.getElementById('vibranceSlider');
    const resetAdjust = document.getElementById('resetAdjust');
    const adjustPresetBtns = document.querySelectorAll('#adjustTool .preset-btn');
    
    // Reusable ImageData for performance (avoid creating new ones constantly)
    let cachedImageData = null;
    
    function initCachedImageData() {
        if (!cachedImageData && canvas.width && canvas.height) {
            cachedImageData = ctx.createImageData(canvas.width, canvas.height);
        }
    }
    
    // Helper: Apply brightness/contrast/saturation adjustments
    function applyColorAdjustments(brightness, contrast, saturation, hue, vibrance) {
        if (!originalImageData) return;
        
        ctx.putImageData(originalImageData, 0, 0);
        initCachedImageData();
        
        // Copy original data to reusable buffer
        const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = srcData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Get RGB
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Apply brightness
            r = Math.min(255, Math.max(0, r + brightness));
            g = Math.min(255, Math.max(0, g + brightness));
            b = Math.min(255, Math.max(0, b + brightness));
            
            // Apply contrast
            if (contrast !== 0) {
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
                g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
                b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
            }
            
            // Convert to HSL for saturation/hue
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2 / 255;
            
            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (510 - max - min) : d / (max + min);
                
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            
            // Apply hue shift
            h = (h + hue / 360) % 1;
            
            // Apply saturation/vibrance
            s = Math.min(1, Math.max(0, s + saturation / 100));
            s = Math.min(1, Math.max(0, s + vibrance / 100));
            
            // Convert back to RGB
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h * 6) % 2 - 1));
            const m = l - c / 2;
            
            let r2 = 0, g2 = 0, b2 = 0;
            if (h < 1/6) { r2 = c; g2 = x; b2 = 0; }
            else if (h < 2/6) { r2 = x; g2 = c; b2 = 0; }
            else if (h < 3/6) { r2 = 0; g2 = c; b2 = x; }
            else if (h < 4/6) { r2 = 0; g2 = x; b2 = c; }
            else if (h < 5/6) { r2 = x; g2 = 0; b2 = c; }
            else { r2 = c; g2 = 0; b2 = x; }
            
            data[i] = Math.round((r2 + m) * 255);
            data[i + 1] = Math.round((g2 + m) * 255);
            data[i + 2] = Math.round((b2 + m) * 255);
        }
        
        ctx.putImageData(srcData, 0, 0);
    }
    
    // Debounce function to reduce event calls
    function createDebounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    }
    
    const debouncedApplyColorAdjustments = createDebounce(() => {
        const br = parseInt(brightSlider?.value || 0);
        const co = parseInt(contrastSlider?.value || 0);
        const sa = parseInt(saturSlider?.value || 0);
        const hu = parseInt(hueSlider?.value || 0);
        const vi = parseInt(vibranceSlider?.value || 0);
        applyColorAdjustments(br, co, sa, hu, vi);
    }, 50);
    
    if (brightSlider) {
        brightSlider.addEventListener('input', function() {
            const br = parseInt(brightSlider.value);
            document.getElementById('brightValue').textContent = br;
            debouncedApplyColorAdjustments();
        });
    }
    
    if (contrastSlider) {
        contrastSlider.addEventListener('input', function() {
            const co = parseInt(contrastSlider.value);
            document.getElementById('contrastValue').textContent = co;
            debouncedApplyColorAdjustments();
        });
    }
    
    if (saturSlider) {
        saturSlider.addEventListener('input', function() {
            const sa = parseInt(saturSlider.value);
            document.getElementById('saturValue').textContent = sa;
            debouncedApplyColorAdjustments();
        });
    }
    
    if (hueSlider) {
        hueSlider.addEventListener('input', function() {
            const hu = parseInt(hueSlider.value);
            document.getElementById('hueValue').textContent = hu;
            debouncedApplyColorAdjustments();
        });
    }
    
    if (vibranceSlider) {
        vibranceSlider.addEventListener('input', function() {
            const vi = parseInt(vibranceSlider.value);
            document.getElementById('vibranceValue').textContent = vi;
            debouncedApplyColorAdjustments();
        });
    }
    
    if (resetAdjust) {
        resetAdjust.addEventListener('click', function() {
            if (originalImageData) {
                ctx.putImageData(originalImageData, 0, 0);
                if (brightSlider) { brightSlider.value = 0; document.getElementById('brightValue').textContent = '0'; }
                if (contrastSlider) { contrastSlider.value = 0; document.getElementById('contrastValue').textContent = '0'; }
                if (saturSlider) { saturSlider.value = 0; document.getElementById('saturValue').textContent = '0'; }
                if (hueSlider) { hueSlider.value = 0; document.getElementById('hueValue').textContent = '0'; }
                if (vibranceSlider) { vibranceSlider.value = 0; document.getElementById('vibranceValue').textContent = '0'; }
                console.log('Adjust tool reset');
            }
        });
    }
    
    // =============================================
    // EFFECTS TOOL HANDLERS
    // =============================================
    
    const blurSlider = document.getElementById('blurSlider');
    const sharpenSlider = document.getElementById('sharpenSlider');
    const grayscaleBtn = document.getElementById('grayscaleBtn');
    const sepiaBtn = document.getElementById('sepiaBtn');
    const invertBtn = document.getElementById('invertBtn');
    const posterizeBtn = document.getElementById('posterizeBtn');
    const resetEffects = document.getElementById('resetEffects');
    
    let effectsState = {
        blur: 0,
        sharpen: 0,
        grayscale: false,
        sepia: false,
        invert: false,
        posterize: false
    };
    
    function applyEffects() {
        if (!originalImageData) return;
        
        ctx.putImageData(originalImageData, 0, 0);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;
        
        // Apply grayscale
        if (effectsState.grayscale) {
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
                data[i] = gray;
                data[i+1] = gray;
                data[i+2] = gray;
            }
        }
        
        // Apply sepia
        if (effectsState.sepia) {
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                data[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                data[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }
        }
        
        // Apply invert
        if (effectsState.invert) {
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i+1] = 255 - data[i+1];
                data[i+2] = 255 - data[i+2];
            }
        }
        
        // Apply posterize
        if (effectsState.posterize) {
            const levels = 4;
            for (let i = 0; i < data.length; i += 4) {
                const step = Math.floor(256 / levels);
                data[i] = Math.floor(data[i] / step) * step;
                data[i+1] = Math.floor(data[i+1] / step) * step;
                data[i+2] = Math.floor(data[i+2] / step) * step;
            }
        }
        
        // Apply blur (fast box blur algorithm)
        if (effectsState.blur > 0) {
            const blurRadius = Math.max(1, Math.ceil(effectsState.blur / 15));
            const w = canvas.width;
            const h = canvas.height;
            
            // Single pass box blur - much faster
            for (let pass = 0; pass < 1; pass++) {
                const temp = new Uint8ClampedArray(data.length);
                
                // Horizontal blur pass
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let r = 0, g = 0, b = 0, count = 0;
                        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                            const nx = Math.max(0, Math.min(w - 1, x + dx));
                            const idx = (y * w + nx) * 4;
                            r += data[idx];
                            g += data[idx + 1];
                            b += data[idx + 2];
                            count++;
                        }
                        const idx = (y * w + x) * 4;
                        temp[idx] = r / count;
                        temp[idx + 1] = g / count;
                        temp[idx + 2] = b / count;
                        temp[idx + 3] = data[idx + 3];
                    }
                }
                
                // Vertical blur pass
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let r = 0, g = 0, b = 0, count = 0;
                        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                            const ny = Math.max(0, Math.min(h - 1, y + dy));
                            const idx = (ny * w + x) * 4;
                            r += temp[idx];
                            g += temp[idx + 1];
                            b += temp[idx + 2];
                            count++;
                        }
                        const idx = (y * w + x) * 4;
                        data[idx] = r / count;
                        data[idx + 1] = g / count;
                        data[idx + 2] = b / count;
                    }
                }
            }
        }
        
        // Apply sharpen (optimized single-pass)
        if (effectsState.sharpen > 0) {
            const sharpenAmount = Math.min(2, effectsState.sharpen / 30);
            const w = canvas.width;
            const h = canvas.height;
            const temp = new Uint8ClampedArray(data);
            
            for (let i = 0; i < data.length; i += 4) {
                const pixelIndex = i / 4;
                const x = pixelIndex % w;
                const y = Math.floor(pixelIndex / w);
                
                if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
                    let r = 0, g = 0, b = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dy !== 0 || dx !== 0) {
                                const idx = ((y + dy) * w + (x + dx)) * 4;
                                r += temp[idx];
                                g += temp[idx + 1];
                                b += temp[idx + 2];
                            }
                        }
                    }
                    const count = 8;
                    data[i] = Math.min(255, Math.max(0, temp[i] * (1 + sharpenAmount) - (r / count) * sharpenAmount));
                    data[i + 1] = Math.min(255, Math.max(0, temp[i + 1] * (1 + sharpenAmount) - (g / count) * sharpenAmount));
                    data[i + 2] = Math.min(255, Math.max(0, temp[i + 2] * (1 + sharpenAmount) - (b / count) * sharpenAmount));
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    // Debounce effects to avoid excessive recalculation
    const debouncedApplyEffects = createDebounce(applyEffects, 50);
    
    if (grayscaleBtn) {
        grayscaleBtn.addEventListener('click', function() {
            effectsState.grayscale = !effectsState.grayscale;
            this.classList.toggle('active', effectsState.grayscale);
            applyEffects();
        });
    }
    
    if (sepiaBtn) {
        sepiaBtn.addEventListener('click', function() {
            effectsState.sepia = !effectsState.sepia;
            this.classList.toggle('active', effectsState.sepia);
            applyEffects();
        });
    }
    
    if (invertBtn) {
        invertBtn.addEventListener('click', function() {
            effectsState.invert = !effectsState.invert;
            this.classList.toggle('active', effectsState.invert);
            applyEffects();
        });
    }
    
    if (posterizeBtn) {
        posterizeBtn.addEventListener('click', function() {
            effectsState.posterize = !effectsState.posterize;
            this.classList.toggle('active', effectsState.posterize);
            applyEffects();
        });
    }
    
    if (blurSlider) {
        blurSlider.addEventListener('input', function() {
            effectsState.blur = parseInt(this.value);
            const blurValue = document.getElementById('blurValue');
            if (blurValue) blurValue.textContent = this.value;
            debouncedApplyEffects();
        });
    }
    
    if (sharpenSlider) {
        sharpenSlider.addEventListener('input', function() {
            effectsState.sharpen = parseInt(this.value);
            const sharpenValue = document.getElementById('sharpenValue');
            if (sharpenValue) sharpenValue.textContent = this.value;
            debouncedApplyEffects();
        });
    }
    
    if (resetEffects) {
        resetEffects.addEventListener('click', function() {
            if (originalImageData) {
                ctx.putImageData(originalImageData, 0, 0);
                effectsState = { blur: 0, sharpen: 0, grayscale: false, sepia: false, invert: false, posterize: false };
                if (blurSlider) { blurSlider.value = 0; document.getElementById('blurValue').textContent = '0'; }
                if (sharpenSlider) { sharpenSlider.value = 0; document.getElementById('sharpenValue').textContent = '0'; }
                [grayscaleBtn, sepiaBtn, invertBtn, posterizeBtn].forEach(btn => {
                    if (btn) btn.classList.remove('active');
                });
                console.log('Effects reset');
            }
        });
    }
    
    // Update blur value display (remove duplicate listener if exists)
    // Already handled in effects tool section above
    
    // =============================================
    // TEXT TOOL HANDLERS
    // =============================================
    
    const textInput = document.getElementById('textInput');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const fontSelect = document.getElementById('fontSelect');
    const textColorPicker = document.getElementById('textColorPicker');
    const alignmentBtns = document.querySelectorAll('#textTool .align-btn');
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    const boldCheck = document.getElementById('boldCheck');
    const addTextBtn = document.getElementById('addTextBtn');
    const clearTextBtn = document.getElementById('clearTextBtn');
    
    let textState = {
        text: '',
        fontSize: 32,
        font: 'Arial',
        color: '#000000',
        alignment: 'center',
        opacity: 1,
        bold: false,
        x: null,
        y: null
    };
    
    let isDraggingText = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', function() {
            textState.fontSize = parseInt(this.value);
            if (fontSizeValue) fontSizeValue.textContent = this.value;
        });
    }
    
    if (fontSelect) {
        fontSelect.addEventListener('change', function() {
            textState.font = this.value;
        });
    }
    
    if (textColorPicker) {
        textColorPicker.addEventListener('change', function() {
            textState.color = this.value;
        });
    }
    
    if (opacitySlider) {
        opacitySlider.addEventListener('input', function() {
            textState.opacity = parseInt(this.value) / 100;
            if (opacityValue) opacityValue.textContent = this.value;
        });
    }
    
    if (boldCheck) {
        boldCheck.addEventListener('change', function() {
            textState.bold = this.checked;
        });
    }
    
    // Set initial alignment to center
    if (alignmentBtns.length > 0) {
        alignmentBtns[1]?.classList.add('active'); // Center button
    }
    
    alignmentBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            alignmentBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            textState.alignment = this.getAttribute('data-align');
        });
    });
    
    if (addTextBtn) {
        addTextBtn.addEventListener('click', function() {
            if (!originalImageData) {
                alert('Please upload an image first');
                return;
            }
            
            if (!textInput || !textInput.value.trim()) {
                alert('Please enter some text');
                return;
            }
            
            console.log('Adding text:', textInput.value);
            ctx.putImageData(originalImageData, 0, 0);
            
            textState.text = textInput.value;
            
            // Set initial position if not already set
            if (textState.x === null || textState.y === null) {
                textState.x = canvas.width / 2;
                textState.y = canvas.height / 2;
            }
            
            redrawTextOnCanvas();
            console.log('Text added at position:', textState.x, textState.y);
        });
    }
    
    function redrawTextOnCanvas() {
        ctx.putImageData(originalImageData, 0, 0);
        
        if (!textState.text) return;
        
        ctx.globalAlpha = textState.opacity;
        ctx.font = `${textState.bold ? 'bold ' : ''}${textState.fontSize}px ${textState.font}`;
        ctx.fillStyle = textState.color;
        ctx.textAlign = textState.alignment;
        ctx.textBaseline = 'middle';
        
        // Add shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(textState.text, textState.x, textState.y);
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'transparent';
    }
    
    // Text dragging functionality - IMPROVED VERSION
    let textHitArea = null;
    
    // Helper function to calculate text hit area
    function getTextHitArea() {
        if (!textState.text) return null;
        
        ctx.font = `${textState.bold ? 'bold ' : ''}${textState.fontSize}px ${textState.font}`;
        const metrics = ctx.measureText(textState.text);
        const textWidth = metrics.width;
        const textHeight = textState.fontSize;
        
        let textLeft = textState.x;
        if (textState.alignment === 'center') textLeft = textState.x - textWidth / 2;
        else if (textState.alignment === 'right') textLeft = textState.x - textWidth;
        
        return {
            left: textLeft,
            right: textLeft + textWidth,
            top: textState.y - textHeight / 2,
            bottom: textState.y + textHeight / 2
        };
    }
    
    canvas.addEventListener('mousemove', function(e) {
        if (!textState.text) {
            canvas.style.cursor = 'default';
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const hitArea = getTextHitArea();
        
        // Check if hovering over text (make it more generous - 30px margin)
        if (hitArea && 
            mouseX >= hitArea.left - 30 && mouseX <= hitArea.right + 30 &&
            mouseY >= hitArea.top - 30 && mouseY <= hitArea.bottom + 30) {
            canvas.style.cursor = isDraggingText ? 'grabbing' : 'grab';
        } else {
            canvas.style.cursor = isDraggingText ? 'grabbing' : 'default';
        }
        
        // If already dragging, update position
        if (isDraggingText) {
            textState.x = mouseX - dragOffsetX;
            textState.y = mouseY - dragOffsetY;
            
            // Keep text within canvas bounds (with padding)
            const padding = 50;
            textState.x = Math.max(padding, Math.min(canvas.width - padding, textState.x));
            textState.y = Math.max(padding, Math.min(canvas.height - padding, textState.y));
            
            redrawTextOnCanvas();
        }
    });
    
    canvas.addEventListener('mousedown', function(e) {
        if (!textState.text) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const hitArea = getTextHitArea();
        
        // Check if clicking on text (generous 30px margin)
        if (hitArea && 
            mouseX >= hitArea.left - 30 && mouseX <= hitArea.right + 30 &&
            mouseY >= hitArea.top - 30 && mouseY <= hitArea.bottom + 30) {
            isDraggingText = true;
            dragOffsetX = mouseX - textState.x;
            dragOffsetY = mouseY - textState.y;
            console.log('Text drag started');
        }
    });
    
    canvas.addEventListener('mouseup', function() {
        if (isDraggingText) {
            isDraggingText = false;
            console.log('Text drag ended at:', textState.x, textState.y);
            canvas.style.cursor = 'default';
        }
    });
    
    canvas.addEventListener('mouseleave', function() {
        isDraggingText = false;
        canvas.style.cursor = 'default';
    });
    
    if (clearTextBtn) {
        clearTextBtn.addEventListener('click', function() {
            if (originalImageData) {
                ctx.putImageData(originalImageData, 0, 0);
                if (textInput) textInput.value = '';
                textState.text = '';
                textState.x = null;
                textState.y = null;
                console.log('Text cleared');
            }
        });
    }
    
    // =============================================
    // TRANSFORM TOOL HANDLERS
    // =============================================
    
    const rotateLeftBtn = document.getElementById('rotateLeftBtn');
    const rotateRightBtn = document.getElementById('rotateRightBtn');
    const flipHBtn = document.getElementById('flipHBtn');
    const flipVBtn = document.getElementById('flipVBtn');
    const cropBtn = document.getElementById('cropBtn');
    const resetTransform = document.getElementById('resetTransform');
    
    function rotateCanvas(degrees) {
        if (!originalImageData) return;
        
        const img = new Image();
        img.onload = function() {
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
            
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            console.log('Image rotated:', degrees, 'degrees');
        };
        img.src = canvas.toDataURL();
    }
    
    function flipCanvas(direction) {
        if (!originalImageData) return;
        
        const img = new Image();
        img.onload = function() {
            const newCanvas = document.createElement('canvas');
            const newCtx = newCanvas.getContext('2d');
            
            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height;
            
            newCtx.save();
            if (direction === 'h') {
                newCtx.scale(-1, 1);
                newCtx.drawImage(img, -img.width, 0);
            } else {
                newCtx.scale(1, -1);
                newCtx.drawImage(img, 0, -img.height);
            }
            newCtx.restore();
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(newCanvas, 0, 0);
            
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            console.log('Image flipped:', direction);
        };
        img.src = canvas.toDataURL();
    }
    
    if (rotateLeftBtn) {
        rotateLeftBtn.addEventListener('click', function() {
            rotateCanvas(-90);
        });
    }
    
    if (rotateRightBtn) {
        rotateRightBtn.addEventListener('click', function() {
            rotateCanvas(90);
        });
    }
    
    if (flipHBtn) {
        flipHBtn.addEventListener('click', function() {
            flipCanvas('h');
        });
    }
    
    if (flipVBtn) {
        flipVBtn.addEventListener('click', function() {
            flipCanvas('v');
        });
    }
    
    if (cropBtn) {
        cropBtn.addEventListener('click', function() {
            if (!originalImageData) {
                alert('Please upload an image first');
                return;
            }
            
            // Toggle crop mode
            cropMode = !cropMode;
            
            if (cropMode) {
                cropBtn.textContent = '✓ Apply Crop';
                cropBtn.style.backgroundColor = '#28a745';
                
                // Initialize crop area if not set
                if (cropState.x === 0 && cropState.y === 0) {
                    const padding = 50;
                    cropState.x = padding;
                    cropState.y = padding;
                    cropState.width = canvas.width - (padding * 2);
                    cropState.height = canvas.height - (padding * 2);
                }
                
                drawCropOverlay();
            } else {
                // Apply crop
                if (cropState.width > 0 && cropState.height > 0) {
                    applyCrop();
                    cropBtn.textContent = '✂️ Crop';
                    cropBtn.style.backgroundColor = '#007bff';
                }
            }
        });
    }
    
    // Crop state
    let cropMode = false;
    let cropState = { x: 0, y: 0, width: 0, height: 0 };
    let isDraggingCrop = false;
    let dragType = null; // 'center', 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
    let dragStartX = 0;
    let dragStartY = 0;
    
    const HANDLE_SIZE = 12;
    const MIN_CROP_SIZE = 50;
    
    function drawCropOverlay() {
        ctx.putImageData(originalImageData, 0, 0);
        
        const x = cropState.x;
        const y = cropState.y;
        const w = cropState.width;
        const h = cropState.height;
        
        // Semi-transparent overlay outside crop area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Clear the crop area
        ctx.clearRect(x, y, w, h);
        ctx.putImageData(originalImageData, 0, 0, x, y, w, h);
        
        // Draw crop box border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + w / 3, y);
        ctx.lineTo(x + w / 3, y + h);
        ctx.moveTo(x + (w * 2) / 3, y);
        ctx.lineTo(x + (w * 2) / 3, y + h);
        ctx.moveTo(x, y + h / 3);
        ctx.lineTo(x + w, y + h / 3);
        ctx.moveTo(x, y + (h * 2) / 3);
        ctx.lineTo(x + w, y + (h * 2) / 3);
        ctx.stroke();
        
        // Draw corner and edge handles
        drawCropHandles(x, y, w, h);
    }
    
    function drawCropHandles(x, y, w, h) {
        const handles = [
            { pos: 'nw', cx: x, cy: y },
            { pos: 'ne', cx: x + w, cy: y },
            { pos: 'sw', cx: x, cy: y + h },
            { pos: 'se', cx: x + w, cy: y + h },
            { pos: 'n', cx: x + w / 2, cy: y },
            { pos: 's', cx: x + w / 2, cy: y + h },
            { pos: 'w', cx: x, cy: y + h / 2 },
            { pos: 'e', cx: x + w, cy: y + h / 2 }
        ];
        
        ctx.fillStyle = '#00ff00';
        handles.forEach(handle => {
            ctx.fillRect(handle.cx - HANDLE_SIZE / 2, handle.cy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        });
    }
    
    function getCropHandleAtPoint(px, py) {
        const x = cropState.x;
        const y = cropState.y;
        const w = cropState.width;
        const h = cropState.height;
        const threshold = HANDLE_SIZE + 5;
        
        // Check corners first
        if (Math.abs(px - x) < threshold && Math.abs(py - y) < threshold) return 'nw';
        if (Math.abs(px - (x + w)) < threshold && Math.abs(py - y) < threshold) return 'ne';
        if (Math.abs(px - x) < threshold && Math.abs(py - (y + h)) < threshold) return 'sw';
        if (Math.abs(px - (x + w)) < threshold && Math.abs(py - (y + h)) < threshold) return 'se';
        
        // Check edges
        if (Math.abs(py - y) < threshold && px > x && px < x + w) return 'n';
        if (Math.abs(py - (y + h)) < threshold && px > x && px < x + w) return 's';
        if (Math.abs(px - x) < threshold && py > y && py < y + h) return 'w';
        if (Math.abs(px - (x + w)) < threshold && py > y && py < y + h) return 'e';
        
        // Check center
        if (px > x + HANDLE_SIZE && px < x + w - HANDLE_SIZE && py > y + HANDLE_SIZE && py < y + h - HANDLE_SIZE) return 'center';
        
        return null;
    }
    
    function applyCrop() {
        const x = Math.round(cropState.x);
        const y = Math.round(cropState.y);
        const w = Math.round(cropState.width);
        const h = Math.round(cropState.height);
        
        if (w <= 0 || h <= 0) {
            alert('Invalid crop area');
            return;
        }
        
        const img = new Image();
        img.onload = function() {
            const newCanvas = document.createElement('canvas');
            const newCtx = newCanvas.getContext('2d');
            
            newCanvas.width = w;
            newCanvas.height = h;
            newCtx.drawImage(img, x, y, w, h, 0, 0, w, h);
            
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(newCanvas, 0, 0);
            
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            cropMode = false;
            isDraggingCrop = false;
            dragType = null;
            cropState = { x: 0, y: 0, width: 0, height: 0 };
            
            if (cropBtn) {
                cropBtn.textContent = '✂️ Crop';
                cropBtn.style.backgroundColor = '#007bff';
            }
            
            console.log('Crop applied:', w, 'x', h);
        };
        img.src = canvas.toDataURL();
    }
    
    // Crop mouse events
    canvas.addEventListener('mousedown', function(e) {
        if (!cropMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (canvas.width / rect.width);
        const py = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        dragType = getCropHandleAtPoint(px, py);
        
        if (dragType) {
            isDraggingCrop = true;
            dragStartX = px;
            dragStartY = py;
            canvas.style.cursor = getCursorForHandle(dragType);
        }
    });
    
    canvas.addEventListener('mousemove', function(e) {
        if (!cropMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (canvas.width / rect.width);
        const py = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        if (isDraggingCrop && dragType) {
            const dx = px - dragStartX;
            const dy = py - dragStartY;
            
            resizeCropArea(dragType, dx, dy);
            dragStartX = px;
            dragStartY = py;
            
            drawCropOverlay();
        } else {
            const handle = getCropHandleAtPoint(px, py);
            canvas.style.cursor = handle ? getCursorForHandle(handle) : 'default';
        }
    });
    
    canvas.addEventListener('mouseup', function() {
        isDraggingCrop = false;
        dragType = null;
    });
    
    function getCursorForHandle(handle) {
        const cursorMap = {
            'nw': 'nwse-resize', 'ne': 'nesw-resize', 'sw': 'nesw-resize', 'se': 'nwse-resize',
            'n': 'ns-resize', 's': 'ns-resize', 'w': 'ew-resize', 'e': 'ew-resize',
            'center': 'move'
        };
        return cursorMap[handle] || 'default';
    }
    
    function resizeCropArea(type, dx, dy) {
        const x = cropState.x;
        const y = cropState.y;
        const w = cropState.width;
        const h = cropState.height;
        
        switch(type) {
            case 'center':
                cropState.x = Math.max(0, Math.min(canvas.width - w, x + dx));
                cropState.y = Math.max(0, Math.min(canvas.height - h, y + dy));
                break;
            case 'nw':
                if (w - dx > MIN_CROP_SIZE) { cropState.x = x + dx; cropState.width = w - dx; }
                if (h - dy > MIN_CROP_SIZE) { cropState.y = y + dy; cropState.height = h - dy; }
                break;
            case 'ne':
                if (w + dx > MIN_CROP_SIZE) cropState.width = w + dx;
                if (h - dy > MIN_CROP_SIZE) { cropState.y = y + dy; cropState.height = h - dy; }
                break;
            case 'sw':
                if (w - dx > MIN_CROP_SIZE) { cropState.x = x + dx; cropState.width = w - dx; }
                if (h + dy > MIN_CROP_SIZE) cropState.height = h + dy;
                break;
            case 'se':
                if (w + dx > MIN_CROP_SIZE) cropState.width = w + dx;
                if (h + dy > MIN_CROP_SIZE) cropState.height = h + dy;
                break;
            case 'n':
                if (h - dy > MIN_CROP_SIZE) { cropState.y = y + dy; cropState.height = h - dy; }
                break;
            case 's':
                if (h + dy > MIN_CROP_SIZE) cropState.height = h + dy;
                break;
            case 'w':
                if (w - dx > MIN_CROP_SIZE) { cropState.x = x + dx; cropState.width = w - dx; }
                break;
            case 'e':
                if (w + dx > MIN_CROP_SIZE) cropState.width = w + dx;
                break;
        }
        
        // Keep within canvas
        cropState.x = Math.max(0, Math.min(canvas.width - cropState.width, cropState.x));
        cropState.y = Math.max(0, Math.min(canvas.height - cropState.height, cropState.y));
    }
    
    if (resetTransform) {
        resetTransform.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Reset clicked, fullyOriginalImageData exists:', !!fullyOriginalImageData);
            
            if (!fullyOriginalImageData) {
                alert('No image loaded');
                return;
            }
            
            // Restore fully original image (before any crop)
            canvas.width = fullyOriginalImageData.width;
            canvas.height = fullyOriginalImageData.height;
            ctx.putImageData(fullyOriginalImageData, 0, 0);
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Reset crop state
            cropMode = false;
            isDraggingCrop = false;
            dragType = null;
            cropState = { x: 0, y: 0, width: 0, height: 0 };
            
            // Reset crop button
            if (cropBtn) {
                cropBtn.textContent = '✂️ Crop';
                cropBtn.style.backgroundColor = '#007bff';
            }
            
            // Reset all other transform states
            canvas.style.cursor = 'default';
            
            console.log('Transform reset complete');
        });
    }
    
    // =============================================
    // ADJUST TOOL - PRESET BUTTONS
    // =============================================
    
    adjustPresetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const preset = this.getAttribute('data-preset');
            console.log('Applying preset:', preset);
            
            // Reset all sliders first
            if (brightSlider) brightSlider.value = 0;
            if (contrastSlider) contrastSlider.value = 0;
            if (saturSlider) saturSlider.value = 0;
            if (hueSlider) hueSlider.value = 0;
            if (vibranceSlider) vibranceSlider.value = 0;
            
            // Apply preset
            switch(preset) {
                case 'bw':
                    if (contrastSlider) contrastSlider.value = 50;
                    if (saturSlider) saturSlider.value = -100;
                    break;
                case 'sepia':
                    if (hueSlider) hueSlider.value = 30;
                    if (saturSlider) saturSlider.value = 50;
                    if (brightSlider) brightSlider.value = 10;
                    break;
                case 'vivid':
                    if (brightSlider) brightSlider.value = 10;
                    if (contrastSlider) contrastSlider.value = 30;
                    if (saturSlider) saturSlider.value = 40;
                    break;
                case 'cool':
                    if (hueSlider) hueSlider.value = -20;
                    if (saturSlider) saturSlider.value = 10;
                    break;
                case 'warm':
                    if (hueSlider) hueSlider.value = 20;
                    if (saturSlider) saturSlider.value = 10;
                    break;
                case 'faded':
                    if (brightSlider) brightSlider.value = 15;
                    if (contrastSlider) contrastSlider.value = -20;
                    if (saturSlider) saturSlider.value = -30;
                    break;
            }
            
            // Apply the adjustment
            const br = parseInt(brightSlider?.value || 0);
            const co = parseInt(contrastSlider?.value || 0);
            const sa = parseInt(saturSlider?.value || 0);
            const hu = parseInt(hueSlider?.value || 0);
            const vi = parseInt(vibranceSlider?.value || 0);
            applyColorAdjustments(br, co, sa, hu, vi);
        });
    });
    
    // Update value displays for adjust sliders
    if (brightSlider) {
        brightSlider.addEventListener('input', function() {
            const brightValue = document.getElementById('brightValue');
            if (brightValue) brightValue.textContent = this.value;
        });
    }
    
    if (contrastSlider) {
        contrastSlider.addEventListener('input', function() {
            const contrastValue = document.getElementById('contrastValue');
            if (contrastValue) contrastValue.textContent = this.value;
        });
    }
    
    if (saturSlider) {
        saturSlider.addEventListener('input', function() {
            const saturValue = document.getElementById('saturValue');
            if (saturValue) saturValue.textContent = this.value;
        });
    }
    
    if (hueSlider) {
        hueSlider.addEventListener('input', function() {
            const hueValue = document.getElementById('hueValue');
            if (hueValue) hueValue.textContent = this.value;
        });
    }
    
    if (vibranceSlider) {
        vibranceSlider.addEventListener('input', function() {
            const vibranceValue = document.getElementById('vibranceValue');
            if (vibranceValue) vibranceValue.textContent = this.value;
        });
    }
    
    console.log('=== Smart Image Editor Initialized Successfully ===');
});
