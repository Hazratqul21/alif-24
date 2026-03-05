import { createContext, useState, useEffect, useContext } from 'react';
import apiService from '../services/apiService';

export const GamificationContext = createContext();

export function GamificationProvider({ children }) {
    const [gamificationProfile, setGamificationProfile] = useState({
        coins: 0,
        current_streak: 0,
        longest_streak: 0,
        badges: []
    });
    const [shopItems, setShopItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadGamificationData = async () => {
        try {
            setLoading(true);
            const [profileRes, shopRes] = await Promise.all([
                apiService.get('/gamification/profile'),
                apiService.get('/gamification/shop')
            ]);

            if (profileRes?.data) setGamificationProfile(profileRes.data);
            if (shopRes?.data) setShopItems(shopRes.data);
        } catch (error) {
            console.error("Error loading gamification data:", error);
        } finally {
            setLoading(false);
        }
    };

    const purchaseItem = async (itemId) => {
        try {
            await apiService.post(`/gamification/shop/purchase/${itemId}`);
            // Reload profile to reflect new coin balance
            await loadGamificationData();
            return { success: true };
        } catch (error) {
            console.error("Purchase error:", error);
            return { success: false, message: error.message || "Xarid amalga oshmadi" };
        }
    };

    useEffect(() => {
        // HttpOnly cookie auth — ping /auth/me to check if user is authenticated
        apiService.get('/auth/me')
            .then(() => {
                loadGamificationData();
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    return (
        <GamificationContext.Provider value={{
            ...gamificationProfile,
            shopItems,
            loading,
            refreshGamification: loadGamificationData,
            purchaseItem
        }}>
            {children}
        </GamificationContext.Provider>
    );
}

export const useGamification = () => useContext(GamificationContext);
