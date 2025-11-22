import { useState, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Trash2, Users, Users2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TournamentState, Team, Player } from '@tournament-app/shared-types';
import { deletePlayer, createTeam, assignPlayerToTeam, setPhase } from '../api/tournamentApi';
import PlayerCard from '../components/PlayerCard';
import PlayerGhostCard from '../components/PlayerGhostCard';
import TeamCard from '../components/TeamCard';
import TeamGhostCard from '../components/TeamGhostCard';

interface RegistrationPageProps {
  tournamentState: TournamentState;
  isAdmin: boolean;
  onRefresh: () => void;
}

export interface RegistrationPageRef {
  handleAutoGenerateTeams: () => Promise<void>;
  isGenerating: boolean;
}

const RegistrationPage = forwardRef<RegistrationPageRef, RegistrationPageProps>(({
  tournamentState: propTournamentState,
  isAdmin,
  onRefresh,
}, ref) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Use prop state directly - all updates come from backend
  const tournamentState = propTournamentState;

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (isDeleting) return;

    try {
      setIsDeleting(playerId);
      await deletePlayer(tournamentState.id, playerId);
      toast.success(`Player "${playerName}" removed`);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete player';
      toast.error(message);
    } finally {
      setIsDeleting(null);
    }
  };


  const handleAutoGenerateTeams = async () => {
    const unassignedPlayers = tournamentState.players.filter(
      (player) => player.name !== 'DummyPlayer'
    );

    if (unassignedPlayers.length === 0) {
      toast.error('No players available to create teams');
      return;
    }

    if (isGenerating) return;

    try {
      setIsGenerating(true);

      // Calculate number of teams needed
      let numTeams = Math.ceil(unassignedPlayers.length / 2);
      
      // Ensure even number of teams
      if (numTeams % 2 !== 0) {
        numTeams += 1;
      }

      // Shuffle players randomly
      const shuffledPlayers = [...unassignedPlayers].sort(() => Math.random() - 0.5);

      // Create teams (will be empty if real players are available)
      const teamPromises = [];
      for (let i = 0; i < numTeams; i++) {
        teamPromises.push(
          createTeam(tournamentState.id, `Team ${i + 1}`)
        );
      }
      const createdTeams = await Promise.all(teamPromises);

      // Assign players to teams (2 per team)
      const assignPromises = [];
      let playerIndex = 0;
      
      for (let i = 0; i < createdTeams.length; i++) {
        const team = createdTeams[i];
        // Assign up to 2 real players per team
        for (let j = 0; j < 2; j++) {
          if (playerIndex < shuffledPlayers.length) {
            assignPromises.push(
              assignPlayerToTeam(tournamentState.id, team.id, shuffledPlayers[playerIndex].id)
            );
            playerIndex++;
          }
        }
      }
      
      await Promise.all(assignPromises);

      // 5. Change phase in backend
      await setPhase(tournamentState.id, 'team_setup');

      // 6. Update parent state (this will get the updated state from backend and trigger the animation via Framer Motion layoutId)
      onRefresh();

      // Calculate how many DummyPlayers were needed for toast
      const totalSlots = numTeams * 2;
      const dummyPlayersNeeded = Math.max(0, totalSlots - shuffledPlayers.length);

      toast.success(
        `Created ${numTeams} teams${dummyPlayersNeeded > 0 ? ` with ${dummyPlayersNeeded} DummyPlayer(s)` : ''}!`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate teams';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Expose function to parent via ref
  useImperativeHandle(ref, () => ({
    handleAutoGenerateTeams,
    isGenerating,
  }));

  return (
    <LayoutGroup>
      <div className="space-y-6">


      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Registered Players ({tournamentState.players.length})
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <AnimatePresence mode="popLayout">
              {tournamentState.players.map((player) =>
                player.teamId ? (
                  <PlayerGhostCard key={player.id} player={player} />
                ) : (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isAdmin={isAdmin}
                    onDelete={handleDeletePlayer}
                    isDeleting={isDeleting === player.id}
                  />
                )
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Teams Section - shown when phase is team_setup or match_setup */}
      {(tournamentState.phase === 'team_setup' || tournamentState.phase === 'match_setup') && 
       tournamentState.teams && 
       tournamentState.teams.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Users2 className="w-5 h-5" />
              Teams ({tournamentState.teams.length})
            </h2>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {tournamentState.teams.map((team) => {
                  // Show TeamGhostCard if phase is match_setup (for animation to matches)
                  const isInMatch = tournamentState.phase === 'match_setup';
                  
                  if (isInMatch) {
                    // Show TeamGhostCard for animation (team has moved to matches)
                    return (
                      <TeamGhostCard
                        key={team.id}
                        team={team}
                      />
                    );
                  }
                  
                  // Show TeamCard with players for team_setup phase (for both player and team animation)
                  const teamPlayers = tournamentState.players.filter((player) =>
                    team.playerIds.includes(player.id)
                  );

                  return (
                    <TeamCard
                      key={team.id}
                      team={team}
                      players={teamPlayers}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>
      )}
      </div>
    </LayoutGroup>
  );
});

RegistrationPage.displayName = 'RegistrationPage';

export default RegistrationPage;
