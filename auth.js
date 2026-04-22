// Global Authentication Logic
(function() {
    // Check if we are on the index page or already authenticated
    const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('mywebapps/');
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';

    if (!isAuthenticated && !isIndex) {
        // Redirect to home if trying to access sub-pages without auth
        const pathPrefix = window.location.pathname.includes('/mywebapps/') ? '/mywebapps/' : '/';
        window.location.href = window.location.origin + pathPrefix + 'index.html';
        return;
    }
})();

function showContent() {
    sessionStorage.setItem('isAuthenticated', 'true');
    const authContainer = document.getElementById('auth-container');
    const appContent = document.getElementById('app-content');
    if (authContainer) authContainer.style.display = 'none';
    if (appContent) appContent.style.display = 'block';
}

function showPinEntry() {
    const pinContainer = document.getElementById('pin-container');
    const pinInput = document.getElementById('pin-input');
    if (pinContainer) pinContainer.style.display = 'flex';
    if (pinInput) {
        setTimeout(() => {
            pinInput.focus();
            pinInput.click();
        }, 100);
    }
}

function verifyPin() {
    const pinInput = document.getElementById('pin-input');
    // Using a simple obfuscation for the PIN
    const hash = btoa(pinInput.value);
    if (hash === 'MDQwNQ==') { // '0405'
        showContent();
    } else {
        // Shake animation for incorrect PIN
        pinInput.style.borderColor = '#ef4444';
        pinInput.classList.add('shake');
        setTimeout(() => { 
            pinInput.classList.remove('shake');
            pinInput.style.borderColor = '';
            pinInput.value = '';
            // Clear dots if in index.html
            if (typeof updateDots === 'function') {
                pinValue = '';
                updateDots();
            }
        }, 400);
    }
}

async function verifyFaceId(isAuto = false) {
    if (!window.isSecureContext || !window.PublicKeyCredential) return false;

    try {
        const storedCredentialId = localStorage.getItem('webauthn_credential_id');
        if (storedCredentialId) {
            const credentialId = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));
            const options = {
                challenge: window.crypto.getRandomValues(new Uint8Array(32)),
                allowCredentials: [{ id: credentialId, type: 'public-key', transports: ['internal'] }],
                userVerification: 'required',
                timeout: 60000,
            };
            await navigator.credentials.get({ publicKey: options });
            showContent();
            return true;
        }
    } catch (err) {
        console.error("Face ID failed:", err);
        return false;
    }
}

async function handleAuthentication() {
    if (sessionStorage.getItem('isAuthenticated')) {
        showContent();
        return;
    }
    showPinEntry();
    if (localStorage.getItem('webauthn_credential_id')) {
        setTimeout(() => verifyFaceId(true), 500);
    }
}

// Initialize on load if elements exist (primarily for index.html)
window.addEventListener('load', () => {
    if (document.getElementById('auth-container')) {
        handleAuthentication();
        const faceIdBtn = document.getElementById('face-id-btn');
        if (faceIdBtn) faceIdBtn.onclick = () => verifyFaceId(false);
    }
});

// Event listener for the hidden input
const pinInput = document.getElementById('pin-input');
if (pinInput) {
    pinInput.addEventListener('input', (e) => {
        if (e.target.value.length === 4) verifyPin();
    });
}
