import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const VerifyEmail: React.FC = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const verify = async () => {
            try {
                await api.get(`/user/verify-email/${token}`);
                setSuccess(true);
                toast.success('Email verified successfully!');
                // Auto login or redirect to login
                setTimeout(() => navigate('/login'), 3000);
            } catch (error: any) {
                setSuccess(false);
                toast.error(error.response?.data?.message || 'Verification failed');
            } finally {
                setVerifying(false);
            }
        };

        if (token) {
            verify();
        }
    }, [token, navigate]);

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-[500px] bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 sm:p-12 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-700 text-center">
                {verifying ? (
                    <div className="space-y-6">
                        <div className="w-20 h-20 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                        <h2 className="text-2xl font-bold text-white">Verifying your email...</h2>
                        <p className="text-slate-400">Please hold on while we confirm your account.</p>
                    </div>
                ) : success ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white">Verification Successful!</h2>
                        <p className="text-slate-400">Your account is now ready. Redirecting you to login...</p>
                        <Link to="/login" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                            Click here if not redirected
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white">Verification Failed</h2>
                        <p className="text-slate-400">The verification link is invalid or has expired.</p>
                        <div className="flex gap-4 justify-center mt-6">
                            <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all">
                                Try Re-registering
                            </Link>
                            <Link to="/login" className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl border border-slate-700 transition-all">
                                Go to Login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
