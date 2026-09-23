import { Hono } from 'hono';
import { z } from 'zod';

import { isUniqueViolation, prisma } from '../db.js';
import { readJson } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

// Os ids nascem no aparelho (base36) e as datas vêm em milissegundos, como o app guarda.
const id = z.string().regex(/^[A-Za-z0-9_-]{6,64}$/, 'Identificador inválido.');
const timestamp = z.number().int().nonnegative();

const setSchema = z.object({
  createdAt: timestamp,
  distanceM: z.number().min(0).max(1_000_000).nullable(),
  done: z.boolean(),
  durationSec: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60)
    .nullable(),
  id,
  isPr: z.boolean(),
  position: z.number().int().min(0).max(1000),
  reps: z.number().int().min(0).max(10_000).nullable(),
  rpe: z.number().int().min(0).max(10).nullable(),
  weightKg: z.number().min(0).max(2000).nullable(),
});

const exerciseSchema = z.object({
  exerciseId: z.string().min(1).max(80),
  id,
  kind: z.string().min(1).max(20),
  muscle: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  position: z.number().int().min(0).max(1000),
  sets: z.array(setSchema).max(100),
});

const workoutSchema = z.union([
  // Treino descartado ou apagado no aparelho: basta o id.
  z.object({ deleted: z.literal(true), id }),
  z.object({
    deleted: z.literal(false).optional(),
    exercises: z.array(exerciseSchema).max(60),
    finishedAt: timestamp.nullable(),
    id,
    note: z.string().max(2000).nullable(),
    startedAt: timestamp,
    updatedAt: timestamp,
  }),
]);

// Cada treino é validado sozinho: um registro ruim não pode travar a fila do aparelho.
const pushSchema = z.object({ workouts: z.array(z.unknown()).max(50) });

function idOf(item: unknown) {
  return typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string' ? item.id : null;
}

export const syncRoutes = new Hono<AppEnv>().use(requireAuth).post('/workouts', async (c) => {
  const userId = c.get('user').id;
  const { workouts: items } = await readJson(c, pushSchema);
  const synced: string[] = [];
  const rejected: string[] = [];
  const invalid: { id: string; reason: string }[] = [];

  for (const item of items) {
    const parsed = workoutSchema.safeParse(item);

    // Fora do formato (uma carga digitada errado, por exemplo): volta com o motivo e o app
    // tira da fila. O treino continua no aparelho.
    if (!parsed.success) {
      const id = idOf(item);

      if (id) {
        invalid.push({ id, reason: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
      }

      continue;
    }

    const workout = parsed.data;
    const existing = await prisma.workout.findUnique({
      select: { clientUpdatedAt: true, userId: true },
      where: { id: workout.id },
    });

    // Id que já pertence a outra conta: não mexe em nada.
    if (existing && existing.userId !== userId) {
      rejected.push(workout.id);
      continue;
    }

    if (workout.deleted) {
      if (existing) {
        await prisma.$transaction([
          prisma.workoutExercise.deleteMany({ where: { workoutId: workout.id } }),
          prisma.workout.update({ data: { deletedAt: new Date() }, where: { id: workout.id } }),
        ]);
      }

      synced.push(workout.id);
      continue;
    }

    // O servidor já tem uma versão mais nova (de outro aparelho): fica a dele.
    if (existing && existing.clientUpdatedAt.getTime() > workout.updatedAt) {
      synced.push(workout.id);
      continue;
    }

    const data = {
      clientUpdatedAt: new Date(workout.updatedAt),
      deletedAt: null,
      finishedAt: workout.finishedAt === null ? null : new Date(workout.finishedAt),
      note: workout.note,
      startedAt: new Date(workout.startedAt),
    };

    try {
      // O treino chega inteiro: exercícios e séries são trocados de uma vez.
      await prisma.$transaction(async (tx) => {
        await tx.workout.upsert({
          create: { ...data, id: workout.id, userId },
          update: data,
          where: { id: workout.id },
        });
        await tx.workoutExercise.deleteMany({ where: { workoutId: workout.id } });

        for (const exercise of workout.exercises) {
          await tx.workoutExercise.create({
            data: {
              exerciseId: exercise.exerciseId,
              id: exercise.id,
              kind: exercise.kind,
              muscle: exercise.muscle,
              name: exercise.name,
              position: exercise.position,
              sets: {
                createMany: { data: exercise.sets.map((set) => ({ ...set, createdAt: new Date(set.createdAt) })) },
              },
              workoutId: workout.id,
            },
          });
        }
      });
      synced.push(workout.id);
    } catch (error) {
      // Id de exercício ou de série que já existe em outra conta.
      if (isUniqueViolation(error)) {
        rejected.push(workout.id);
        continue;
      }

      throw error;
    }
  }

  return c.json({ invalid, rejected, synced });
});
