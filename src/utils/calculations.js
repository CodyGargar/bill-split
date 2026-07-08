export function getItemAssignees(item, people) {
  if (!item.assignedTo || item.assignedTo === 'everyone') return people
  return people.filter(p => item.assignedTo.includes(p.id))
}

export function getPersonAmount(item, personId, people) {
  const price = parseFloat(item.price) || 0
  const assignees = getItemAssignees(item, people)
  if (!assignees.find(p => p.id === personId)) return 0

  if (item.splits && Object.keys(item.splits).length > 0) {
    const totalShares = assignees.reduce((s, p) => s + (item.splits[p.id] ?? 1), 0)
    if (totalShares === 0) return 0
    return price * ((item.splits[personId] ?? 1) / totalShares)
  }

  return price / assignees.length
}

export function getPerPerson(item, people) {
  const assignees = getItemAssignees(item, people)
  if (assignees.length === 0) return 0
  if (item.splits && Object.keys(item.splits).length > 0) return null // custom — no single value
  return (parseFloat(item.price) || 0) / assignees.length
}

export function isCustomSplit(item, people) {
  if (!item.splits || Object.keys(item.splits).length === 0) return false
  const assignees = getItemAssignees(item, people)
  const values = assignees.map(p => item.splits[p.id] ?? 1)
  return !values.every(v => v === values[0])
}

export function calcSummary(people, items, tax) {
  const personSubtotals = {}
  people.forEach(p => { personSubtotals[p.id] = 0 })

  let totalSubtotal = 0

  items.forEach(item => {
    const price = parseFloat(item.price) || 0
    totalSubtotal += price

    const assignees = getItemAssignees(item, people).filter(p => personSubtotals[p.id] !== undefined)
    if (assignees.length === 0) return

    if (item.splits && Object.keys(item.splits).length > 0) {
      const totalShares = assignees.reduce((s, p) => s + (item.splits[p.id] ?? 1), 0)
      if (totalShares === 0) return
      assignees.forEach(p => {
        personSubtotals[p.id] += price * ((item.splits[p.id] ?? 1) / totalShares)
      })
    } else {
      const share = price / assignees.length
      assignees.forEach(p => { personSubtotals[p.id] += share })
    }
  })

  const personTax = {}
  const personTotals = {}

  people.forEach(p => {
    const taxShare = totalSubtotal > 0
      ? (personSubtotals[p.id] / totalSubtotal) * tax
      : tax / Math.max(people.length, 1)
    personTax[p.id] = taxShare
    personTotals[p.id] = personSubtotals[p.id] + taxShare
  })

  const grandTotal = people.reduce((sum, p) => sum + personTotals[p.id], 0)

  return { personSubtotals, personTax, personTotals, totalSubtotal, grandTotal }
}
