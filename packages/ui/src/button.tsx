import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
}

type ButtonWithChildren = BaseButtonProps & {
  iconOnly?: false;
  children: React.ReactNode;
};

type IconOnlyButton = BaseButtonProps & {
  iconOnly: true;
  children?: React.ReactNode;
};

type ButtonProps = ButtonWithChildren | IconOnlyButton;

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue-bg text-white hover:bg-blue-bg-hover disabled:opacity-50",
  secondary: "bg-surface-2 text-fg border border-edge hover:bg-surface-3",
  ghost: "bg-transparent text-fg-2 hover:bg-surface-2 hover:text-fg",
  danger: "bg-red text-white hover:opacity-90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs gap-1",
  md: "px-3 py-1.5 text-sm gap-1.5",
  lg: "px-4 py-2 text-base gap-2",
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: "p-1.5",
  md: "p-2",
  lg: "p-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  iconOnly = false,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        rounded-md
        font-medium
        transition-colors
        disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="animate-pulse">{children}</span>
      ) : (
        <>
          {icon && iconPosition === "left" && icon}
          {children}
          {icon && iconPosition === "right" && icon}
        </>
      )}
    </button>
  );
}
