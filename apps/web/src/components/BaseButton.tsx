import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type ButtonColor = 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'yellow' | 'purple' | 'cyan' | 'gold';

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
    bg: 'bg-retro-blue-400/90',
    hover: 'hover:bg-retro-blue-500/90',
    text: 'text-white',
  },
  green: {
    bg: 'bg-retro-tennis-green-light',
    hover: 'hover:bg-retro-tennis-green',
    text: 'text-white',
  },
  orange: {
    bg: 'bg-retro-orange-400/90',
    hover: 'hover:bg-retro-orange-500/90',
    text: 'text-white',
  },
  red: {
    bg: 'bg-red-500',
    hover: 'hover:bg-red-600',
    text: 'text-white',
  },
  gray: {
    bg: 'bg-retro-brown-200',
    hover: 'hover:bg-retro-brown-300',
    text: 'text-retro-brown-700',
  },
  yellow: {
    bg: 'bg-retro-yellow-400/90',
    hover: 'hover:bg-retro-yellow-500/90',
    text: 'text-retro-brown-800',
  },
  purple: {
    bg: 'bg-retro-purple-400/90',
    hover: 'hover:bg-retro-purple-500/90',
    text: 'text-white',
  },
  cyan: {
    bg: 'bg-retro-cyan-400/90',
    hover: 'hover:bg-retro-cyan-500/90',
    text: 'text-white',
  },
  gold: {
    bg: 'bg-retro-gold-400/90',
    hover: 'hover:bg-retro-gold-500/90',
    text: 'text-retro-brown-800',
  },
};

const sizeClasses = {
  sm: 'px-4 py-2 text-base',
  md: 'px-6 py-3 text-lg',
  lg: 'px-8 py-4 text-xl',
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
    rounded-md font-retro font-bold uppercase tracking-wider
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

