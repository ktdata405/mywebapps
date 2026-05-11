/**
 * KTCache - Lightweight fetch cache with TTL for Google Apps Script endpoints
 * Stores responses in sessionStorage to avoid redundant network calls.
 * Supports "stale-while-revalidate": returns cached data immediately,
 * then refreshes in the background when TTL has expired.
 */
const KTCache = (() => {
    const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
    const PREFIX = 'ktcache_';

    function _key(url) {
        // Remove cache-busting params (t=, v=) so same logical URL reuses cache
        return PREFIX + url.replace(/[?&][tv]=\d+/g, '');
    }

    function _get(url) {
        try {
            const item = sessionStorage.getItem(_key(url));
            if (!item) return null;
            const parsed = JSON.parse(item);
            return parsed;
        } catch (e) { return null; }
    }

    function _set(url, data) {
        try {
            sessionStorage.setItem(_key(url), JSON.stringify({ data, ts: Date.now() }));
        } catch (e) {
            // sessionStorage full or unavailable — just skip caching
        }
    }

    function invalidate(urlPattern) {
        try {
            const keys = Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX) && k.includes(urlPattern));
            keys.forEach(k => sessionStorage.removeItem(k));
        } catch (e) {}
    }

    function invalidateAll() {
        try {
            const keys = Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX));
            keys.forEach(k => sessionStorage.removeItem(k));
        } catch (e) {}
    }

    /**
     * Fetch with cache.
     * @param {string} url - URL to fetch (cache-busting params stripped for key)
     * @param {object} opts - { ttl, onCacheHit, fetchOpts }
     *   ttl: milliseconds before cache expires (default 5 min)
     *   onCacheHit: callback(cachedData) called immediately if cache valid
     *   fetchOpts: options passed to fetch()
     * @returns {Promise} resolves with JSON response data
     */
    function fetchCached(url, opts = {}) {
        const ttl = opts.ttl !== undefined ? opts.ttl : DEFAULT_TTL;
        const cached = _get(url);
        const now = Date.now();
        const isFresh = cached && (now - cached.ts) < ttl;

        if (isFresh) {
            // Serve from cache immediately
            if (opts.onCacheHit) opts.onCacheHit(cached.data);
            return Promise.resolve(cached.data);
        }

        if (cached && opts.onCacheHit) {
            // Stale cache — return stale data immediately, refresh in background
            opts.onCacheHit(cached.data);
        }

        // Build URL with cache-busting for actual network request
        const separator = url.includes('?') ? '&' : '?';
        const networkUrl = `${url}${separator}_t=${now}`;

        return fetch(networkUrl, opts.fetchOpts || {})
            .then(r => r.json())
            .then(data => {
                _set(url, data);
                return data;
            });
    }

    /**
     * POST that also invalidates relevant cache entries.
     * @param {string} url - endpoint URL
     * @param {object} body - JSON payload
     * @param {object} opts - { invalidatePattern, mode }
     * @returns {Promise}
     */
    function postAndInvalidate(url, body, opts = {}) {
        const fetchOpts = {
            method: 'POST',
            body: JSON.stringify(body),
            mode: opts.mode || undefined,
        };
        if (opts.contentType) {
            fetchOpts.headers = { 'Content-Type': opts.contentType };
        }
        const promise = fetch(url, fetchOpts);
        // Invalidate cache entries matching this endpoint base
        const baseUrl = url.split('?')[0];
        invalidate(baseUrl);
        if (opts.invalidatePattern) invalidate(opts.invalidatePattern);
        return promise;
    }

    return { fetchCached, postAndInvalidate, invalidate, invalidateAll };
})();

