import { useEffect, useRef } from "react"

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const rocketWidth = 50
  const rocketHeight = 100

  useEffect(() => {

    const createRocket = () => ({
      x: 250,
      y: 120,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
    })

    // game state
    let rocket = createRocket()
    const sideBoosterWidth = 10
    const sideBoosterHeight = 15
    const gravity = 0.02
    const keys = new Set<string>()
    const thrust = 0.05
    let frameId = 0
    const turnThrust = 0.0005
    let gameState: 'playing' | 'landed' | 'crashed' = 'playing'
    let resultMessage = ''
    let frameCount = 0

    const resetGame = () => {
      resultMessage = ''
      rocket = createRocket()
      gameState = 'playing'
      frameCount = 0
    }

    const keydownHandler = (e: KeyboardEvent) => {
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
    const groundY = canvas.height - 40
    
    const pad = {
      x: canvas.width / 2 - 75,
      y: groundY,
      width: 150,
      height: 8,
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
    
    const drawRocket = () => {
      const centerX = rocket.x + rocketWidth / 2
      const centerY = rocket.y + rocketHeight / 2
      const mainFlameLength = gameState === 'playing' && keys.has('w') ? 40 : 0
      const leftBoosterFlameLength = 
        gameState === 'playing' && keys.has('d') ? 24 : 0

      const rightBoosterFlameLength = 
        gameState === 'playing' && keys.has('a') ? 24 : 0
      const sideBoosterY = rocketHeight / 4
      const sideBoosterCenterY = sideBoosterY + sideBoosterHeight / 2

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(rocket.angle)

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
      ctx.fillText('W thrust | A/D rotate | R reset', 16, 24)
      ctx.fillText('Target: land on yellow pad', 16, 48)
      ctx.fillText('Safe: vy < 1 | vx < 0.5 | angle < 0.2', 16, 72)

      // top middle
      ctx.textAlign = 'center'
      ctx.fillText(`time: ${(frameCount / 60).toFixed(1)}s`, canvas.width / 2, 24)

      // top right
      ctx.textAlign = 'right'
      ctx.fillText(`rocket.vy: ${rocket.vy.toFixed(2)}`, canvas.width - 16, 24)
      ctx.fillText(`y: ${rocket.y.toFixed(2)}`, canvas.width - 16, 48)
      ctx.fillText(`rocket.vx: ${rocket.vx.toFixed(2)}`, canvas.width - 16, 72)
      ctx.fillText(`rocket.angle: ${rocket.angle.toFixed(2)}`, canvas.width - 16, 96)

      drawKey('W', 56, 96, keys.has('w'))
      drawKey('A', 16, 136, keys.has('a'))
      drawKey('D', 96, 136, keys.has('d'))
    }

    const loop = () => {

      drawBackground()
      drawGround()
      
      if (gameState === 'playing') {
        frameCount += 1

        // vertical movement
        rocket.vy += gravity
        if (keys.has('w')) {
          rocket.vx += Math.sin(rocket.angle) * thrust
          rocket.vy -= Math.cos(rocket.angle) * thrust
        }
        rocket.y += rocket.vy
        rocket.x += rocket.vx

        // rotation movement
        if (keys.has('a')) rocket.angularVelocity -= turnThrust
        if (keys.has('d')) rocket.angularVelocity += turnThrust
        rocket.angle += rocket.angularVelocity
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
        } else if (Math.abs(rocket.vy) >= 1) {
          gameState = 'crashed'
          resultMessage = 'TOO FAST'
        } else if (Math.abs(rocket.vx) >= 0.5) {
          gameState = 'crashed'
          resultMessage = 'SIDEWAYS SPEED'
        } else if (Math.abs(rocket.angle) >= 0.2) {
          gameState = 'crashed'
          resultMessage = 'NOT UPRIGHT'
        } else {
          gameState = 'landed'
          resultMessage = 'LANDED'
        }

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

export default App
