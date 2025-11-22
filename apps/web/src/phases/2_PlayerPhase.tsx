import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';
import type { TournamentState } from '@tournament-app/shared-types';
import { getPhaseNumber, PhaseEnum } from '@tournament-app/shared-types';
import PlayerCard from '../components/PlayerCard';
import PlayerGhostCard from '../components/PlayerGhostCard';
import { registerPlayer, deletePlayer, getTournamentState } from '../api/tournamentApi';
import type { PhaseConfig, PhaseViewElement } from './PhaseInterface';
import PhaseViewRenderer from './PhaseViewRenderer';

interface PlayerPhaseProps {
  tournamentState: TournamentState;
  isAdmin: boolean;
  onNextPhase: () => void;
  getNextPhase: () => string | null;
  isLoading: boolean;
  onStateUpdate: (state: TournamentState) => void;
}

export default function PlayerPhase({
  tournamentState,
  isAdmin,
  onNextPhase,
  getNextPhase,
  isLoading,
  onStateUpdate,
}: PlayerPhaseProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const isAddingPlayersRef = useRef(false);

  // Add fake players when transitioning to player phase
  useEffect(() => {
    const addFakePlayers = async () => {
      // Prevent multiple simultaneous executions
      if (isAddingPlayersRef.current) {
        return;
      }

      if (tournamentState.phase === 'player' && tournamentState.players.length === 0) {
        isAddingPlayersRef.current = true;
        
        const playerNames = [
          'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
          'Iris', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul',
          'Quinn', 'Rachel', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
          'Yara', 'Zoe'
        ];

        try {
          for (let i = 0; i < playerNames.length; i++) {
            const playerName = playerNames[i];
            
            await registerPlayer(tournamentState.id, playerName);
            const currentState = await getTournamentState(tournamentState.id);
            onStateUpdate(currentState);
            
            // Delay of 0.5 seconds between each player registration
            if (i < 25) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          toast.success('26 players added successfully!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add players';
          toast.error(message);
        } finally {
          isAddingPlayersRef.current = false;
        }
      }
    };

    addFakePlayers();
  }, [tournamentState.phase, tournamentState.id, onStateUpdate]);

  // Handle delete player
  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (isDeleting || !tournamentState) return;

    try {
      setIsDeleting(playerId);
      await deletePlayer(tournamentState.id, playerId);
      toast.success(`Player "${playerName}" removed`);
      const updatedState = await getTournamentState(tournamentState.id);
      onStateUpdate(updatedState);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete player';
      toast.error(message);
    } finally {
      setIsDeleting(null);
    }
  };
  // Player View Component
  const PlayerView = ({ tournamentState, isAdmin, isDeleting, onDeletePlayer }: any) => (
    <div className="bg-gradient-to-br from-retro-blue-50/70 to-white/90 rounded-lg shadow-retro border-2 border-retro-blue-200/60 p-6 relative">
      {tournamentState.players.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {isAdmin
              ? 'No players registered yet. Add your first player above!'
              : 'No players registered yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
          <AnimatePresence mode="popLayout">
            {tournamentState.players.map((player: any) => {
              const currentPhaseNumber = getPhaseNumber(tournamentState.phase);
              const isInTeamPhase = currentPhaseNumber === PhaseEnum.Team;
              
              // In team phase: show both normal card (for transition) and ghost card (fading in)
              // The normal card transitions to team cards, the ghost card appears at the same position
              if (player.teamId && isInTeamPhase) {
                return (
                  <div key={player.id} className="relative z-50">
                    {/* Normal card that transitions to team cards */}
                    <PlayerCard
                      player={player}
                      isAdmin={isAdmin}
                      onDelete={onDeletePlayer}
                      isDeleting={isDeleting === player.id}
                      layout="horizontal"
                    />
                    {/* Ghost card that fades in at the same position */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="absolute inset-0 pointer-events-none z-40"
                    >
                      <PlayerGhostCard player={player} layout="horizontal" />
                    </motion.div>
                  </div>
                );
              } else if (player.teamId) {
                // After team phase: only ghost card
                return <PlayerGhostCard key={player.id} player={player} layout="horizontal" />;
              } else {
                // Normal player card
                return (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isAdmin={isAdmin}
                    onDelete={onDeletePlayer}
                    isDeleting={isDeleting === player.id}
                    layout="horizontal"
                  />
                );
              }
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  const phaseViews: PhaseViewElement[] = [
    {
      type: 'typingText',
      id: 'typing-text-anmeldung',
      text: 'Die Anmeldung ist eröffnet ...',
      secondaryText: '... wer zu spät kommt, hat Pech gehabt.',
      faded: (state) => state.phase !== 'player',
      showCursor: (state) => state.phase === 'player',
    },
    {
      type: 'view',
      component: PlayerView,
      className: 'bg-white rounded-lg shadow p-6 relative',
    },
    {
      type: 'verticalLine',
      className: 'mb-4',
      condition: (state) => state.players.length > 0,
    },
    {
      type: 'button',
      text: (state) => `${state.players.length} ${state.players.length === 1 ? 'Teilnehmer' : 'Teilnehmer'}`,
      onClick: (_state, props) => props.onNextPhase(),
      color: 'blue',
      active: (state, props) => !!props.getNextPhase() && !props.isLoading && state.players.length > 0,
      disabled: (state, props) => !props.getNextPhase() || props.isLoading || state.players.length === 0,
      title: 'Zur nächsten Phase wechseln',
      condition: (state) => state.players.length > 0,
    },
  ];

  return (
    <div id="phase-player">
      <PhaseViewRenderer
        elements={phaseViews}
        tournamentState={tournamentState}
        phaseProps={{
          isAdmin,
          isDeleting,
          onDeletePlayer: handleDeletePlayer,
          onNextPhase,
          getNextPhase,
          isLoading,
        }}
      />
    </div>
  );
}

// Phase configuration
export const playerPhaseConfig: PhaseConfig = {
  id: 'player',
  title: 'Anmeldung zum Turnier - letzte Chance!',
  description: 'Spieler können sich für das Turnier anmelden',
  backgroundColor: 'bg-gradient-to-br from-retro-blue-50/80 via-retro-blue-100/90 to-retro-blue-50/80',
  nextPhase: 'team',
};
