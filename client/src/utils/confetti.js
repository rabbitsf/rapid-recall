function loadConfetti() {
  return new Promise(resolve => {
    if (window.confetti) return resolve(window.confetti)
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
    s.onload = () => resolve(window.confetti)
    document.body.appendChild(s)
  })
}

export async function launchConfetti(big = false) {
  try {
    const audio = new Audio(big
      ? 'https://actions.google.com/sounds/v1/crowds/stadium_crowd_cheer_and_applause.ogg'
      : 'https://actions.google.com/sounds/v1/crowds/light_crowd_cheer.ogg')
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch {}

  const confetti = await loadConfetti()

  if (big) {
    const end = Date.now() + 3000
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }
    const rand = (min, max) => Math.random() * (max - min) + min
    const interval = setInterval(() => {
      const t = end - Date.now()
      if (t <= 0) return clearInterval(interval)
      const count = 50 * (t / 3000)
      confetti({ ...defaults, particleCount: count, origin: { x: rand(0.1, 0.3), y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount: count, origin: { x: rand(0.7, 0.9), y: Math.random() - 0.2 } })
    }, 250)
  } else {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } })
  }
}
