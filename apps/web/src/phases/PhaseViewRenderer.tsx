import { motion } from 'framer-motion';
import type { TournamentState } from '@tournament-app/shared-types';
import type { PhaseViewElement } from './PhaseInterface';
import VerticalLine from '../components/VerticalLine';
import HorizontalLine from '../components/HorizontalLine';
import TypingText from '../components/TypingText';
import BaseButton from '../components/BaseButton';

interface PhaseViewRendererProps {
  elements: PhaseViewElement[];
  tournamentState: TournamentState;
  phaseProps?: Record<string, any>;
  baseDelay?: number;
}

export default function PhaseViewRenderer({
  elements,
  tournamentState,
  phaseProps = {},
  baseDelay = 0.2,
}: PhaseViewRendererProps) {
  return (
    <div className="space-y-6">
      {elements.map((element, index) => {
        // Check condition if provided
        if (element.condition && !element.condition(tournamentState, phaseProps)) {
          return null;
        }

        const delay = index * baseDelay;

        switch (element.type) {
          case 'verticalLine':
            return (
              <div key={element.id || `verticalLine-${index}`} className="flex flex-col items-center w-full">
                <VerticalLine
                  delay={delay}
                  height={element.height}
                  className={element.className}
                />
              </div>
            );

          case 'horizontalLine':
            return (
              <div key={element.id || `horizontalLine-${index}`} className="flex flex-col items-center">
                <HorizontalLine
                  delay={delay}
                  width={element.width}
                  className={element.className}
                />
              </div>
            );

          case 'text':
            const textSizeClass = element.size
              ? `text-${element.size}`
              : 'text-3xl';
            return (
              <motion.p
                key={element.id || `text-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay }}
                className={`${textSizeClass} font-bold ${
                  element.faded
                    ? 'text-gray-300 opacity-50'
                    : 'text-gray-900'
                } ${element.className || ''}`}
              >
                {element.text}
              </motion.p>
            );

          case 'typingText':
            const typingFaded = typeof element.faded === 'function' 
              ? element.faded(tournamentState, phaseProps)
              : (element.faded ?? false);
            const typingShowCursor = typeof element.showCursor === 'function'
              ? element.showCursor(tournamentState, phaseProps)
              : (element.showCursor ?? true);
            return (
              <TypingText
                key={element.id || `typingText-${index}`}
                text={element.text}
                secondaryText={element.secondaryText}
                className={element.className}
                faded={typingFaded}
                showCursor={typingShowCursor}
                typingSpeed={element.typingSpeed}
              />
            );

          case 'view':
            const viewContent =
              typeof element.component === 'function'
                ? element.component({ tournamentState, ...phaseProps })
                : element.component;
            return (
              <motion.div
                key={element.id || `view-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay }}
                className={element.className || ''}
              >
                {viewContent}
              </motion.div>
            );

          case 'button':
            const buttonText =
              typeof element.text === 'function'
                ? element.text(tournamentState, phaseProps)
                : element.text;
            const buttonActive =
              typeof element.active === 'function'
                ? element.active(tournamentState, phaseProps)
                : element.active ?? true;
            const buttonDisabled =
              typeof element.disabled === 'function'
                ? element.disabled(tournamentState, phaseProps)
                : element.disabled ?? false;

            return (
              <motion.div
                key={element.id || `button-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay }}
                className="flex flex-col items-center"
              >
                <BaseButton
                  text={buttonText}
                  onClick={() => element.onClick(tournamentState, phaseProps)}
                  color={element.color}
                  active={buttonActive}
                  disabled={buttonDisabled}
                  icon={element.icon}
                  size={element.size}
                  className={element.className}
                  title={element.title}
                />
              </motion.div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

