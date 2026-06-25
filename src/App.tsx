import { useEffect, useRef } from "react"

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const rocketWidth = 50
  const rocketHeight = 100

  useEffect(() => {
    let rocketX = 100
    let rocketY = 100
    let vy = 0
    const gravity = 0.02
    const keys = new Set<string>()
    const thrust = 0.05
    let frameId = 0

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
      // body
      ctx.fillStyle = 'white'
      ctx.fillRect(rocketX, rocketY, rocketWidth, rocketHeight)

      //nose
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.moveTo(rocketX + (rocketHeight / 4), rocketY - 50)
      ctx.lineTo(rocketX, rocketY)
      ctx.lineTo(rocketX + rocketWidth, rocketY)
      ctx.closePath()
      ctx.fill()

      // engine
      ctx.fillStyle = '#444'
      ctx.fillRect(rocketX + 15, rocketY + rocketHeight, 20, 20)

      // flame
      ctx.fillStyle = 'orange'
      ctx.beginPath()
      ctx.moveTo(rocketX + 15, rocketY + rocketHeight + 20)
      ctx.lineTo(rocketX + rocketWidth / 2, rocketY + rocketHeight + 60)
      ctx.lineTo(rocketX + 35, rocketY + rocketHeight + 20)
      ctx.closePath()
      ctx.fill()
    }

    const drawHUD = () => {
      ctx.fillStyle = 'white'
      ctx.font = '16px monospace'
      ctx.textAlign = 'right'

      ctx.fillText(`vy: ${vy.toFixed(2)}`, canvas.width - 16, 24)
      ctx.fillText(`y: ${rocketY.toFixed(2)}`, canvas.width - 16, 48)
    }

    const loop = () => {
      drawBackground()

      vy += gravity
      if (keys.has('w')) vy -= thrust
      rocketY += vy

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
