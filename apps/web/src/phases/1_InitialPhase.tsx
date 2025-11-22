import type { TournamentState } from '@tournament-app/shared-types';
import type { PhaseConfig, PhaseViewElement } from './PhaseInterface';
import PhaseViewRenderer from './PhaseViewRenderer';

interface InitialPhaseProps {
  onNextPhase: () => void;
  onReset: () => Promise<void>;
  isLoading: boolean;
  tournamentState: TournamentState | null;
}

export default function InitialPhase({
  onNextPhase,
  onReset,
  isLoading,
  tournamentState,
}: InitialPhaseProps) {
  if (!tournamentState) {
    return null;
  }

  const phaseViews: PhaseViewElement[] = [
    {
      type: 'verticalLine',
      className: 'mb-4',
    },
    {
      type: 'button',
      text: (state) => (state?.players.length === 0 ? 'Start' : 'Reset'),
      onClick: (state, props) => {
        if (state?.players.length === 0) {
          props.onNextPhase();
        } else {
          props.onReset();
        }
      },
      color: 'orange',
      active: () => !isLoading,
      disabled: () => isLoading,
      title: tournamentState?.players.length === 0 ? 'Turnier starten' : 'Neues Turnier starten',
      size: 'lg',
    },
  ];

  return (
    <div
      id="phase-initial"
      className="flex flex-col items-center"
    >
      <PhaseViewRenderer
        elements={phaseViews}
        tournamentState={tournamentState}
        phaseProps={{ onNextPhase, onReset, isLoading }}
      />
    </div>
  );
}

// Phase configuration
export const initialPhaseConfig: PhaseConfig = {
  id: 'initial',
  title: 'Turnier Start',
  description: 'Willkommen zum Turnier',
  backgroundColor: 'bg-gray-50',
  nextPhase: 'player',
};
