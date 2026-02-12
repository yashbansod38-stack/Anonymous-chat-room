import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

const variantStyles = {
    primary:
        "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-md shadow-primary-500/20 dark:shadow-primary-900/30",
    secondary:
        "bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
    ghost:
        "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
    danger:
        "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md shadow-red-500/20",
};

const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
};

export default function Button({
    children,
    variant = "primary",
    size = "md",
    isLoading = false,
    className = "",
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2
        dark:focus:ring-offset-surface-dark
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
}
