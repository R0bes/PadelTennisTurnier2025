import { motion } from 'framer-motion';

interface VerticalLineProps {
  height?: string;
  delay?: number;
  className?: string;
}

export default function VerticalLine({ 
  height = 'h-12', 
  delay = 0,
  className = ''
}: VerticalLineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 0.3, delay }}
      className={`w-0.5 ${height} bg-gray-300 ${className}`}
    />
  );
}

