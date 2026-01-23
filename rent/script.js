const dateInput = document.getElementById('date');
let formattedDateValue = '';
const scriptURL = CONFIG.GOOGLE_SHEET_URL_RENT; // Replace with your Google Apps Script URL
const form = document.getElementById('tenetForm');
const submitButton = form.querySelector('button[type="submit"]');

function formatAndSetDate(el) {
    el.type = 'text';
    if (el.value) {
        const date = new Date(el.value);
        if (!isNaN(date.getTime())) {
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getUTCFullYear();
            formattedDateValue = `${day}/${month}/${year}`;
            el.value = formattedDateValue;
        }
    } else {
         el.value = formattedDateValue;
    }
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
    const day = String(today.getDate()).padStart(2, '0');
    const month = today.toLocaleString('default', { month: 'short' });
    const year = today.getFullYear();
    formattedDateValue = `${day}/${month}/${year}`;
    dateInput.value = formattedDateValue;

    calculateTotal();
}

function clearForm() {
    form.reset();
    initializeForm();
}

form.addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = {
        date: dateInput.value,
        rentAmount: document.getElementById('rentAmount').value || '0',
        paidAmount: document.getElementById('paidAmount').value || '0',
        balanceAmount: document.getElementById('balanceAmount').value || 0,
        powerBill: document.getElementById('powerBill').value || '0',
        waterBill: document.getElementById('waterBill').value || '0',
        totalPaid: document.getElementById('totalPaid').value,
        remarks: document.getElementById('remarks').value || '-'
    };

    if (!formData.date) {
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
                if (recordsContainer.style.display === 'none') {
                    recordsContainer.style.display = 'block';
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