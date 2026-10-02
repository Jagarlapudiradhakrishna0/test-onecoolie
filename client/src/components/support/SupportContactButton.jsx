import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, ArrowRight } from 'lucide-react';
import { handleContactSupport } from '../../services/supportService';

/**
 * SupportContactButton
 *
 * Reusable button that safely routes to /support on desktop,
 * preventing any native OS/browser "Open Pick an app?" protocol dialogs.
 */
export default function SupportContactButton({
  children,
  className = '',
  showArrow = true,
  icon: Icon = Headphones,
  onClick,
  ...props
}) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
    if (!e.defaultPrevented) {
      handleContactSupport(navigate);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className || "w-full py-3 px-5 rounded-full bg-black hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children || 'Contact Support'}</span>
      {showArrow && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );
}
