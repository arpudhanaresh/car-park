import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';
import { Car, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const response = await auth.login({
                    username: formData.username,
                    password: formData.password,
                });
                const { access_token, role, username } = response.data;
                login(username, role, access_token);
                navigate(role === 'admin' ? '/admin' : '/dashboard');
            } else {
                if (formData.password !== formData.confirmPassword) {
                    setError("Passwords don't match");
                    setLoading(false);
                    return;
                }
                const response = await auth.signup({
                    username: formData.username,
                    password: formData.password,
                    role: 'customer', // Default to customer for signup
                });
                // Auto login after signup
                const { access_token, role, username } = response.data;
                login(username, role, access_token);
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Car size={24} />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-center text-gray-900 mb-1 tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-center text-gray-500 mb-5 text-xs">
                        {isLogin
                            ? 'Enter your credentials to access your account'
                            : 'Join us to experience premium parking services'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-700">Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                                    <User size={16} />
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="block w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-gray-900"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-700">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="block w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-gray-900"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-gray-700">Confirm Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="block w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-gray-900"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-2.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-2.5 text-sm rounded-lg transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-5"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-5 pt-4 border-t border-gray-200 text-center">
                        <p className="text-gray-600 text-xs">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                    setFormData({ username: '', password: '', confirmPassword: '' });
                                }}
                                className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors hover:underline decoration-2 underline-offset-2"
                            >
                                {isLogin ? 'Sign up' : 'Log in'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
