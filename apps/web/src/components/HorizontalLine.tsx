import { motion } from 'framer-motion';

interface HorizontalLineProps {
  width?: string;
  delay?: number;
  className?: string;
}

export default function HorizontalLine({ 
  width = 'w-48', 
  delay = 0,
  className = ''
}: HorizontalLineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.3, delay }}
      className={`${width} h-1 bg-retro-brown-400 ${className}`}
    />
  );
}

