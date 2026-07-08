import { useState } from 'react'

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2']

export default function PeopleStep({ people, setPeople, onNext }) {
  const [name, setName] = useState('')

  const addPerson = () => {
    const trimmed = name.trim()
    if (!trimmed || people.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return
    setPeople(prev => [...prev, {
      id: crypto.randomUUID(),
      name: trimmed,
      color: AVATAR_COLORS[prev.length % AVATAR_COLORS.length]
    }])
    setName('')
  }

  const removePerson = (id) => setPeople(prev => prev.filter(p => p.id !== id))

  return (
    <div className="step-content">
      <div className="step-header">
        <h2>Who's splitting the bill?</h2>
        <p className="step-desc">Add everyone on this grocery run.</p>
      </div>

      <div className="card">
        <div className="add-row">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPerson()}
            placeholder="Name"
            className="input input-flex"
            autoFocus
            autoCapitalize="words"
          />
          <button onClick={addPerson} className="btn btn-primary" disabled={!name.trim()}>
            Add
          </button>
        </div>

        {people.length > 0 && (
          <ul className="people-list">
            {people.map(p => (
              <li key={p.id} className="person-row">
                <div className="avatar" style={{ background: p.color }}>
                  {p.name[0].toUpperCase()}
                </div>
                <span className="person-name">{p.name}</span>
                <button
                  onClick={() => removePerson(p.id)}
                  className="icon-btn danger"
                  aria-label={`Remove ${p.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {people.length === 0 && (
          <p className="empty-hint">Add at least one person to get started.</p>
        )}
      </div>

      <button
        onClick={onNext}
        className="btn btn-primary btn-block"
        disabled={people.length === 0}
      >
        Continue to Items →
      </button>
    </div>
  )
}
