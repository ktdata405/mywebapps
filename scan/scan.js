// Global State
let stream = null;
let currentModule = 'camera';
let allDocuments = [];
let currentFolder = null; // null for root, or folder name string
let selectedFilesForUpload = [];
let capturedImages = [];
let isShowAllMode = false;

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

    if (document.getElementById('module-menu')) {
        switchModule('menu');
    } else {
        switchModule('camera');
        fetchDocuments();
    }
});

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
    const modal = document.getElementById('folder-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('scan-folder-input').value = '';
    document.getElementById('scan-folder-input').focus();
};

window.closeFolderModal = function() {
    document.getElementById('folder-modal').classList.add('hidden');
    document.getElementById('folder-modal').classList.remove('flex');
};

window.saveScans = async function() {
    const folderName = document.getElementById('scan-folder-input').value.trim();
    closeFolderModal();
    
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    loader.classList.remove('hidden');
    loader.classList.add('flex');
    if (loaderText) loaderText.innerHTML = `Uploading ${capturedImages.length} files...`;

    try {
       await uploadFiles(capturedImages, folderName);
        capturedImages = [];
        const badge = document.getElementById('scan-count-badge');
        if(badge) badge.classList.add('hidden');
        
        switchModule('browse');
        fetchDocuments();
    } catch (e) {
        console.error(e);
        showAlert("Upload failed: " + e.message, "error");
    } finally {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
        if (loaderText) loaderText.textContent = 'Processing...';
    }
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
    selectedFilesForUpload = Array.from(files);
    
    document.getElementById('initial-upload-ui').classList.add('hidden');
    document.getElementById('upload-preview-container').classList.remove('hidden');

    const list = document.getElementById('upload-list');
    list.innerHTML = '';
    selectedFilesForUpload.forEach(file => {
        const item = document.createElement('div');
        item.className = 'w-full bg-white/5 rounded-lg p-3 border border-white/5 flex items-center gap-3';
        item.innerHTML = `
            <div class="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-indigo-400 flex-shrink-0">
                 <iconify-icon icon="solar:file-text-linear" width="16"></iconify-icon>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-xs text-white truncate">${file.name}</p>
                <p class="text-[10px] text-neutral-400">${(file.size / 1024).toFixed(1)} KB</p>
            </div>
        `;
        list.appendChild(item);
    });
};

function cancelUpload() {
    selectedFilesForUpload = [];
    document.getElementById('initial-upload-ui').classList.remove('hidden');
    document.getElementById('upload-preview-container').classList.add('hidden');
    document.getElementById('folder-name-input').value = '';
    document.getElementById('file-input').value = ''; // Reset file input
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
    const folderName = prompt("Enter new folder name:");
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
    const newName = prompt("Enter new file name:", doc.name);
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

    grid.innerHTML = '';

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
            folderEl.className = 'group relative aspect-square rounded-xl border border-white/10 hover:border-indigo-500/50 bg-neutral-800/20 hover:bg-neutral-800/50 transition-all flex flex-col items-center justify-center gap-2';
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
            folderEl.innerHTML = `
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer folder-link">
                    <iconify-icon icon="solar:folder-bold" class="text-4xl text-indigo-400/50 group-hover:text-indigo-400/80 transition-colors"></iconify-icon>
                    <span class="text-sm font-medium text-neutral-300 group-hover:text-white text-center px-2 break-all">${folderName}</span>
                </div>
                <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 z-10">
                    <button title="Rename Folder" class="rename-folder-btn w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-indigo-500">
                        <iconify-icon icon="solar:pen-new-square-linear" width="16"></iconify-icon>
                    </button>
                    <button title="Delete Folder" class="delete-folder-btn w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500">
                        <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon>
                    </button>
                </div>
            `;
            folderEl.querySelector('.folder-link').onclick = () => {
                isShowAllMode = false;
                currentFolder = fullPath;
                renderBrowse();
            };
            folderEl.querySelector('.rename-folder-btn').onclick = (e) => { e.stopPropagation(); renameFolder(folderName, fullPath); };
            folderEl.querySelector('.delete-folder-btn').onclick = (e) => { e.stopPropagation(); deleteFolder(fullPath); };
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
        folderEl.className = 'group relative aspect-square rounded-xl border border-white/10 hover:border-indigo-500/50 bg-neutral-800/20 hover:bg-neutral-800/50 transition-all flex flex-col items-center justify-center gap-2';
        folderEl.innerHTML = `
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer folder-link">
                <iconify-icon icon="solar:folder-bold" class="text-4xl text-indigo-400/50 group-hover:text-indigo-400/80 transition-colors"></iconify-icon>
                <span class="text-sm font-medium text-neutral-300 group-hover:text-white text-center px-2 break-all">${folderName}</span>
            </div>
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 z-10">
                <button title="Rename Folder" class="rename-folder-btn w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-indigo-500">
                    <iconify-icon icon="solar:pen-new-square-linear" width="16"></iconify-icon>
                </button>
                <button title="Delete Folder" class="delete-folder-btn w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500">
                    <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon>
                </button>
            </div>
        `;
        folderEl.querySelector('.folder-link').onclick = () => {
            currentFolder = fullPath;
            renderBrowse();
        };
        folderEl.querySelector('.rename-folder-btn').onclick = (e) => { e.stopPropagation(); renameFolder(folderName, fullPath); };
        folderEl.querySelector('.delete-folder-btn').onclick = (e) => { e.stopPropagation(); deleteFolder(fullPath); };
        grid.appendChild(folderEl);
    });

    // 2. Render Files
    const files = allDocuments.filter(d => d.name && (d.folder || '') === (currentFolder || ''));
    files.forEach(doc => grid.appendChild(createFileElement(doc)));

}

function createFileElement(doc) {
    const date = new Date(doc.timestamp).toLocaleDateString();
    const imgUrl = doc.id ? `https://lh3.googleusercontent.com/d/${doc.id}` : doc.url;
    
    const el = document.createElement('div');
    el.className = 'group relative aspect-square bg-neutral-800/40 rounded-xl border border-white/5 hover:border-indigo-500/40 transition-all overflow-hidden';
    el.draggable = true;
    el.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', doc.id);
        e.dataTransfer.effectAllowed = 'move';
    };
    el.innerHTML = `
        <div class="absolute inset-0 cursor-pointer file-link">
            <img src="${imgUrl}" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.style.display='none'">
            <div class="absolute inset-0 flex items-center justify-center">
                 <iconify-icon icon="solar:gallery-wide-linear" class="text-neutral-600 text-4xl"></iconify-icon>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
            <div class="absolute bottom-4 left-4 right-4">
                <h3 class="text-sm font-medium text-white truncate" title="${doc.name}">${doc.name}</h3>
                <p class="text-[10px] text-neutral-400 mt-1">${date}</p>
            </div>
        </div>
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 z-10">
            <button title="Rename" class="rename-btn w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-indigo-500">
                <iconify-icon icon="solar:pen-new-square-linear" width="16"></iconify-icon>
            </button>
            <button title="Replace" class="replace-btn w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-green-500">
                <iconify-icon icon="solar:refresh-linear" width="16"></iconify-icon>
            </button>
            <button title="Delete" class="delete-btn w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500">
                <iconify-icon icon="solar:trash-bin-trash-linear" width="16"></iconify-icon>
            </button>
        </div>
    `;
    el.querySelector('.file-link').onclick = () => window.open(doc.url, '_blank');
    el.querySelector('.rename-btn').onclick = (e) => { e.stopPropagation(); renameFile(doc); };
    el.querySelector('.replace-btn').onclick = (e) => { e.stopPropagation(); triggerReplaceFile(doc); };
    el.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteFile(doc); };
    return el;
}

async function renameFolder(oldName, oldPath) {
    const newName = prompt("Enter new folder name:", oldName);
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