/**
 * KT Apps — Global UI Utilities
 * Provides beautiful custom popups to replace browser alert() / confirm()
 *
 * Usage:
 *   KTui.alert('Title', 'Message', 'success' | 'error' | 'warning' | 'info')
 *   KTui.confirm('Title', 'Message', onConfirm, { confirmText, cancelText, type })
 *   KTui.toast('Message', 'success' | 'error' | 'warning' | 'info')
 *
 * Notification style is controlled by localStorage key 'notificationStyle':
 *   'toast'  → show a toast banner (default if not set)
 *   'popup'  → show the full overlay popup
 *
 * Include this file AFTER the page body, e.g.:
 *   <script src="../ktui.js"></script>
 */

(function () {
    // ── Inject styles once ──────────────────────────────────────────────────
    const STYLE_ID = '__ktui_styles__';
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
        /* ── KTui Overlay ── */
        .ktui-overlay {
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(2,6,23,0.78);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: center;
            padding: 16px;
            opacity: 0; visibility: hidden;
            transition: opacity 0.24s ease, visibility 0.24s ease;
        }
        .ktui-overlay.active { opacity: 1; visibility: visible; }

        .ktui-box {
            background: rgba(13,18,38,0.98);
            border-radius: 24px;
            padding: 32px 28px 28px;
            max-width: 360px; width: 100%;
            text-align: center;
            transform: scale(0.86) translateY(8px);
            transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1);
            box-shadow: 0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05);
            position: relative; overflow: hidden;
        }
        .ktui-overlay.active .ktui-box { transform: scale(1) translateY(0); }

        /* Subtle top accent line */
        .ktui-box::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
        }
        .ktui-box.ktui-success::before { background: linear-gradient(90deg, transparent, #22c55e, transparent); }
        .ktui-box.ktui-error::before   { background: linear-gradient(90deg, transparent, #ef4444, transparent); }
        .ktui-box.ktui-warning::before { background: linear-gradient(90deg, transparent, #f59e0b, transparent); }
        .ktui-box.ktui-info::before    { background: linear-gradient(90deg, transparent, #6366f1, transparent); }
        .ktui-box.ktui-confirm::before { background: linear-gradient(90deg, transparent, #8b5cf6, transparent); }

        /* Icon circle */
        .ktui-icon {
            width: 64px; height: 64px; border-radius: 50%;
            margin: 0 auto 18px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.7rem;
        }
        .ktui-success .ktui-icon { background: rgba(34,197,94,0.13); border: 1px solid rgba(34,197,94,0.28); color: #22c55e; }
        .ktui-error   .ktui-icon { background: rgba(239,68,68,0.13); border: 1px solid rgba(239,68,68,0.28); color: #f87171; }
        .ktui-warning .ktui-icon { background: rgba(245,158,11,0.13); border: 1px solid rgba(245,158,11,0.28); color: #fbbf24; }
        .ktui-info    .ktui-icon { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.28); color: #818cf8; }
        .ktui-confirm .ktui-icon { background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.28); color: #a78bfa; }

        .ktui-title {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 17px; font-weight: 900; color: #f8fafc;
            margin-bottom: 8px; line-height: 1.3;
        }
        .ktui-badge {
            display: inline-block;
            background: rgba(139,92,246,0.15);
            border: 1px solid rgba(139,92,246,0.30);
            color: #c4b5fd; font-size: 11px; font-weight: 800;
            padding: 3px 12px; border-radius: 20px;
            margin-bottom: 10px; letter-spacing: 0.04em;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .ktui-msg {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13px; color: #94a3b8;
            line-height: 1.65; margin-bottom: 24px;
        }

        /* Buttons */
        .ktui-btns { display: flex; gap: 10px; }
        .ktui-btn-ok, .ktui-btn-cancel, .ktui-btn-confirm {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13px; font-weight: 800;
            padding: 11px 20px; border-radius: 14px;
            cursor: pointer; transition: all 0.2s; border: none;
            letter-spacing: 0.02em;
        }
        /* single OK button — full width */
        .ktui-btn-ok {
            width: 100%;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            color: #f1f5f9;
        }
        .ktui-btn-ok:hover { background: rgba(255,255,255,0.13); }

        /* confirm dialog — two buttons */
        .ktui-btn-cancel {
            flex: 1;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.10);
            color: #94a3b8;
        }
        .ktui-btn-cancel:hover { background: rgba(255,255,255,0.10); color: #e2e8f0; }

        .ktui-btn-confirm {
            flex: 1;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            color: #fff;
            box-shadow: 0 4px 16px rgba(139,92,246,0.38);
        }
        .ktui-btn-confirm:hover { box-shadow: 0 6px 20px rgba(139,92,246,0.55); transform: translateY(-1px); }
        .ktui-btn-confirm:active { transform: scale(0.96); }

        .ktui-btn-confirm.danger {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            box-shadow: 0 4px 16px rgba(239,68,68,0.35);
        }
        .ktui-btn-confirm.danger:hover { box-shadow: 0 6px 20px rgba(239,68,68,0.50); }

        /* ── KTui Toast ── */
        .ktui-toast {
            position: fixed;
            bottom: calc(100px + env(safe-area-inset-bottom, 0px));
            left: 50%;
            transform: translateX(-50%) translateY(140px);
            padding: 14px 22px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 999999;
            opacity: 0;
            transition: opacity 0.35s ease, transform 0.35s ease;
            pointer-events: none;
            max-width: 90vw;
            white-space: normal;
            word-break: break-word;
            text-align: center;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .ktui-toast.ktui-toast-show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
            pointer-events: auto;
        }
        .ktui-toast.ktui-toast-success { background: #166534; color: #bbf7d0; border: 1px solid rgba(34,197,94,0.27); }
        .ktui-toast.ktui-toast-error   { background: #7f1d1d; color: #fecaca; border: 1px solid rgba(239,68,68,0.27); }
        .ktui-toast.ktui-toast-warning { background: #78350f; color: #fde68a; border: 1px solid rgba(245,158,11,0.27); }
        .ktui-toast.ktui-toast-info    { background: #1e1b4b; color: #c7d2fe; border: 1px solid rgba(99,102,241,0.27); }
        `;
        document.head.appendChild(style);
    }

    // ── Build overlay DOM once ──────────────────────────────────────────────
    function getOrCreateOverlay() {
        let overlay = document.getElementById('__ktui_overlay__');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = '__ktui_overlay__';
            overlay.className = 'ktui-overlay';
            overlay.innerHTML = `<div class="ktui-box" id="__ktui_box__">
                <div class="ktui-icon" id="__ktui_icon__"></div>
                <div class="ktui-title" id="__ktui_title__"></div>
                <div class="ktui-badge" id="__ktui_badge__" style="display:none"></div>
                <div class="ktui-msg"  id="__ktui_msg__"></div>
                <div class="ktui-btns" id="__ktui_btns__"></div>
            </div>`;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function closeKtui() {
        const overlay = document.getElementById('__ktui_overlay__');
        if (overlay) overlay.classList.remove('active');
    }

    // ── Icon map ────────────────────────────────────────────────────────────
    const ICONS = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        error:   '<i class="fa-solid fa-triangle-exclamation"></i>',
        warning: '<i class="fa-solid fa-circle-exclamation"></i>',
        info:    '<i class="fa-solid fa-circle-info"></i>',
        confirm: '<i class="fa-solid fa-shield-halved"></i>',
    };

    const TOAST_ICONS = {
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        warning: 'fa-circle-exclamation',
        info:    'fa-circle-info',
    };

    // ── Toast ───────────────────────────────────────────────────────────────
    function ktuiToast(message, type = 'info') {
        let toast = document.getElementById('__ktui_toast__');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = '__ktui_toast__';
            document.body.appendChild(toast);
        }
        const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
        toast.className = `ktui-toast ktui-toast-${type}`;
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
        // force reflow so transition fires even if already shown
        void toast.offsetWidth;
        toast.classList.add('ktui-toast-show');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('ktui-toast-show');
        }, 5000);
    }

    // ── Helper: should we use toast? ────────────────────────────────────────
    function useToast() {
        return (localStorage.getItem('notificationStyle') || 'toast') === 'toast';
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Show an alert popup or toast depending on user's notification style setting.
     * @param {string} title
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} type
     * @param {function} [onClose]
     * @param {string} [badge] optional small badge text shown below title
     */
    function ktuiAlert(title, message, type = 'info', onClose, badge) {
        if (useToast()) {
            ktuiToast(message, type);
            if (typeof onClose === 'function') setTimeout(onClose, 5500);
            return;
        }

        const overlay = getOrCreateOverlay();
        const box     = document.getElementById('__ktui_box__');
        const iconEl  = document.getElementById('__ktui_icon__');
        const titleEl = document.getElementById('__ktui_title__');
        const badgeEl = document.getElementById('__ktui_badge__');
        const msgEl   = document.getElementById('__ktui_msg__');
        const btnsEl  = document.getElementById('__ktui_btns__');

        box.className = `ktui-box ktui-${type}`;
        iconEl.innerHTML = ICONS[type] || ICONS.info;
        titleEl.textContent = title;
        msgEl.textContent   = message;

        if (badge) {
            badgeEl.textContent = badge;
            badgeEl.style.display = 'inline-block';
        } else {
            badgeEl.style.display = 'none';
        }

        btnsEl.innerHTML = '';
        const okBtn = document.createElement('button');
        okBtn.className = 'ktui-btn-ok';
        okBtn.textContent = 'OK';
        okBtn.onclick = () => {
            closeKtui();
            if (typeof onClose === 'function') onClose();
        };
        btnsEl.appendChild(okBtn);

        overlay.classList.add('active');
    }

    /**
     * Show a confirm popup (Cancel + Confirm buttons)
     * @param {string} title
     * @param {string} message
     * @param {function} onConfirm  called when user clicks confirm
     * @param {object}  [opts]
     * @param {string}  [opts.confirmText='Confirm']
     * @param {string}  [opts.cancelText='Cancel']
     * @param {string}  [opts.badge]   optional badge text
     * @param {boolean} [opts.danger]  red confirm button
     */
    function ktuiConfirm(title, message, onConfirm, opts = {}) {
        const overlay = getOrCreateOverlay();
        const box     = document.getElementById('__ktui_box__');
        const iconEl  = document.getElementById('__ktui_icon__');
        const titleEl = document.getElementById('__ktui_title__');
        const badgeEl = document.getElementById('__ktui_badge__');
        const msgEl   = document.getElementById('__ktui_msg__');
        const btnsEl  = document.getElementById('__ktui_btns__');

        box.className = 'ktui-box ktui-confirm';
        iconEl.innerHTML = opts.danger ? ICONS.error : ICONS.confirm;
        if (opts.danger) box.className = 'ktui-box ktui-error';
        titleEl.textContent = title;
        msgEl.textContent   = message;

        if (opts.badge) {
            badgeEl.textContent = opts.badge;
            badgeEl.style.display = 'inline-block';
        } else {
            badgeEl.style.display = 'none';
        }

        btnsEl.innerHTML = '';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'ktui-btn-cancel';
        cancelBtn.textContent = opts.cancelText || 'Cancel';
        cancelBtn.onclick = closeKtui;

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'ktui-btn-confirm' + (opts.danger ? ' danger' : '');
        confirmBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${opts.confirmText || 'Confirm'}`;
        confirmBtn.onclick = () => {
            closeKtui();
            if (typeof onConfirm === 'function') onConfirm();
        };

        btnsEl.appendChild(cancelBtn);
        btnsEl.appendChild(confirmBtn);

        overlay.classList.add('active');
    }

    // ── Expose globally ─────────────────────────────────────────────────────
    window.KTui = { alert: ktuiAlert, confirm: ktuiConfirm, toast: ktuiToast, close: closeKtui };

    // Override native alert/confirm only if desired (opt-in via data attribute on <html>)
    // <html data-ktui-override="true">
    if (document.documentElement.dataset.ktuiOverride === 'true') {
        window._nativeAlert   = window.alert;
        window._nativeConfirm = window.confirm;
        window.alert = (msg) => ktuiAlert('Notice', msg, 'info');
    }
})();

