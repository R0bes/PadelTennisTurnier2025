import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users2,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { TournamentState, Team, Player } from '@tournament-app/shared-types';
import {
  createTeam,
  deleteTeam,
  assignPlayerToTeam,
  unassignPlayer,
} from '../api/tournamentApi';

interface TeamSetupPageProps {
  tournamentState: TournamentState;
  isAdmin: boolean;
  onRefresh: () => void;
}

export default function TeamSetupPage({
  tournamentState,
  isAdmin,
  onRefresh,
}: TeamSetupPageProps) {
  const [isAssigning, setIsAssigning] = useState<string | null>(null);

  const teams = tournamentState.teams || [];
  const players = tournamentState.players || [];

  // Get players not assigned to any team (exclude DummyPlayers)
  const unassignedPlayers = players.filter(
    (player) =>
      player.name !== 'DummyPlayer' &&
      !teams.some((team) => team.playerIds.includes(player.id))
  );

  // Get players for a specific team
  const getTeamPlayers = (team: Team): Player[] => {
    return players.filter((player) => team.playerIds.includes(player.id));
  };



  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      await deleteTeam(tournamentState.id, teamId);
      toast.success(`Team "${teamName}" deleted`);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete team';
      toast.error(message);
    }
  };


  const handleUnassignPlayer = async (playerId: string) => {
    if (isAssigning) return;

    try {
      setIsAssigning(playerId);
      await unassignPlayer(tournamentState.id, playerId);
      toast.success('Player removed from team');
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to unassign player';
      toast.error(message);
    } finally {
      setIsAssigning(null);
    }
  };

  const handleAutoGenerateTeams = async () => {
    if (unassignedPlayers.length === 0) {
      toast.error('No players available to create teams');
      return;
    }

    try {
      // Calculate number of teams needed
      // Each team needs 2 players, so we need at least Math.ceil(players / 2) teams
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
      // All real players will be assigned, remaining slots will be filled with DummyPlayers
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

      // Calculate how many DummyPlayers were needed
      const totalSlots = numTeams * 2;
      const dummyPlayersNeeded = totalSlots - shuffledPlayers.length;

      const message = dummyPlayersNeeded > 0
        ? `Created ${numTeams} teams! All ${shuffledPlayers.length} players assigned. ${dummyPlayersNeeded} DummyPlayer(s) added to fill teams.`
        : `Created ${numTeams} teams! All ${shuffledPlayers.length} players assigned.`;
      toast.success(message);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate teams';
      toast.error(message);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Users2 className="w-8 h-8" />
          Team Setup
        </h1>
        <p className="mt-2 text-gray-600">
          Organize players into teams for the tournament.
        </p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={handleAutoGenerateTeams}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Auto-Generate Teams
          </button>
        </div>
      )}

      {/* Teams */}
      {teams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users2 className="w-5 h-5" />
            Teams ({teams.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {teams.map((team) => {
                const teamPlayers = getTeamPlayers(team);
                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {team.name}
                      </h3>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {/* Always show exactly 2 slots */}
                      {(() => {
                        // Ensure we only show exactly 2 players
                        const displayedPlayers = teamPlayers.slice(0, 2);
                        const slotsToShow = 2;
                        const emptySlots = slotsToShow - displayedPlayers.length;

                        return (
                          <>
                            {/* Show real players and DummyPlayers (max 2 total) */}
                            {displayedPlayers.map((player) => {
                              const isDummy = player.name === 'DummyPlayer';
                              return (
                                <div
                                  key={player.id}
                                  className={`flex items-center justify-between p-2 rounded-md ${
                                    isDummy
                                      ? 'bg-gray-100 border border-dashed border-gray-300'
                                      : 'bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        isDummy
                                          ? 'bg-gray-200'
                                          : 'bg-blue-100'
                                      }`}
                                    >
                                      <span
                                        className={`font-semibold text-xs ${
                                          isDummy
                                            ? 'text-gray-500'
                                            : 'text-blue-600'
                                        }`}
                                      >
                                        {isDummy ? '?' : player.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-sm font-medium ${
                                        isDummy ? 'text-gray-500 italic' : 'text-gray-800'
                                      }`}
                                    >
                                      {player.name}
                                    </span>
                                  </div>
                                  {isAdmin && !isDummy && (
                                    <button
                                      onClick={() => handleUnassignPlayer(player.id)}
                                      disabled={isAssigning === player.id}
                                      className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                      title="Remove from team"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {/* Show empty slots if needed */}
                            {Array.from({ length: emptySlots }).map((_, index) => (
                              <div
                                key={`empty-${index}`}
                                className="flex items-center gap-2 p-2 bg-gray-100 border border-dashed border-gray-300 rounded-md"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                  <span className="text-gray-500 font-semibold text-xs">
                                    ?
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-gray-500 italic">
                                  DummyPlayer
                                </span>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

    </div>
  );
}
