import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { TournamentState, Phase } from '@tournament-app/shared-types';
import RegistrationPage, { type RegistrationPageRef } from './RegistrationPage';
import TournamentFlowPage from './TournamentFlowPage';
import SummaryPage from './SummaryPage';

interface TournamentPageProps {
  tournamentState: TournamentState;
  isAdmin: boolean;
  onRefresh: () => void;
  showMatches?: boolean;
}

const TournamentPage = forwardRef<RegistrationPageRef, TournamentPageProps>(({
  tournamentState,
  isAdmin,
  onRefresh,
}, ref) => {
  const phaseOrder: Phase[] = ['registration', 'team_setup', 'match_setup', 'swiss_rounds', 'ko_bracket', 'summary'];
  
  const phasesReached = useMemo(() => {
    const currentIndex = phaseOrder.indexOf(tournamentState.phase);
    // Include all phases up to and including the current phase
    return phaseOrder.slice(0, currentIndex + 1);
  }, [tournamentState.phase]);

  const registrationPageRef = useRef<RegistrationPageRef>(null);

  // Expose registration page ref to parent
  useImperativeHandle(ref, () => ({
    handleAutoGenerateTeams: async () => {
      if (registrationPageRef.current) {
        await registrationPageRef.current.handleAutoGenerateTeams();
      }
    },
    isGenerating: registrationPageRef.current?.isGenerating || false,
  }));

  return (
    <div className="space-y-8">
      {/* Registration Section - always visible once reached */}
      {phasesReached.includes('registration') && (
        <motion.div
          id="phase-registration"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <RegistrationPage
            ref={registrationPageRef}
            tournamentState={tournamentState}
            isAdmin={isAdmin}
            onRefresh={onRefresh}
          />
        </motion.div>
      )}

      {/* Swiss Rounds Section - shown when match_setup or swiss_rounds phase is reached */}
      {(phasesReached.includes('match_setup') || phasesReached.includes('swiss_rounds')) && (
        <motion.div
          id="phase-swiss-rounds"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 pt-8 border-t-2 border-gray-200"
        >
          <TournamentFlowPage
            tournamentState={tournamentState}
            isAdmin={isAdmin}
          />
        </motion.div>
      )}

      {/* Summary Section - shown when summary phase is reached */}
      {phasesReached.includes('summary') && (
        <motion.div
          id="phase-summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 pt-8 border-t-2 border-gray-200"
        >
          <SummaryPage
            tournamentState={tournamentState}
            isAdmin={isAdmin}
          />
        </motion.div>
      )}
    </div>
  );
});

TournamentPage.displayName = 'TournamentPage';

export default TournamentPage;

