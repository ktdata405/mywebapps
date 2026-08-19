(function () {
    const PRESET_KEY = 'themePreset';
    const INTERACTIVE_SELECTOR = [
        '.inf-node',
        '.side-node-row',
        '.temp-icon-node',
        '.action-card',
        '.stat-card',
        '.card-box',
        '.notice-card',
        '.nav-item'
    ].join(',');

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
            return;
        }
        fn();
    }

    function canHandleLink(link) {
        if (!link) return false;
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) return false;
        if (/^(mailto:|tel:|sms:|blob:|data:)/i.test(href)) return false;
        return !(link.target === '_blank' || link.hasAttribute('download'));
    }

    function getPresetMap() {
        return {
            neon: {
                '--modern-accent-1': '#7c3aed',
                '--modern-accent-2': '#06b6d4',
                '--modern-accent-3': '#22c55e'
            },
            minimal: {
                '--modern-accent-1': '#2563eb',
                '--modern-accent-2': '#0ea5e9',
                '--modern-accent-3': '#0f766e'
            },
            corporate: {
                '--modern-accent-1': '#1d4ed8',
                '--modern-accent-2': '#0891b2',
                '--modern-accent-3': '#16a34a'
            }
        };
    }

    function getSavedPreset() {
        const saved = localStorage.getItem(PRESET_KEY);
        return saved || 'neon';
    }

    function applyThemePreset(presetName) {
        const root = document.documentElement;
        const body = document.body;
        if (!root || !body) return;

        const presets = getPresetMap();
        const name = presets[presetName] ? presetName : 'neon';
        const preset = presets[name];

        Object.entries(preset).forEach(function (entry) {
            root.style.setProperty(entry[0], entry[1]);
        });

        body.classList.remove('kt-preset-neon', 'kt-preset-minimal', 'kt-preset-corporate');
        body.classList.add('kt-preset-' + name);
        localStorage.setItem(PRESET_KEY, name);
    }

    function setupReducedMotion() {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = function () {
            window.__ktReduceMotion = media.matches;
            document.body.classList.toggle('kt-reduced-motion', media.matches);
        };
        sync();
        if (typeof media.addEventListener === 'function') {
            media.addEventListener('change', sync);
        } else if (typeof media.addListener === 'function') {
            media.addListener(sync);
        }
    }

    function setupSkipLink() {
        const link = document.querySelector('.skip-link');
        const main = document.querySelector('main');
        if (!link || !main) return;
        if (!main.id) main.id = 'main-content';
        link.setAttribute('href', '#' + main.id);
    }

    function setupPageTransition() {
        const loader = document.getElementById('loader');
        if (!loader) return;

        if (!document.body.dataset.ktTransitionBound) {
            document.body.dataset.ktTransitionBound = 'true';
            document.addEventListener('click', function (event) {
                if (event.defaultPrevented) return;
                if (event.button !== 0) return;
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

                const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
                if (!canHandleLink(link)) return;

                event.preventDefault();
                event.stopImmediatePropagation();
                loader.classList.add('visible');
                window.setTimeout(function () {
                    window.location.href = link.href;
                }, 280);
            }, true);

            document.addEventListener('submit', function (event) {
                if (!event.target || event.defaultPrevented) return;
                loader.classList.add('visible');
            });
        }

        window.addEventListener('pageshow', function () {
            loader.classList.remove('visible');
        });
    }

    function toLabel(el) {
        const txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
        return txt.length ? txt.slice(0, 80) : 'Item';
    }

    function setupAccessibleCards() {
        document.querySelectorAll(INTERACTIVE_SELECTOR).forEach(function (el) {
            const tag = el.tagName.toLowerCase();
            const nativeInteractive = tag === 'a' || tag === 'button' || tag === 'input';
            if (!nativeInteractive) {
                if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
                if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
            }
            if (!el.hasAttribute('aria-label')) {
                el.setAttribute('aria-label', toLabel(el));
            }
            if (!el.dataset.ktKeyBound) {
                el.dataset.ktKeyBound = 'true';
                el.addEventListener('keydown', function (event) {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    if (tag === 'a' || tag === 'button') return;
                    event.preventDefault();
                    el.click();
                });
            }
        });
    }

    function setupPressFx() {
        document.querySelectorAll(INTERACTIVE_SELECTOR).forEach(function (el) {
            if (el.dataset.ktPressBound) return;
            el.dataset.ktPressBound = 'true';
            el.addEventListener('pointerdown', function () {
                el.classList.add('kt-press');
            });
            el.addEventListener('pointerup', function () {
                el.classList.remove('kt-press');
            });
            el.addEventListener('pointercancel', function () {
                el.classList.remove('kt-press');
            });
            el.addEventListener('pointerleave', function () {
                el.classList.remove('kt-press');
            });
        });
    }

    function setupEntranceFx() {
        document.body.classList.add('kt-page-enter');
        window.requestAnimationFrame(function () {
            document.body.classList.add('kt-page-enter-active');
        });
    }

    ready(function () {
        setupReducedMotion();
        setupSkipLink();
        applyThemePreset(getSavedPreset());
        setupPageTransition();
        setupAccessibleCards();
        setupPressFx();
        setupEntranceFx();

        window.applyThemePreset = applyThemePreset;
        window.getSavedThemePreset = getSavedPreset;
    });
})();

