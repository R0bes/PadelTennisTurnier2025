import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import {
  TournamentSchema,
  PlayerSchema,
  PhaseSchema,
  TournamentStateSchema,
  TeamSchema,
  type Phase,
} from '@tournament-app/shared-types';

const prisma = new PrismaClient();
const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
});

// Phase transition validation - simple chain validation
const phaseChain: Record<Phase, Phase | null> = {
  initial: 'player',
  player: 'team',
  team: 'swiss',
  swiss: 'ko',
  ko: 'summary',
  summary: null, // No transitions from summary
};

function isValidTransition(currentPhase: Phase, targetPhase: Phase): boolean {
  return phaseChain[currentPhase] === targetPhase;
}

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Helper function to sanitize and validate names
function sanitizeName(name: string): string {
  return name.trim().replace(/[<>]/g, '');
}

function validateName(name: string, maxLength: number = 100): { valid: boolean; error?: string; sanitized?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }
  
  const sanitized = sanitizeName(name);
  
  if (sanitized.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }
  
  if (sanitized.length > maxLength) {
    return { valid: false, error: `Name must be less than ${maxLength} characters` };
  }
  
  return { valid: true, sanitized };
}

// Create tournament
fastify.post<{ Body: { name: string } }>('/tournaments', async (request, reply) => {
  try {
    const { name } = request.body;

    const validation = validateName(name);
    if (!validation.valid) {
      return reply.code(400).send({ error: validation.error });
    }

    // First, check if phase column exists by trying to read it
    let tournament;
    try {
      tournament = await prisma.tournament.create({
        data: {
          name: validation.sanitized!,
          phase: 'initial',
        },
        include: {
          players: true,
        },
      });
    } catch (createError: any) {
      // If phase column doesn't exist, try without it
      if (createError?.code === 'P2022' || createError?.message?.includes('phase')) {
        fastify.log.warn('Phase column not found, creating without phase field');
        tournament = await prisma.tournament.create({
          data: {
            name: validation.sanitized!,
          },
          include: {
            players: true,
          },
        });
      } else {
        throw createError;
      }
    }

    // Fetch tournament with teams
    const tournamentWithTeams = await prisma.tournament.findUnique({
      where: { id: tournament.id },
      include: {
        players: true,
        teams: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!tournamentWithTeams) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch tournament after creation'
      });
    }

    const result = {
      id: tournamentWithTeams.id,
      name: tournamentWithTeams.name,
      phase: (tournamentWithTeams.phase || 'initial') as Phase,
      createdAt: tournamentWithTeams.createdAt.toISOString(),
      players: tournamentWithTeams.players.map((player) => ({
        id: player.id,
        name: player.name,
        teamId: player.teamId || null,
        telegramUsername: (player as any).telegramUsername || null,
        avatarUrl: (player as any).avatarUrl || null,
      })),
      teams: tournamentWithTeams.teams.length > 0 
        ? tournamentWithTeams.teams.map((team) => ({
        id: team.id,
        name: team.name,
        tournamentId: team.tournamentId,
        playerIds: team.players.map((p) => p.id),
        createdAt: team.createdAt.toISOString(),
          }))
        : [],
      rounds: [],
    };

    // Validate with shared schema
    try {
    TournamentStateSchema.parse(result);
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : 'Unknown error';
      const zodError = validationError as any;
      const zodIssues = zodError?.issues ? JSON.stringify(zodError.issues, null, 2) : '';
      fastify.log.error(`Schema validation error: ${errorMessage}`);
      fastify.log.error(`Zod issues: ${zodIssues}`);
      fastify.log.error(`Result being validated: ${JSON.stringify(result, null, 2)}`);
      // Also log to console for easier debugging
      console.error('=== SCHEMA VALIDATION ERROR ===');
      console.error('Error:', errorMessage);
      console.error('Zod Issues:', zodIssues);
      console.error('Result:', JSON.stringify(result, null, 2));
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: `Schema validation failed: ${errorMessage}`,
        details: zodIssues ? JSON.parse(zodIssues) : null
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    fastify.log.error(`Error creating tournament: ${errorMessage}`);
    if (errorStack) {
      fastify.log.error(`Stack trace: ${errorStack}`);
    }
    // Also log to console for easier debugging
    console.error('=== TOURNAMENT CREATION ERROR ===');
    console.error('Error:', errorMessage);
    console.error('Stack:', errorStack);
    console.error('Full error:', error);
    return reply.code(500).send({ 
      error: 'Internal Server Error',
      message: errorMessage
    });
  }
});

// Get tournament
fastify.get<{ Params: { id: string } }>(
  '/tournaments/:id',
  async (request, reply) => {
    const { id } = request.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        players: true,
      },
    });

    if (!tournament) {
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    const result = {
      id: tournament.id,
      name: tournament.name,
      phase: tournament.phase as Phase,
      createdAt: tournament.createdAt.toISOString(),
        players: tournament.players.map((player) => ({
          id: player.id,
          name: player.name,
          teamId: player.teamId || null,
          telegramUsername: (player as any).telegramUsername || null,
        avatarUrl: (player as any).avatarUrl || null,
        })),
    };

    // Validate with shared schema
    TournamentSchema.parse(result);

    return result;
  }
);

// Get active tournament (newest one)
fastify.get('/tournaments/active', async (request, reply) => {
  try {
    const tournament = await prisma.tournament.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        players: {
          include: {
            team: true,
          },
        },
        teams: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!tournament) {
      return reply.code(404).send({ error: 'No tournament found' });
    }

    const result = {
      id: tournament.id,
      name: tournament.name,
      phase: (tournament.phase || 'initial') as Phase,
      createdAt: tournament.createdAt.toISOString(),
      players: tournament.players.map((player) => ({
        id: player.id,
        name: player.name,
        teamId: player.teamId || null,
          telegramUsername: (player as any).telegramUsername || null,
        avatarUrl: (player as any).avatarUrl || null,
      })),
      teams: tournament.teams.map((team) => ({
        id: team.id,
        name: team.name,
        tournamentId: team.tournamentId,
        playerIds: team.players.map((p) => p.id),
        createdAt: team.createdAt.toISOString(),
      })),
      rounds: [],
    };

    TournamentStateSchema.parse(result);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get tournament state
fastify.get<{ Params: { id: string } }>(
  '/tournaments/:id/state',
  async (request, reply) => {
    try {
      const { id } = request.params;

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          players: {
            include: {
              team: true,
            },
          },
          teams: {
            include: {
              players: true,
            },
          },
        },
      });

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      const result = {
        id: tournament.id,
        name: tournament.name,
        phase: (tournament.phase || 'initial') as Phase,
        createdAt: tournament.createdAt.toISOString(),
        players: tournament.players.map((player) => ({
          id: player.id,
          name: player.name,
          teamId: player.teamId || null,
          telegramUsername: (player as any).telegramUsername || null,
        avatarUrl: (player as any).avatarUrl || null,
        })),
        teams: tournament.teams.map((team) => ({
          id: team.id,
          name: team.name,
          tournamentId: team.tournamentId,
          playerIds: team.players.map((p) => p.id),
          createdAt: team.createdAt.toISOString(),
        })),
        rounds: [], // Placeholder for future rounds
      };

      // Validate with shared schema
      TournamentStateSchema.parse(result);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Set tournament phase
fastify.post<{ Params: { id: string }; Body: { phase: Phase } }>(
  '/tournaments/:id/phase',
  async (request, reply) => {
    const { id } = request.params;
    const { phase } = request.body;

    // Validate phase
    try {
      PhaseSchema.parse(phase);
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid phase' });
    }

    // Get current tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        players: true,
      },
    });

    if (!tournament) {
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    const currentPhase = tournament.phase as Phase;

    // Validate transition
    if (!isValidTransition(currentPhase, phase)) {
      return reply.code(400).send({
        error: `Invalid phase transition: cannot transition from ${currentPhase} to ${phase}`,
      });
    }

    // Update phase
    const updated = await prisma.tournament.update({
      where: { id },
      data: { phase },
      include: {
        players: {
          include: {
            team: true,
          },
        },
        teams: {
          include: {
            players: true,
          },
        },
      },
    });

    const result = {
      id: updated.id,
      name: updated.name,
      phase: updated.phase as Phase,
      createdAt: updated.createdAt.toISOString(),
      players: updated.players.map((player) => ({
        id: player.id,
        name: player.name,
        teamId: player.teamId || null,
        telegramUsername: (player as any).telegramUsername || null,
        avatarUrl: (player as any).avatarUrl || null,
      })),
      teams: updated.teams.map((team) => ({
        id: team.id,
        name: team.name,
        tournamentId: team.tournamentId,
        playerIds: team.players.map((p) => p.id),
        createdAt: team.createdAt.toISOString(),
      })),
      rounds: [],
    };

    // Validate with shared schema
    TournamentStateSchema.parse(result);

    return result;
  }
);

// Register player
fastify.post<{ Params: { id: string }; Body: { name: string } }>(
  '/tournaments/:id/register-player',
  async (request, reply) => {
    try {
      const { id } = request.params;
      const { name } = request.body;

      const validation = validateName(name);
      if (!validation.valid) {
        return reply.code(400).send({ error: validation.error });
      }

      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      const player = await prisma.player.create({
        data: {
          name: validation.sanitized!,
          tournamentId: id,
        },
      });

      const result = {
        id: player.id,
        name: player.name,
        tournamentId: player.tournamentId,
      };

      // Validate player data with shared schema (only id and name)
      PlayerSchema.parse({ id: player.id, name: player.name });

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Delete player
fastify.delete<{ Params: { id: string; playerId: string } }>(
  '/tournaments/:id/players/:playerId',
  async (request, reply) => {
    try {
      const { id, playerId } = request.params;

      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      // Check if player exists and belongs to tournament
      const player = await prisma.player.findUnique({
        where: { id: playerId },
      });

      if (!player) {
        return reply.code(404).send({ error: 'Player not found' });
      }

      if (player.tournamentId !== id) {
        return reply.code(400).send({
          error: 'Player does not belong to this tournament',
        });
      }

      await prisma.player.delete({
        where: { id: playerId },
      });

      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Create team
fastify.post<{ Params: { id: string }; Body: { name: string } }>(
  '/tournaments/:id/teams',
  async (request, reply) => {
    try {
      const { id } = request.params;
      const { name } = request.body;

      const validation = validateName(name);
      if (!validation.valid) {
        return reply.code(400).send({ error: validation.error || 'Team name is required' });
      }

      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      const team = await prisma.team.create({
        data: {
          name: validation.sanitized!,
          tournamentId: id,
        },
        include: {
          players: true,
        },
      });

      // Get unassigned real players (excluding DummyPlayers)
      const unassignedRealPlayers = await prisma.player.findMany({
        where: {
          tournamentId: id,
          teamId: null,
          name: { not: 'DummyPlayer' },
        },
      });

      // Only create DummyPlayers if there are no unassigned real players available
      let playerIds: string[] = [];
      if (unassignedRealPlayers.length === 0) {
        // No real players available, create 2 DummyPlayers
        const dummyPlayers = await Promise.all([
          prisma.player.create({
            data: {
              name: 'DummyPlayer',
              tournamentId: id,
              teamId: team.id,
            },
          }),
          prisma.player.create({
            data: {
              name: 'DummyPlayer',
              tournamentId: id,
              teamId: team.id,
            },
          }),
        ]);
        playerIds = dummyPlayers.map((p) => p.id);
      } else {
        // Real players available, team starts empty (will be filled by assignments)
        playerIds = [];
      }

      const result = {
        id: team.id,
        name: team.name,
        tournamentId: team.tournamentId,
        playerIds,
        createdAt: team.createdAt.toISOString(),
      };

      TeamSchema.parse(result);
      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Delete team
fastify.delete<{ Params: { id: string; teamId: string } }>(
  '/tournaments/:id/teams/:teamId',
  async (request, reply) => {
    try {
      const { id, teamId } = request.params;

      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      // Check if team exists and belongs to tournament
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        return reply.code(404).send({ error: 'Team not found' });
      }

      if (team.tournamentId !== id) {
        return reply.code(400).send({
          error: 'Team does not belong to this tournament',
        });
      }

      await prisma.team.delete({
        where: { id: teamId },
      });

      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Assign player to team
fastify.post<{
  Params: { id: string; teamId: string };
  Body: { playerId: string };
}>('/tournaments/:id/teams/:teamId/assign-player', async (request, reply) => {
  try {
    const { id, teamId } = request.params;
    const { playerId } = request.body;

    if (!playerId || typeof playerId !== 'string') {
      return reply.code(400).send({ error: 'Player ID is required' });
    }

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    // Check if team exists and belongs to tournament
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: true,
      },
    });

    if (!team) {
      return reply.code(404).send({ error: 'Team not found' });
    }

    if (team.tournamentId !== id) {
      return reply.code(400).send({
        error: 'Team does not belong to this tournament',
      });
    }

    // Check if player exists and belongs to tournament
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }

    if (player.tournamentId !== id) {
      return reply.code(400).send({
        error: 'Player does not belong to this tournament',
      });
    }

    // Count real players (excluding DummyPlayers)
    const realPlayers = team.players.filter((p) => p.name !== 'DummyPlayer');
    
    // Teams must always have exactly 2 players
    if (realPlayers.length >= 2) {
      return reply.code(400).send({
        error: 'Team already has 2 players. Remove a player first before assigning a new one.',
      });
    }

    // If player is already assigned to another team, remove from that team first
    if (player.teamId && player.teamId !== teamId) {
      const oldTeam = await prisma.team.findUnique({
        where: { id: player.teamId },
        include: { players: true },
      });
      
      if (oldTeam) {
        // Remove player from old team
        await prisma.player.update({
          where: { id: playerId },
          data: { teamId: null },
        });
        
        // Ensure old team still has 2 players (add DummyPlayer only if no real players available)
        const oldTeamRealPlayers = oldTeam.players.filter((p) => p.name !== 'DummyPlayer' && p.id !== playerId);
        const oldTeamDummyPlayers = oldTeam.players.filter((p) => p.name === 'DummyPlayer');
        const oldTeamPlayersNeeded = 2 - oldTeamRealPlayers.length - oldTeamDummyPlayers.length;
        
        // Check if there are unassigned real players available
        const unassignedRealPlayers = await prisma.player.findMany({
          where: {
            tournamentId: id,
            teamId: null,
            name: { not: 'DummyPlayer' },
          },
        });
        
        // Only add DummyPlayers if no real players are available
        if (unassignedRealPlayers.length === 0 && oldTeamPlayersNeeded > 0) {
          for (let i = 0; i < oldTeamPlayersNeeded; i++) {
            await prisma.player.create({
              data: {
                name: 'DummyPlayer',
                tournamentId: id,
                teamId: oldTeam.id,
              },
            });
          }
        }
      }
    }

    // Find and remove one DummyPlayer from the target team if it exists
    const dummyPlayer = team.players.find((p) => p.name === 'DummyPlayer');
    if (dummyPlayer) {
      await prisma.player.delete({
        where: { id: dummyPlayer.id },
      });
    }

    // Assign player to team
    await prisma.player.update({
      where: { id: playerId },
      data: { teamId },
    });

    // After assignment, check if team needs a DummyPlayer
    // (if team has only 1 player and no real players are available)
    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: { players: true },
    });

    if (updatedTeam) {
      // Ensure team never has more than 2 players
      if (updatedTeam.players.length > 2) {
        // Remove excess players, prioritizing DummyPlayers
        const realPlayers = updatedTeam.players.filter((p) => p.name !== 'DummyPlayer');
        const dummyPlayers = updatedTeam.players.filter((p) => p.name === 'DummyPlayer');
        
        // Keep 2 players: prefer real players, then DummyPlayers
        const playersToKeep = [
          ...realPlayers.slice(0, 2),
          ...dummyPlayers.slice(0, Math.max(0, 2 - realPlayers.length))
        ];
        const playersToRemove = updatedTeam.players.filter(
          (p) => !playersToKeep.some((kp) => kp.id === p.id)
        );
        
        for (const playerToRemove of playersToRemove) {
          await prisma.player.delete({
            where: { id: playerToRemove.id },
          });
        }
        
        // Re-fetch team after cleanup
        const cleanedTeam = await prisma.team.findUnique({
          where: { id: teamId },
          include: { players: true },
        });
        
        if (cleanedTeam) {
          const realPlayersAfterCleanup = cleanedTeam.players.filter((p) => p.name !== 'DummyPlayer');
          const dummyPlayersAfterCleanup = cleanedTeam.players.filter((p) => p.name === 'DummyPlayer');
          const totalPlayersAfterCleanup = realPlayersAfterCleanup.length + dummyPlayersAfterCleanup.length;
          const playersNeeded = 2 - totalPlayersAfterCleanup;

          if (playersNeeded > 0) {
            // Check if there are unassigned real players available
            const unassignedRealPlayers = await prisma.player.findMany({
              where: {
                tournamentId: id,
                teamId: null,
                name: { not: 'DummyPlayer' },
              },
            });

            // Only add DummyPlayers if no real players are available
            if (unassignedRealPlayers.length === 0) {
              for (let i = 0; i < playersNeeded; i++) {
                await prisma.player.create({
                  data: {
                    name: 'DummyPlayer',
                    tournamentId: id,
                    teamId: teamId,
                  },
                });
              }
            }
          }
        }
        
        return reply.code(204).send();
      }

      const realPlayersAfterAssignment = updatedTeam.players.filter((p) => p.name !== 'DummyPlayer');
      const dummyPlayersAfterAssignment = updatedTeam.players.filter((p) => p.name === 'DummyPlayer');
      const totalPlayers = realPlayersAfterAssignment.length + dummyPlayersAfterAssignment.length;
      const playersNeeded = 2 - totalPlayers;

      if (playersNeeded > 0) {
        // Check if there are unassigned real players available
        const unassignedRealPlayers = await prisma.player.findMany({
          where: {
            tournamentId: id,
            teamId: null,
            name: { not: 'DummyPlayer' },
          },
        });

        // Only add DummyPlayers if no real players are available
        if (unassignedRealPlayers.length === 0) {
          for (let i = 0; i < playersNeeded; i++) {
            await prisma.player.create({
              data: {
                name: 'DummyPlayer',
                tournamentId: id,
                teamId: teamId,
              },
            });
          }
        }
      }
    }

    return reply.code(204).send();
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Remove player from team
fastify.post<{
  Params: { id: string; playerId: string };
}>('/tournaments/:id/players/:playerId/unassign', async (request, reply) => {
  try {
    const { id, playerId } = request.params;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    // Check if player exists and belongs to tournament
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }

    if (player.tournamentId !== id) {
      return reply.code(400).send({
        error: 'Player does not belong to this tournament',
      });
    }

    // Get team to check current player count
    const team = player.teamId
      ? await prisma.team.findUnique({
          where: { id: player.teamId },
          include: {
            players: true,
          },
        })
      : null;

    // Remove player from team
    await prisma.player.update({
      where: { id: playerId },
      data: { teamId: null },
    });

    // Teams must always have exactly 2 players - add DummyPlayer(s) only if no real players available
    if (team) {
      // Count remaining players (excluding the one we just removed)
      const remainingPlayers = team.players.filter((p) => p.id !== playerId);
      const playersNeeded = 2 - remainingPlayers.length;

      // Check if there are unassigned real players available
      const unassignedRealPlayers = await prisma.player.findMany({
        where: {
          tournamentId: id,
          teamId: null,
          name: { not: 'DummyPlayer' },
        },
      });

      // Only add DummyPlayers if no real players are available
      if (unassignedRealPlayers.length === 0 && playersNeeded > 0) {
        for (let i = 0; i < playersNeeded; i++) {
          await prisma.player.create({
            data: {
              name: 'DummyPlayer',
              tournamentId: id,
              teamId: team.id,
            },
          });
        }
      }
    }

    return reply.code(204).send();
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Link player to Telegram username
fastify.post<{
  Params: { id: string; playerId: string };
  Body: { telegramUsername: string };
}>('/tournaments/:id/players/:playerId/link-telegram', async (request, reply) => {
  try {
    const { id, playerId } = request.params;
    const { telegramUsername } = request.body;

    if (!telegramUsername || typeof telegramUsername !== 'string') {
      return reply.code(400).send({ error: 'Telegram username is required' });
    }

    // Normalize username (remove @ if present, lowercase)
    const normalizedUsername = telegramUsername.replace(/^@/, '').toLowerCase();

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    // Check if player exists and belongs to tournament
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }

    if (player.tournamentId !== id) {
      return reply.code(400).send({
        error: 'Player does not belong to this tournament',
      });
    }

    // Update player with telegram username
    const updated = await prisma.player.update({
      where: { id: playerId },
      data: { telegramUsername: normalizedUsername } as any,
    });

    const result = {
      id: updated.id,
      name: updated.name,
      teamId: updated.teamId || null,
      telegramUsername: (updated as any).telegramUsername || null,
      avatarUrl: (updated as any).avatarUrl || null,
    };

    PlayerSchema.parse(result);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Set player avatar URL
fastify.post<{
  Params: { id: string; playerId: string };
  Body: { avatarUrl: string };
}>('/tournaments/:id/players/:playerId/avatar', async (request, reply) => {
  try {
    const { id, playerId } = request.params;
    const { avatarUrl } = request.body;

    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return reply.code(400).send({ error: 'Avatar URL is required' });
    }

    // Validate URL format
    try {
      new URL(avatarUrl);
    } catch {
      return reply.code(400).send({ error: 'Invalid URL format' });
    }

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    // Check if player exists and belongs to tournament
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }

    if (player.tournamentId !== id) {
      return reply.code(400).send({
        error: 'Player does not belong to this tournament',
      });
    }

    // Update player with avatar URL
    const updated = await prisma.player.update({
      where: { id: playerId },
      data: { avatarUrl } as any,
    });

    const result = {
      id: updated.id,
      name: updated.name,
      teamId: updated.teamId || null,
      telegramUsername: (updated as any).telegramUsername || null,
      avatarUrl: (updated as any).avatarUrl || null,
    };

    PlayerSchema.parse(result);
    return result;
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get ready matches (matches that are ready to be played)
fastify.get<{ Params: { id: string } }>(
  '/tournaments/:id/ready-matches',
  async (request, reply) => {
    try {
      const { id } = request.params;

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          players: {
            include: {
              team: true,
            },
          },
          teams: {
            include: {
              players: true,
            },
          },
        },
      });

      if (!tournament) {
        return reply.code(404).send({ error: 'Tournament not found' });
      }

      // Only return ready matches during swiss or ko phases
      if (tournament.phase !== 'swiss' && tournament.phase !== 'ko') {
        return [];
      }

      const teams = tournament.teams.map((team) => ({
        id: team.id,
        name: team.name,
        tournamentId: team.tournamentId,
        playerIds: team.players.map((p) => p.id),
        createdAt: team.createdAt.toISOString(),
      }));

      const readyMatches: Array<{
        matchKey: string;
        matchNumber: string;
        team1: { id: string; name: string; playerIds: string[] } | null;
        team2: { id: string; name: string; playerIds: string[] } | null;
        phase: 'swiss' | 'ko';
        round?: string;
      }> = [];

      if (tournament.phase === 'swiss') {
        // Generate Swiss matches (simplified - first round only for now)
        const numMatches = Math.ceil(teams.length / 2);
        const seed = tournament.id;
        const shuffledTeams = [...teams].sort((a, b) => {
          const hashA = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const hashB = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return hashA - hashB;
        });

        for (let i = 0; i < numMatches; i++) {
          const team1 = shuffledTeams[i * 2] || null;
          const team2 = shuffledTeams[i * 2 + 1] || null;
          
          if (team1 && team2) {
            readyMatches.push({
              matchKey: `swiss-1-${i + 1}`,
              matchNumber: `${i + 1}`,
              team1: {
                id: team1.id,
                name: team1.name,
                playerIds: team1.playerIds,
              },
              team2: {
                id: team2.id,
                name: team2.name,
                playerIds: team2.playerIds,
              },
              phase: 'swiss',
              round: '1',
            });
          }
        }
      } else if (tournament.phase === 'ko') {
        // Generate KO bracket matches (quarterfinals only for now)
        try {
          const sharedUtils = await import('@tournament-app/shared-utils');
          const bracket = sharedUtils.generateKOBracket(teams);
          
          if (bracket && bracket.length > 0) {
            const roundNames: Record<string, string> = {
              'Quarterfinals': 'QF',
              'Semifinals': 'SF',
              'Final': 'F',
            };
            
            const firstRound = bracket[0];
            const roundShort = roundNames[firstRound.round] || firstRound.round.charAt(0);
            const seededTeams = [...teams].slice(0, 8);
            
            firstRound.matches.forEach((match: { team1: typeof teams[0] | null; team2: typeof teams[0] | null }, matchIdx: number) => {
              const team1 = seededTeams[matchIdx * 2] || null;
              const team2 = seededTeams[matchIdx * 2 + 1] || null;
              
              if (team1 && team2) {
                readyMatches.push({
                  matchKey: `ko-${roundShort}-${matchIdx + 1}`,
                  matchNumber: `${matchIdx + 1}`,
                  team1: {
                    id: team1.id,
                    name: team1.name,
                    playerIds: team1.playerIds,
                  },
                  team2: {
                    id: team2.id,
                    name: team2.name,
                    playerIds: team2.playerIds,
                  },
                  phase: 'ko',
                  round: firstRound.round,
                });
              }
            });
          }
        } catch (error) {
          fastify.log.error(error, 'Error generating KO bracket');
        }
      }

      return readyMatches;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

const start = async () => {
  try {
    await fastify.listen({ port: 4000, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:4000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

