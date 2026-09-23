// Canonical audio helpers: Web Audio playback (bypasses the CSP media-src restriction on blob URLs)
// and microphone recording encoded as WAV (plays on every browser, including iPad Safari).

let ctx = null

// Must first be called synchronously inside a user gesture (tap/click) or iOS keeps the context suspended
function getAudioContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Fetches and plays an audio URL. Throws if the fetch fails or the audio can't be decoded.
export async function playAudioUrl(url) {
  const audioCtx = getAudioContext()
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`audio fetch failed: ${res.status}`)
  const decoded = await audioCtx.decodeAudioData(await res.arrayBuffer())
  const src = audioCtx.createBufferSource()
  src.buffer = decoded
  src.connect(audioCtx.destination)
  src.start()
}

export const canRecordAudio = () =>
  typeof window !== 'undefined' && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia

const WAV_SAMPLE_RATE = 22050
const MAX_RECORDING_MS = 10000

// Starts recording from the microphone. Returns { stop(): Promise<Blob> (audio/wav), cancel() }.
// Recording auto-stops after 10 seconds; onAutoStop fires with the resulting WAV blob.
export async function startRecording({ onAutoStop } = {}) {
  const audioCtx = getAudioContext()
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks = []
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }

  let cancelled = false
  const finished = new Promise(resolve => {
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      if (cancelled) return resolve(null)
      const recorded = new Blob(chunks, { type: recorder.mimeType })
      const decoded = await audioCtx.decodeAudioData(await recorded.arrayBuffer())
      resolve(await toWav(decoded))
    }
  })

  recorder.start()
  const timer = setTimeout(() => {
    if (recorder.state === 'recording') { recorder.stop(); finished.then(blob => blob && onAutoStop?.(blob)) }
  }, MAX_RECORDING_MS)

  return {
    stop: () => {
      clearTimeout(timer)
      if (recorder.state === 'recording') recorder.stop()
      return finished
    },
    cancel: () => {
      clearTimeout(timer)
      cancelled = true
      if (recorder.state === 'recording') recorder.stop()
      else stream.getTracks().forEach(t => t.stop())
    },
  }
}

// Downmixes to mono, resamples to 22.05 kHz and encodes as 16-bit PCM WAV
async function toWav(buffer) {
  const length = Math.max(1, Math.ceil(buffer.duration * WAV_SAMPLE_RATE))
  const offline = new OfflineAudioContext(1, length, WAV_SAMPLE_RATE)
  const src = offline.createBufferSource()
  src.buffer = buffer
  src.connect(offline.destination)
  src.start()
  const samples = (await offline.startRendering()).getChannelData(0)

  const view = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)                   // fmt chunk size
  view.setUint16(20, 1, true)                    // PCM
  view.setUint16(22, 1, true)                    // mono
  view.setUint32(24, WAV_SAMPLE_RATE, true)
  view.setUint32(28, WAV_SAMPLE_RATE * 2, true)  // byte rate
  view.setUint16(32, 2, true)                    // block align
  view.setUint16(34, 16, true)                   // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([view], { type: 'audio/wav' })
}
