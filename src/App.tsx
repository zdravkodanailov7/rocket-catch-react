import { useEffect, useState, useRef } from "react"
import { useMutation, useQuery, Authenticated, Unauthenticated, AuthLoading, AuthRefreshing } from "convex/react"
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { SignInButton, UserButton } from '@clerk/react'

const level1 = {
  id: 'level-1',
  startX: 250,
  startY: 120,
  padWidth: 150,
  padHeight: 8,
  groundHeight: 40,
  gravity: 0.08,
  thrust: 0.2,
  turnThrust: 0.002,
  angularDamping: 0.9604,
  maxSafeVy: 2,
  maxSafeVx: 1,
  maxSafeAngle: 0.2,
}

const navigateTo = (path: string) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const formatTime = (seconds: number) => {
  return `${seconds.toFixed(3)}s`
}

const formatDuration = (seconds: number) => {
  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  if (minutes === 0) return `${remainingSeconds}s`

  return `${minutes}m ${remainingSeconds}s`
}

const formatPercent = (value: number) => {
  return `${Math.round(value * 100)}%`
}

const usePathname = () => {
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return pathname
}

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

  type GhostMode = 'off' | 'mine' | 'best'

  const leaderboard = useQuery(api.attempts.leaderboard, { levelId: level1.id })
  const myBestAttempt = useQuery(api.attempts.myBestAttempt, { levelId: level1.id })
  const leaderboardRef = useRef<typeof leaderboard>(undefined)
  const myBestAttemptRef = useRef<typeof myBestAttempt>(undefined)

  useEffect(() => {
    leaderboardRef.current = leaderboard
  }, [leaderboard])

  useEffect(() => {
    myBestAttemptRef.current = myBestAttempt
  }, [myBestAttempt])

  useEffect(() => {
    const level = level1
    let ghostMode: GhostMode = 'mine'

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
    const angularDamping = level.angularDamping

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
    
    const getBestLocalLanding = () => {
      return attempts
        .filter((attempt) => attempt.levelId === level.id && attempt.outcome === 'landed')
        .sort((a, b) => a.frames - b.frames)[0]
    }

    const getGhostAttempt = () => {
      if (ghostMode === 'off') return undefined
      if (ghostMode === 'best') return leaderboardRef.current?.[0]

      return myBestAttemptRef.current ?? getBestLocalLanding()
    }

    const getNextGhostMode = () => {
      if (ghostMode === 'mine') return 'best'
      if (ghostMode === 'best') return 'off'

      return 'mine'
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
        ghostMode = getNextGhostMode()
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
      ctx.fillText(`Safe: vy < ${level.maxSafeVy} | vx < ${level.maxSafeVx} | angle < ${level.maxSafeAngle}`, 16, hudTop + 48)
      drawKey('W', 56, hudTop + 72, keys.has('w'))
      drawKey('A', 16, hudTop + 112, keys.has('a'))
      drawKey('D', 96, hudTop + 112, keys.has('d'))
      ctx.textAlign = 'left'
      ctx.fillText(`Attempt ${attempts.length + 1}`, 16, hudTop + 180)

      // top middle
      ctx.textAlign = 'center'
      ctx.fillText(`time: ${formatTime(frameCount / 60)}`, canvas.width / 2, 24)

      // top right
      ctx.textAlign = 'right'
      ctx.fillText(`rocket.vy: ${rocket.vy.toFixed(2)}`, canvas.width - 16, debugTop)
      ctx.fillText(`y: ${rocket.y.toFixed(2)}`, canvas.width - 16, debugTop + 24)
      ctx.fillText(`rocket.vx: ${rocket.vx.toFixed(2)}`, canvas.width - 16, debugTop + 48)
      ctx.fillText(`rocket.angle: ${rocket.angle.toFixed(2)}`, canvas.width - 16, debugTop + 72)
      ctx.fillText(`ghost: ${ghostMode} (g)`, canvas.width - 16, debugTop + 116)
    }

    const stepSim = () => {
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
        rocket.angularVelocity *= angularDamping
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
    }

    // fixed timestep: the sim always steps at 60Hz, whatever the display refresh rate
    const stepMs = 1000 / 60
    let lastTime = performance.now()
    let accumulator = 0

    const loop = () => {
      const now = performance.now()
      accumulator += now - lastTime
      lastTime = now

      // cap catch-up so a backgrounded tab doesn't fast-forward the game
      if (accumulator > 250) accumulator = 250

      while (accumulator >= stepMs) {
        stepSim()
        accumulator -= stepMs
      }

      drawBackground()
      drawGround()

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


      const ghostAttempt = getGhostAttempt()
      const ghostFrame = ghostAttempt?.replayFrames[frameCount - 1]

      if (ghostFrame) {
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
  }, [saveAttempt])

  return (
    <>
      <canvas ref={canvasRef} />
      <section className="leaderboard-panel" aria-label="Leaderboard">
        <h2>Leaderboard</h2>
        {!leaderboard && <p className="leaderboard-empty">Loading...</p>}
        {leaderboard?.length === 0 && (
          <p className="leaderboard-empty">No landings yet</p>
        )}
        {leaderboard && leaderboard.length > 0 && (
          <ol>
            {leaderboard.slice(0, 5).map((entry) => (
              <li key={entry._id}>
                <a
                  href={entry.user ? `/profile/${entry.user._id}` : '#'}
                  className="leaderboard-user-link"
                  onClick={(event) => {
                    if (!entry.user) return
                    event.preventDefault()
                    navigateTo(`/profile/${entry.user._id}`)
                  }}
                >
                  {entry.user?.imageUrl ? (
                    <img
                      src={entry.user.imageUrl}
                      alt=""
                      className="leaderboard-avatar"
                    />
                  ) : (
                    <span className="leaderboard-avatar leaderboard-avatar-fallback">
                      {(entry.user?.displayName ?? 'P').slice(0, 1)}
                    </span>
                  )}
                  <span className="leaderboard-name">
                    {entry.user?.displayName ?? 'Player'}
                  </span>
                </a>
                <span className="leaderboard-time">
                  {formatTime(entry.timeSeconds)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}

function ProfileSummary({
  profile,
}: {
  profile:
    | NonNullable<ReturnType<typeof useQuery<typeof api.users.current>>>
    | NonNullable<ReturnType<typeof useQuery<typeof api.users.profile>>>
}) {
  const { user, stats } = profile

  return (
    <main className="profile-page">
      <section className="profile-header">
        {user.imageUrl ? (
          <img src={user.imageUrl} alt="" className="profile-avatar" />
        ) : (
          <span className="profile-avatar profile-avatar-fallback">
            {user.displayName.slice(0, 1)}
          </span>
        )}
        <div>
          <h1>{user.displayName}</h1>
          <p>Level 1 pilot</p>
        </div>
      </section>

      <UserSearch />

      <section className="stats-grid" aria-label="Stats">
        <div>
          <span>Total attempts</span>
          <strong>{stats.totalAttempts}</strong>
        </div>
        <div>
          <span>Landings</span>
          <strong>{stats.landedCount}</strong>
        </div>
        <div>
          <span>Success rate</span>
          <strong>{formatPercent(stats.successRate)}</strong>
        </div>
        <div>
          <span>Best time</span>
          <strong>
            {stats.bestLanding ? formatTime(stats.bestLanding.timeSeconds) : '--'}
          </strong>
        </div>
        <div>
          <span>Total time played</span>
          <strong>{formatDuration(stats.totalTimeSeconds)}</strong>
        </div>
        <div>
          <span>Crashes</span>
          <strong>{stats.crashedCount}</strong>
        </div>
      </section>

      <FailureBreakdown
        crashedCount={stats.crashedCount}
        failureReasons={stats.failureReasons}
      />

      <section className="profile-section">
        <h2>Latest attempts</h2>
        {stats.latestAttempts.length === 0 ? (
          <p className="muted-text">No attempts yet</p>
        ) : (
          <ol className="attempt-list">
            {stats.latestAttempts.map((attempt) => (
              <li key={attempt._id}>
                <span>{attempt.outcome === 'landed' ? 'LANDED' : attempt.reason}</span>
                <span>{formatTime(attempt.timeSeconds)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}

function FailureBreakdown({
  crashedCount,
  failureReasons,
}: {
  crashedCount: number
  failureReasons: Array<{
    reason: string
    count: number
    percent: number
  }>
}) {
  const topFailure = failureReasons.find((failure) => failure.count > 0)

  return (
    <section className="profile-section failure-breakdown">
      <div className="profile-section-header">
        <div>
          <h2>Crash breakdown</h2>
          <p>Failure reasons</p>
        </div>
        {topFailure && <strong>{topFailure.reason}</strong>}
      </div>

      {crashedCount === 0 ? (
        <p className="muted-text">No crashes yet</p>
      ) : (
        <div className="failure-bars">
          {failureReasons.map((failure) => (
            <div className="failure-row" key={failure.reason}>
              <div className="failure-label">
                <span>{failure.reason}</span>
                <span>{failure.count}</span>
              </div>
              <div className="failure-track">
                <div
                  className="failure-fill"
                  style={{ width: `${failure.percent * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ProfilePage({ profileId }: { profileId: Id<'users'> }) {
  const profile = useQuery(api.users.profile, { profileId })

  if (profile === undefined) {
    return <main className="profile-page">Loading...</main>
  }

  if (profile === null) {
    return <main className="profile-page">Profile not found</main>
  }

  return <ProfileSummary profile={profile} />
}

function MyProfilePage() {
  const profile = useQuery(api.users.current)

  if (profile === undefined) {
    return <main className="profile-page">Loading...</main>
  }

  if (profile === null) {
    return <main className="profile-page">Play one run to create your profile.</main>
  }

  return <ProfileSummary profile={profile} />
}

function UserSearch() {
  const [search, setSearch] = useState('')
  const shouldSearch = search.trim().length > 0
  const users = useQuery(api.users.search, shouldSearch ? { search } : 'skip')

  return (
    <section className="user-search" aria-label="Find players">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Find player"
      />
      {shouldSearch && (
        <div className="user-search-results">
          {users?.map((user) => (
            <a
              key={user._id}
              href={`/profile/${user._id}`}
              onClick={(event) => {
                event.preventDefault()
                navigateTo(`/profile/${user._id}`)
              }}
            >
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="" />
              ) : (
                <span>{user.displayName.slice(0, 1)}</span>
              )}
              {user.displayName}
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function AuthenticatedApp() {
  const pathname = usePathname()
  const profileMatch = pathname.match(/^\/profile\/([^/]+)$/)

  return (
    <div className="app-shell">
      <header className="app-nav">
        <nav>
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault()
              navigateTo('/')
            }}
          >
            Game
          </a>
          <a
            href="/me"
            onClick={(event) => {
              event.preventDefault()
              navigateTo('/me')
            }}
          >
            Profile
          </a>
        </nav>
        <UserButton />
      </header>

      {pathname === '/me' && <MyProfilePage />}
      {profileMatch && (
        <ProfilePage profileId={profileMatch[1] as Id<'users'>} />
      )}
      {pathname !== '/me' && !profileMatch && <Game />}
    </div>
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
        <AuthenticatedApp />
      </Authenticated>

      <AuthLoading>Loading...</AuthLoading>
      <AuthRefreshing>Refreshing...</AuthRefreshing>
    </>
  )
}

export default App
