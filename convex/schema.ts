import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { keyFrame, replayFrame } from './validators'

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    displayName: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  attempts: defineTable({
    levelId: v.string(),
    frames: v.number(),
    timeSeconds: v.number(),
    outcome: v.union(v.literal('landed'), v.literal('crashed')),
    reason: v.string(),
    keyFrames: v.array(keyFrame),
    replayFrames: v.array(replayFrame),
    userId: v.string(),
    createdAt: v.number(),
  }).index('by_level_outcome_frames', ['levelId', 'outcome', 'frames'])
})
