import { useState, useMemo } from 'react'
import PeopleStep from './components/PeopleStep.jsx'
import ItemsStep from './components/ItemsStep.jsx'
import SummaryStep from './components/SummaryStep.jsx'
import { calcSummary } from './utils/calculations.js'

const STEPS = ['People', 'Items', 'Summary']

export default function App() {
  const [step, setStep] = useState(0)
  const [people, setPeople] = useState([])
  const [items, setItems] = useState([])
  const [tax, setTax] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('bs_api_key') || '')

  const summary = useMemo(
    () => calcSummary(people, items, parseFloat(tax) || 0),
    [people, items, tax]
  )

  const saveApiKey = (key) => {
    setApiKey(key)
    localStorage.setItem('bs_api_key', key)
  }

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0)
  const total = subtotal + (parseFloat(tax) || 0)

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Bill Split</span>
        {items.length > 0 && (
          <span className="header-total">${total.toFixed(2)}</span>
        )}
      </header>

      <nav className="step-nav" role="tablist">
        {STEPS.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={step === i}
            className={`step-tab ${step === i ? 'active' : ''} ${i < step ? 'done' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="step-num">{i < step ? '✓' : i + 1}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {step === 0 && (
          <PeopleStep
            people={people}
            setPeople={setPeople}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <ItemsStep
            items={items}
            setItems={setItems}
            people={people}
            tax={tax}
            setTax={setTax}
            apiKey={apiKey}
            setApiKey={saveApiKey}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <SummaryStep
            people={people}
            items={items}
            tax={parseFloat(tax) || 0}
            summary={summary}
            onBack={() => setStep(1)}
          />
        )}
      </main>
    </div>
  )
}
