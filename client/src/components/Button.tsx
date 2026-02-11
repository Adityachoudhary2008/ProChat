import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    className = '',
    ...props
}) => {
    const baseStyle = "w-full font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200";
    const variants = {
        primary: "bg-slate-900 hover:bg-slate-800 text-white",
        secondary: "bg-white hover:bg-slate-100 text-slate-900 border border-slate-300",
        danger: "bg-red-500 hover:bg-red-600 text-white",
    };

    return (
        <button
            className={`${baseStyle} ${variants[variant]} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            disabled={isLoading}
            {...props}
        >
            {isLoading ? 'Loading...' : children}
        </button>
    );
};

export default Button;
