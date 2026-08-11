import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json({ limit: '20mb' }))
app.use(express.static(join(__dirname, 'dist')))

const TMP_DIR = join(__dirname, '.tmp-receipts')
fs.mkdirSync(TMP_DIR, { recursive: true })

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'sonnet'

const RECEIPT_PROMPT = `Read the receipt image at "{{FILE}}" and extract all purchased items. Return ONLY a valid JSON object with no markdown formatting, no explanation, no code blocks — just raw JSON:

{
  "items": [
    {"name": "item description", "price": 0.00, "quantity": 1}
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00
}

Rules:
- "price" is the TOTAL line price (quantity × unit price). E.g. if "2 @ $5.99" then price = 11.98
- "quantity" is how many units were purchased (default 1)
- "name" should be human-readable (e.g. "Kirkland Organic Milk" not "#47291")
- Include ALL items, fees, and deposits
- Do NOT include tax, subtotal, or total lines as items
- If subtotal/tax/total are not clearly visible, use null for those fields
- Remove trailing/leading whitespace from item names`

// --- Rate limiter -----------------------------------------------------
// This app shells out to your local Claude CLI, which spends your Claude
// subscription's usage. This is an in-memory, single-process limiter that
// caps how many scans can run in a rolling window, purely to guard against
// runaway usage (double-clicks, retry loops, bugs) — not a defense against
// external abuse, since this server is meant to run only on your own machine.
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 5)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000)
const requestTimestamps = []

function rateLimiter(req, res, next) {
  const now = Date.now()
  while (requestTimestamps.length && now - requestTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift()
  }
  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - requestTimestamps[0])
    res.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)))
    return res.status(429).json({
      error: `Rate limit reached: max ${RATE_LIMIT_MAX} receipt scans per ${Math.round(RATE_LIMIT_WINDOW_MS / 1000)}s. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`
    })
  }
  requestTimestamps.push(now)
  next()
}

// --- Claude CLI invocation ---------------------------------------------
// Runs the local `claude` CLI in print/non-interactive mode, scoped to only
// the Read tool, with cwd set to an isolated temp directory so the model can
// see the one receipt image and nothing else from the project.
const CLI_TIMEOUT_MS = Number(process.env.CLAUDE_CLI_TIMEOUT_MS || 90_000)

function runClaudeCLI(prompt, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', [
      '-p',
      '--tools', 'Read',
      '--permission-mode', 'bypassPermissions',
      '--output-format', 'json',
      '--no-session-persistence',
      '--model', CLAUDE_MODEL
    ], { shell: true, cwd })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      settled = true
      // shell:true means child.pid is cmd.exe's PID on Windows, not claude's —
      // kill the whole tree so the underlying process doesn't keep running.
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid, '/t', '/f'])
      } else {
        child.kill('SIGKILL')
      }
      reject(new Error(`Claude CLI timed out after ${Math.round(CLI_TIMEOUT_MS / 1000)}s.`))
    }, CLI_TIMEOUT_MS)

    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', d => { stderr += d })

    child.on('error', err => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err.code === 'ENOENT') {
        reject(new Error('Claude CLI not found. Install it and run `claude` once to log in with your subscription.'))
      } else {
        reject(err)
      }
    })

    child.on('close', code => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Claude CLI exited with code ${code}`))
      }
      let outer
      try {
        outer = JSON.parse(stdout)
      } catch {
        return reject(new Error('Failed to parse Claude CLI output.'))
      }
      if (outer.is_error) {
        return reject(new Error(outer.result || 'Claude CLI returned an error.'))
      }
      resolve(outer.result || '')
    })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

app.post('/api/parse-receipt', rateLimiter, async (req, res) => {
  const { imageData, mediaType } = req.body

  if (!imageData) {
    return res.status(400).json({ error: 'No image provided.' })
  }

  const ext = mediaType === 'image/png' ? 'png'
    : mediaType === 'image/webp' ? 'webp'
    : mediaType === 'image/heic' ? 'heic'
    : 'jpg'
  const fileName = `${randomUUID()}.${ext}`
  const filePath = join(TMP_DIR, fileName)

  try {
    fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'))

    const prompt = RECEIPT_PROMPT.replace('{{FILE}}', fileName)
    const text = (await runClaudeCLI(prompt, TMP_DIR)).trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not extract items from receipt. Try a clearer photo.')

    const parsed = JSON.parse(jsonMatch[0])
    res.json(parsed)
  } catch (err) {
    console.error('Parse error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    fs.unlink(filePath, () => {})
  }
})

app.get('*', (req, res) => {
  const indexPath = join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(200).send(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto">
        <h2>Bill Split</h2>
        <p>The app hasn't been built yet. Run:</p>
        <pre style="background:#f1f5f9;padding:16px;border-radius:8px">npm run build</pre>
        <p>Or for development with hot reload:</p>
        <pre style="background:#f1f5f9;padding:16px;border-radius:8px">npm run dev</pre>
        <p>Then open <a href="http://localhost:5173">http://localhost:5173</a></p>
      </body></html>
    `)
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\nBill Split API server → http://localhost:${PORT}`)
  console.log('For development: open http://localhost:5173')
  console.log('Receipt scanning uses your local Claude CLI subscription login.\n')
})
