import { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';

/**
 * AuthSync Component
 * Enforces cross-subdomain authentication using HttpOnly cookies
 * 
 * 1. Pings the backend to verify the session using the cookie.
 * 2. If NO active session exists, redirects the user to the MainPlatform login page.
 * 3. Loop protection: max 2 redirects before giving up.
 */
const REDIRECT_KEY = 'authsync_redirect_count';
const MAX_REDIRECTS = 2;

const AuthSync = ({ children, enforceLogin = true }) => {
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        const verifySession = async () => {
            if (!enforceLogin) {
                setIsChecked(true);
                return;
            }

            try {
                await apiService.get('/auth/me');
                sessionStorage.removeItem(REDIRECT_KEY);
                setIsChecked(true);
            } catch (err) {
                const count = parseInt(sessionStorage.getItem(REDIRECT_KEY) || '0', 10);
                if (count >= MAX_REDIRECTS) {
                    console.warn('AuthSync: Loop detected, stopping redirects');
                    sessionStorage.removeItem(REDIRECT_KEY);
                    setIsChecked(true);
                    return;
                }

                sessionStorage.setItem(REDIRECT_KEY, String(count + 1));

                const currentUrl = encodeURIComponent(window.location.href);
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const mainDomain = isLocalhost ? 'http://localhost:5173' : 'https://alif24.uz';

                window.location.href = `${mainDomain}/login?redirect=${currentUrl}`;
            }
        };

        verifySession();
    }, [enforceLogin]);

    if (!isChecked && enforceLogin) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return children;
};

export default AuthSync;
