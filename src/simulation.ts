export interface SimulationVariables {
  venueCost: number
  guestCount: number
  cateringCostPerGuest: number
  travelCost: number
  availableBudget: number
  daysRemaining: number
}

export type EventReadiness = 'excellent' | 'good' | 'at-risk' | 'critical'

export interface SimulationResult {
  totalExpenditure: number
  budgetRemaining: number
  budgetDeficit: number
  availableBudget: number
  cateringExpenditure: number
  travelExpenditure: number
  preparationPressure: number
  scheduleRisk: number
  eventReadiness: EventReadiness
}

export type Baseline = SimulationVariables

export const defaultVariables: SimulationVariables = {
  venueCost: 200000,
  guestCount: 150,
  cateringCostPerGuest: 800,
  travelCost: 35000,
  availableBudget: 500000,
  daysRemaining: 45,
}

export const baselineVariables: Baseline = { ...defaultVariables }

export function computeResult(vars: SimulationVariables): SimulationResult {
  for (const [key, value] of Object.entries(vars)) {
    if (!Number.isFinite(value)) throw new RangeError(`${key} must be a finite number`)
  }
  if (vars.venueCost < 0 || vars.guestCount < 0 || vars.cateringCostPerGuest < 0 || vars.travelCost < 0 || vars.availableBudget < 0 || vars.daysRemaining < 0) {
    throw new RangeError('Scenario values cannot be negative')
  }
  const cateringExpenditure = vars.guestCount * vars.cateringCostPerGuest
  const totalExpenditure = vars.venueCost + cateringExpenditure + vars.travelCost
  const budgetRemaining = vars.availableBudget - totalExpenditure
  const budgetDeficit = Math.max(0, -budgetRemaining)
  const preparationPressure = Math.round(Math.max(0, Math.min(100, 100 - (vars.daysRemaining / 90) * 100)))
  const scheduleRisk = Math.min(100, 20 + Math.round((preparationPressure / 100) * 50))

  let eventReadiness: EventReadiness
  if (budgetRemaining >= 0 && scheduleRisk <= 30 && vars.daysRemaining >= 30) eventReadiness = 'excellent'
  else if (budgetRemaining >= 0 && scheduleRisk <= 60 && vars.daysRemaining >= 15) eventReadiness = 'good'
  else if (budgetDeficit <= totalExpenditure * 0.2 && scheduleRisk <= 80) eventReadiness = 'at-risk'
  else eventReadiness = 'critical'

  return {
    totalExpenditure,
    budgetRemaining,
    budgetDeficit,
    availableBudget: vars.availableBudget,
    cateringExpenditure,
    travelExpenditure: vars.travelCost,
    preparationPressure,
    scheduleRisk,
    eventReadiness,
  }
}

export function computeBaselineResult(): SimulationResult {
  return computeResult(baselineVariables)
}

export function updateVariable(vars: SimulationVariables, key: keyof SimulationVariables, value: number): SimulationVariables {
  if (!Number.isFinite(value)) throw new RangeError(`${key} must be a finite number`)
  return { ...vars, [key]: value }
}

export function getVariableRange(key: keyof SimulationVariables): { min: number; max: number; step: number } {
  switch (key) {
    case 'venueCost': return { min: 50000, max: 1000000, step: 10000 }
    case 'guestCount': return { min: 20, max: 1000, step: 10 }
    case 'cateringCostPerGuest': return { min: 200, max: 5000, step: 50 }
    case 'travelCost': return { min: 0, max: 200000, step: 5000 }
    case 'availableBudget': return { min: 50000, max: 5000000, step: 50000 }
    case 'daysRemaining': return { min: 7, max: 180, step: 1 }
  }
}
