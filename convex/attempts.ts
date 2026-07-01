import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { keyFrame, replayFrame } from './validators'


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
    await ctx.db.insert('attempts', {
      ...args,
      userId: identity.tokenIdentifier,
      userName: identity.name,
      userEmail: identity.email,
      createdAt: Date.now(),
    })
  },
})
