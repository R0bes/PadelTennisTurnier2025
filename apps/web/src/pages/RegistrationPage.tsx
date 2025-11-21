import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TournamentState } from '@tournament-app/shared-types';
import { registerPlayer, deletePlayer } from '../api/tournamentApi';

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
            <div className="flex gap-3">
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
          <ul className="space-y-2">
            <AnimatePresence mode="popLayout">
              {tournamentState.players.map((player) => (
                <motion.li
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {player.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-800 font-medium text-lg">
                      {player.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <>
                        <span className="text-xs text-gray-400 font-mono">
                          {player.id.slice(0, 8)}...
                        </span>
                        <button
                          onClick={() =>
                            handleDeletePlayer(player.id, player.name)
                          }
                          disabled={isDeleting === player.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Delete player"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {!isAdmin && (
                      <span className="text-sm text-gray-400">****</span>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
