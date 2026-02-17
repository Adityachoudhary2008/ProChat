import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { register, reset } from '../features/auth/authSlice';
import toast from 'react-hot-toast';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student' as 'student' | 'teacher' | 'hr' | 'admin',
    });

    const { name, email, password, confirmPassword, role } = formData;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { user, isLoading, isError, isSuccess, message } = useAppSelector(
        (state) => state.auth
    );

    useEffect(() => {
        if (isError) {
            toast.error(message);
        }

        if (isSuccess) {
            toast.success(message || 'Registration successful! Please verify your email.');
            // We don't navigate to /chats anymore since user needs to verify
            navigate('/login');
        }

        dispatch(reset());
    }, [user, isError, isSuccess, message, navigate, dispatch]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
        } else if (!name || !email || !password) {
            toast.error('Please fill in all fields');
        } else {
            const userData = { name, email, password, role };
            dispatch(register(userData));
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-[1100px] flex rounded-3xl overflow-hidden bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Left Side - Visual/Marketing */}
                <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-tr from-emerald-600 to-indigo-900 p-12 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-indigo-600 font-black text-xl">P</span>
                            </div>
                            <span className="text-white text-2xl font-bold tracking-tight">ProChat</span>
                        </div>
                        <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-6">
                            Start your <br />
                            <span className="text-white/70 italic font-medium">Professional</span> <br />
                            journey here.
                        </h1>
                        <p className="text-indigo-100/80 text-lg max-w-md font-medium leading-relaxed">
                            Join thousands of professionals and students using ProChat for high-stability communication.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full border-2 border-emerald-400 overflow-hidden bg-slate-800">
                                    <img src="https://ui-avatars.com/api/?name=John+Doe&background=random" alt="User" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">John Doe</p>
                                    <p className="text-emerald-300 text-xs">Full Stack Developer</p>
                                </div>
                            </div>
                            <p className="text-indigo-100/70 text-sm mt-3 italic">"ProChat changed how our remote team collaborates. The meeting quality is insane."</p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-[55%] p-8 sm:p-12 lg:px-16 lg:py-12 flex flex-col justify-center max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="mb-8 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                        <p className="text-slate-400">Join the professional network today.</p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={name}
                                    onChange={onChange}
                                    placeholder="John Doe"
                                    className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={onChange}
                                    placeholder="john@example.com"
                                    className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 ml-1">Account Role</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(['student', 'teacher', 'hr', 'admin'] as const).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: r })}
                                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all capitalize ${role === r
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 ml-1">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={password}
                                    onChange={onChange}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 ml-1">Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={confirmPassword}
                                    onChange={onChange}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-1 pt-2">
                            <input type="checkbox" id="terms" className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 accent-indigo-600" required />
                            <label htmlFor="terms" className="text-xs text-slate-400">
                                I agree to the <span className="text-indigo-400 hover:underline cursor-pointer">Terms of Service</span> and <span className="text-indigo-400 hover:underline cursor-pointer">Privacy Policy</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-white font-bold hover:text-indigo-400 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
