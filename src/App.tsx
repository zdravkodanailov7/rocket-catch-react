import { useEffect, useRef } from "react"

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const rocketWidth = 50
  const rocketHeight = 100

  useEffect(() => {
    const rocket = {
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
    }
    const gravity = 0.02
    const keys = new Set<string>()
    const thrust = 0.05
    let frameId = 0
    const turnThrust = 0.0005
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
    
    window.addEventListener('keydown', keydownHandler)
    window.addEventListener('keyup', keyupHandler)

    const drawBackground = () => {
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const drawGround = () => {
      ctx.fillStyle = '#166534'
      ctx.fillRect(0, groundY, canvas.width, 40)
    }
    
    const drawRocket = () => {
      const centerX = rocket.x + rocketWidth / 2
      const centerY = rocket.y + rocketHeight / 2

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

      // flame
      ctx.fillStyle = 'orange'
      ctx.beginPath()
      ctx.moveTo(-10, rocketHeight / 2 + 20)
      ctx.lineTo(0, rocketHeight / 2 + 60)
      ctx.lineTo(10, rocketHeight / 2 + 20)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }

    const drawHUD = () => {
      ctx.fillStyle = 'white'
      ctx.font = '16px monospace'
      ctx.textAlign = 'right'

      ctx.fillText(`rocket.vy: ${rocket.vy.toFixed(2)}`, canvas.width - 16, 24)
      ctx.fillText(`y: ${rocket.y.toFixed(2)}`, canvas.width - 16, 48)
      ctx.fillText(`rocket.vx: ${rocket.vx.toFixed(2)}`, canvas.width - 16, 72)
      ctx.fillText(`rocket.angle: ${rocket.angle.toFixed(2)}`, canvas.width - 16, 96)
    }

    const loop = () => {
      drawBackground()
      drawGround()

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
