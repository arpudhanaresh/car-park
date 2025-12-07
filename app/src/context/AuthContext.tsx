import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    username: string;
    role: 'admin' | 'customer';
    token: string;
    full_name?: string;
    email?: string;
    phone?: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, role: 'admin' | 'customer', token: string, userDetails?: any) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const login = (username: string, role: 'admin' | 'customer', token: string, userDetails?: any) => {
        const newUser: User = {
            username,
            role,
            token,
            full_name: userDetails?.full_name,
            email: userDetails?.email,
            phone: userDetails?.phone
        };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
