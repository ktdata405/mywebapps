// Global State
let stream = null;
let currentModule = 'camera';
let allDocuments = [];
let currentFolder = null; // null for root, or folder name string
let selectedFilesForUpload = [];
let capturedImages = [];
let isShowAllMode = false;
let cropper = null;
let currentEditingFileIndex = -1;
let currentViewMode = 'list'; // 'list' or 'grid'
let movingItem = null; // { type: 'file' | 'folder', id: string, path: string, name: string }
let currentEditingDoc = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof CONFIG === 'undefined') {
        console.error('CONFIG not loaded');
        return;
    }

    // Event Listeners for new buttons
    document.getElementById('create-folder-btn').addEventListener('click', createFolder);
    document.getElementById('confirm-upload-btn').addEventListener('click', confirmUpload);
    document.getElementById('cancel-upload-btn').addEventListener('click', cancelUpload);
    
    // Search Listeners
    const searchInput = document.getElementById('browse-search-input');
    const searchClear = document.getElementById('browse-search-clear');
    searchInput.addEventListener('input', () => {
        searchClear.classList.toggle('hidden', !searchInput.value);
        renderBrowse();
    });
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.classList.add('hidden');
        renderBrowse();
    });

    // Close dropdowns on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown-menu') && !e.target.closest('.dropdown-trigger')) {
            document.querySelectorAll('.dropdown-menu').forEach(el => el.classList.add('hidden'));
        }
    });

    if (document.getElementById('module-menu')) {
        switchModule('menu');
    } else {
        switchModule('camera');
        fetchDocuments();
    }
    
    // Initialize view mode
    setViewMode('list');
});

// --- MODAL UTILITIES ---

// Custom Alert
window.showAlert = function(message, type = 'info') {
    const modal = document.getElementById('custom-alert-modal');
    const msgEl = document.getElementById('alert-message');
    const iconContainer = document.getElementById('alert-icon-container');
    
    if (!modal || !msgEl || !iconContainer) {
        alert(message); // Fallback
        return;
    }

    msgEl.textContent = message;
    
    let icon = '';
    let colorClass = '';
    if (type === 'error') {
        icon = '<iconify-icon icon="solar:danger-circle-bold" class="text-red-500"></iconify-icon>';
        colorClass = 'bg-red-500/10';
    } else if (type === 'success') {
        icon = '<iconify-icon icon="solar:check-circle-bold" class="text-green-500"></iconify-icon>';
        colorClass = 'bg-green-500/10';
    } else {
        icon = '<iconify-icon icon="solar:info-circle-bold" class="text-indigo-500"></iconify-icon>';
        colorClass = 'bg-indigo-500/10';
    }
    
    iconContainer.innerHTML = icon;
    iconContainer.className = `w-12 h-12 rounded-full flex items-center justify-center text-2xl ${colorClass}`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeCustomAlert = function() {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// Custom Confirm
window.showConfirm = function(title, description) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-desc').textContent = description;
        
        const confirmBtn = document.getElementById('confirm-modal-ok');
        const cancelBtn = document.getElementById('confirm-modal-cancel');

        const onConfirm = () => {
            close();
            resolve(true);
        };
        
        const onCancel = () => {
            close();
            resolve(false);
        };

        const close = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });
};

// Custom Prompt (Input Modal)
window.showInput = function(title, description, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('input-modal');
        document.getElementById('input-modal-title').textContent = title;
        document.getElementById('input-modal-desc').textContent = description;
        const inputField = document.getElementById('input-modal-field');
        inputField.value = defaultValue;
        
        const confirmBtn = document.getElementById('input-modal-confirm');
        const cancelBtn = document.getElementById('input-modal-cancel');

        const onConfirm = () => {
            close();
            resolve(inputField.value);
        };
        
        const onCancel = () => {
            close();
            resolve(null);
        };

        const close = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        inputField.focus();
    });
};

// Module Switching
window.switchModule = function(moduleName) {
    // Hide all modules
    document.querySelectorAll('.module-view').forEach(el => {
        el.classList.remove('active');
        setTimeout(() => {
            if(!el.classList.contains('active')) el.style.display = 'none';
        }, 300);
    });

    // Update Nav State
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-white/5', 'text-white', 'border-white/5', 'shadow-sm');
        el.classList.add('text-neutral-400', 'border-transparent');
    });

    const navBtn = document.getElementById(`nav-${moduleName}`);
    if(navBtn) {
        navBtn.classList.remove('text-neutral-400', 'border-transparent');
        navBtn.classList.add('bg-white/5', 'text-white', 'border-white/5', 'shadow-sm');
    }

    // Show selected module
    const target = document.getElementById(`module-${moduleName}`);
    if (target) {
        target.style.display = 'flex';
        requestAnimationFrame(() => {
            target.classList.add('active');
        });
    }

    // Camera logic
    if(moduleName === 'camera') {
        initCamera();
    } else {
        stopCamera();
    }
    currentModule = moduleName;
};

window.showAllDocuments = async function() {
    currentFolder = null;
    const searchInput = document.getElementById('browse-search-input');
    if(searchInput) {
        searchInput.value = '';
        document.getElementById('browse-search-clear').classList.add('hidden');
    }
    switchModule('browse');
    await fetchDocuments();
};
window.openBrowse = async function() {
    isShowAllMode = false;
    switchModule('browse');
    if (allDocuments.length === 0) {
        await fetchDocuments();
    } else {
        renderBrowse();
    }
};

// View Mode Logic
window.setViewMode = function(mode) {
    currentViewMode = mode;
    const listBtn = document.getElementById('view-list-btn');
    const gridBtn = document.getElementById('view-grid-btn');
    
    if (mode === 'list') {
        listBtn.classList.remove('text-neutral-400', 'hover:text-white');
        listBtn.classList.add('text-white', 'bg-white/10');
        gridBtn.classList.remove('text-white', 'bg-white/10');
        gridBtn.classList.add('text-neutral-400', 'hover:text-white');
    } else {
        gridBtn.classList.remove('text-neutral-400', 'hover:text-white');
        gridBtn.classList.add('text-white', 'bg-white/10');
        listBtn.classList.remove('text-white', 'bg-white/10');
        listBtn.classList.add('text-neutral-400', 'hover:text-white');
    }
    renderBrowse();
};

// Camera Logic
async function initCamera() {
    const video = document.getElementById('webcam-feed');
    const staticImg = document.getElementById('static-feed');
    
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.style.opacity = '1';
                staticImg.style.opacity = '0';
            };
        }
    } catch (err) {
        console.log("Camera access denied or not available, using static image.", err);
        video.style.opacity = '0';
        staticImg.style.opacity = '1';
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

window.captureImage = async function() {
    // Visual feedback
    const flash = document.getElementById('flash-overlay');
    flash.classList.remove('flash-active');
    void flash.offsetWidth; 
    flash.classList.add('flash-active');

    const toast = document.getElementById('status-toast');
    const originalToast = toast.innerHTML;
    toast.innerHTML = `<div class="flex items-center gap-2"><iconify-icon icon="solar:check-circle-bold" class="text-green-400"></iconify-icon><p class="text-xs font-medium text-white">Capturing...</p></div>`;

    // Capture frame
    const video = document.getElementById('webcam-feed');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (stream && video.readyState === 4) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
        const img = document.getElementById('static-feed');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    
    canvas.toBlob((blob) => {
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        capturedImages.push(file);
        
        // Update Badge
        const badge = document.getElementById('scan-count-badge');
        if(badge) {
            badge.innerText = capturedImages.length;
            badge.classList.remove('hidden');
        }

        toast.innerHTML = `<div class="flex items-center gap-2"><iconify-icon icon="solar:camera-add-linear" class="text-indigo-400"></iconify-icon><p class="text-xs font-medium text-white">Captured (${capturedImages.length})</p></div>`;
        setTimeout(() => {
            toast.innerHTML = originalToast;
        }, 1000);
    }, 'image/jpeg', 0.85);
};

window.finishScan = function() {
    if (capturedImages.length === 0) {
        showAlert("No images captured yet.", "error");
        return;
    }
    // Instead of going directly to folder modal, go to upload preview to allow editing
    handleFiles(capturedImages);
};

window.closeFolderModal = function() {
    document.getElementById('folder-modal').classList.add('hidden');
    document.getElementById('folder-modal').classList.remove('flex');
};

window.saveScans = async function() {
    const folderName = document.getElementById('scan-folder-input').value.trim();
    closeFolderModal();
    
    // Use the existing upload logic but with capturedImages
    // Actually, we should route through confirmUpload logic to be consistent
    // But since we are here from finishScan -> handleFiles -> confirmUpload -> (if folder needed) -> folder modal
    // Wait, finishScan now calls handleFiles. So this function might be redundant if we change flow.
    // Let's keep it for now but adapt.
    
    // If we are here, it means we are saving directly from camera without review? 
    // No, I changed finishScan to call handleFiles.
    // So handleFiles will show the preview list.
    // Then user clicks "Upload".
    // If no folder name in input, maybe we ask? Or just upload to root.
    // The original logic had a specific flow for camera. Let's unify it.
    
    // If this function is called, it means we want to upload capturedImages with a specific folder name.
    // But now capturedImages are passed to handleFiles, so they become selectedFilesForUpload.
    // So we should use uploadFiles with selectedFilesForUpload.
    
    // Let's deprecate direct usage of this function from UI and route everything through the upload preview screen.
};

// Upload Logic
window.handleDragOver = function(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.add('drag-active');
    document.getElementById('drop-border').style.borderColor = '#6366f1';
};

window.handleDragLeave = function(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-active');
    document.getElementById('drop-border').style.borderColor = 'rgba(255,255,255,0.1)';
};

window.handleDrop = function(e) {
    e.preventDefault();
    window.handleDragLeave(e);
    window.handleFiles(e.dataTransfer.files);
};

window.handleFiles = function(files) {
    if (files.length === 0) return;

    switchModule('upload');
    // Append to existing if needed, but for now replace
    // If coming from camera, capturedImages are passed.
    // If coming from file input, FileList is passed.
    
    if (files instanceof FileList) {
        selectedFilesForUpload = Array.from(files);
    } else {
        selectedFilesForUpload = files; // Array of Files
    }
    
    document.getElementById('initial-upload-ui').classList.add('hidden');
    document.getElementById('upload-preview-container').classList.remove('hidden');

    renderUploadList();
};

function renderUploadList() {
    const list = document.getElementById('upload-list');
    list.innerHTML = '';
    selectedFilesForUpload.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'w-full bg-white/5 rounded-lg p-3 border border-white/5 flex items-center gap-3 group';
        
        // Create thumbnail if image
        let thumbnail = '<div class="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-indigo-400 flex-shrink-0"><iconify-icon icon="solar:file-text-linear" width="16"></iconify-icon></div>';
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            thumbnail = `<div class="w-8 h-8 rounded bg-neutral-800 flex-shrink-0 overflow-hidden border border-white/10 cursor-pointer" onclick="openImagePreview('${url}')"><img src="${url}" class="w-full h-full object-cover"></div>`;
        }

        item.innerHTML = `
            ${thumbnail}
            <div class="flex-1 min-w-0 cursor-pointer" onclick="openImagePreview('${file.type.startsWith('image/') ? URL.createObjectURL(file) : ''}')">
                <p class="text-xs text-white truncate">${file.name}</p>
                <p class="text-[10px] text-neutral-400">${(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                ${file.type.startsWith('image/') ? `<button onclick="editImage(${index})" class="p-1.5 rounded-md bg-neutral-700 hover:bg-indigo-600 text-white transition-colors" title="Crop/Rotate"><iconify-icon icon="solar:crop-minimalistic-linear" width="14"></iconify-icon></button>` : ''}
                <button onclick="removeFile(${index})" class="p-1.5 rounded-md bg-neutral-700 hover:bg-red-500 text-white transition-colors" title="Remove"><iconify-icon icon="solar:trash-bin-trash-linear" width="14"></iconify-icon></button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.removeFile = function(index) {
    selectedFilesForUpload.splice(index, 1);
    renderUploadList();
    if (selectedFilesForUpload.length === 0) {
        cancelUpload();
    }
};

window.editImage = function(indexOrDoc) {
    currentEditingDoc = null;
    currentEditingFileIndex = -1;

    let filePromise;
    if (typeof indexOrDoc === 'number') { // Editing a new file from upload list
        const file = selectedFilesForUpload[indexOrDoc];
        if (!file || !file.type.startsWith('image/')) return;
        currentEditingFileIndex = indexOrDoc;
        filePromise = Promise.resolve(file);
    } else { // Editing an existing doc
        if (!indexOrDoc.id) return;
        currentEditingDoc = indexOrDoc;
        // We need to fetch the original image data to edit it.
        // This requires a proxy or CORS-enabled server if Google Drive links are used.
        // For simplicity, let's assume we can fetch it.
        // Add cache buster to avoid cached image
        const imageUrl = `https://lh3.googleusercontent.com/d/${currentEditingDoc.id}?t=${new Date().getTime()}`;
        filePromise = fetch(imageUrl).then(res => res.blob()).then(blob => new File([blob], currentEditingDoc.name, {type: blob.type}));
    }

    filePromise.then(file => {
        const url = URL.createObjectURL(file);
        const img = document.getElementById('image-to-edit');
        img.src = url;
        
        const modal = document.getElementById('image-editor-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        if (cropper) cropper.destroy();
        cropper = new Cropper(img, { viewMode: 1, autoCropArea: 1 });
    }).catch(err => {
        showAlert("Could not load image for editing. It might be protected.", "error");
        console.error(err);
    });
};

window.rotateImage = function(degree) {
    if (cropper) {
        cropper.rotate(degree);
    }
};

window.closeImageEditor = function() {
    const modal = document.getElementById('image-editor-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    currentEditingFileIndex = -1;
    currentEditingDoc = null;
};

window.saveEditedImage = function() {
    if (!cropper) return;

    cropper.getCroppedCanvas().toBlob(async (blob) => {
        if (currentEditingFileIndex !== -1) { // Saving a new file from upload list
            const originalFile = selectedFilesForUpload[currentEditingFileIndex];
            const newFile = new File([blob], originalFile.name, { type: 'image/jpeg' });
            selectedFilesForUpload[currentEditingFileIndex] = newFile;
            renderUploadList();
        } else if (currentEditingDoc) { // Saving an existing document
            const loader = document.getElementById('loader');
            loader.classList.add('flex');
            const fileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ name: currentEditingDoc.name, type: 'image/jpeg', data: reader.result.split(',')[1] });
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const result = await performAction('updateFileContent', { fileId: currentEditingDoc.id, file: fileData });
            if (result) {
                showAlert('File updated successfully!', "success");
                await fetchDocuments(); // Refresh to get new thumbnail
            }
            loader.classList.remove('flex');
        }
        closeImageEditor();
    }, 'image/jpeg', 0.9);
};

window.openImagePreview = function(url) {
    if (!url) return;
    const modal = document.getElementById('image-preview-modal');
    const img = document.getElementById('preview-image-full');
    img.src = url;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeImagePreview = function() {
    const modal = document.getElementById('image-preview-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('preview-image-full').src = '';
};

function cancelUpload() {
    selectedFilesForUpload = [];
    capturedImages = []; // Clear captured images too if cancelled
    document.getElementById('initial-upload-ui').classList.remove('hidden');
    document.getElementById('upload-preview-container').classList.add('hidden');
    document.getElementById('folder-name-input').value = '';
    document.getElementById('file-input').value = ''; // Reset file input
    
    // Reset badge
    const badge = document.getElementById('scan-count-badge');
    if(badge) badge.classList.add('hidden');
}

async function confirmUpload() {
    const folderName = document.getElementById('folder-name-input').value.trim();
    if (selectedFilesForUpload.length > 0) {
        const loader = document.getElementById('loader');
        const loaderText = document.getElementById('loader-text');
        loader.classList.remove('hidden');
        loader.classList.add('flex');
        if (loaderText) loaderText.innerHTML = `Uploading ${selectedFilesForUpload.length} files...`;

        try {
            await uploadFiles(selectedFilesForUpload, folderName);
            cancelUpload();
            fetchDocuments();
            switchModule('browse');
        } catch(e) {
            showAlert(e.message, "error");
        } finally {
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            if (loaderText) loaderText.textContent = 'Processing...';
        }
    }
}

async function uploadFiles(fileList, folderName) {
    try {
        const processedFiles = await Promise.all(Array.from(fileList).map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({
                    name: file.name,
                    type: file.type,
                    data: reader.result.split(',')[1],
                });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }));

        const response = await fetch(CONFIG.GOOGLE_SHEET_URL_SCAN, {
            method: 'POST',
            body: JSON.stringify({ files: processedFiles, folderName: folderName })
        });
        
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);
        
        // Success handled by caller (loader removal etc)
    } catch (error) {
        console.error('Upload failed:', error);
        throw error; // Re-throw to let caller handle UI
    }
}

async function createFolder() {
    const folderName = await showInput("Create New Folder", "Enter a name for the new folder.");
    if (folderName && folderName.trim() !== "" && !folderName.includes('/')) {
        const name = folderName.trim();
        // Construct full path
        const fullPath = currentFolder ? `${currentFolder}/${name}` : name;

        try {
            const response = await fetch(CONFIG.GOOGLE_SHEET_URL_SCAN, {
                method: 'POST',
                body: JSON.stringify({ action: 'createFolder', folderName: fullPath })
            });
            const result = await response.json();
            if (result.status === 'success') {
                showAlert(`Folder "${name}" created!`, "success");
                // Manually add folder to documents to make it appear instantly
                if (!allDocuments.some(d => d.folder === fullPath)) {
                    allDocuments.push({ folder: fullPath, name: '', timestamp: new Date().toISOString() });
                }
                renderBrowse();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Failed to create folder', error);
            showAlert('Error creating folder: ' + error.message, "error");
        }
    }
}

async function performAction(action, payload) {
    try {
        const response = await fetch(CONFIG.GOOGLE_SHEET_URL_SCAN, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || 'Action failed');
        }
        return result;
    } catch (error) {
        console.error(`Error performing action '${action}':`, error);
        showAlert(`Error: ${error.message}`, "error");
        return null;
    }
}

async function moveFileToFolder(fileId, folderPath) {
    const docToMove = allDocuments.find(d => d.id === fileId);
    if (!docToMove || docToMove.folder === folderPath) return;

    const oldFolder = docToMove.folder || '';
    docToMove.folder = folderPath;
    renderBrowse(); // Optimistic update

    const result = await performAction('moveFile', { fileId: fileId, newFolderPath: folderPath });
    if (!result) { // Revert on failure
        docToMove.folder = oldFolder;
        renderBrowse();
        showAlert('Failed to move file.', "error");
    }
}

async function renameFile(doc) {
    const newName = await showInput("Rename File", "Enter a new name for the file.", doc.name);
    if (newName && newName.trim() !== "" && newName.trim() !== doc.name) {
        const oldName = doc.name;
        doc.name = newName.trim();
        renderBrowse(); // Optimistic update
        const result = await performAction('renameFile', { fileId: doc.id, newName: newName.trim() });
        if (!result) { // Revert on failure
            doc.name = oldName;
            renderBrowse();
        }
    }
}

async function deleteFile(doc) {
    if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
        const originalDocs = [...allDocuments];
        allDocuments = allDocuments.filter(d => d.id !== doc.id);
        renderBrowse(); // Optimistic update
        const result = await performAction('deleteFile', { fileId: doc.id });
        if (!result) { // Revert on failure
            allDocuments = originalDocs;
            renderBrowse();
        }
    }
}

function triggerReplaceFile(doc) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!confirm(`This will replace the content of "${doc.name}" with the new file. Continue?`)) return;
            
            const loader = document.getElementById('loader');
            const loaderText = document.getElementById('loader-text');
            if(loader) {
                if (loaderText) loaderText.textContent = 'Replacing file...';
                loader.classList.remove('hidden');
                loader.classList.add('flex');
            }

            try {
                const fileData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result.split(',')[1] });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                const result = await performAction('updateFileContent', { fileId: doc.id, file: fileData });
                if (result) {
                    showAlert('File content updated successfully!', "success");
                    fetchDocuments(); // Refresh to get new thumbnail/data
                }
            } catch (error) {
                console.error('File replacement failed:', error);
                showAlert('File replacement failed: ' + error.message, "error");
            } finally {
                if(loader) {
                    loader.classList.add('hidden');
                    if (loaderText) loaderText.textContent = 'Processing...';
                    loader.classList.remove('flex');
                }
            }
        }
    };
    input.click();
}


// Data Fetching
async function fetchDocuments() {
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');

    if (loader) {
        if (loaderText) loaderText.textContent = 'Fetching documents...';
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    }

    try {
        const response = await fetch(CONFIG.GOOGLE_SHEET_URL_SCAN);
        const result = await response.json();
        
        if (result.status === 'success') {
            allDocuments = result.data;
            if (currentModule === 'browse') {
                renderBrowse();
            }
            renderRecentActivity(result.data);
        }
    } catch (e) {
        console.error("Failed to fetch documents", e);
    } finally {
        if (loader) {
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            if (loaderText) loaderText.textContent = 'Processing...';
        }
    }
}

function renderBrowse() {
    const grid = document.getElementById('browse-grid');
    const title = document.getElementById('browse-title');
    const backBtn = document.getElementById('browse-back-btn');
    const searchInput = document.getElementById('browse-search-input');
    const searchTerm = searchInput.value.toLowerCase();
    const header = document.getElementById('browse-header');

    // Clear drag handlers from header initially
    if (header) {
        header.ondragover = null;
        header.ondragleave = null;
        header.ondrop = null;
        header.classList.remove('drag-active');
    }

    // --- MOVE MODE UI ---
    const actionGroup = document.getElementById('browse-actions');
    
    if (movingItem) {
        if (actionGroup) actionGroup.classList.add('hidden');
        
        let moveControls = document.getElementById('move-controls');
        if (!moveControls) {
            moveControls = document.createElement('div');
            moveControls.id = 'move-controls';
            moveControls.className = 'flex items-center gap-3';
            moveControls.innerHTML = `
                <div class="text-sm text-neutral-400 mr-2 hidden sm:block">Moving: <span class="text-white font-medium max-w-[100px] truncate inline-block align-bottom">${movingItem.name}</span></div>
                <button onclick="cancelMove()" class="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white bg-white/5 border border-white/5 transition-colors">Cancel</button>
                <button onclick="confirmMove()" class="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 whitespace-nowrap">Move Here</button>
            `;
            header.querySelector('.flex.items-center.justify-between').appendChild(moveControls);
        } else {
            moveControls.classList.remove('hidden');
            moveControls.querySelector('span').textContent = movingItem.name;
        }
    } else {
        if (actionGroup) actionGroup.classList.remove('hidden');
        const moveControls = document.getElementById('move-controls');
        if (moveControls) moveControls.classList.add('hidden');
    }

    grid.innerHTML = '';
    
    // Set grid layout based on view mode
    if (currentViewMode === 'list') {
        grid.className = 'flex flex-col gap-2';
    } else {
        grid.className = 'grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-1 md:gap-2';
    }

    // SHOW ALL MODE
    if (isShowAllMode) {
        title.textContent = 'All Documents';
        backBtn.classList.add('hidden');
        currentFolder = null; // Ensure we are at root for folder creation

        // Get all root folders
        const rootFolders = new Set();
        allDocuments.forEach(d => {
            if (d.folder) {
                rootFolders.add(d.folder.split('/')[0]);
            }
        });

        // Filter folders if searching
        const foldersToRender = searchTerm
            ? [...rootFolders].filter(name => name.toLowerCase().includes(searchTerm))
            : [...rootFolders];

        foldersToRender.sort().forEach(folderName => {
            const fullPath = folderName;
            const folderEl = document.createElement('div');
            
            // Folder Menu HTML
            const menuHtml = `
                <div class="dropdown-menu hidden absolute right-0 top-8 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <button onclick="event.stopPropagation(); editFolderTags('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                        <iconify-icon icon="solar:tag-linear" width="16"></iconify-icon> Tags
                    </button>
                    <button onclick="event.stopPropagation(); toggleFolderSelect('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                        <iconify-icon icon="solar:check-square-linear" width="16"></iconify-icon> Select
                    </button>
                    <button onclick="event.stopPropagation(); renameFolder('${folderName}', '${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                        <iconify-icon icon="solar:pen-new-square-linear" width="16"></iconify-icon> Rename
                    </button>
                    <button onclick="event.stopPropagation(); showAlert('Download as Image not supported for folders', 'info')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-500 cursor-not-allowed flex items-center gap-2">
                        <iconify-icon icon="solar:gallery-download-linear" width="16"></iconify-icon> Download Image
                    </button>
                    <button onclick="event.stopPropagation(); showAlert('Download as PDF not supported for folders', 'info')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-500 cursor-not-allowed flex items-center gap-2">
                        <iconify-icon icon="solar:file-download-linear" width="16"></iconify-icon> Download PDF
                    </button>
                    <button onclick="event.stopPropagation(); toggleFolderLock('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                        <iconify-icon icon="solar:lock-linear" width="16"></iconify-icon> Lock
                    </button>
                    <button onclick="event.stopPropagation(); moveFolder('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                        <iconify-icon icon="solar:folder-with-files-linear" width="16"></iconify-icon> Move
                    </button>
                    <div class="h-px bg-white/5 my-1"></div>
                    <button onclick="event.stopPropagation(); deleteFolder('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                        <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon> Trash
                    </button>
                </div>
            `;

            if (currentViewMode === 'list') {
                folderEl.className = 'group relative w-full bg-neutral-800/40 rounded-xl border border-white/5 hover:border-indigo-500/40 transition-all flex items-center p-3 gap-4';
                folderEl.innerHTML = `
                    <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                        <iconify-icon icon="solar:folder-bold" class="text-xl"></iconify-icon>
                    </div>
                    <div class="flex-1 min-w-0 cursor-pointer folder-link">
                        <h3 class="text-sm font-medium text-white truncate">${folderName}</h3>
                        <p class="text-[10px] text-neutral-400">Folder</p>
                    </div>
                    <div class="relative">
                        <button class="dropdown-trigger p-2 rounded-lg hover:bg-white/10 text-white transition-colors" onclick="event.stopPropagation(); toggleDropdown(this)">
                            <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
                        </button>
                        ${menuHtml}
                    </div>
                `;
            } else {
                folderEl.className = 'group relative aspect-square rounded-xl border border-white/10 hover:border-indigo-500/50 bg-neutral-800/20 hover:bg-neutral-800/50 transition-all flex flex-col items-center justify-center gap-2';
                folderEl.innerHTML = `
                    <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer folder-link">
                        <iconify-icon icon="solar:folder-bold" class="text-4xl text-indigo-400/50 group-hover:text-indigo-400/80 transition-colors"></iconify-icon>
                        <span class="text-sm font-medium text-neutral-300 group-hover:text-white text-center px-2 break-all">${folderName}</span>
                    </div>
                    <div class="absolute top-2 right-2 z-30">
                        <button class="dropdown-trigger p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors" onclick="event.stopPropagation(); toggleDropdown(this)">
                            <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
                        </button>
                        ${menuHtml}
                    </div>
                `;
            }
            
            folderEl.ondragover = (e) => {
                e.preventDefault();
                folderEl.classList.add('drag-active');
            };
            folderEl.ondragleave = () => {
                folderEl.classList.remove('drag-active');
            };
            folderEl.ondrop = (e) => {
                e.preventDefault();
                folderEl.classList.remove('drag-active');
                const fileId = e.dataTransfer.getData('text/plain');
                if (fileId) {
                    moveFileToFolder(fileId, fullPath);
                }
            };
            
            folderEl.querySelector('.folder-link').onclick = () => {
                if (movingItem) {
                    // In move mode, clicking a folder navigates into it
                    currentFolder = fullPath;
                    renderBrowse();
                } else {
                    isShowAllMode = false;
                    currentFolder = fullPath;
                    renderBrowse();
                }
            };
            grid.appendChild(folderEl);
        });

        let files = allDocuments.filter(d => d.name && !d.folder);
        if (searchTerm) {
            files = files.filter(f => f.name.toLowerCase().includes(searchTerm));
            title.textContent = 'Search Results';
        }

        files.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        files.forEach(doc => grid.appendChild(createFileElement(doc)));

        return;
    }

    // SEARCH MODE (for folder view)
    if (searchTerm) {
        title.textContent = 'Search Results';
        backBtn.classList.add('hidden');
        const matchingDocs = allDocuments.filter(d => d.name && d.name.toLowerCase().includes(searchTerm));
        matchingDocs.forEach(doc => grid.appendChild(createFileElement(doc)));
        return;
    }

    // NORMAL BROWSE MODE
    if (currentFolder === null) {
        title.textContent = 'Documents';
        backBtn.classList.add('hidden');
    } else {
        // Show only the last part of the folder path in the title
        const parts = currentFolder.split('/');
        title.textContent = parts[parts.length - 1];
        backBtn.classList.remove('hidden');
        
        // Back button logic
        backBtn.onclick = () => {
            const parts = currentFolder.split('/');
            parts.pop();
            currentFolder = parts.length > 0 ? parts.join('/') : null;
            renderBrowse();
        };

        // Add drop zone to header to move files to root
        if (header) {
            header.ondragover = (e) => {
                e.preventDefault();
                header.classList.add('drag-active');
            };
            header.ondragleave = () => {
                header.classList.remove('drag-active');
            };
            header.ondrop = (e) => {
                e.preventDefault();
                header.classList.remove('drag-active');
                const fileId = e.dataTransfer.getData('text/plain');
                if (fileId) {
                    moveFileToFolder(fileId, ''); // Move to root
                }
            };
        }
    }

    const currentPathPrefix = currentFolder ? currentFolder + '/' : '';

    // 1. Render Subfolders
    const subFolders = new Set();
    allDocuments.forEach(d => {
        const folderPath = d.folder || '';
        if (folderPath === currentFolder) return; // File in current folder

        if (currentFolder) {
            if (folderPath.startsWith(currentPathPrefix)) {
                const relativePath = folderPath.substring(currentPathPrefix.length);
                const firstPart = relativePath.split('/')[0];
                if (firstPart) subFolders.add(firstPart);
            }
        } else {
            if (folderPath) {
                const firstPart = folderPath.split('/')[0];
                if (firstPart) subFolders.add(firstPart);
            }
        }
    });

    [...subFolders].sort().forEach(folderName => {
        const fullPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;
        const folderEl = document.createElement('div');
        
        // Folder Menu HTML
        const menuHtml = `
            <div class="dropdown-menu hidden absolute right-0 top-8 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button onclick="event.stopPropagation(); editFolderTags('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                    <iconify-icon icon="solar:tag-linear" width="16"></iconify-icon> Tags
                </button>
                <button onclick="event.stopPropagation(); toggleFolderSelect('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                    <iconify-icon icon="solar:check-square-linear" width="16"></iconify-icon> Select
                </button>
                <button onclick="event.stopPropagation(); renameFolder('${folderName}', '${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                    <iconify-icon icon="solar:pen-new-square-linear" width="16"></iconify-icon> Rename
                </button>
                <button onclick="event.stopPropagation(); showAlert('Download as Image not supported for folders', 'info')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-500 cursor-not-allowed flex items-center gap-2">
                    <iconify-icon icon="solar:gallery-download-linear" width="16"></iconify-icon> Download Image
                </button>
                <button onclick="event.stopPropagation(); showAlert('Download as PDF not supported for folders', 'info')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-500 cursor-not-allowed flex items-center gap-2">
                    <iconify-icon icon="solar:file-download-linear" width="16"></iconify-icon> Download PDF
                </button>
                <button onclick="event.stopPropagation(); toggleFolderLock('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                    <iconify-icon icon="solar:lock-linear" width="16"></iconify-icon> Lock
                </button>
                <button onclick="event.stopPropagation(); moveFolder('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                    <iconify-icon icon="solar:folder-with-files-linear" width="16"></iconify-icon> Move
                </button>
                <div class="h-px bg-white/5 my-1"></div>
                <button onclick="event.stopPropagation(); deleteFolder('${fullPath}')" class="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                    <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon> Trash
                </button>
            </div>
        `;

        if (currentViewMode === 'list') {
            folderEl.className = 'group relative w-full bg-neutral-800/40 rounded-xl border border-white/5 hover:border-indigo-500/40 transition-all flex items-center p-3 gap-4';
            folderEl.innerHTML = `
                <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <iconify-icon icon="solar:folder-bold" class="text-xl"></iconify-icon>
                </div>
                <div class="flex-1 min-w-0 cursor-pointer folder-link">
                    <h3 class="text-sm font-medium text-white truncate">${folderName}</h3>
                    <p class="text-[10px] text-neutral-400">Folder</p>
                </div>
                <div class="relative">
                    <button class="dropdown-trigger p-2 rounded-lg hover:bg-white/10 text-white transition-colors" onclick="event.stopPropagation(); toggleDropdown(this)">
                        <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
                    </button>
                    ${menuHtml}
                </div>
            `;
        } else {
            folderEl.className = 'group relative aspect-square rounded-xl border border-white/10 hover:border-indigo-500/50 bg-neutral-800/20 hover:bg-neutral-800/50 transition-all flex flex-col items-center justify-center gap-2';
            folderEl.innerHTML = `
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer folder-link">
                    <iconify-icon icon="solar:folder-bold" class="text-4xl text-indigo-400/50 group-hover:text-indigo-400/80 transition-colors"></iconify-icon>
                    <span class="text-sm font-medium text-neutral-300 group-hover:text-white text-center px-2 break-all">${folderName}</span>
                </div>
                <div class="absolute top-2 right-2 z-30">
                    <button class="dropdown-trigger p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors" onclick="event.stopPropagation(); toggleDropdown(this)">
                        <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
                    </button>
                    ${menuHtml}
                </div>
            `;
        }
        
        folderEl.querySelector('.folder-link').onclick = () => {
            if (movingItem) {
                // In move mode, clicking a folder navigates into it
                currentFolder = fullPath;
                renderBrowse();
            } else {
                isShowAllMode = false;
                currentFolder = fullPath;
                renderBrowse();
            }
        };
        grid.appendChild(folderEl);
    });

    // 2. Render Files
    const files = allDocuments.filter(d => d.name && (d.folder || '') === (currentFolder || ''));
    files.forEach(doc => grid.appendChild(createFileElement(doc)));

}

function createFileElement(doc) {
    const date = new Date(doc.timestamp).toLocaleDateString();
    // Add cache buster to image URL
    const imgUrl = doc.id ? `https://lh3.googleusercontent.com/d/${doc.id}?t=${new Date(doc.timestamp).getTime()}` : doc.url;
    
    const el = document.createElement('div');
    el.draggable = true;
    el.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', doc.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    // Dropdown Menu HTML
    const menuHtml = `
        <div class="dropdown-menu hidden absolute right-0 top-8 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <button onclick="event.stopPropagation(); editTags(allDocuments.find(d => d.id === '${doc.id}'))" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                <iconify-icon icon="solar:tag-linear" width="16"></iconify-icon> Tags
            </button>
            <button onclick="event.stopPropagation(); toggleSelect(allDocuments.find(d => d.id === '${doc.id}'))" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                <iconify-icon icon="solar:check-square-linear" width="16"></iconify-icon> Select
            </button>
            <button onclick="event.stopPropagation(); openEditModal(allDocuments.find(d => d.id === '${doc.id}'))" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                <iconify-icon icon="solar:pen-new-square-linear" width="16"></iconify-icon> Edit
            </button>
            <button onclick="event.stopPropagation(); downloadImage(allDocuments.find(d => d.id === '${doc.id}'))" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                <iconify-icon icon="solar:gallery-download-linear" width="16"></iconify-icon> Download Image
            </button>
            <button onclick="event.stopPropagation(); downloadPDF(allDocuments.find(d => d.id === '${doc.id}'))" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                <iconify-icon icon="solar:file-download-linear" width="16"></iconify-icon> Download PDF
            </button>
            <button onclick="event.stopPropagation(); toggleLock(allDocuments.find(d => d.id === '${doc.id}'))" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                <iconify-icon icon="${doc.locked ? 'solar:lock-unlocked-linear' : 'solar:lock-linear'}" width="16"></iconify-icon> ${doc.locked ? 'Unlock' : 'Lock'}
            </button>
            <button onclick="event.stopPropagation(); moveFile(allDocuments.find(d => d.id === '${doc.id}'))" class="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                <iconify-icon icon="solar:folder-with-files-linear" width="16"></iconify-icon> Move
            </button>
            <div class="h-px bg-white/5 my-1"></div>
            <button onclick="event.stopPropagation(); deleteFile(allDocuments.find(d => d.id === '${doc.id}'))" class="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon> Trash
            </button>
        </div>
    `;

    const lockIcon = doc.locked ? `<div class="absolute top-2 left-2 text-white/50"><iconify-icon icon="solar:lock-bold" width="14"></iconify-icon></div>` : '';
    const selectOverlay = doc.selected ? `<div class="absolute inset-0 bg-indigo-500/20 border-2 border-indigo-500 rounded-xl z-20 pointer-events-none"></div>` : '';

    if (currentViewMode === 'list') {
        el.className = 'group relative w-full bg-neutral-800/40 rounded-xl border border-white/5 hover:border-indigo-500/40 transition-all flex items-center p-3 gap-4';
        el.innerHTML = `
            ${selectOverlay}
            <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 relative">
                <img src="${imgUrl}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'">
                ${lockIcon}
            </div>
            <div class="flex-1 min-w-0 cursor-pointer file-link">
                <h3 class="text-sm font-medium text-white truncate" title="${doc.name}">${doc.name}</h3>
                <p class="text-[10px] text-neutral-400">${date} ${doc.tags ? '• ' + doc.tags : ''}</p>
            </div>
            <div class="relative">
                <button class="dropdown-trigger p-2 rounded-lg hover:bg-white/10 text-white transition-colors" onclick="event.stopPropagation(); toggleDropdown(this)">
                    <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
                </button>
                ${menuHtml}
            </div>
        `;
    } else {
        el.className = 'group relative aspect-square bg-neutral-800/40 rounded-xl border border-white/5 hover:border-indigo-500/40 transition-all overflow-hidden';
        el.innerHTML = `
            ${selectOverlay}
            <div class="absolute inset-0 cursor-pointer file-link">
                <img src="${imgUrl}" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.style.display='none'">
                <div class="absolute inset-0 flex items-center justify-center">
                     <iconify-icon icon="solar:gallery-wide-linear" class="text-neutral-600 text-4xl"></iconify-icon>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                ${lockIcon}
                <div class="absolute bottom-4 left-4 right-4">
                    <h3 class="text-sm font-medium text-white truncate" title="${doc.name}">${doc.name}</h3>
                    <p class="text-[10px] text-neutral-400 mt-1 truncate">${date} ${doc.tags ? '• ' + doc.tags : ''}</p>
                </div>
            </div>
            <div class="absolute top-2 right-2 z-30">
                <button class="dropdown-trigger p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors" onclick="event.stopPropagation(); toggleDropdown(this)">
                    <iconify-icon icon="solar:menu-dots-bold" width="20"></iconify-icon>
                </button>
                ${menuHtml}
            </div>
        `;
    }

    el.querySelector('.file-link').onclick = () => openImagePreview(imgUrl);
    return el;
}

window.toggleDropdown = function(btn) {
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(el => {
        if (el !== btn.nextElementSibling) el.classList.add('hidden');
    });
    const menu = btn.nextElementSibling;
    menu.classList.toggle('hidden');
    
    // Adjust position if it goes off screen (basic check)
    const rect = menu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
        menu.style.top = 'auto';
        menu.style.bottom = '100%';
    } else {
        menu.style.top = '100%';
        menu.style.bottom = 'auto';
    }
};

// --- New Feature Implementations ---

window.openEditModal = function(doc) {
    currentEditingDoc = doc;
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    document.getElementById('edit-crop-btn').onclick = () => {
        closeEditModal();
        editImage(doc);
    };
    
    document.getElementById('edit-rename-btn').onclick = () => {
        closeEditModal();
        renameFile(doc);
    };
};

window.closeEditModal = function() {
    const modal = document.getElementById('edit-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.editTags = function(doc) {
    const tags = prompt("Enter tags (comma separated):", doc.tags || "");
    if (tags !== null) {
        doc.tags = tags;
        renderBrowse(); // Optimistic update
        // In a real app, save to backend
        // performAction('updateTags', { fileId: doc.id, tags: tags });
    }
};

window.toggleSelect = function(doc) {
    doc.selected = !doc.selected;
    renderBrowse();
};

window.toggleLock = function(doc) {
    doc.locked = !doc.locked;
    renderBrowse();
    // performAction('toggleLock', { fileId: doc.id, locked: doc.locked });
};

window.downloadImage = function(doc) {
    const link = document.createElement('a');
    link.href = `https://lh3.googleusercontent.com/d/${doc.id}`;
    link.download = doc.name || 'image.jpg';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.downloadPDF = function(doc) {
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `https://lh3.googleusercontent.com/d/${doc.id}`;
    img.onload = function() {
        const imgProps = docPdf.getImageProperties(img);
        const pdfWidth = docPdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        docPdf.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        docPdf.save(`${doc.name || 'document'}.pdf`);
    };
    img.onerror = function() {
        showAlert("Failed to load image for PDF generation.", "error");
    };
};

window.moveFile = function(doc) {
    if (doc.locked) {
        showAlert("This file is locked and cannot be moved.", "error");
        return;
    }
    movingItem = { type: 'file', id: doc.id, name: doc.name };
    renderBrowse(); // Re-render to show move UI
};

// --- Folder Actions ---

window.editFolderTags = function(folderPath) {
    // In a real app, folder metadata would be stored. Here we just mock it or store in a separate structure.
    // For simplicity, we'll just show an alert as we don't have a folder object in allDocuments to store tags on easily without refactoring.
    // But let's try to find if we can attach it to the first doc in folder or similar? No, that's bad.
    // We'll just alert for now as "Not implemented fully" or store in a global object.
    const tags = prompt("Enter tags for folder (comma separated):", "");
    if (tags !== null) {
        showAlert(`Tags '${tags}' saved for folder (mock).`, "success");
    }
};

window.toggleFolderSelect = function(folderPath) {
    // Select all files in folder? Or just visual selection of folder?
    // Let's just toggle a visual state if we had a folder object.
    // Since we regenerate folder elements every render, we need state.
    // We'll skip visual selection persistence for folders for now or implement a simple set.
    showAlert("Folder selected (mock).", "success");
};

window.toggleFolderLock = function(folderPath) {
    // Lock all files in folder?
    const filesInFolder = allDocuments.filter(d => d.folder === folderPath || (d.folder && d.folder.startsWith(folderPath + '/')));
    const newLockState = !filesInFolder.some(d => d.locked); // If any unlocked, lock all. If all locked, unlock all.
    filesInFolder.forEach(d => d.locked = newLockState);
    renderBrowse();
    showAlert(`Folder ${newLockState ? 'locked' : 'unlocked'}.`, "success");
};

window.moveFolder = function(folderPath) {
    const folderName = folderPath.split('/').pop();
    movingItem = { type: 'folder', path: folderPath, name: folderName };
    renderBrowse(); // Re-render to show move UI
};

window.confirmMove = function() {
    if (!movingItem) return;
    
    const targetFolder = currentFolder || ""; // Root is empty string
    
    if (movingItem.type === 'file') {
        moveFileToFolder(movingItem.id, targetFolder);
    } else if (movingItem.type === 'folder') {
        // Prevent moving folder into itself
        if (targetFolder.startsWith(movingItem.path)) {
            showAlert("Cannot move a folder into itself.", "error");
            return;
        }
        
        // Move folder logic
        const oldPath = movingItem.path;
        const folderName = movingItem.name;
        const newPath = targetFolder ? `${targetFolder}/${folderName}` : folderName;
        
        // Update all files in this folder
        allDocuments.forEach(d => {
            if (d.folder === oldPath) {
                d.folder = newPath;
            } else if (d.folder && d.folder.startsWith(oldPath + '/')) {
                const suffix = d.folder.substring(oldPath.length);
                d.folder = newPath + suffix;
            }
        });
        
        // performAction('moveFolder', ...); // In real app
        showAlert(`Moved "${folderName}" to "${targetFolder || 'Root'}"`, "success");
    }
    
    movingItem = null;
    renderBrowse();
};

window.cancelMove = function() {
    movingItem = null;
    renderBrowse();
};


// --- Existing Functions Updates ---

async function renameFolder(oldName, oldPath) {
    const newName = await showInput("Rename Folder", "Enter a new name for the folder.", oldName);
    if (newName && newName.trim() !== "" && newName.trim() !== oldName && !newName.includes('/')) {
        const trimmedNewName = newName.trim();
        
        // Calculate new path prefix
        const pathParts = oldPath.split('/');
        pathParts.pop();
        const parentPath = pathParts.join('/');
        const newPath = parentPath ? parentPath + '/' + trimmedNewName : trimmedNewName;

        // Optimistic Update
        allDocuments.forEach(doc => { 
            if (doc.folder === oldPath) doc.folder = newPath;
            else if (doc.folder && doc.folder.startsWith(oldPath + '/')) {
                doc.folder = newPath + doc.folder.substring(oldPath.length);
            }
        });
        
        renderBrowse(); // Optimistic update

        const result = await performAction('renameFolder', { oldPath: oldPath, newName: trimmedNewName });
        if (!result) fetchDocuments(); // Revert/Refresh on failure
    }
}

async function deleteFolder(folderPath) {
    if (confirm(`Are you sure you want to delete the folder and all its contents? This cannot be undone.`)) {
        const originalDocs = [...allDocuments];
        allDocuments = allDocuments.filter(d => d.folder !== folderPath && (!d.folder || !d.folder.startsWith(folderPath + '/')));
        renderBrowse(); // Optimistic update
        const result = await performAction('deleteFolder', { folderPath: folderPath });
        if (!result) { // Revert on failure
            allDocuments = originalDocs;
            renderBrowse();
        }
    }
}

function renderRecentActivity(data) {
    const list = document.getElementById('recent-list');
    if (!list) return;
    list.innerHTML = '';
    
    data.filter(d => d.name).slice(0, 5).forEach(doc => {
        const date = new Date(doc.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const el = document.createElement('div');
        el.className = 'group p-3 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/5 transition-all cursor-pointer';
        el.innerHTML = `
            <div class="flex gap-3">
                 <div class="w-10 h-14 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0 relative flex items-center justify-center border border-white/5">
                    <iconify-icon icon="solar:file-text-linear" class="text-neutral-500" width="20"></iconify-icon>
                </div>
                <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                    <h3 class="text-xs font-medium text-neutral-300 truncate group-hover:text-white">${doc.name}</h3>
                    <p class="text-[10px] text-neutral-500">${date}</p>
                </div>
            </div>
        `;
        list.appendChild(el);
    });
}

// UI Toggles
window.setMode = function(btn) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
};

window.toggleGrid = function(btn) {
    const grid = document.getElementById('grid-lines');
    const isVisible = grid.style.opacity === '1';
    grid.style.opacity = isVisible ? '0' : '1';
    btn.classList.toggle('text-indigo-400');
    btn.classList.toggle('text-neutral-400');
};

window.toggleAuto = function(btn) {
    const span = btn.querySelector('span');
    if(span.innerText === 'AUTO') {
        span.innerText = 'MANUAL';
        btn.classList.replace('text-indigo-400', 'text-yellow-400');
    } else {
        span.innerText = 'AUTO';
        btn.classList.replace('text-yellow-400', 'text-indigo-400');
    }
};