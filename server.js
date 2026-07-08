import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json({ limit: '20mb' }))
app.use(express.static(join(__dirname, 'dist')))

app.post('/api/parse-receipt', async (req, res) => {
  try {
    const { imageData, mediaType } = req.body
    const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return res.status(400).json({ error: 'No API key provided. Enter your Anthropic API key in the app settings.' })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageData }
          },
          {
            type: 'text',
            text: `Parse this receipt image and extract all purchased items. Return ONLY a valid JSON object with no markdown formatting, no explanation, no code blocks — just raw JSON:

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
          }
        ]
      }]
    })

    const text = response.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not extract items from receipt. Try a clearer photo.')

    const parsed = JSON.parse(jsonMatch[0])
    res.json(parsed)
  } catch (err) {
    console.error('Parse error:', err.message)
    if (err.status === 401) {
      res.status(401).json({ error: 'Invalid API key. Check your Anthropic API key and try again.' })
    } else {
      res.status(500).json({ error: err.message })
    }
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
  console.log('For development: open http://localhost:5173\n')
})
