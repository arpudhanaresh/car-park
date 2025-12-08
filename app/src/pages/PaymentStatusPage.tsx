import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const PaymentStatusPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const status = searchParams.get('status');
    const code = searchParams.get('code');
    const orderId = searchParams.get('orderId');
    const bookingIdStr = orderId ? orderId.split('-')[1] : null; // Extract from RP-123-timestamp
    const [countdown, setCountdown] = useState(5);
    const [checkResult, setCheckResult] = useState<string | null>(null);

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

    const handleRetry = async () => {
        if (!bookingIdStr) return;
        // Re-initiate payment using custom logic existing in BookingPage or redirect there? 
        // Better: Reuse the logic from BookingPage but we don't have the form submission logic here easily without duplication.
        // Easiest: Redirect to Dashboard or Booking with intention? 
        // Actually, we can just call the backend to get params and auto-submit form here.
        // Let's implement a quick form submission helper.
        try {
            import('../services/api').then(async (apiModule) => {
                const response = await apiModule.parking.initiatePayment(parseInt(bookingIdStr));
                const { action, fields } = response.data;

                const form = document.createElement('form');
                form.method = 'POST';
                form.action = action;

                Object.keys(fields).forEach(key => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = fields[key];
                    form.appendChild(input);
                });

                document.body.appendChild(form);
                form.submit();
            });
        } catch (e) {
            alert('Failed to retry payment. Please try again from dashboard.');
        }
    };

    const handleCheckStatus = async () => {
        if (!bookingIdStr || !orderId) return;
        setCheckResult('Checking...');
        try {
            const apiModule = await import('../services/api');
            const response = await apiModule.parking.checkPaymentStatus(parseInt(bookingIdStr), orderId);
            const newStatus = response.data.status; // 'paid', 'failed', 'pending'

            if (newStatus === 'paid') {
                navigate('/payment-status?status=success');
            } else if (newStatus === 'failed') {
                navigate(`/payment-status?status=failed&code=${response.data.rp_statusCode}&orderId=${orderId}`);
            } else {
                setCheckResult('Payment is still pending processing. Please wait.');
            }
        } catch (e) {
            setCheckResult('Error checking status. Please try again.');
        }
    };

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
            ) : status === 'pending' ? (
                <>
                    <div className="p-4 bg-yellow-500/20 rounded-full text-yellow-500 animate-pulse">
                        <AlertCircle size={64} />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Payment Processing</h1>
                    <p className="text-gray-400 max-w-md">
                        Your payment is currently being processed by the gateway.
                        {code && <span className="block mt-2 text-sm font-mono text-yellow-400">Code: {code}</span>}
                    </p>
                    {checkResult && <p className="text-indigo-400">{checkResult}</p>}
                    <div className="flex gap-4">
                        <button
                            onClick={handleCheckStatus}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
                        >
                            Check Status
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
                        >
                            Go to Dashboard
                        </button>
                    </div>
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
                        {bookingIdStr && (
                            <button
                                onClick={handleRetry}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
                            >
                                Retry Payment
                            </button>
                        )}
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
