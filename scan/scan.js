document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const previewContainer = document.getElementById('preview-container');
    const cancelBtn = document.getElementById('cancel-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const cropModal = document.getElementById('crop-modal');
    const cropImage = document.getElementById('crop-image');
    const cropCancel = document.getElementById('crop-cancel');
    const cropSave = document.getElementById('crop-save');
    const loader = document.getElementById('loader');
    const bottomBar = document.getElementById('bottom-bar');
    const selectedCount = document.getElementById('selected-count');

    let files = [];
    let cropper;
    let currentFileIndex = -1;

    // Handle file selection
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Drag and Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('bg-white/[0.05]');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('bg-white/[0.05]');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('bg-white/[0.05]');
        handleFiles({ target: { files: e.dataTransfer.files } });
    });

    fileInput.addEventListener('change', handleFiles);

    function handleFiles(e) {
        const newFiles = Array.from(e.target.files);
        let addedCount = 0;
        newFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                files.push(file);
                addPreview(file);
                addedCount++;
            }
        });
        fileInput.value = ''; // Reset input
        updateUI();
    }

    function updateUI() {
        if (files.length > 0) {
            bottomBar.classList.remove('translate-y-[150%]');
            uploadArea.classList.add('hidden');
            uploadArea.classList.remove('flex');
            previewContainer.classList.remove('hidden');
            previewContainer.classList.add('grid');
        } else {
            bottomBar.classList.add('translate-y-[150%]');
            uploadArea.classList.remove('hidden');
            uploadArea.classList.add('flex');
            previewContainer.classList.add('hidden');
            previewContainer.classList.remove('grid');
        }
        selectedCount.textContent = files.length;
    }

    function addPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'relative group bg-[#151a25] border border-white/5 rounded-2xl overflow-hidden shadow-lg hover:shadow-indigo-500/10 transition-all duration-300';
            div.innerHTML = `
                <div class="relative aspect-[4/3] overflow-hidden bg-black/40">
                    <img src="${e.target.result}" class="w-full h-full object-contain" alt="Preview">
                    <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button class="crop-btn w-8 h-8 rounded-xl bg-black/50 hover:bg-indigo-500 text-white backdrop-blur-md flex items-center justify-center transition-all border border-white/10 shadow-lg">
                            <i class="fa-solid fa-crop-simple text-xs"></i>
                        </button>
                        <button class="delete-btn w-8 h-8 rounded-xl bg-black/50 hover:bg-red-500 text-white backdrop-blur-md flex items-center justify-center transition-all border border-white/10 shadow-lg">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
                <div class="p-3">
                    <p class="text-gray-200 text-sm font-medium truncate" title="${file.name}">${file.name}</p>
                    <p class="text-gray-500 text-xs mt-0.5">${(file.size / 1024).toFixed(1)} KB</p>
                </div>
            `;
            
            // Delete functionality
            div.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const index = Array.from(previewContainer.children).indexOf(div);
                files.splice(index, 1);
                div.remove();
                updateUI();
            });

            // Crop functionality
            div.querySelector('.crop-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                currentFileIndex = Array.from(previewContainer.children).indexOf(div);
                openCropModal(e.target.result); // Pass the image source directly
            });

            previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
    }

    function openCropModal(imageSrc) {
        cropImage.src = imageSrc;
        cropModal.classList.remove('hidden');
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropImage, {
            viewMode: 1,
            autoCropArea: 1,
            background: false,
        });
    }

    cropCancel.addEventListener('click', () => {
        cropModal.classList.add('hidden');
        if (cropper) cropper.destroy();
    });

    cropSave.addEventListener('click', () => {
        if (cropper) {
            cropper.getCroppedCanvas().toBlob((blob) => {
                const oldFile = files[currentFileIndex];
                const newFile = new File([blob], oldFile.name, {
                    type: oldFile.type,
                    lastModified: Date.now()
                });
                files[currentFileIndex] = newFile;
                
                // Update preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    const card = previewContainer.children[currentFileIndex];
                    const img = card.querySelector('img');
                    img.src = e.target.result;
                    // Update size text
                    const sizeText = card.querySelectorAll('p')[1];
                    sizeText.textContent = (newFile.size / 1024).toFixed(1) + ' KB';
                };
                reader.readAsDataURL(newFile);

                cropModal.classList.add('hidden');
                cropper.destroy();
            });
        }
    });

    cancelBtn.addEventListener('click', () => {
        if(confirm('Clear all selected files?')) {
            files = [];
            previewContainer.innerHTML = '';
            updateUI();
        }
    });

    uploadBtn.addEventListener('click', async () => {
        if (files.length === 0) return;

        loader.classList.remove('hidden');
        
        try {
            // Convert files to Base64
            const filePromises = files.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({
                        name: file.name,
                        type: file.type,
                        data: reader.result.split(',')[1] // Remove data URL prefix
                    });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            const processedFiles = await Promise.all(filePromises);

            // Send to Google Apps Script
            const response = await fetch(CONFIG.GOOGLE_SHEET_URL_SCAN, {
                method: 'POST',
                body: JSON.stringify({ files: processedFiles })
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert('Files uploaded successfully!');
                files = [];
                previewContainer.innerHTML = '';
                updateUI();
            } else {
                throw new Error(result.message || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload Error:', error);
            alert('Error uploading files: ' + error.message);
        } finally {
            loader.classList.add('hidden');
        }
    });
});