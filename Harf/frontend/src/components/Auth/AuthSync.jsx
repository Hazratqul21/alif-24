import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService'; // Make sure this path fits

/**
 * AuthSync Component
 * Enforces cross-subdomain authentication using HttpOnly cookies
 * 
 * 1. Pings the backend to verify the session using the cookie.
 * 2. If NO active session exists, redirects the user to the MainPlatform login page.
 */
const AuthSync = ({ children, enforceLogin = true }) => {
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        const verifySession = async () => {
            if (!enforceLogin) {
                setIsChecked(true);
                return;
            }

            try {
                // Ping the backend using the apiService which includes credentials (cookies)
                await apiService.get('/auth/me');
                setIsChecked(true); // Session is valid
            } catch (err) {
                // We don't have a valid session, redirect to main platform login
                const currentUrl = encodeURIComponent(window.location.href);
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const mainDomain = isLocalhost ? 'http://localhost:5173' : 'https://alif24.uz';

                window.location.href = `${mainDomain}/login?redirect=${currentUrl}`;
            }
        };

        verifySession();
    }, [enforceLogin]);

    if (!isChecked && enforceLogin) {
        // Show a loading state while checking the session
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
