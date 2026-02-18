import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                isMobile={isMobile}
            />

            {/* Main Content Wrapper */}
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen && !isMobile ? 'ml-64' : !sidebarOpen && !isMobile ? 'ml-20' : 'ml-0'
                }`}>

                {/* Header */}
                <div className={`fixed top-0 right-0 z-30 transition-all duration-300 ${sidebarOpen && !isMobile ? 'left-64' : !sidebarOpen && !isMobile ? 'left-20' : 'left-0'
                    }`}>
                    <Header
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        isMobile={isMobile}
                    />
                </div>

                {/* Main Content Area */}
                <main className="flex-1 p-6 mt-[70px] overflow-x-hidden">
                    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                        {children || <Outlet />}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
