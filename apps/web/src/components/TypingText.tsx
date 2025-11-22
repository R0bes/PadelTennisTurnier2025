import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import HorizontalLine from './HorizontalLine';
import VerticalLine from './VerticalLine';

interface TypingTextProps {
  text: string;
  secondaryText?: string;
  className?: string;
  faded?: boolean;
  showCursor?: boolean;
  typingSpeed?: number;
  onComplete?: () => void;
}

export default function TypingText({
  text,
  secondaryText,
  className = '',
  faded = false,
  showCursor = true,
  typingSpeed = 50,
  onComplete,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousTextRef = useRef<string>('');
  const mountedRef = useRef(true);
  
  // Determine which text to display
  // Only use secondaryText if it's explicitly provided AND faded is true
  // Otherwise always use the primary text
  const activeText = (faded && secondaryText) ? secondaryText : text;
  const isShowingSecondary = faded && !!secondaryText;

  // Reset on unmount/remount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Cleanup previous interval if exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Update previous text ref
    previousTextRef.current = activeText;

    if (!activeText || activeText.length === 0) {
      setDisplayedText('');
      return;
    }

    // Start animation (always restart when text changes or on mount)
    setDisplayedText('');
    let currentIndex = 0;
    
    intervalRef.current = setInterval(() => {
      // Check if component is still mounted
      if (!mountedRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      // Use the current text value from closure
      if (currentIndex < activeText.length) {
        setDisplayedText(activeText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (onComplete) {
          onComplete();
        }
      }
    }, typingSpeed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeText, typingSpeed, onComplete]);

  if (!activeText || activeText.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center mb-4">
      {/* Vertical line above */}
      <VerticalLine delay={0} className="mb-4" />

      {/* Horizontal container with lines and text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex items-center gap-6"
      >
        {/* Left horizontal line */}
        <HorizontalLine delay={0.4} />

        {/* Text with typing effect */}
        <p className={`text-4xl font-retro font-bold uppercase tracking-wider ${
          isShowingSecondary
            ? 'text-retro-brown-300 opacity-50'
            : faded
            ? 'text-retro-brown-300 opacity-50'
            : 'bg-gradient-to-r from-retro-brown-600 via-retro-orange-500 to-retro-brown-600 bg-clip-text text-transparent'
        } ${className}`} style={{ textShadow: '0 2px 4px rgba(255,255,255,0.5)' }}>
          {displayedText}
          {showCursor &&
            displayedText.length > 0 &&
            displayedText.length < activeText.length &&
            !isShowingSecondary && (
              <span className="animate-pulse">|</span>
            )}
        </p>

        {/* Right horizontal line */}
        <HorizontalLine delay={0.4} />
      </motion.div>

      {/* Vertical line below */}
      <VerticalLine delay={0.6} className="mt-4" />
    </div>
  );
}

