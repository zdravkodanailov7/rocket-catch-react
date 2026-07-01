import { useEffect, useRef } from "react"
import { useMutation, Authenticated, Unauthenticated, AuthLoading, AuthRefreshing } from "convex/react"
import { api } from '../convex/_generated/api'
import { SignInButton, UserButton } from '@clerk/react'

function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const saveAttempt = useMutation(api.attempts.save)
  const rocketWidth = 50
  const rocketHeight = 100

  type KeyFrame = {
    frame: number
    w: boolean
    a: boolean
    d: boolean
  }

  type ReplayFrame = {
    frame: number,
    x: number,
    y: number,
    angle: number
  }

  type Attempt = {
    frames: number
    timeSeconds: number
    outcome: 'landed' | 'crashed'
    reason: string
    keyFrames: KeyFrame[]
    levelId: string
    replayFrames: ReplayFrame[]
  }

  const level1 = {
    id: 'level-1',
    startX: 250,
    startY: 120,
    padWidth: 150,
    padHeight: 8,
    groundHeight: 40,
    gravity: 0.02,
    thrust: 0.05,
    turnThrust: 0.0005,
    maxSafeVy: 1,
    maxSafeVx: 0.5,
    maxSafeAngle: 0.2,
  }

  useEffect(() => {
    const level = level1
    let showGhost = true

    const createRocket = () => ({
      x: level.startX,
      y: level.startY,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
    })

    // game state
    let rocket = createRocket()
    const sideBoosterWidth = 10
    const sideBoosterHeight = 15

    const gravity = level.gravity
    const thrust = level.thrust
    const turnThrust = level.turnThrust

    const keys = new Set<string>()
    let frameId = 0
    let gameState: 'playing' | 'landed' | 'crashed' = 'playing'
    let resultMessage = ''
    let frameCount = 0
    let keyFrames: KeyFrame[] = []
    let replayFrames: ReplayFrame[] = []

    const attempts: Attempt[] = []

    const normaliseAngle = (angle: number) => {
      return Math.atan2(Math.sin(angle), Math.cos(angle))
    }
    
    const getBestLanding = () => {
      return attempts
        .filter((attempt) => attempt.levelId === level.id && attempt.outcome === 'landed')
        .sort((a, b) => a.frames - b.frames)[0]
    }

    const resetGame = () => {
      resultMessage = ''
      rocket = createRocket()
      gameState = 'playing'
      frameCount = 0
      keyFrames = []
      replayFrames = []
    }

    const keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'g') {
        showGhost = !showGhost
        return
      }
      keys.add(e.key)
    }

    const keyupHandler = (e: KeyboardEvent) => {
      keys.delete(e.key)
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const groundY = canvas.height - level.groundHeight
    
    const pad = {
      x: canvas.width / 2 - 75,
      y: groundY,
      width: level.padWidth,
      height: level.padHeight,
    }
      
    window.addEventListener('keydown', keydownHandler)
    window.addEventListener('keyup', keyupHandler)

    const drawBackground = () => {
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const drawGround = () => {
      ctx.fillStyle = '#166534'
      ctx.fillRect(0, groundY, canvas.width, 40)

      ctx.fillStyle = '#eab308'
      ctx.fillRect(pad.x, pad.y, pad.width, pad.height)
    }
    
    const drawRocket = (rocketToDraw = rocket, opacity = 1) => {
      const centerX = rocketToDraw.x + rocketWidth / 2
      const centerY = rocketToDraw.y + rocketHeight / 2
      const mainFlameLength = gameState === 'playing' && keys.has('w') ? 40 : 0
      const leftBoosterFlameLength = 
        gameState === 'playing' && keys.has('d') ? 24 : 0

      const rightBoosterFlameLength = 
        gameState === 'playing' && keys.has('a') ? 24 : 0
      const sideBoosterY = rocketHeight / 4
      const sideBoosterCenterY = sideBoosterY + sideBoosterHeight / 2

      ctx.save()
      ctx.globalAlpha = opacity
      ctx.translate(centerX, centerY)
      ctx.rotate(rocketToDraw.angle)

      // body
      ctx.fillStyle = 'white'
      ctx.fillRect(-rocketWidth / 2, -rocketHeight / 2, rocketWidth, rocketHeight)

      // nose
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.moveTo(0, -rocketHeight / 2 - 50)
      ctx.lineTo(-rocketWidth / 2, -rocketHeight / 2)
      ctx.lineTo(rocketWidth / 2, -rocketHeight / 2)
      ctx.closePath()
      ctx.fill()

      // engine
      ctx.fillStyle = '#444'
      ctx.fillRect(-10, rocketHeight / 2, 20, 20)

      // side boosters
      ctx.fillRect(-rocketWidth / 2 - sideBoosterWidth, sideBoosterY, sideBoosterWidth, sideBoosterHeight)
      ctx.fillRect(rocketWidth / 2, sideBoosterY, sideBoosterWidth, sideBoosterHeight)

      // flame
      if (mainFlameLength > 0) {
        ctx.fillStyle = 'orange'
        ctx.beginPath()
        ctx.moveTo(-10, rocketHeight / 2 + 20)
        ctx.lineTo(0, rocketHeight / 2 + 20 + mainFlameLength)
        ctx.lineTo(10, rocketHeight / 2 + 20)
        ctx.closePath()
        ctx.fill()
      }

      // side boosters
      if (leftBoosterFlameLength > 0) {
        ctx.fillStyle = 'orange'
        ctx.beginPath()
        ctx.moveTo(-rocketWidth / 2 - sideBoosterWidth, sideBoosterCenterY - 8)
        ctx.lineTo(-rocketWidth / 2 - sideBoosterWidth - leftBoosterFlameLength, sideBoosterCenterY)
        ctx.lineTo(-rocketWidth / 2 - sideBoosterWidth, sideBoosterCenterY + 8)
        ctx.closePath()
        ctx.fill()
      }

      if (rightBoosterFlameLength > 0) {
        ctx.fillStyle = 'orange'
        ctx.beginPath()
        ctx.moveTo(rocketWidth / 2 + sideBoosterWidth, sideBoosterCenterY - 8)
        ctx.lineTo(rocketWidth / 2 + sideBoosterWidth + rightBoosterFlameLength, sideBoosterCenterY)
        ctx.lineTo(rocketWidth / 2 + sideBoosterWidth, sideBoosterCenterY + 8)
        ctx.closePath()
        ctx.fill()
      }

      ctx.restore()
    }

    const drawHUD = () => {
      const hudTop = 72
      const debugTop = hudTop

      const drawKey = (label: string, x: number, y: number, active: boolean) => {
        ctx.fillStyle = active ? '#eab308' : '#374151'
        ctx.fillRect(x, y, 36, 36)

        ctx.fillStyle = 'white'
        ctx.textAlign = 'center'
        ctx.fillText(label, x + 18, y + 24)
      }

      ctx.fillStyle = 'white'
      ctx.font = '16px monospace'

      // top left
      ctx.textAlign = 'left'
      ctx.fillText('W thrust | A/D rotate | R reset', 16, hudTop)
      ctx.fillText('Target: land on yellow pad', 16, hudTop + 24)
      ctx.fillText('Safe: vy < 1 | vx < 0.5 | angle < 0.2', 16, hudTop + 48)
      drawKey('W', 56, hudTop + 72, keys.has('w'))
      drawKey('A', 16, hudTop + 112, keys.has('a'))
      drawKey('D', 96, hudTop + 112, keys.has('d'))
      ctx.textAlign = 'left'
      ctx.fillText(`Attempt ${attempts.length + 1}`, 16, hudTop + 180)

      // top middle
      ctx.textAlign = 'center'
      ctx.fillText(`time: ${(frameCount / 60).toFixed(1)}s`, canvas.width / 2, 24)

      // top right
      ctx.textAlign = 'right'
      ctx.fillText(`rocket.vy: ${rocket.vy.toFixed(2)}`, canvas.width - 16, debugTop)
      ctx.fillText(`y: ${rocket.y.toFixed(2)}`, canvas.width - 16, debugTop + 24)
      ctx.fillText(`rocket.vx: ${rocket.vx.toFixed(2)}`, canvas.width - 16, debugTop + 48)
      ctx.fillText(`rocket.angle: ${rocket.angle.toFixed(2)}`, canvas.width - 16, debugTop + 72)
      ctx.fillText(`ghost: ${showGhost ? 'on' : 'off'} (g)`, canvas.width - 16, debugTop + 116)
    }

    const loop = () => {

      drawBackground()
      drawGround()
      
      if (gameState === 'playing') {
        frameCount += 1
        keyFrames.push({
          frame: frameCount,
          w: keys.has('w'),
          a: keys.has('a'),
          d: keys.has('d'),
        })

        // vertical movement
        rocket.vy += gravity
        if (keys.has('w')) {
          rocket.vx += Math.sin(rocket.angle) * thrust
          rocket.vy -= Math.cos(rocket.angle) * thrust
        }
        rocket.y += rocket.vy
        rocket.x += rocket.vx

        replayFrames.push({
          frame: frameCount,
          x: rocket.x,
          y: rocket.y,
          angle: rocket.angle
        })

        // rotation movement
        if (keys.has('a')) rocket.angularVelocity -= turnThrust
        if (keys.has('d')) rocket.angularVelocity += turnThrust
        rocket.angle += rocket.angularVelocity
        rocket.angle = normaliseAngle(rocket.angle)
        rocket.angularVelocity *= 0.98
      }

      const rocketBottom = rocket.y + rocketHeight + 20
      
      if (gameState === 'playing' && rocketBottom >= groundY) {
        rocket.y = groundY - rocketHeight - 20

        const rocketCenterX = rocket.x + rocketWidth / 2
        const onPad = rocketCenterX >= pad.x && rocketCenterX <= pad.x + pad.width

        if (!onPad) {
          gameState = 'crashed'
          resultMessage = 'MISSED PAD'
        } else if (Math.abs(rocket.vy) >= level.maxSafeVy) {
          gameState = 'crashed'
          resultMessage = 'TOO FAST'
        } else if (Math.abs(rocket.vx) >= level.maxSafeVx) {
          gameState = 'crashed'
          resultMessage = 'SIDEWAYS SPEED'
        } else if (Math.abs(rocket.angle) >= level.maxSafeAngle) {
          gameState = 'crashed'
          resultMessage = 'NOT UPRIGHT'
        } else {
          gameState = 'landed'
          resultMessage = 'LANDED'
        }

        const attempt = {
          frames: frameCount,
          timeSeconds: frameCount / 60,
          outcome: gameState,
          reason: resultMessage,
          keyFrames: [...keyFrames],
          levelId: level.id,
          replayFrames: [...replayFrames]
        }

        attempts.push(attempt)
        void saveAttempt(attempt)

        rocket.vy = 0
        rocket.vx = 0
        rocket.angularVelocity = 0
      }

      if (gameState === 'landed') {
        ctx.textAlign = 'center'
        ctx.fillText(resultMessage, canvas.width / 2, 80)
      }

      if (gameState === 'crashed') {
        ctx.textAlign = 'center'
        ctx.fillText(resultMessage, canvas.width / 2, 80)
      }

      if (keys.has('r')) {
        resetGame()
      }


      const bestLanding = getBestLanding()
      const ghostFrame = bestLanding?.replayFrames[frameCount - 1]

      if (showGhost && ghostFrame) {
        drawRocket(
          {
            x: ghostFrame.x,
            y: ghostFrame.y,
            vx: 0,
            vy: 0,
            angle: ghostFrame.angle,
            angularVelocity: 0
          },
          0.35
        )
      }
      drawRocket()
      drawHUD()
      frameId = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      window.removeEventListener('keyup', keyupHandler)
      window.removeEventListener('keydown', keydownHandler)
      cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <canvas ref={canvasRef} />
  )
}

function App() {
  return (
    <>
      <Unauthenticated>
        <div className='auth-screen'>
          <h1>Rocket Catch</h1>
          <SignInButton mode='modal' />
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="game-shell">
          <div className="user-menu">
            <UserButton />
          </div>
          <Game />
        </div>
      </Authenticated>

      <AuthLoading>Loading...</AuthLoading>
      <AuthRefreshing>Refreshing...</AuthRefreshing>
    </>
  )
}

export default App
