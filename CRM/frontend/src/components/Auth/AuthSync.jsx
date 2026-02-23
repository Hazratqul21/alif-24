import { useEffect } from 'react';

/**
 * AuthSync Component
 * Enforces cross-subdomain authentication.
 * 
 * 1. Checks if a token is present in the URL (coming from MainPlatform redirect).
 * 2. If present, saves it to localStorage and cleans the URL.
 * 3. Checks if a token exists in localStorage.
 * 4. If NO token exists, redirects the user to the MainPlatform login page,
 *    passing the current subdomain URL as a `redirect` parameter so they can
 *    be sent back after logging in.
 */
const AuthSync = ({ children, enforceLogin = true }) => {
    useEffect(() => {
        // 1. Process URL Tokens
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        const urlRefresh = urlParams.get('refresh');

        if (urlToken) {
            localStorage.setItem('accessToken', urlToken);
            if (urlRefresh) localStorage.setItem('refreshToken', urlRefresh);

            // Clean URL
            const url = new URL(window.location);
            url.searchParams.delete('token');
            url.searchParams.delete('refresh');
            window.history.replaceState({}, '', url);
        }

        // 2. Enforce Login (if required)
        if (enforceLogin) {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                // We don't have a token, redirect to main platform login
                const currentUrl = encodeURIComponent(window.location.href);
                // Determine the main domain base (works for dev localhost too)
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const mainDomain = isLocalhost ? 'http://localhost:5173' : 'https://alif24.uz';

                window.location.href = `${mainDomain}/login?redirect=${currentUrl}`;
            }
        }
    }, [enforceLogin]);

    // We render children regardless, but the redirect will fire immediately if no token
    return children;
};

export default AuthSync;
