import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import HorizontalLine from './HorizontalLine';
import VerticalLine from './VerticalLine';

interface TypingTextProps {
  text: string;
  className?: string;
  faded?: boolean;
  showCursor?: boolean;
  typingSpeed?: number;
  onComplete?: () => void;
}

export default function TypingText({
  text,
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
    previousTextRef.current = text;

    if (!text || text.length === 0) {
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
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
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
  }, [text, typingSpeed, onComplete]);

  if (!text || text.length === 0) {
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
        <p className={`text-3xl font-bold ${
          faded
            ? 'text-gray-300 opacity-50'
            : 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent'
        } ${className}`}>
          {displayedText}
          {showCursor &&
            displayedText.length > 0 &&
            displayedText.length < text.length &&
            !faded && (
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

