const SCRIPT_URL = CONFIG.GOOGLE_SHEET_URL_LOAN

document.addEventListener('DOMContentLoaded', () => {
    const loanForm = document.getElementById('loanForm');
    if (loanForm) {
        loanForm.addEventListener('submit', handleFormSubmit);
        // Set default date to today
        document.getElementById('date').valueAsDate = new Date();
    }
});

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const messageDiv = document.getElementById('message');

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    messageDiv.textContent = '';
    messageDiv.className = '';
    messageDiv.style.display = 'none';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Clean up amount field (remove commas)
    if (data.amount) {
        data.amount = parseFloat(data.amount.replace(/,/g, ''));
    }

    // Convert date from YYYY-MM-DD to DD/MMM/YYYY
    if (data.date) {
        data.date = formatDateForSheet(data.date);
    }
    // Combine tenure value and type
    if (data.tenure && data.tenureType) {
        data.tenure = `${data.tenure} ${data.tenureType}`;
        delete data.tenureType;
    }

    // Check if editing
    const editId = submitButton.dataset.editId;
    if (editId) {
        data.action = 'updateLoan';
        data.id = editId;
    } else {
        data.action = 'addLoan';
    }

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            messageDiv.textContent = editId ? 'Loan updated successfully!' : 'Loan saved successfully!';
            messageDiv.className = 'success';
            messageDiv.style.display = 'block';
            form.reset();
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('amountText').textContent = '';
            submitButton.removeAttribute('data-edit-id');
            document.getElementById('submitBtnText').textContent = 'Save Transaction';
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        messageDiv.textContent = 'Error saving loan: ' + error.message;
        messageDiv.className = 'error';
        messageDiv.style.display = 'block';
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save"></i> <span id="submitBtnText">' + (editId ? 'Update Transaction' : 'Save Transaction') + '</span>';
    });
}

function fetchLoans() {
    const loadingDiv = document.getElementById('loading');
    const table = document.getElementById('loanTable');
    const tbody = document.getElementById('loanTableBody');

    fetch(`${SCRIPT_URL}?action=getLoans`)
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            loadingDiv.style.display = 'none';
            table.style.display = 'table';
            tbody.innerHTML = '';

            result.data.forEach(loan => {
                const row = document.createElement('tr');
                const date = formatDisplayDate(loan.date);
                
                row.innerHTML = `
                    <td>${date}</td>
                    <td>${loan.name}</td>
                    <td>${loan.amount}</td>
                    <td>${loan.interestRate}</td>
                    <td>${loan.tenure || '-'}</td>
                    <td>${loan.type}</td>
                    <td>${loan.remarks}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            throw new Error(result.message || 'Failed to fetch data');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        loadingDiv.innerHTML = '<i class="fas fa-exclamation-circle fa-2x"></i><p>Error loading data: ' + error.message + '</p>';
        loadingDiv.className = 'error';
    });
}

function formatDateForSheet(yyyyMmDd) {
    // Input: YYYY-MM-DD
    if (!yyyyMmDd) return '';
    const parts = yyyyMmDd.split('-');
    if (parts.length !== 3) return yyyyMmDd;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[monthIndex];
    
    return `${day}/${month}/${year}`;
}

function formatDisplayDate(dateVal) {
    if (!dateVal) return '';
    
    // If it's already in DD/MMM/YYYY format (simple check)
    if (typeof dateVal === 'string' && /^\d{2}\/[A-Za-z]{3}\/\d{4}$/.test(dateVal)) {
        return dateVal;
    }

    // If it's a date string (ISO) or timestamp
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return dateVal;

    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}
