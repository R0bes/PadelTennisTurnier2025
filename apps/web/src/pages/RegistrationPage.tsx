import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TournamentState } from '@tournament-app/shared-types';
import { registerPlayer } from '../api/tournamentApi';

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

    try {
      setIsAdding(true);
      await registerPlayer(tournamentState.id, randomName);
      onRefresh();
    } catch (error) {
      console.error('Failed to register player:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Registration</h1>
        <p className="mt-2 text-gray-600">
          Register players for the tournament.
          {isAdmin && ' Click the button to add demo players.'}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          Registered Players ({tournamentState.players.length})
        </h2>
        {isAdmin && (
          <button
            onClick={addFakePlayer}
            disabled={isAdding}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : 'Add fake player'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {tournamentState.players.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {isAdmin
              ? 'No players registered yet. Click "Add fake player" to get started.'
              : 'No players registered yet.'}
          </p>
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
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-800 font-medium">
                    {player.name}
                  </span>
                  {isAdmin && (
                    <span className="text-sm text-gray-500">{player.id}</span>
                  )}
                  {!isAdmin && (
                    <span className="text-sm text-gray-500">****</span>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
