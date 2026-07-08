import { useState } from 'react'
import { getItemAssignees, getPersonAmount } from '../utils/calculations.js'

function formatCurrency(n) {
  return '$' + n.toFixed(2)
}

export default function SummaryStep({ people, items, tax, summary, onBack }) {
  const { personSubtotals, personTax, personTotals, grandTotal } = summary
  const [payerId, setPayerId] = useState('')
  const [copied, setCopied] = useState('')

  const itemsForPerson = (personId) =>
    items.flatMap(item => {
      const amt = getPersonAmount(item, personId, people)
      if (amt === 0) return []
      return [{ name: item.name, amount: amt }]
    })

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 2500)
    } catch { /* clipboard unavailable */ }
  }

  const buildSimple = () => {
    const payer = people.find(p => p.id === payerId)
    let lines = ['Bill Split', '']
    if (payer) {
      people.filter(p => p.id !== payerId).forEach(p => {
        lines.push(`${p.name} owes ${payer.name}  ${formatCurrency(personTotals[p.id] || 0)}`)
      })
    } else {
      people.forEach(p => {
        lines.push(`${p.name}  ${formatCurrency(personTotals[p.id] || 0)}`)
      })
    }
    lines.push('', `Total  ${formatCurrency(grandTotal)}`)
    return lines.join('\n')
  }

  const buildBreakdown = () => {
    const payer = people.find(p => p.id === payerId)
    let lines = ['Bill Split — Breakdown', '']
    people.forEach(p => {
      const total = personTotals[p.id] || 0
      const taxShare = personTax[p.id] || 0
      const myItems = itemsForPerson(p.id)

      if (payer && p.id !== payerId) {
        lines.push(`${p.name} owes ${payer.name}  ${formatCurrency(total)}`)
      } else {
        lines.push(`${p.name}  ${formatCurrency(total)}`)
      }

      myItems.forEach(item => {
        lines.push(`  ${item.name}  ${formatCurrency(item.amount)}`)
      })
      if (taxShare > 0.005) {
        lines.push(`  Tax  ${formatCurrency(taxShare)}`)
      }
      lines.push('')
    })
    lines.push(`Grand Total  ${formatCurrency(grandTotal)}`)
    return lines.join('\n')
  }

  const sortedPeople = [...people].sort((a, b) => (personTotals[b.id] || 0) - (personTotals[a.id] || 0))

  return (
    <div className="step-content">
      <div className="step-header">
        <h2>Summary</h2>
      </div>

      {people.length > 1 && (
        <div className="card payer-section">
          <label className="section-title">Who paid? (optional)</label>
          <div className="payer-chips">
            {people.map(p => (
              <button
                key={p.id}
                onClick={() => setPayerId(prev => prev === p.id ? '' : p.id)}
                className={`chip ${payerId === p.id ? 'chip-on' : 'chip-off'}`}
                style={payerId === p.id ? { borderColor: p.color, color: p.color, background: p.color + '18' } : {}}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {payerId && (
        <div className="card owes-card">
          <div className="section-title">Owes {people.find(p => p.id === payerId)?.name}</div>
          {people.filter(p => p.id !== payerId).map(p => (
            <div key={p.id} className="owes-row">
              <div className="avatar sm" style={{ background: p.color }}>{p.name[0].toUpperCase()}</div>
              <span className="owes-name">{p.name}</span>
              <span className="owes-amount">{formatCurrency(personTotals[p.id] || 0)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="summary-list">
        {sortedPeople.map(p => {
          const myItems = itemsForPerson(p.id)
          const taxShare = personTax[p.id] || 0
          return (
            <details key={p.id} className="person-summary-card">
              <summary className="person-summary-header">
                <div className="avatar" style={{ background: p.color }}>{p.name[0].toUpperCase()}</div>
                <span className="person-summary-name">{p.name}</span>
                <span className="person-summary-total">{formatCurrency(personTotals[p.id] || 0)}</span>
                <span className="chevron">›</span>
              </summary>
              <div className="person-breakdown">
                {myItems.map((item, i) => (
                  <div key={i} className="breakdown-row">
                    <span className="breakdown-name">{item.name}</span>
                    <span className="breakdown-amt">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {taxShare > 0.005 && (
                  <div className="breakdown-row tax-share-row">
                    <span className="breakdown-name">Tax</span>
                    <span className="breakdown-amt">{formatCurrency(taxShare)}</span>
                  </div>
                )}
                <div className="breakdown-row breakdown-subtotal">
                  <span>Total</span>
                  <span>{formatCurrency(personTotals[p.id] || 0)}</span>
                </div>
              </div>
            </details>
          )
        })}
      </div>

      <div className="grand-total-card">
        <span>Grand Total</span>
        <span>{formatCurrency(grandTotal)}</span>
      </div>

      <div className="copy-section">
        <p className="copy-label">Copy summary</p>
        <div className="copy-buttons">
          <button
            onClick={() => copyText(buildSimple(), 'simple')}
            className={`copy-btn ${copied === 'simple' ? 'copy-btn-done' : ''}`}
          >
            <span className="copy-btn-icon">{copied === 'simple' ? '✓' : '📋'}</span>
            <span>
              <strong>Totals only</strong>
              <span className="copy-btn-sub">Just what each person owes</span>
            </span>
          </button>
          <button
            onClick={() => copyText(buildBreakdown(), 'breakdown')}
            className={`copy-btn ${copied === 'breakdown' ? 'copy-btn-done' : ''}`}
          >
            <span className="copy-btn-icon">{copied === 'breakdown' ? '✓' : '📋'}</span>
            <span>
              <strong>With breakdown</strong>
              <span className="copy-btn-sub">Total + every item listed</span>
            </span>
          </button>
        </div>
      </div>

      <div className="step-actions">
        <button onClick={onBack} className="btn">← Edit Items</button>
        {typeof navigator.share === 'function' && (
          <button onClick={() => navigator.share({ text: buildBreakdown() })} className="btn">
            Share ↑
          </button>
        )}
      </div>
    </div>
  )
}
