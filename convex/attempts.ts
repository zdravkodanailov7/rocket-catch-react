import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { keyFrame, replayFrame } from './validators'

const getDisplayName = (identity: {
  name?: string
  preferredUsername?: string
  nickname?: string
}) => {
  return identity.name ?? identity.preferredUsername ?? identity.nickname ?? 'Player'
}


export const save = mutation({
  args: {
    levelId: v.string(),
    frames: v.number(),
    timeSeconds: v.number(),
    outcome: v.union(v.literal('landed'), v.literal('crashed')),
    reason: v.string(),
    keyFrames: v.array(keyFrame),
    replayFrames: v.array(replayFrame),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Not authenticated')
    }

    const now = Date.now()
    const userId = identity.tokenIdentifier
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique()

    const userProfile = {
      displayName: getDisplayName(identity),
      ...(identity.pictureUrl ? { imageUrl: identity.pictureUrl } : {}),
      updatedAt: now,
    }

    if (existingUser) {
      await ctx.db.patch(existingUser._id, userProfile)
    } else {
      await ctx.db.insert('users', {
        userId,
        ...userProfile,
        createdAt: now,
      })
    }

    await ctx.db.insert('attempts', {
      ...args,
      userId,
      createdAt: now,
    })
  },
})

export const leaderboard = query({
  args: {
    levelId: v.string(),
  },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query('attempts')
      .withIndex('by_level_outcome_frames', (q) =>
        q.eq('levelId', args.levelId).eq('outcome', 'landed')
      )
      .take(10)

    return await Promise.all(
      attempts.map(async (attempt) => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_userId', (q) => q.eq('userId', attempt.userId))
          .unique()

        return {
          ...attempt,
          user,
        }
      })
    )
  },
})

export const myBestAttempt = query({
  args: {
    levelId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return null
    }

    return await ctx.db
      .query('attempts')
      .withIndex('by_user_level_outcome_frames', (q) =>
        q
          .eq('userId', identity.tokenIdentifier)
          .eq('levelId', args.levelId)
          .eq('outcome', 'landed')
      )
      .first()
  },
})
