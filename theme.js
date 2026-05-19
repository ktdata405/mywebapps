(function () {
    const STORAGE_KEY = 'darkMode';
    const STYLE_ID = '__kt_global_theme__';
    const SETTINGS_STYLE_ID = '__kt_settings_shortcut__';
    const META_THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

    const THEME_MAP = {
        light: {
            metaThemeColor: '#f8fafc',
            vars: {
                '--bg': '#f8fafc',
                '--bg-color': '#f8fafc',
                '--bg-dark': '#f8fafc',
                '--bg-darker': '#eef2ff',
                '--card': '#ffffff',
                '--card-bg': '#ffffff',
                '--surface': '#ffffff',
                '--surface-color': '#ffffff',
                '--surface-soft': '#f1f5f9',
                '--text': '#0f172a',
                '--text-primary': '#0f172a',
                '--text-secondary': '#475569',
                '--text-light': '#0f172a',
                '--text-muted': '#64748b',
                '--text-dim': '#64748b',
                '--muted': '#64748b',
                '--border': 'rgba(15, 23, 42, 0.15)',
                '--border-color': 'rgba(15, 23, 42, 0.15)',
                '--card-border': 'rgba(15, 23, 42, 0.15)',
                '--card-hover-border': 'rgba(59, 130, 246, 0.28)',
                '--input-bg': '#ffffff',
                '--input-border': 'rgba(15, 23, 42, 0.2)',
                '--input-focus-bg': '#ffffff',
                '--input-focus-shadow': '0 0 0 3px rgba(59, 130, 246, 0.2)',
                '--body-bg-color': '#f8fafc',
                '--body-text-color': '#0f172a',
                '--table-head-bg': '#e2e8f0',
                '--table-row-bg': '#ffffff',
                '--table-row-alt': '#f8fafc'
            }
        },
        dark: {
            metaThemeColor: '#0b1120',
            vars: {
                '--bg': '#0b1120',
                '--bg-color': '#0b1120',
                '--bg-dark': '#0f172a',
                '--bg-darker': '#020617',
                '--card': 'rgba(15, 23, 42, 0.9)',
                '--card-bg': 'rgba(15, 23, 42, 0.9)',
                '--surface': 'rgba(15, 23, 42, 0.9)',
                '--surface-color': '#111827',
                '--surface-soft': '#1f2937',
                '--text': '#f8fafc',
                '--text-primary': '#f8fafc',
                '--text-secondary': '#cbd5e1',
                '--text-light': '#f8fafc',
                '--text-muted': '#94a3b8',
                '--text-dim': '#94a3b8',
                '--muted': '#94a3b8',
                '--border': 'rgba(148, 163, 184, 0.25)',
                '--border-color': 'rgba(148, 163, 184, 0.25)',
                '--card-border': 'rgba(148, 163, 184, 0.25)',
                '--card-hover-border': 'rgba(99, 102, 241, 0.4)',
                '--input-bg': 'rgba(15, 23, 42, 0.95)',
                '--input-border': 'rgba(148, 163, 184, 0.32)',
                '--input-focus-bg': 'rgba(15, 23, 42, 1)',
                '--input-focus-shadow': '0 0 0 3px rgba(99, 102, 241, 0.25)',
                '--body-bg-color': '#0b1120',
                '--body-text-color': '#f8fafc',
                '--table-head-bg': '#1e293b',
                '--table-row-bg': '#0f172a',
                '--table-row-alt': '#111827'
            }
        }
    };

    function ensureThemeStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
        body.dark-mode,
        body.light-mode {
            background: var(--body-bg-color) !important;
            color: var(--body-text-color) !important;
        }

        body.light-mode { color-scheme: light; }
        body.dark-mode { color-scheme: dark; }

        body.dark-mode :where(main, section, article, aside, nav, header, footer, .app-content, .content),
        body.light-mode :where(main, section, article, aside, nav, header, footer, .app-content, .content) {
            color: var(--text-primary) !important;
        }

        body.dark-mode :where(.glass-panel, .glass-card, .glass, .card, .container, .modal-content, .tile, .summary-card, .table-container, .panel, .report-card),
        body.light-mode .glass-panel,
        body.light-mode .card,
        body.light-mode .container,
        body.light-mode .modal-content,
        body.light-mode .tile,
        body.light-mode .summary-card,
        body.light-mode .table-container {
            background: var(--card-bg) !important;
            color: var(--text-primary) !important;
            border-color: var(--border-color) !important;
            box-shadow: none !important;
        }

        body.dark-mode :where(input, select, textarea, .form-control, .field-input, .search-input),
        body.light-mode input,
        body.light-mode select,
        body.light-mode textarea,
        body.light-mode .form-control {
            background: var(--input-bg) !important;
            color: var(--text-primary) !important;
            border-color: var(--input-border) !important;
            box-shadow: none !important;
        }

        body.dark-mode :where(input:focus, select:focus, textarea:focus, .form-control:focus, .field-input:focus, .search-input:focus),
        body.light-mode :where(input:focus, select:focus, textarea:focus, .form-control:focus, .field-input:focus, .search-input:focus) {
            background: var(--input-focus-bg) !important;
            border-color: var(--card-hover-border) !important;
            box-shadow: var(--input-focus-shadow) !important;
            color: var(--text-primary) !important;
            outline: none !important;
        }

        body.dark-mode :where(input::placeholder, textarea::placeholder),
        body.light-mode :where(input::placeholder, textarea::placeholder) {
            color: var(--text-muted) !important;
            opacity: 1;
        }

        body.dark-mode :where(button, .btn, .nav-btn, .icon-btn, .action-btn),
        body.light-mode :where(button, .btn, .nav-btn, .icon-btn, .action-btn) {
            color: var(--text-primary) !important;
            border-color: var(--border-color) !important;
        }

        body.dark-mode :where(table, th, td, tr),
        body.light-mode table,
        body.light-mode th,
        body.light-mode td,
        body.light-mode tr {
            color: var(--text-primary) !important;
            border-color: var(--border-color) !important;
            background: transparent !important;
        }

        body.dark-mode :where(thead, th),
        body.light-mode :where(thead, th) {
            background: var(--table-head-bg) !important;
        }

        body.dark-mode :where(tbody tr:nth-child(even)),
        body.light-mode :where(tbody tr:nth-child(even)) {
            background: var(--table-row-alt) !important;
        }

        body.dark-mode :where(a, label, p, span, li, small, strong, h1, h2, h3, h4, h5, h6, i),
        body.light-mode :where(a, label, p, span, li, small, strong, h1, h2, h3, h4, h5, h6, i) {
            color: inherit;
        }

        body.dark-mode :where(select option),
        body.light-mode :where(select option) {
            background: var(--input-bg) !important;
            color: var(--text-primary) !important;
        }
        `;
        document.head.appendChild(style);
    }

    function setThemeVars(isDarkMode) {
        const root = document.documentElement;
        if (!root) return;

        const vars = (isDarkMode ? THEME_MAP.dark : THEME_MAP.light).vars;
        Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    }

    function setMetaThemeColor(isDarkMode) {
        const meta = document.querySelector(META_THEME_COLOR_SELECTOR);
        if (!meta) return;
        meta.setAttribute('content', isDarkMode ? THEME_MAP.dark.metaThemeColor : THEME_MAP.light.metaThemeColor);
    }

    function applyAppTheme(isDarkMode) {
        ensureThemeStyles();
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.body.classList.toggle('light-mode', !isDarkMode);
        setThemeVars(isDarkMode);
        setMetaThemeColor(isDarkMode);
    }

    function getSavedTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === null ? true : saved === 'true';
    }

    function initTheme() {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', initTheme, { once: true });
            return;
        }
        applyAppTheme(getSavedTheme());
    }

    function getSettingsHref() {
        const marker = '/mywebapps/';
        const p = window.location.pathname || '/';
        const idx = p.indexOf(marker);
        const basePath = idx >= 0 ? p.slice(0, idx + marker.length) : '/';
        return window.location.origin + basePath + 'settings.html';
    }

    function ensureSettingsShortcutStyles() {
        if (document.getElementById(SETTINGS_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = SETTINGS_STYLE_ID;
        style.textContent = `
        .kt-settings-shortcut {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            color: var(--text-secondary, #a1a1aa);
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .kt-settings-shortcut:hover {
            background: rgba(255,255,255,0.1);
            color: #fff;
            border-color: rgba(255,255,255,0.15);
        }

        body.light-mode .kt-settings-shortcut {
            background: rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.08);
            color: var(--text-secondary, #4a5568);
        }

        body.light-mode .kt-settings-shortcut:hover {
            background: rgba(0,0,0,0.1);
            color: var(--text-primary, #1a202c);
            border-color: rgba(0,0,0,0.15);
        }

        .kt-settings-floating {
            position: fixed;
            top: calc(12px + env(safe-area-inset-top));
            right: calc(12px + env(safe-area-inset-right));
            z-index: 999;
        }
        `;
        document.head.appendChild(style);
    }

    function createSettingsLink() {
        const link = document.createElement('a');
        link.className = 'kt-settings-shortcut';
        link.href = getSettingsHref();
        link.setAttribute('aria-label', 'Settings');
        link.setAttribute('title', 'Settings');
        link.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
        return link;
    }

    function isHomeLink(anchor) {
        const href = (anchor.getAttribute('href') || '').toLowerCase();
        const aria = (anchor.getAttribute('aria-label') || '').toLowerCase();
        const title = (anchor.getAttribute('title') || '').toLowerCase();
        const text = (anchor.textContent || '').toLowerCase();
        const hasHomeIcon = !!anchor.querySelector('.fa-house, .fa-home');

        return href.includes('index.html') || aria.includes('home') || title.includes('home') || text.includes('home') || hasHomeIcon;
    }

    function findHomeLink() {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.find(isHomeLink) || null;
    }

    function injectSettingsShortcut() {
        if (!document.body) return;
        if (window.location.pathname.endsWith('settings.html')) return;

        ensureSettingsShortcutStyles();

        let settingsLink = document.querySelector('a[href$="settings.html"], a[href*="/settings.html"], a[href*="settings.html"]');
        if (!settingsLink) {
            settingsLink = createSettingsLink();
        } else {
            settingsLink.classList.add('kt-settings-shortcut');
            settingsLink.setAttribute('aria-label', settingsLink.getAttribute('aria-label') || 'Settings');
            settingsLink.setAttribute('title', settingsLink.getAttribute('title') || 'Settings');
            if (!settingsLink.querySelector('.fa-gear')) {
                settingsLink.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
            }
        }

        const homeLink = findHomeLink();
        if (homeLink) {
            homeLink.insertAdjacentElement('afterend', settingsLink);
            return;
        }

        const existingActionHost = document.querySelector('.header-actions, .nav-actions, .top-actions, .action-buttons');
        if (existingActionHost) {
            existingActionHost.appendChild(settingsLink);
            return;
        }

        const header = document.querySelector('header');
        if (header) {
            const host = document.createElement('div');
            host.style.marginLeft = 'auto';
            host.style.display = 'inline-flex';
            host.style.gap = '0.6rem';
            host.appendChild(settingsLink);
            header.appendChild(host);
            return;
        }

        settingsLink.classList.add('kt-settings-floating');
        document.body.appendChild(settingsLink);
    }

    window.applyAppTheme = applyAppTheme;

    window.addEventListener('storage', function (event) {
        if (event.key === STORAGE_KEY) {
            applyAppTheme(getSavedTheme());
        }
    });

    initTheme();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectSettingsShortcut, { once: true });
    } else {
        injectSettingsShortcut();
    }
})();

