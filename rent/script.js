const dateInput = document.getElementById('date');
const scriptURL = CONFIG.GOOGLE_SHEET_URL_RENT; // Replace with your Google Apps Script URL
const form = document.getElementById('tenetForm');
const submitButton = form.querySelector('button[type="submit"]');
const loader = document.getElementById('loader');

let isEditMode = false;
let originalDate = null;
let originalSide = null;

// Helper to format date as DD/MMM/YYYY
function formatDateForSheet(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return as is if not a valid date (already formatted?)
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Helper to parse DD-MMM-YYYY or DD/MMM/YYYY back to YYYY-MM-DD for input
function parseDateToISO(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateTotal() {
    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    const waterBill = parseFloat(document.getElementById('waterBill').value) || 0;
    const balanceAmount = parseFloat(document.getElementById('balanceAmount').value) || 0;

    const totalPaid = (paidAmount + waterBill) - balanceAmount;
    document.getElementById('totalPaid').value = totalPaid.toFixed(2);
}

function initializeForm() {
    const editData = sessionStorage.getItem('tenetEditData');
    
    if (editData) {
        isEditMode = true;
        const data = JSON.parse(editData);
        sessionStorage.removeItem('tenetEditData'); // Clear after loading
        
        // Populate fields
        dateInput.value = parseDateToISO(data.date);
        originalDate = data.date; // Store original formatted date for lookup
        originalSide = data.side;

        const sideSelect = document.getElementById('side');
        if (sideSelect) sideSelect.value = data.side;
        
        document.getElementById('rentAmount').value = data.rentAmount;
        document.getElementById('paidAmount').value = data.paidAmount;
        document.getElementById('balanceAmount').value = data.balanceAmount;
        document.getElementById('powerBill').value = data.powerBill;
        document.getElementById('waterBill').value = data.waterBill;
        document.getElementById('totalPaid').value = data.totalPaid;
        document.getElementById('remarks').value = data.remarks;
        
        submitButton.textContent = 'Update';
        submitButton.innerHTML = '<i class="fa-solid fa-check"></i> Update';
        
    } else {
        // Default initialization
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        dateInput.value = `${year}-${month}-${day}`;
        calculateTotal();
        
        const sideSelect = document.getElementById('side');
        if (sideSelect) sideSelect.value = "";
    }
}

function clearForm() {
    form.reset();
    isEditMode = false;
    originalDate = null;
    originalSide = null;
    submitButton.textContent = 'Submit';
    submitButton.innerHTML = '<i class="fa-solid fa-check"></i> Submit';
    initializeForm(); // Re-init to set default date
}

form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Format the date for the backend
    const rawDate = dateInput.value;
    const formattedDate = formatDateForSheet(rawDate);

    const formData = {
        date: formattedDate,
        side: document.getElementById('side').value,
        rentAmount: document.getElementById('rentAmount').value || '0',
        paidAmount: document.getElementById('paidAmount').value || '0',
        balanceAmount: document.getElementById('balanceAmount').value || 0,
        powerBill: document.getElementById('powerBill').value || '0',
        waterBill: document.getElementById('waterBill').value || '0',
        totalPaid: document.getElementById('totalPaid').value,
        remarks: document.getElementById('remarks').value || '-',
        action: isEditMode ? 'update' : 'add',
        originalDate: originalDate,
        originalSide: originalSide
    };

    if (!rawDate) {
        alert('Please select a Date.');
        return;
    }
    
    if (!formData.side) {
        alert('Please select a Side.');
        return;
    }

    // Show Loader
    loader.classList.remove('hidden');
    submitButton.disabled = true;
    submitButton.textContent = isEditMode ? 'Updating...' : 'Saving...';

    // Send as JSON string
    fetch(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(res => {
        if (res.result === 'success') {
            alert(isEditMode ? 'Record updated successfully!' : 'Record saved successfully!');
            
            if (isEditMode) {
                window.location.href = 'tenetreport.html';
            } else {
                const recordsContainer = document.getElementById('recordsContainer');
                if (recordsContainer.style.display === 'none' || recordsContainer.classList.contains('hidden')) {
                    recordsContainer.style.display = 'block';
                    recordsContainer.classList.remove('hidden');
                }

                const tableBody = document.getElementById('recordsTableBody');
                const newRow = tableBody.insertRow(0);

                newRow.innerHTML = `
                    <td>${formData.date}</td>
                    <td>${formData.side}</td>
                    <td>${formData.rentAmount}</td>
                    <td>${formData.paidAmount}</td>
                    <td>${formData.balanceAmount}</td>
                    <td>${formData.powerBill}</td>
                    <td>${formData.waterBill}</td>
                    <td>${formData.totalPaid}</td>
                    <td>${formData.remarks}</td>
                `;
                
                clearForm();
            }
        } else {
            throw new Error(res.error || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error!', error.message);
        alert('An error occurred: ' + error.message);
    })
    .finally(() => {
        // Hide Loader
        loader.classList.add('hidden');
        submitButton.disabled = false;
        submitButton.textContent = isEditMode ? 'Update' : 'Submit';
    });
});

window.onload = initializeForm;