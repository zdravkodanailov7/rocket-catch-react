import { v } from 'convex/values'

export const keyFrame = v.object({
  frame: v.number(),
  w: v.boolean(),
  a: v.boolean(),
  d: v.boolean(),
})

export const replayFrame = v.object({
  frame: v.number(),
  x: v.number(),
  y: v.number(),
  angle: v.number(),
})
