import { useState, useRef } from 'react'
import ItemCard from './ItemCard.jsx'

function parsePastedItems(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => {
      // Match: anything followed by a price like $12.34 or 12.34 at the end
      const m = line.match(/^(.+?)\s*\$?([\d,]+\.?\d*)\s*$/)
      if (!m) return []
      const name = m[1].replace(/\|/g, '').trim()
      const price = parseFloat(m[2].replace(',', ''))
      if (!name || isNaN(price) || price <= 0) return []
      return [{ id: crypto.randomUUID(), name, price, quantity: 1, assignedTo: 'everyone' }]
    })
}

export default function ItemsStep({ items, setItems, people, tax, setTax, apiKey, setApiKey, onNext, onBack }) {
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const fileRef = useRef()

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0)
  const taxAmt = parseFloat(tax) || 0

  const handleFile = (file) => {
    if (!file) return
    if (!apiKey) {
      setPendingFile(file)
      setShowApiKey(true)
      return
    }
    doParseReceipt(file, apiKey)
  }

  const doParseReceipt = async (file, key) => {
    setParsing(true)
    setParseError('')

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1]
        const res = await fetch('/api/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key },
          body: JSON.stringify({ imageData: base64, mediaType: file.type || 'image/jpeg' })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to parse receipt')

        const parsed = (data.items || []).map(item => ({
          id: crypto.randomUUID(),
          name: item.name || 'Unknown item',
          price: parseFloat(item.price) || 0,
          quantity: item.quantity || 1,
          assignedTo: 'everyone'
        }))

        setItems(prev => [...prev, ...parsed])
        if (data.tax != null) setTax(data.tax.toFixed(2))
      } catch (err) {
        setParseError(err.message)
      } finally {
        setParsing(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const importPasted = () => {
    const parsed = parsePastedItems(pasteText)
    if (parsed.length === 0) return
    setItems(prev => [...prev, ...parsed])
    setPasteText('')
    setShowPaste(false)
  }

  const addItem = () => {
    const name = newName.trim()
    const price = parseFloat(newPrice)
    if (!name || isNaN(price) || price < 0) return
    setItems(prev => [...prev, { id: crypto.randomUUID(), name, price, quantity: 1, assignedTo: 'everyone' }])
    setNewName('')
    setNewPrice('')
  }

  const updateItem = (id, updates) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))
  const assignAll = (to) => setItems(prev => prev.map(i => ({ ...i, assignedTo: to })))

  const pastePreview = parsePastedItems(pasteText)

  return (
    <div className="step-content">
      {showApiKey && (
        <div className="modal-overlay" onClick={() => setShowApiKey(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Anthropic API Key</h3>
            <p>Receipt scanning uses Claude AI vision. Enter your API key — it's saved locally in your browser and only sent to your local server.</p>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="input"
              autoFocus
            />
            <p className="hint-text">Get a key at <strong>console.anthropic.com</strong></p>
            <div className="modal-actions">
              <button onClick={() => { setShowApiKey(false); setPendingFile(null) }} className="btn">Cancel</button>
              <button
                onClick={() => {
                  setShowApiKey(false)
                  if (pendingFile) { doParseReceipt(pendingFile, apiKey); setPendingFile(null) }
                }}
                className="btn btn-primary"
                disabled={!apiKey.trim()}
              >
                Save & Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaste && (
        <div className="modal-overlay" onClick={() => setShowPaste(false)}>
          <div className="modal modal-tall" onClick={e => e.stopPropagation()}>
            <h3>Paste Item List</h3>
            <p>One item per line — name followed by price. Works with copied receipts, spreadsheets, or plain lists.</p>
            <p className="hint-text">Example:<br /><code>Rotisserie Chicken $4.99</code><br /><code>Organic Milk 7.99</code></p>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={"KS Water 40pk $3.99\nRotisserie Chicken $4.99\n..."}
              className="input paste-textarea"
              autoFocus
              rows={8}
            />
            {pastePreview.length > 0 && (
              <p className="paste-preview-count">✓ {pastePreview.length} item{pastePreview.length !== 1 ? 's' : ''} recognized</p>
            )}
            <div className="modal-actions">
              <button onClick={() => { setShowPaste(false); setPasteText('') }} className="btn">Cancel</button>
              <button
                onClick={importPasted}
                className="btn btn-primary"
                disabled={pastePreview.length === 0}
              >
                Import {pastePreview.length > 0 ? `${pastePreview.length} items` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="step-header">
        <h2>Items</h2>
        <p className="step-desc">Scan a receipt, paste a list, or add items manually.</p>
      </div>

      <div className="card">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={e => handleFile(e.target.files[0])}
          style={{ display: 'none' }}
          id="receipt-upload"
        />

        <div className="import-buttons">
          {parsing ? (
            <div className="upload-zone parsing">
              <div className="spinner" />
              <p className="upload-label">Scanning receipt with Claude AI…</p>
            </div>
          ) : (
            <label htmlFor="receipt-upload" className="upload-zone upload-zone-half">
              <span className="upload-icon">📷</span>
              <span className="upload-label">Scan Receipt</span>
              <span className="upload-sub">Photo or camera</span>
            </label>
          )}
          <button className="upload-zone upload-zone-half" onClick={() => setShowPaste(true)}>
            <span className="upload-icon">📋</span>
            <span className="upload-label">Paste List</span>
            <span className="upload-sub">From notes or text</span>
          </button>
        </div>

        {parseError && (
          <div className="error-banner">
            <span>⚠️</span>
            <span>{parseError}</span>
            <button onClick={() => setParseError('')} className="icon-btn">×</button>
          </div>
        )}

        <div className="divider-label">or add one at a time</div>

        <div className="add-row">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Item name"
            className="input input-flex"
          />
          <span className="price-prefix">$</span>
          <input
            type="number"
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="0.00"
            className="input input-price"
            step="0.01"
            min="0"
          />
          <button onClick={addItem} className="btn btn-primary" disabled={!newName.trim() || !newPrice}>
            Add
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card">
          <div className="section-header">
            <span className="section-title">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            <div className="header-actions">
              <button onClick={() => assignAll('everyone')} className="link-btn">All → Everyone</button>
              <button onClick={() => setItems([])} className="link-btn danger">Clear all</button>
            </div>
          </div>

          <div className="items-list">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                people={people}
                onUpdate={u => updateItem(item.id, u)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>

          <div className="totals-block">
            <div className="totals-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="totals-row tax-row-input">
              <label htmlFor="tax-input">Tax</label>
              <div className="tax-input-wrap">
                <span className="price-prefix">$</span>
                <input
                  id="tax-input"
                  type="number"
                  value={tax}
                  onChange={e => setTax(e.target.value)}
                  placeholder="0.00"
                  className="input input-price"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div className="totals-row totals-total">
              <span>Total</span>
              <span>${(subtotal + taxAmt).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="step-actions">
        <button onClick={onBack} className="btn">← People</button>
        <button onClick={onNext} className="btn btn-primary" disabled={items.length === 0}>
          See Summary →
        </button>
      </div>

      <button onClick={() => setShowApiKey(true)} className="api-key-btn" title="Configure API key for receipt scanning">
        🔑 {apiKey ? 'API key set' : 'Set API key'}
      </button>
    </div>
  )
}
