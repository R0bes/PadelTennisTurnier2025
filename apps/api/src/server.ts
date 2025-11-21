import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import {
  TournamentSchema,
  PlayerSchema,
  PhaseSchema,
  TournamentStateSchema,
  type Phase,
} from '@tournament-app/shared-types';

const prisma = new PrismaClient();
const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: true,
});

// Phase transition validation
const allowedTransitions: Record<Phase, Phase[]> = {
  registration: ['team_setup'],
  team_setup: ['swiss_rounds'],
  swiss_rounds: ['ko_bracket'],
  ko_bracket: ['summary'],
  summary: [], // No transitions from summary
};

function isValidTransition(currentPhase: Phase, targetPhase: Phase): boolean {
  return allowedTransitions[currentPhase]?.includes(targetPhase) ?? false;
}

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Create tournament
fastify.post<{ Body: { name: string } }>('/tournaments', async (request, reply) => {
  try {
    const { name } = request.body;

    if (!name || typeof name !== 'string') {
      return reply.code(400).send({ error: 'Name is required' });
    }

    // First, check if phase column exists by trying to read it
    let tournament;
    try {
      tournament = await prisma.tournament.create({
        data: {
          name,
          phase: 'registration',
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
            name,
          },
          include: {
            players: true,
          },
        });
      } else {
        throw createError;
      }
    }

    const result = {
      id: tournament.id,
      name: tournament.name,
      phase: (tournament.phase || 'registration') as Phase,
      createdAt: tournament.createdAt.toISOString(),
      players: tournament.players.map((player) => ({
        id: player.id,
        name: player.name,
      })),
      rounds: [],
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
      })),
    };

    // Validate with shared schema
    TournamentSchema.parse(result);

    return result;
  }
);

// Get tournament state
fastify.get<{ Params: { id: string } }>(
  '/tournaments/:id/state',
  async (request, reply) => {
    try {
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
        phase: (tournament.phase || 'registration') as Phase,
        createdAt: tournament.createdAt.toISOString(),
        players: tournament.players.map((player) => ({
          id: player.id,
          name: player.name,
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
        players: true,
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
    const { id } = request.params;
    const { name } = request.body;

    if (!name || typeof name !== 'string') {
      return reply.code(400).send({ error: 'Name is required' });
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
        name,
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

