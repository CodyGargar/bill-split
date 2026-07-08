import { useState, useRef } from 'react'
import { getItemAssignees, getPersonAmount, getPerPerson, isCustomSplit } from '../utils/calculations.js'

function SplitModal({ item, people, onUpdate, onClose }) {
  const assignees = getItemAssignees(item, people)
  const price = parseFloat(item.price) || 0
  const inputRefs = useRef([])

  const initial = Object.fromEntries(
    assignees.map(p => [p.id, (item.splits && item.splits[p.id] != null) ? item.splits[p.id] : 1])
  )
  const [shares, setShares] = useState(initial)

  const totalShares = assignees.reduce((s, p) => s + (parseFloat(shares[p.id]) || 0), 0)

  const setShare = (id, val) => {
    const n = Math.max(0, parseFloat(val) || 0)
    setShares(prev => ({ ...prev, [id]: n }))
  }

  const resetEqual = () => setShares(Object.fromEntries(assignees.map(p => [p.id, 1])))

  const save = () => {
    const allEqual = assignees.every(p => (parseFloat(shares[p.id]) || 0) === (parseFloat(shares[assignees[0].id]) || 0))
    onUpdate({ splits: allEqual ? undefined : shares })
    onClose()
  }

  const handleKeyDown = (e, idx) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      inputRefs.current[idx + 1]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      inputRefs.current[idx - 1]?.focus()
    } else if (e.key === 'Enter') {
      save()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="split-modal-header">
          <h3>Custom Split</h3>
          <p className="split-item-name">{item.name} · ${price.toFixed(2)}</p>
        </div>
        <p>Set relative shares — higher = bigger portion. E.g. owner pays 2, others pay 1. ↑↓ to move between people.</p>
        <div className="split-rows">
          {assignees.map((p, idx) => {
            const myShares = parseFloat(shares[p.id]) || 0
            const myAmount = totalShares > 0 ? price * (myShares / totalShares) : 0
            const pct = totalShares > 0 ? Math.round((myShares / totalShares) * 100) : 0
            return (
              <div key={p.id} className="split-row">
                <div className="avatar sm" style={{ background: p.color }}>{p.name[0].toUpperCase()}</div>
                <span className="split-name">{p.name}</span>
                <input
                  ref={el => inputRefs.current[idx] = el}
                  type="number"
                  value={shares[p.id]}
                  onChange={e => setShare(p.id, e.target.value)}
                  onKeyDown={e => handleKeyDown(e, idx)}
                  className="input split-share-input"
                  min="0"
                  step="0.5"
                />
                <span className="split-preview">
                  ${myAmount.toFixed(2)}<span className="split-pct"> {pct}%</span>
                </span>
              </div>
            )
          })}
        </div>
        <div className="modal-actions">
          <button onClick={resetEqual} className="btn">Equal</button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} className="btn">Cancel</button>
          <button onClick={save} className="btn btn-primary">Done</button>
        </div>
      </div>
    </div>
  )
}

export default function ItemCard({ item, people, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editPrice, setEditPrice] = useState(String(item.price))
  const [showSplit, setShowSplit] = useState(false)

  const assignees = getItemAssignees(item, people)
  const perPerson = getPerPerson(item, people)
  const custom = isCustomSplit(item, people)
  const isEveryone = !item.assignedTo || item.assignedTo === 'everyone'

  const isAssigned = (personId) =>
    isEveryone || (Array.isArray(item.assignedTo) && item.assignedTo.includes(personId))

  const togglePerson = (personId) => {
    let newAssigned
    if (isEveryone) {
      newAssigned = people.filter(p => p.id !== personId).map(p => p.id)
      if (newAssigned.length === 0) newAssigned = [personId]
    } else {
      const current = Array.isArray(item.assignedTo) ? item.assignedTo : []
      if (current.includes(personId)) {
        const next = current.filter(id => id !== personId)
        newAssigned = next.length === 0 ? [personId] : next
      } else {
        const next = [...current, personId]
        newAssigned = next.length === people.length ? 'everyone' : next
      }
    }
    // Clear custom splits when toggling people — avoids stale weights
    onUpdate({ assignedTo: newAssigned, splits: undefined })
  }

  const selectAll = () => onUpdate({ assignedTo: 'everyone', splits: undefined })

  const saveEdit = () => {
    const price = parseFloat(editPrice)
    if (!editName.trim() || isNaN(price)) return
    onUpdate({ name: editName.trim(), price })
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditName(item.name)
    setEditPrice(String(item.price))
    setEditing(false)
  }

  return (
    <>
      {showSplit && (
        <SplitModal
          item={item}
          people={people}
          onUpdate={onUpdate}
          onClose={() => setShowSplit(false)}
        />
      )}

      <div className={`item-card ${assignees.length === 0 ? 'unassigned' : ''}`}>
        {editing ? (
          <div className="item-edit-row">
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
              className="input input-flex"
              autoFocus
            />
            <span className="price-prefix">$</span>
            <input
              type="number"
              value={editPrice}
              onChange={e => setEditPrice(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
              className="input input-price"
              step="0.01"
              min="0"
            />
            <button onClick={saveEdit} className="btn btn-sm btn-primary">✓</button>
            <button onClick={cancelEdit} className="btn btn-sm">✕</button>
          </div>
        ) : (
          <div className="item-top-row">
            <button className="item-info-btn" onClick={() => setEditing(true)}>
              <span className="item-name">{item.name}</span>
              <span className="item-price">${(parseFloat(item.price) || 0).toFixed(2)}</span>
            </button>
            <button onClick={onRemove} className="icon-btn danger" aria-label="Delete item">×</button>
          </div>
        )}

        <div className="assign-row">
          <div className="assign-chips">
            {people.map(p => (
              <button
                key={p.id}
                onClick={() => togglePerson(p.id)}
                className={`chip ${isAssigned(p.id) ? 'chip-on' : 'chip-off'}`}
                style={isAssigned(p.id) ? { borderColor: p.color, color: p.color, background: p.color + '18' } : {}}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
            {people.length > 1 && (
              <button
                onClick={selectAll}
                className={`chip ${isEveryone ? 'chip-on chip-all' : 'chip-off'}`}
              >
                All
              </button>
            )}
          </div>

          <div className="item-right-actions">
            {assignees.length > 1 && (
              <button
                onClick={() => setShowSplit(true)}
                className={`split-btn ${custom ? 'split-btn-active' : ''}`}
                title="Custom split"
              >
                ⚖ {custom ? 'custom' : 'split'}
              </button>
            )}
            {assignees.length > 0 && (
              <span className="per-person-label">
                {custom ? (
                  <span className="custom-split-label">
                    {assignees.map(p => (
                      <span key={p.id} style={{ color: p.color }}>
                        {p.name.split(' ')[0]} ${getPersonAmount(item, p.id, people).toFixed(2)}
                      </span>
                    ))}
                  </span>
                ) : (
                  people.length > 1 && perPerson != null
                    ? `$${perPerson.toFixed(2)}/ea`
                    : null
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
