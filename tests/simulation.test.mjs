import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baselineVariables, computeResult, defaultVariables, getVariableRange, updateVariable } from '../src/simulation.ts'

test('baseline totals and budget reconcile', () => {
  const result = computeResult(baselineVariables)
  assert.equal(result.cateringExpenditure, 120000)
  assert.equal(result.totalExpenditure, 355000)
  assert.equal(result.budgetRemaining, 145000)
  assert.equal(result.budgetDeficit, 0)
})

test('budget deficit is the exact overspend', () => {
  const result = computeResult({ ...defaultVariables, venueCost: 700000 })
  assert.equal(result.totalExpenditure, 855000)
  assert.equal(result.budgetRemaining, -355000)
  assert.equal(result.budgetDeficit, 355000)
})

test('time pressure and risk stay bounded and deterministic', () => {
  const short = computeResult({ ...defaultVariables, daysRemaining: 7 })
  assert.equal(short.preparationPressure, 92)
  assert.equal(short.scheduleRisk, 66)
  assert.equal(short.eventReadiness, 'at-risk')
  assert.deepEqual(computeResult(defaultVariables), computeResult(defaultVariables))
})

test('range extremes produce finite results and zero budget is handled', () => {
  const maxScenario = { ...defaultVariables, venueCost: 1000000, guestCount: 1000, cateringCostPerGuest: 5000, travelCost: 200000, availableBudget: 50000, daysRemaining: 180 }
  const result = computeResult(maxScenario)
  assert.equal(result.totalExpenditure, 6200000)
  assert.equal(result.budgetDeficit, 6150000)
  assert.ok(Number.isFinite(result.scheduleRisk))
  assert.equal(computeResult({ ...defaultVariables, availableBudget: 0 }).budgetDeficit, 355000)
})

test('non-finite and negative simulation inputs are rejected', () => {
  assert.throws(() => computeResult({ ...defaultVariables, venueCost: Number.NaN }), RangeError)
  assert.throws(() => computeResult({ ...defaultVariables, guestCount: -1 }), RangeError)
  assert.throws(() => updateVariable(defaultVariables, 'travelCost', Number.POSITIVE_INFINITY), RangeError)
})

test('variable ranges are present and updates preserve other values', () => {
  assert.deepEqual(getVariableRange('guestCount'), { min: 20, max: 1000, step: 10 })
  assert.deepEqual(updateVariable(defaultVariables, 'guestCount', 300), { ...defaultVariables, guestCount: 300 })
})
