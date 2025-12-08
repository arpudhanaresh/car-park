import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const PaymentStatusPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const status = searchParams.get('status');
    const code = searchParams.get('code');
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (status === 'success') {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        navigate('/dashboard');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6">
            {status === 'success' ? (
                <>
                    <div className="p-4 bg-green-500/20 rounded-full text-green-500 animate-bounce">
                        <CheckCircle size={64} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
                    <p className="text-gray-400 max-w-md">
                        Your booking has been confirmed. You will be redirected to your dashboard in {countdown} seconds.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold transition-all"
                    >
                        Go to Dashboard Now
                    </button>
                </>
            ) : (
                <>
                    <div className="p-4 bg-red-500/20 rounded-full text-red-500">
                        <XCircle size={64} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Payment Failed</h1>
                    <p className="text-gray-400 max-w-md">
                        We could not process your payment.
                        {code && <span className="block mt-2 text-sm font-mono text-red-400">Error Code: {code}</span>}
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/book')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
                        >
                            Dashboard
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default PaymentStatusPage;
