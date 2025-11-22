import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import type { TournamentState } from '@tournament-app/shared-types';
import { getPhaseNumber, PhaseEnum } from '@tournament-app/shared-types';
import { createTeam, assignPlayerToTeam, registerPlayer, getTournamentState } from '../api/tournamentApi';
import { generateTeamName, isDummyPlayer } from '@tournament-app/shared-utils';
import TeamCard from '../components/TeamCard';
import TeamGhostCard from '../components/TeamGhostCard';
import type { PhaseConfig, PhaseViewElement } from './PhaseInterface';
import PhaseViewRenderer from './PhaseViewRenderer';

interface TeamPhaseProps {
  tournamentState: TournamentState;
  onNextPhase: () => void;
  phaseButtonClicked: string | null;
  getNextPhase: () => string | null;
  isLoading: boolean;
  onStateUpdate: (state: TournamentState) => void;
}

export default function TeamPhase({
  tournamentState,
  onNextPhase,
  phaseButtonClicked,
  getNextPhase,
  isLoading,
  onStateUpdate,
}: TeamPhaseProps) {
  const isCreatingTeamsRef = useRef(false);

  // Create teams when transitioning to team phase
  useEffect(() => {
    const createTeams = async () => {
      // Prevent multiple simultaneous executions
      if (isCreatingTeamsRef.current) {
        return;
      }

      if (tournamentState.phase === 'team' && (!tournamentState.teams || tournamentState.teams.length === 0)) {
        isCreatingTeamsRef.current = true;

        const unassignedPlayers = tournamentState.players.filter(
          (player) => !isDummyPlayer(player)
        );

        if (unassignedPlayers.length === 0) {
          toast.error('No players available to create teams');
          isCreatingTeamsRef.current = false;
          return;
        }

        try {
          // Calculate number of teams needed
          let numTeams = Math.ceil(unassignedPlayers.length / 2);
          if (numTeams % 2 !== 0) {
            numTeams += 1;
          }

          // Shuffle players deterministically
          const seed = tournamentState.id;
          const shuffledPlayers = [...unassignedPlayers].sort((a, b) => {
            const hashA =
              seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
              a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const hashB =
              seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
              b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return hashA - hashB;
          });
          const totalSlots = numTeams * 2;
          const dummyPlayersNeeded = Math.max(0, totalSlots - shuffledPlayers.length);

          // Create dummy players first (if needed)
          const dummyPlayers = [];
          for (let i = 0; i < dummyPlayersNeeded; i++) {
            const dummyPlayer = await registerPlayer(tournamentState.id, 'DummyPlayer');
            dummyPlayers.push(dummyPlayer);
            const currentState = await getTournamentState(tournamentState.id);
            onStateUpdate(currentState);
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Create all teams first
          const createdTeams = [];
          for (let i = 0; i < numTeams; i++) {
            const teamName = generateTeamName(i);
            const team = await createTeam(tournamentState.id, teamName);
            createdTeams.push(team);
          }

          // Assign all players to teams
          let playerIndex = 0;
          let dummyPlayerIndex = 0;
          for (let i = 0; i < createdTeams.length; i++) {
            const team = createdTeams[i];
            for (let j = 0; j < 2; j++) {
              if (playerIndex < shuffledPlayers.length) {
                await assignPlayerToTeam(tournamentState.id, team.id, shuffledPlayers[playerIndex].id);
                playerIndex++;
              } else if (dummyPlayerIndex < dummyPlayers.length) {
                await assignPlayerToTeam(tournamentState.id, team.id, dummyPlayers[dummyPlayerIndex].id);
                dummyPlayerIndex++;
              }
            }
          }

          // Update state once after all teams and players are assigned
          const finalState = await getTournamentState(tournamentState.id);
          onStateUpdate(finalState);

          const dummyPlayersNeededCount = Math.max(0, numTeams * 2 - unassignedPlayers.length);
          toast.success(
            `${numTeams} Teams erstellt${dummyPlayersNeededCount > 0 ? ` mit ${dummyPlayersNeededCount} Dummy Player(s)` : ''}!`
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create teams';
          toast.error(message);
        } finally {
          isCreatingTeamsRef.current = false;
        }
      }
    };

    createTeams();
  }, [tournamentState.phase, tournamentState.id, onStateUpdate]);

  // Show empty state if no teams yet (but phase is team)
  if (!tournamentState.teams || tournamentState.teams.length === 0) {
    // Still render the view elements, just show empty state
    const EmptyTeamView = () => (
      <div className="bg-gradient-to-br from-retro-purple-50/70 to-white/90 rounded-lg shadow-retro border-2 border-retro-purple-200/60 p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Teams werden erstellt...</p>
        </div>
      </div>
    );

    const phaseViews: PhaseViewElement[] = [
      {
        type: 'typingText',
        id: 'typing-text-teambuilding',
        text: 'Teambuildingmaßnahmen gestartet ...',
        faded: (state) => state.phase !== 'team',
        showCursor: (state) => state.phase === 'team',
      },
      {
        type: 'view',
        component: EmptyTeamView,
        className: 'bg-gradient-to-br from-retro-purple-50/70 to-white/90 rounded-lg shadow-retro border-2 border-retro-purple-200/60 p-6',
      },
    ];

    return (
      <section id="phase-team">
        <PhaseViewRenderer
          elements={phaseViews}
          tournamentState={tournamentState}
          phaseProps={{
            onNextPhase,
            phaseButtonClicked,
            getNextPhase,
            isLoading,
            teamsInMatches: new Set<string>(),
          }}
        />
      </section>
    );
  }

  // Determine which teams are already in matches (should be shown as ghost cards)
  // Teams are shown as ghost cards if phase is greater than team phase
  const teamsInMatches = new Set<string>();
  const currentPhaseNumber = getPhaseNumber(tournamentState.phase);
  if (currentPhaseNumber > PhaseEnum.Team && tournamentState.teams) {
    // If phase is greater than team phase, all teams are shown as ghost cards
    tournamentState.teams.forEach((team) => {
      teamsInMatches.add(team.id);
    });
  }

  // Team View Component
  const TeamView = ({ tournamentState, teamsInMatches }: any) => {
    const currentPhaseNumber = getPhaseNumber(tournamentState.phase);
    const isInSwissPhase = currentPhaseNumber === PhaseEnum.Swiss;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 justify-items-center">
          <AnimatePresence mode="popLayout">
            {tournamentState.teams.map((team: any) => {
              const teamPlayers = tournamentState.players.filter((player: any) =>
                team.playerIds.includes(player.id)
              );
              const isInMatch = teamsInMatches.has(team.id);

              // In swiss phase: show both normal card (for transition) and ghost card (fading in)
              // The normal card transitions to match cards, the ghost card appears at the same position
              if (isInMatch && isInSwissPhase) {
                return (
                  <div key={team.id} className="relative z-10">
                    {/* Normal card that transitions to match cards */}
                    <TeamCard
                      team={team}
                      players={teamPlayers}
                      playerLayout="horizontal"
                    />
                    {/* Ghost card that fades in at the same position */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="absolute inset-0 pointer-events-none z-5"
                    >
                      <TeamGhostCard
                        team={team}
                        players={teamPlayers}
                        playerLayout="horizontal"
                      />
                    </motion.div>
                  </div>
                );
              } else if (isInMatch) {
                // After swiss phase: only ghost card
                return (
                  <TeamGhostCard
                    key={team.id}
                    team={team}
                    players={teamPlayers}
                    playerLayout="horizontal"
                  />
                );
              } else {
                // Normal team card
                return (
                  <TeamCard
                    key={team.id}
                    team={team}
                    players={teamPlayers}
                    playerLayout="horizontal"
                  />
                );
              }
            })}
          </AnimatePresence>
        </div>
    );
  };

  const phaseViews: PhaseViewElement[] = [
    {
      type: 'typingText',
      id: 'typing-text-teambuilding',
      text: 'Teambuildingmaßnahmen gestartet ...',
      faded: (state) => state.phase !== 'team',
      showCursor: (state) => state.phase === 'team',
    },
    {
      type: 'view',
      component: TeamView,
      className: 'bg-gradient-to-br from-retro-purple-50/70 to-white/90 rounded-lg shadow-retro border-2 border-retro-purple-200/60 p-6',
    },
    {
      type: 'verticalLine',
      className: 'mb-4',
    },
    {
      type: 'button',
      text: (state) => `${state.teams?.length || 0} ${(state.teams?.length || 0) === 1 ? 'Team' : 'Teams'}`,
      onClick: (_state, props) => props.onNextPhase(),
      color: 'purple',
      active: (state, props) => !!props.getNextPhase() && !props.isLoading && (state.teams?.length || 0) > 0 && props.phaseButtonClicked !== 'team',
      disabled: (_state, props) => props.phaseButtonClicked === 'team',
      title: 'Zur nächsten Phase wechseln',
    },
  ];

  return (
    <section id="phase-team">
      <PhaseViewRenderer
        elements={phaseViews}
        tournamentState={tournamentState}
        phaseProps={{
          onNextPhase,
          phaseButtonClicked,
          getNextPhase,
          isLoading,
          teamsInMatches,
        }}
      />
    </section>
  );
}

// Phase configuration
export const teamPhaseConfig: PhaseConfig = {
  id: 'team',
  title: 'Teambuilding',
  description: 'Teams werden erstellt und Spieler zugewiesen',
  backgroundColor: 'bg-gradient-to-br from-retro-purple-50/80 via-retro-purple-100/90 to-retro-purple-50/80',
  nextPhase: 'swiss',
  requiresTeams: true,
};
