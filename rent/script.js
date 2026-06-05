const dateInput = document.getElementById('date');
const form = document.getElementById('tenetForm');
const submitButton = form.querySelector('button[type="submit"]');
const loader = document.getElementById('loader');

const sheetURL = CONFIG.GOOGLE_SHEET_URL_RENT;
const neonSyncURL = CONFIG.RENT_SYNC_API_URL || '/api/rent-sync';

let isEditMode = false;
let originalDate = null;
let originalSide = null;

function formatDateForSheet(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function parseDateToISO(dateString) {
    if (!dateString) return '';

    const ddMmm = String(dateString).trim().match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
    if (ddMmm) {
        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            .findIndex((m) => m.toLowerCase() === ddMmm[2].toLowerCase());
        if (monthIndex !== -1) {
            const d = String(Number(ddMmm[1])).padStart(2, '0');
            const m = String(monthIndex + 1).padStart(2, '0');
            return `${ddMmm[3]}-${m}-${d}`;
        }
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toNumber(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function calculateTotal() {
    const paidAmount = toNumber(document.getElementById('paidAmount').value);
    const waterBill = toNumber(document.getElementById('waterBill').value);
    const balanceAmount = toNumber(document.getElementById('balanceAmount').value);

    const totalPaid = (paidAmount + waterBill) - balanceAmount;
    document.getElementById('totalPaid').value = totalPaid.toFixed(2);
}

function changeDate(days) {
    const currentVal = dateInput.value;
    if (!currentVal) return;

    const dateObj = new Date(currentVal);
    if (isNaN(dateObj.getTime())) return;

    dateObj.setDate(dateObj.getDate() + days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateObj <= today) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        dateInput.value = `${y}-${m}-${d}`;
    }
}

function getRecordPayload() {
    const rawDate = dateInput.value;
    const formattedDate = formatDateForSheet(rawDate);
    const side = document.getElementById('side').value;

    return {
        rawDate,
        formattedDate,
        side,
        rentAmount: toNumber(document.getElementById('rentAmount').value),
        paidAmount: toNumber(document.getElementById('paidAmount').value),
        balanceAmount: toNumber(document.getElementById('balanceAmount').value),
        powerBill: toNumber(document.getElementById('powerBill').value),
        waterBill: toNumber(document.getElementById('waterBill').value),
        totalPaid: toNumber(document.getElementById('totalPaid').value),
        remarks: (document.getElementById('remarks').value || '').trim() || '-'
    };
}

function showSuccessAndContinue() {
    KTui.alert('Success', isEditMode ? 'Record updated in Neon + Google Sheet.' : 'Record saved in Neon + Google Sheet.', 'success');
    // Move to report so the list is always read back from backend sources.
    setTimeout(() => {
        window.location.href = 'tenetreport.html';
    }, 250);
}

function initializeForm() {
    const editData = sessionStorage.getItem('tenetEditData');

    if (editData) {
        isEditMode = true;
        const data = JSON.parse(editData);
        sessionStorage.removeItem('tenetEditData');

        dateInput.value = parseDateToISO(data.date);
        originalDate = data.date;
        originalSide = data.side;

        document.getElementById('side').value = data.side || '';
        document.getElementById('rentAmount').value = data.rentAmount || '';
        document.getElementById('paidAmount').value = data.paidAmount || '';
        document.getElementById('balanceAmount').value = data.balanceAmount || '';
        document.getElementById('powerBill').value = data.powerBill || '';
        document.getElementById('waterBill').value = data.waterBill || '';
        document.getElementById('totalPaid').value = data.totalPaid || '';
        document.getElementById('remarks').value = data.remarks || '';

        submitButton.innerHTML = '<i class="fa-solid fa-check"></i> Update';
    } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        document.getElementById('side').value = '';
        calculateTotal();
    }

    document.getElementById('prev-day').addEventListener('click', () => changeDate(-1));
    document.getElementById('next-day').addEventListener('click', () => changeDate(1));
}

function clearForm() {
    form.reset();
    isEditMode = false;
    originalDate = null;
    originalSide = null;
    submitButton.innerHTML = '<i class="fa-solid fa-check"></i> Submit';

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
    calculateTotal();
}

form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = getRecordPayload();
    if (!formData.rawDate) {
        KTui.alert('Error', 'Please select a Date.', 'error');
        return;
    }

    if (!formData.side) {
        KTui.alert('Error', 'Please select a Side.', 'error');
        return;
    }

    loader.classList.remove('hidden');
    submitButton.disabled = true;
    submitButton.textContent = isEditMode ? 'Updating...' : 'Saving...';

    const action = isEditMode ? 'update' : 'add';

    const sheetPayload = {
        date: formData.formattedDate,
        side: formData.side,
        rentAmount: formData.rentAmount,
        paidAmount: formData.paidAmount,
        balanceAmount: formData.balanceAmount,
        powerBill: formData.powerBill,
        waterBill: formData.waterBill,
        totalPaid: formData.totalPaid,
        remarks: formData.remarks,
        action,
        originalDate,
        originalSide
    };

    const neonPayload = {
        type: 'rent',
        action,
        originalDate,
        originalSide,
        record: {
            date: formData.formattedDate,
            side: formData.side,
            rentAmount: formData.rentAmount,
            paidAmount: formData.paidAmount,
            balanceAmount: formData.balanceAmount,
            powerBill: formData.powerBill,
            waterBill: formData.waterBill,
            totalPaid: formData.totalPaid,
            remarks: formData.remarks
        }
    };

    const saveToSheets = fetch(sheetURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetPayload)
    }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result || result.result !== 'success') {
            throw new Error((result && result.error) || `Google Sheets save failed with status ${response.status}`);
        }
    });

    const saveToNeon = fetch(neonSyncURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(neonPayload)
    }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result || !result.ok) {
            throw new Error((result && result.message) || `Neon save failed with status ${response.status}`);
        }
    });

    const [sheetResult, neonResult] = await Promise.allSettled([saveToSheets, saveToNeon]);

    loader.classList.add('hidden');
    submitButton.disabled = false;
    submitButton.innerHTML = isEditMode ? '<i class="fa-solid fa-check"></i> Update' : '<i class="fa-solid fa-check"></i> Submit';

    const sheetOk = sheetResult.status === 'fulfilled';
    const neonOk = neonResult.status === 'fulfilled';

    if (sheetOk && neonOk) {
        showSuccessAndContinue();
        return;
    }

    if (sheetOk && !neonOk) {
        KTui.alert('Save Failed', `Saved to Google Sheets only. Neon save failed: ${neonResult.reason?.message || 'Unknown Neon error.'}`, 'error');
        return;
    }

    if (!sheetOk && neonOk) {
        KTui.alert('Save Failed', `Saved to Neon only. Google Sheets save failed: ${sheetResult.reason?.message || 'Unknown Google Sheets error.'}`, 'error');
        return;
    }

    KTui.alert(
        'Error',
        `${sheetResult.reason?.message || 'Google Sheets save failed.'} ${neonResult.reason?.message || 'Neon save failed.'}`,
        'error'
    );
});

window.onload = initializeForm;