import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type ButtonColor = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'yellow';

export interface BaseButtonProps {
  text: string;
  onClick: () => void;
  color: ButtonColor;
  active?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

const colorClasses: Record<ButtonColor, { bg: string; hover: string; text: string }> = {
  blue: {
    bg: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
    text: 'text-white',
  },
  green: {
    bg: 'bg-green-500',
    hover: 'hover:bg-green-600',
    text: 'text-white',
  },
  orange: {
    bg: 'bg-orange-500',
    hover: 'hover:bg-orange-600',
    text: 'text-white',
  },
  red: {
    bg: 'bg-red-500',
    hover: 'hover:bg-red-600',
    text: 'text-white',
  },
  gray: {
    bg: 'bg-gray-200',
    hover: 'hover:bg-gray-300',
    text: 'text-gray-700',
  },
  yellow: {
    bg: 'bg-yellow-500',
    hover: 'hover:bg-yellow-600',
    text: 'text-white',
  },
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export default function BaseButton({
  text,
  onClick,
  color,
  active = true,
  disabled = false,
  icon: Icon,
  size = 'md',
  className = '',
  title,
  type = 'button',
}: BaseButtonProps) {
  const colorClass = colorClasses[color];
  const sizeClass = sizeClasses[size];
  const isInactive = !active || disabled;

  const baseClasses = `
    flex items-center justify-center gap-2
    rounded-md font-medium
    transition-all
    ${sizeClass}
    ${colorClass.text}
    ${isInactive 
      ? `${colorClass.bg} opacity-40 cursor-not-allowed` 
      : `${colorClass.bg} ${colorClass.hover} shadow-sm hover:shadow cursor-pointer`
    }
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleClick = () => {
    if (!isInactive) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isInactive}
      className={baseClasses}
      title={title}
    >
      {Icon && <Icon className={`w-5 h-5 ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : ''}`} />}
      {text}
    </button>
  );
}

