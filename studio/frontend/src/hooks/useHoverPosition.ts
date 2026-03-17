import { useEffect, useState, RefObject } from 'react';

export type Position = 'top' | 'bottom' | 'left' | 'right';
export type Alignment = 'start' | 'center' | 'end';

interface PositionResult {
  position: Position;
  alignment: Alignment;
  positionClasses: string;
  arrowClasses: string;
}

interface PopoverSize {
  width: number;
  height: number;
}

const MARGIN = 8; // Minimum margin from viewport edge
const ARROW_SIZE = 8; // Size of the arrow in pixels

export function useHoverPosition(
  triggerRef: RefObject<HTMLElement | null>,
  popoverSize: PopoverSize,
  preferredPosition: Position = 'bottom',
  isOpen: boolean = false
): PositionResult {
  const [positionResult, setPositionResult] = useState<PositionResult>({
    position: preferredPosition,
    alignment: 'center',
    positionClasses: getPositionClasses(preferredPosition, 'center'),
    arrowClasses: getArrowClasses(preferredPosition, 'center'),
  });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const calculatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      };

      // Calculate available space in each direction
      const spaces = {
        top: triggerRect.top - MARGIN,
        bottom: viewport.height - triggerRect.bottom - MARGIN,
        left: triggerRect.left - MARGIN,
        right: viewport.width - triggerRect.right - MARGIN,
      };

      // Determine best position based on available space
      let bestPosition: Position = preferredPosition;
      let bestAlignment: Alignment = 'center';

      // Try preferred position first
      if (canFitInPosition(preferredPosition, spaces, popoverSize, triggerRect, viewport)) {
        bestPosition = preferredPosition;
        bestAlignment = getBestAlignment(preferredPosition, triggerRect, popoverSize, viewport);
      } else {
        // Try other positions in order of preference
        const positionPriority: Position[] = ['bottom', 'top', 'right', 'left'];
        for (const pos of positionPriority) {
          if (canFitInPosition(pos, spaces, popoverSize, triggerRect, viewport)) {
            bestPosition = pos;
            bestAlignment = getBestAlignment(pos, triggerRect, popoverSize, viewport);
            break;
          }
        }
      }

      setPositionResult({
        position: bestPosition,
        alignment: bestAlignment,
        positionClasses: getPositionClasses(bestPosition, bestAlignment),
        arrowClasses: getArrowClasses(bestPosition, bestAlignment),
      });
    };

    calculatePosition();

    // Recalculate on scroll or resize
    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, triggerRef, popoverSize, preferredPosition]);

  return positionResult;
}

function canFitInPosition(
  position: Position,
  spaces: Record<Position, number>,
  popoverSize: PopoverSize,
  triggerRect: DOMRect,
  viewport: { width: number; height: number }
): boolean {
  const requiredSpace = position === 'top' || position === 'bottom' 
    ? popoverSize.height + ARROW_SIZE 
    : popoverSize.width + ARROW_SIZE;

  // Check if there's enough space in the primary direction
  if (spaces[position] < requiredSpace) {
    return false;
  }

  // Check if there's enough space in the perpendicular direction
  if (position === 'top' || position === 'bottom') {
    // For vertical positioning, check horizontal space
    const centerX = triggerRect.left + triggerRect.width / 2;
    const leftSpace = centerX - MARGIN;
    const rightSpace = viewport.width - centerX - MARGIN;
    const halfWidth = popoverSize.width / 2;
    
    // Can we center it?
    if (leftSpace >= halfWidth && rightSpace >= halfWidth) {
      return true;
    }
    
    // Can we align it to start or end?
    return leftSpace >= popoverSize.width || rightSpace >= popoverSize.width;
  } else {
    // For horizontal positioning, check vertical space
    const centerY = triggerRect.top + triggerRect.height / 2;
    const topSpace = centerY - MARGIN;
    const bottomSpace = viewport.height - centerY - MARGIN;
    const halfHeight = popoverSize.height / 2;
    
    // Can we center it?
    if (topSpace >= halfHeight && bottomSpace >= halfHeight) {
      return true;
    }
    
    // Can we align it to start or end?
    return topSpace >= popoverSize.height || bottomSpace >= popoverSize.height;
  }
}

function getBestAlignment(
  position: Position,
  triggerRect: DOMRect,
  popoverSize: PopoverSize,
  viewport: { width: number; height: number }
): Alignment {
  if (position === 'top' || position === 'bottom') {
    // Horizontal alignment for vertical positions
    const centerX = triggerRect.left + triggerRect.width / 2;
    const leftSpace = centerX - MARGIN;
    const rightSpace = viewport.width - centerX - MARGIN;
    const halfWidth = popoverSize.width / 2;

    if (leftSpace >= halfWidth && rightSpace >= halfWidth) {
      return 'center';
    } else if (leftSpace < halfWidth) {
      return 'start';
    } else {
      return 'end';
    }
  } else {
    // Vertical alignment for horizontal positions
    const centerY = triggerRect.top + triggerRect.height / 2;
    const topSpace = centerY - MARGIN;
    const bottomSpace = viewport.height - centerY - MARGIN;
    const halfHeight = popoverSize.height / 2;

    if (topSpace >= halfHeight && bottomSpace >= halfHeight) {
      return 'center';
    } else if (topSpace < halfHeight) {
      return 'start';
    } else {
      return 'end';
    }
  }
}

function getPositionClasses(position: Position, alignment: Alignment): string {
  const classes: string[] = ['absolute', 'z-50'];

  // Primary position
  switch (position) {
    case 'top':
      classes.push('bottom-full', 'mb-2');
      break;
    case 'bottom':
      classes.push('top-full', 'mt-2');
      break;
    case 'left':
      classes.push('right-full', 'mr-2');
      break;
    case 'right':
      classes.push('left-full', 'ml-2');
      break;
  }

  // Alignment
  if (position === 'top' || position === 'bottom') {
    switch (alignment) {
      case 'center':
        classes.push('left-1/2', '-translate-x-1/2');
        break;
      case 'start':
        classes.push('left-0');
        break;
      case 'end':
        classes.push('right-0');
        break;
    }
  } else {
    switch (alignment) {
      case 'center':
        classes.push('top-1/2', '-translate-y-1/2');
        break;
      case 'start':
        classes.push('top-0');
        break;
      case 'end':
        classes.push('bottom-0');
        break;
    }
  }

  return classes.join(' ');
}

function getArrowClasses(position: Position, alignment: Alignment): string {
  const classes: string[] = [
    'absolute',
    'w-2',
    'h-2',
    'bg-forest-light',
    'border-vegas-gold/20',
    'rotate-45',
  ];

  // Arrow position relative to popover
  switch (position) {
    case 'top':
      classes.push('top-full', '-mt-1', 'border-r', 'border-b');
      break;
    case 'bottom':
      classes.push('bottom-full', '-mb-1', 'border-l', 'border-t');
      break;
    case 'left':
      classes.push('left-full', '-ml-1', 'border-r', 'border-t');
      break;
    case 'right':
      classes.push('right-full', '-mr-1', 'border-l', 'border-b');
      break;
  }

  // Arrow alignment
  if (position === 'top' || position === 'bottom') {
    switch (alignment) {
      case 'center':
        classes.push('left-1/2', '-translate-x-1/2');
        break;
      case 'start':
        classes.push('left-4');
        break;
      case 'end':
        classes.push('right-4');
        break;
    }
  } else {
    switch (alignment) {
      case 'center':
        classes.push('top-1/2', '-translate-y-1/2');
        break;
      case 'start':
        classes.push('top-4');
        break;
      case 'end':
        classes.push('bottom-4');
        break;
    }
  }

  return classes.join(' ');
}
