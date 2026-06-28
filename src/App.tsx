import { useEffect, useRef } from "react"

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const rocketWidth = 50
  const rocketHeight = 100

  useEffect(() => {
    let rocketX = 100
    let rocketY = 100
    let angle = 0
    let angularVelocity = 0
    let vy = 0
    let vx = 0
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
    
    window.addEventListener('keydown', keydownHandler)
    window.addEventListener('keyup', keyupHandler)

    const drawBackground = () => {
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    
    const drawRocket = () => {
      const centerX = rocketX + rocketWidth / 2
      const centerY = rocketY + rocketHeight / 2

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(angle)

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

      ctx.fillText(`vy: ${vy.toFixed(2)}`, canvas.width - 16, 24)
      ctx.fillText(`y: ${rocketY.toFixed(2)}`, canvas.width - 16, 48)
      ctx.fillText(`vx: ${vx.toFixed(2)}`, canvas.width - 16, 72)
      ctx.fillText(`angle: ${angle.toFixed(2)}`, canvas.width - 16, 96)
    }

    const loop = () => {
      drawBackground()

      // vertical movement
      vy += gravity
      if (keys.has('w')) {
        vx += Math.sin(angle) * thrust
        vy -= Math.cos(angle) * thrust
      }
      rocketY += vy
      rocketX += vx

      // rotation movement
      if (keys.has('a')) angularVelocity -= turnThrust
      if (keys.has('d')) angularVelocity += turnThrust
      angle += angularVelocity
      angularVelocity *= 0.98

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
