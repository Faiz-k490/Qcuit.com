import React, { useRef, useState, useEffect, ReactNode, RefObject } from 'react';
import { useHoverPosition, Position } from '../hooks/useHoverPosition';

interface SmartPopoverProps {
  trigger: ReactNode;
  content: ReactNode;
  preferredPosition?: Position;
  width?: number;
  className?: string;
  triggerClassName?: string;
  showArrow?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SmartPopover({
  trigger,
  content,
  preferredPosition = 'bottom',
  width = 256,
  className = '',
  triggerClassName = '',
  showArrow = true,
  onOpenChange,
}: SmartPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { positionClasses, arrowClasses } = useHoverPosition(
    triggerRef as RefObject<HTMLElement | null>,
    { width, height: 200 }, // Approximate height, will be measured dynamically
    preferredPosition,
    isOpen
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div ref={triggerRef} className={`relative inline-flex ${triggerClassName}`}>
      <div onClick={handleToggle}>{trigger}</div>
      {isOpen && (
        <div
          ref={popoverRef}
          className={`${positionClasses} heritage-card rounded-lg p-3 shadow-xl border border-vegas-gold/20 ${className}`}
          style={{ width: `${width}px` }}
        >
          {content}
          {showArrow && <div className={arrowClasses} />}
        </div>
      )}
    </div>
  );
}

interface HoverPopoverProps {
  trigger: ReactNode;
  content: ReactNode;
  preferredPosition?: Position;
  width?: number;
  className?: string;
  triggerClassName?: string;
  showArrow?: boolean;
  delay?: number;
}

export function HoverPopover({
  trigger,
  content,
  preferredPosition = 'bottom',
  width = 256,
  className = '',
  triggerClassName = '',
  showArrow = true,
  delay = 200,
}: HoverPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { positionClasses, arrowClasses } = useHoverPosition(
    triggerRef as RefObject<HTMLElement | null>,
    { width, height: 200 },
    preferredPosition,
    isOpen
  );

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex group ${triggerClassName}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`${positionClasses} heritage-card rounded-lg p-2.5 shadow-xl border border-vegas-gold/20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 ${className}`}
          style={{ width: `${width}px` }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
          {showArrow && <div className={arrowClasses} />}
        </div>
      )}
    </div>
  );
}
