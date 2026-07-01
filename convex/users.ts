import { query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { v } from 'convex/values'

const buildStats = async (ctx: QueryCtx, userId: string) => {
  const attempts = await ctx.db
    .query('attempts')
    .withIndex('by_user_createdAt', (q) => q.eq('userId', userId))
    .collect()

  const landedAttempts = attempts.filter((attempt) => attempt.outcome === 'landed')
  const crashedAttempts = attempts.filter((attempt) => attempt.outcome === 'crashed')
  const bestLanding = landedAttempts.reduce<(typeof landedAttempts)[number] | null>(
    (best, attempt) => {
      if (!best || attempt.frames < best.frames) return attempt
      return best
    },
    null
  )

  const totalAttempts = attempts.length
  const landedCount = landedAttempts.length
  const totalTimeSeconds = attempts.reduce(
    (total, attempt) => total + attempt.timeSeconds,
    0
  )
  const latestAttempts = [...attempts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)
  const failureReasonCounts = new Map<string, number>([
    ['MISSED PAD', 0],
    ['TOO FAST', 0],
    ['SIDEWAYS SPEED', 0],
    ['NOT UPRIGHT', 0],
  ])

  for (const attempt of crashedAttempts) {
    failureReasonCounts.set(
      attempt.reason,
      (failureReasonCounts.get(attempt.reason) ?? 0) + 1
    )
  }

  const failureReasons = [...failureReasonCounts.entries()]
    .map(([reason, count]) => ({
      reason,
      count,
      percent:
        crashedAttempts.length === 0 ? 0 : count / crashedAttempts.length,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    totalAttempts,
    landedCount,
    crashedCount: crashedAttempts.length,
    successRate: totalAttempts === 0 ? 0 : landedCount / totalAttempts,
    totalTimeSeconds,
    bestLanding,
    latestAttempts,
    failureReasons,
  }
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.tokenIdentifier))
      .unique()

    if (!user) return null

    return {
      user,
      stats: await buildStats(ctx, user.userId),
    }
  },
})

export const profile = query({
  args: {
    profileId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.profileId)

    if (!user) return null

    return {
      user,
      stats: await buildStats(ctx, user.userId),
    }
  },
})

export const search = query({
  args: {
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const search = args.search.trim().toLowerCase()

    if (!search) {
      return await ctx.db.query('users').take(12)
    }

    const users = await ctx.db.query('users').take(100)

    return users
      .filter((user) => user.displayName.toLowerCase().includes(search))
      .slice(0, 12)
  },
})
