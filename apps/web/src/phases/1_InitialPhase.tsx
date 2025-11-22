import type { TournamentState } from '@tournament-app/shared-types';
import type { PhaseConfig, PhaseViewElement } from './PhaseInterface';
import PhaseViewRenderer from './PhaseViewRenderer';

interface InitialPhaseProps {
  onNextPhase: () => void;
  onReset: () => Promise<void>;
  onCreate?: () => Promise<void>;
  isLoading: boolean;
  tournamentState: TournamentState | null;
}

export default function InitialPhase({
  onNextPhase,
  onReset,
  onCreate,
  isLoading,
  tournamentState,
}: InitialPhaseProps) {

  const phaseViews: PhaseViewElement[] = [
    {
      type: 'verticalLine',
      height: 'h-[80px]',
      className: 'mb-4 -mt-[80px]',
    },
    {
      type: 'button',
      text: (state) => {
        if (!state) return 'Start';
        return state.players.length === 0 ? 'Start' : 'Reset';
      },
      onClick: async (state, props) => {
        if (!state) {
          // No tournament exists - create one
          if (props.onCreate) {
            await props.onCreate();
          }
        } else if (state.players.length === 0) {
          props.onNextPhase();
        } else {
          props.onReset();
        }
      },
      color: 'orange',
      active: () => !isLoading,
      disabled: () => isLoading,
      title: (state) => {
        if (!state) return 'Turnier starten';
        return state.players.length === 0 ? 'Turnier starten' : 'Neues Turnier starten';
      },
      size: 'lg',
    },
  ];

  return (
    <div
      id="phase-initial"
      className="flex flex-col items-center relative"
    >
      <PhaseViewRenderer
        elements={phaseViews}
        tournamentState={tournamentState || {
          id: '',
          name: '',
          phase: 'initial',
          createdAt: new Date().toISOString(),
          players: [],
        }}
        phaseProps={{ onNextPhase, onReset, onCreate, isLoading }}
      />
    </div>
  );
}

// Phase configuration
export const initialPhaseConfig: PhaseConfig = {
  id: 'initial',
  title: 'Turnier Start',
  description: 'Willkommen zum Turnier',
  backgroundColor: 'bg-gradient-to-br from-retro-orange-50/80 via-retro-beige-100/90 to-retro-orange-50/80',
  nextPhase: 'player',
};
