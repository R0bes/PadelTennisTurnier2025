import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, UserPlus, Users, Sparkles, Users2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TournamentState, Team, Player } from '@tournament-app/shared-types';
import { registerPlayer, deletePlayer, createTeam, assignPlayerToTeam, setPhase } from '../api/tournamentApi';

interface RegistrationPageProps {
  tournamentState: TournamentState;
  isAdmin: boolean;
  onRefresh: () => void;
}

export default function RegistrationPage({
  tournamentState,
  isAdmin,
  onRefresh,
}: RegistrationPageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddPlayer = async (name: string) => {
    if (!name.trim() || isAdding) return;

    try {
      setIsAdding(true);
      await registerPlayer(tournamentState.id, name.trim());
      toast.success(`Player "${name.trim()}" registered successfully!`);
      setPlayerName('');
      setShowForm(false);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to register player';
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

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

  const addFakePlayer = async () => {
    if (isAdding) return;

    const fakeNames = [
      'Alice Johnson',
      'Bob Smith',
      'Charlie Brown',
      'Diana Prince',
      'Eve Wilson',
      'Frank Miller',
      'Grace Lee',
      'Henry Davis',
    ];
    const randomName =
      fakeNames[Math.floor(Math.random() * fakeNames.length)] +
      ` #${tournamentState.players.length + 1}`;

    await handleAddPlayer(randomName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddPlayer(playerName);
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

      // Calculate how many DummyPlayers were needed
      const totalSlots = numTeams * 2;
      const dummyPlayersNeeded = Math.max(0, totalSlots - shuffledPlayers.length);

      // Change phase to team_setup
      await setPhase(tournamentState.id, 'team_setup');

      // Refresh to get updated state
      onRefresh();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-8 h-8" />
          Registration
        </h1>
        <p className="mt-2 text-gray-600">
          Register players for the tournament.
          {isAdmin && ' Add players manually or use the quick add button.'}
        </p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          {!showForm ? (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Add Player
              </button>
              <button
                onClick={addFakePlayer}
                disabled={isAdding}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {isAdding ? 'Adding...' : 'Quick Add'}
              </button>
              {tournamentState.players.length >= 2 && (
                <button
                  onClick={handleAutoGenerateTeams}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? 'Generating...' : 'Auto Generate Teams'}
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter player name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!playerName.trim() || isAdding}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setPlayerName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

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
              {tournamentState.players.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="relative group"
                >
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all p-3 h-full flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2 shadow-sm">
                      <span className="text-white font-bold text-lg">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-800 font-semibold text-sm truncate w-full">
                      {player.name}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() =>
                          handleDeletePlayer(player.id, player.name)
                        }
                        disabled={isDeleting === player.id}
                        className="absolute top-1 right-1 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                        title="Delete player"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Show teams if phase is team_setup */}
      {tournamentState.phase === 'team_setup' && tournamentState.teams && tournamentState.teams.length > 0 && (
        <>
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
                  const teamPlayers = tournamentState.players.filter((player) =>
                    team.playerIds.includes(player.id)
                  );
                  const displayedPlayers = teamPlayers.slice(0, 2);
                  const emptySlots = 2 - displayedPlayers.length;

                  return (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="bg-gradient-to-br from-green-50 to-white rounded-lg border-2 border-gray-200 hover:border-green-400 hover:shadow-md transition-all p-4"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        {team.name}
                      </h3>
                      <div className="space-y-2">
                        {displayedPlayers.map((player) => {
                          const isDummy = player.name === 'DummyPlayer';
                          return (
                            <div
                              key={player.id}
                              className={`flex items-center gap-2 p-2 rounded-md ${
                                isDummy
                                  ? 'bg-gray-100 border border-dashed border-gray-300'
                                  : 'bg-blue-50'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isDummy
                                    ? 'bg-gray-200'
                                    : 'bg-blue-500'
                                }`}
                              >
                                <span
                                  className={`font-semibold text-xs ${
                                    isDummy
                                      ? 'text-gray-500'
                                      : 'text-white'
                                  }`}
                                >
                                  {isDummy ? '?' : player.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span
                                className={`text-sm font-medium truncate ${
                                  isDummy ? 'text-gray-500 italic' : 'text-gray-800'
                                }`}
                              >
                                {player.name}
                              </span>
                            </div>
                          );
                        })}
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
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
