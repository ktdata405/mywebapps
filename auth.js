function showContent() {
    sessionStorage.setItem('isAuthenticated', 'true');
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
}

function showPinEntry() {
    const pinContainer = document.getElementById('pin-container');
    const pinInput = document.getElementById('pin-input');
    const authContainer = document.getElementById('auth-container');

    pinContainer.style.display = 'flex';
    if (document.getElementById('try-pin-button')) {
        document.getElementById('try-pin-button').style.display = 'none';
    }
    authContainer.querySelector('p').textContent = 'Verify your Identity';

    // Force focus and open keyboard
    setTimeout(() => {
        pinInput.focus();
        pinInput.click(); // Sometimes needed for mobile browsers
    }, 100);
}

function verifyPin() {
    const pinInput = document.getElementById('pin-input');
    if (pinInput.value === '0405') {
        showContent();
    } else {
        alert('Incorrect PIN');
        pinInput.value = '';
        pinInput.focus();
    }
}

async function verifyFaceId(isAuto = false) {
    // WebAuthn requires a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
        if (!isAuto) alert("Face ID requires a secure context (HTTPS or localhost). It will not work on file://.");
        return false;
    }

    if (!window.PublicKeyCredential) {
        if (!isAuto) alert("Face ID / Biometrics not supported on this device/browser.");
        return false;
    }

    try {
        // Check if we have a stored credential ID
        const storedCredentialId = localStorage.getItem('webauthn_credential_id');

        if (storedCredentialId) {
            // Try to authenticate with existing credential
            const credentialId = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));
            
            const publicKeyCredentialRequestOptions = {
                challenge: window.crypto.getRandomValues(new Uint8Array(32)),
                allowCredentials: [{
                    id: credentialId,
                    type: 'public-key',
                    transports: ['internal'],
                }],
                userVerification: 'required',
                timeout: 60000,
            };

            await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions });
            showContent();
            return true;
        } else {
            if (isAuto) return false; // Don't auto-register

            // Check availability
            const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                alert("Face ID / Touch ID is not set up or available on this device.");
                return false;
            }

            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions = {
                challenge: challenge,
                rp: {
                    name: "Cash Counter App",
                    // id: window.location.hostname // Optional, defaults to current domain
                },
                user: {
                    id: window.crypto.getRandomValues(new Uint8Array(16)),
                    name: "user@cashcounter.local",
                    displayName: "App User",
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" }, // ES256
                    { alg: -257, type: "public-key" } // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // Forces FaceID/TouchID
                    userVerification: "required",
                    residentKey: "preferred",
                    requireResidentKey: false
                },
                timeout: 60000,
                attestation: "none"
            };

            const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });
            
            // Store credential ID for future logins
            const rawId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
            localStorage.setItem('webauthn_credential_id', rawId);

            showContent();
            return true;
        }

    } catch (err) {
        console.error("Face ID verification failed:", err);
        if (isAuto) return false;

        if (err.name === 'NotAllowedError') {
             // User cancelled
             return false;
        }
        
        // If authentication failed (e.g. credential not found), offer to reset
        if (localStorage.getItem('webauthn_credential_id')) {
             if (confirm("Face ID verification failed. Do you want to reset Face ID and set it up again?")) {
                 localStorage.removeItem('webauthn_credential_id');
                 return verifyFaceId(false); // Retry as registration
             }
        } else {
             alert("Authentication failed: " + err.message);
        }
        return false;
    }
}

async function handleAuthentication() {
    if (sessionStorage.getItem('isAuthenticated')) {
        showContent();
        return;
    }
    showPinEntry();
    
    // Auto-trigger Face ID if previously set up
    // Add a small delay to ensure the DOM is fully ready and to avoid conflicts with page load
    if (localStorage.getItem('webauthn_credential_id')) {
        setTimeout(() => {
             verifyFaceId(true);
        }, 500);
    }
}

// Wait for window load instead of just DOMContentLoaded to ensure all resources are ready
window.addEventListener('load', () => {
    handleAuthentication();
    
    const faceIdBtn = document.getElementById('face-id-btn');
    if (faceIdBtn) {
        // Use click for better mobile compatibility
        faceIdBtn.onclick = () => verifyFaceId(false);
    }
});

document.getElementById('pin-input').addEventListener('input', (event) => {
    if (event.target.value.length === 4) {
        verifyPin();
    }
});