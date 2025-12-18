/**
 * Simple Bootstrap Page Loader
 * Handles pre-navigation loading state safely
 */

(function () {
    'use strict';

    const LOADER_TIMEOUT_MS = 5000; // 5 seconds max load time to prevent freeze
    let navigationTimeout = null;

    /**
     * Show the loader
     */
    function showLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.remove('hidden');

            // Failsafe: hide after timeout in case of stuck navigation
            clearTimeout(navigationTimeout);
            navigationTimeout = setTimeout(hideLoader, LOADER_TIMEOUT_MS);
        }
    }

    /**
     * Hide the loader
     */
    function hideLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
        clearTimeout(navigationTimeout);
    }

    /**
     * Check if link is safe to show loader for
     */
    function shouldIntercept(link) {
        const href = link.getAttribute('href');
        const target = link.getAttribute('target');

        if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
        if (target === '_blank') return false;
        if (link.hasAttribute('download')) return false;
        if (link.dataset.noLoader) return false;

        // Don't show for same page anchors
        if (href.startsWith('#')) return false;

        return true;
    }

    // Init Logic
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Hide loader immediately on load
        hideLoader();

        // 2. Intercept Clicks
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && shouldIntercept(link)) {
                // If holding mod keys, let it open in new tab (no loader)
                if (e.ctrlKey || e.metaKey || e.shiftKey) return;

                showLoader();
            }
        });

        // 3. Intercept Forms
        document.body.addEventListener('submit', (e) => {
            const form = e.target;
            if (!form.target || form.target !== '_blank') {
                showLoader();
            }
        });
    });

    // 4. Handle Back/Forward Cache (bfcache)
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            hideLoader();
        }
    });

    // 5. Fallback for window load
    window.addEventListener('load', hideLoader);

})();

