const dateInput = document.getElementById('date');
const scriptURL = CONFIG.GOOGLE_SHEET_URL_RENT; // Replace with your Google Apps Script URL
const form = document.getElementById('tenetForm');
const submitButton = form.querySelector('button[type="submit"]');

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

function formatAndSetDate(el) {
    // We'll keep the native date picker behavior for better UX on mobile/modern browsers
    // but we can ensure the value is valid.
    // The previous logic switching to type='text' is often problematic for UX consistency.
    // We will handle the formatting strictly during submission.
}

function calculateTotal() {
    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    const waterBill = parseFloat(document.getElementById('waterBill').value) || 0;
    const balanceAmount = parseFloat(document.getElementById('balanceAmount').value) || 0;

    const totalPaid = (paidAmount + waterBill) - balanceAmount;
    document.getElementById('totalPaid').value = totalPaid.toFixed(2);
}

function initializeForm() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Set standard YYYY-MM-DD for the input to recognize it
    dateInput.value = `${year}-${month}-${day}`;

    calculateTotal();
}

function clearForm() {
    form.reset();
    initializeForm();
}

form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Format the date for the backend
    const rawDate = dateInput.value;
    const formattedDate = formatDateForSheet(rawDate);

    const formData = {
        date: formattedDate,
        rentAmount: document.getElementById('rentAmount').value || '0',
        paidAmount: document.getElementById('paidAmount').value || '0',
        balanceAmount: document.getElementById('balanceAmount').value || 0,
        powerBill: document.getElementById('powerBill').value || '0',
        waterBill: document.getElementById('waterBill').value || '0',
        totalPaid: document.getElementById('totalPaid').value,
        remarks: document.getElementById('remarks').value || '-'
    };

    if (!rawDate) {
        alert('Please select a Date.');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    const data = new FormData();
    for (const key in formData) {
        data.append(key, formData[key]);
    }

    fetch(scriptURL, { method: 'POST', body: data})
        .then(response => response.json())
        .then(res => {
            if (res.result === 'success') {
                const recordsContainer = document.getElementById('recordsContainer');
                if (recordsContainer.style.display === 'none' || recordsContainer.classList.contains('hidden')) {
                    recordsContainer.style.display = 'block';
                    recordsContainer.classList.remove('hidden');
                }

                const tableBody = document.getElementById('recordsTableBody');
                const newRow = tableBody.insertRow(0);

                newRow.innerHTML = `
                    <td>${formData.date}</td>
                    <td>${formData.rentAmount}</td>
                    <td>${formData.paidAmount}</td>
                    <td>${formData.balanceAmount}</td>
                    <td>${formData.powerBill}</td>
                    <td>${formData.waterBill}</td>
                    <td>${formData.totalPaid}</td>
                    <td>${formData.remarks}</td>
                `;
                
                clearForm();
                alert('Record saved successfully!');
            } else {
                throw new Error(res.error || 'Unknown error occurred');
            }
        })
        .catch(error => {
            console.error('Error!', error.message);
            alert('An error occurred while saving the record.');
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit';
        });
});

window.onload = initializeForm;