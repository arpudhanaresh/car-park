import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Car, LogOut, User, Menu, X, Zap } from 'lucide-react';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return <Outlet />;

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="flex h-screen bg-[#030712] text-gray-100 font-sans overflow-hidden selection:bg-indigo-500/30">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-20 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-30 w-72 bg-[#0B1121] border-r border-gray-800/50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div className="p-6 border-b border-gray-800/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-indigo-500 rounded-lg blur opacity-40"></div>
                            <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-inner border border-white/10">
                                <Zap size={24} />
                            </div>
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">
                            ParkPro
                        </span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-4">Menu</div>
                    {user.role === 'admin' ? (
                        <>
                            <Link
                                to="/admin"
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive('/admin')
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100'
                                    }`}
                            >
                                <LayoutDashboard size={20} className={isActive('/admin') ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'} />
                                <span className="font-medium">Dashboard</span>
                                {isActive('/admin') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/dashboard"
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive('/dashboard')
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100'
                                    }`}
                            >
                                <LayoutDashboard size={20} className={isActive('/dashboard') ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'} />
                                <span className="font-medium">My Bookings</span>
                                {isActive('/dashboard') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                            </Link>
                            <Link
                                to="/book"
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive('/book')
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100'
                                    }`}
                            >
                                <Car size={20} className={isActive('/book') ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'} />
                                <span className="font-medium">Book a Spot</span>
                                {isActive('/book') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-gray-800/50 bg-[#0B1121]">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-gray-900/50 border border-gray-800">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-gray-300 shadow-inner border border-white/5">
                            <User size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-200 truncate">
                                {user.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate capitalize">
                                {user.role}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-200 font-medium border border-transparent hover:border-red-500/20"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#030712] relative">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-indigo-900/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-purple-900/10 rounded-full blur-[120px]" />
                </div>

                {/* Mobile Header */}
                <div className="lg:hidden bg-[#0B1121]/80 backdrop-blur-md border-b border-gray-800 p-4 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            <Zap size={18} />
                        </div>
                        <span className="text-lg font-bold text-white">ParkPro</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth relative z-0">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
