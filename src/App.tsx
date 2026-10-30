import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  baselineVariables,
  computeResult,
  defaultVariables,
  getVariableRange,
  updateVariable,
  type SimulationVariables,
} from './simulation'
import './App.css'

type ExperimentId = 'double-guests' | 'expensive-venue' | 'reduced-time' | 'increased-budget'
type NodeId = 'venue' | 'guests' | 'catering' | 'travel' | 'budget' | 'days' | 'catering-total' | 'total' | 'budget-remaining' | 'budget-deficit' | 'pressure' | 'risk' | 'readiness'
type GraphNode = { id: NodeId; label: string; value: string; color: string; input?: keyof SimulationVariables }
type GraphEdge = { from: NodeId; to: NodeId; label: string }

const variableLabels: Record<keyof SimulationVariables, string> = {
  venueCost: 'Venue cost', guestCount: 'Guest count', cateringCostPerGuest: 'Catering per guest',
  travelCost: 'Travel cost', availableBudget: 'Available budget', daysRemaining: 'Days remaining',
}
const graphPositions: Record<NodeId, [number, number]> = {
  venue: [75, 62], guests: [205, 62], catering: [335, 62], travel: [465, 62], budget: [595, 62], days: [725, 62],
  'catering-total': [205, 180], total: [400, 180], 'budget-remaining': [595, 180], 'budget-deficit': [595, 300],
  pressure: [725, 180], risk: [725, 300], readiness: [400, 300],
}
const graphEdges: GraphEdge[] = [
  { from: 'venue', to: 'total', label: 'adds' }, { from: 'guests', to: 'catering-total', label: '× rate' },
  { from: 'catering', to: 'catering-total', label: '× guests' }, { from: 'catering-total', to: 'total', label: 'adds' },
  { from: 'travel', to: 'total', label: 'adds' }, { from: 'total', to: 'budget-remaining', label: 'subtracts' },
  { from: 'budget', to: 'budget-remaining', label: 'sets limit' }, { from: 'budget-remaining', to: 'budget-deficit', label: 'if negative' },
  { from: 'days', to: 'pressure', label: 'less time' }, { from: 'pressure', to: 'risk', label: 'raises' },
  { from: 'budget-remaining', to: 'readiness', label: 'budget' }, { from: 'budget-deficit', to: 'readiness', label: 'deficit' },
  { from: 'risk', to: 'readiness', label: 'schedule' },
]
const inputNode: Partial<Record<keyof SimulationVariables, NodeId>> = {
  venueCost: 'venue', guestCount: 'guests', cateringCostPerGuest: 'catering', travelCost: 'travel', availableBudget: 'budget', daysRemaining: 'days',
}
const descendants: Record<NodeId, NodeId[]> = {
  venue: ['total', 'budget-remaining', 'budget-deficit', 'readiness'], guests: ['catering-total', 'total', 'budget-remaining', 'budget-deficit', 'readiness'],
  catering: ['catering-total', 'total', 'budget-remaining', 'budget-deficit', 'readiness'], travel: ['total', 'budget-remaining', 'budget-deficit', 'readiness'],
  budget: ['budget-remaining', 'budget-deficit', 'readiness'], days: ['pressure', 'risk', 'readiness'], 'catering-total': ['total', 'budget-remaining', 'budget-deficit', 'readiness'],
  total: ['budget-remaining', 'budget-deficit', 'readiness'], 'budget-remaining': ['budget-deficit', 'readiness'], 'budget-deficit': ['readiness'], pressure: ['risk', 'readiness'], risk: ['readiness'], readiness: [],
}
const money = (value: number) => `₹${Math.abs(value).toLocaleString('en-IN')}`

function App() {
  const [vars, setVars] = useState<SimulationVariables>({ ...defaultVariables })
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null)
  const baselineResult = useMemo(() => computeResult(baselineVariables), [])
  const result = useMemo(() => computeResult(vars), [vars])
  const changedKeys = (Object.keys(variableLabels) as (keyof SimulationVariables)[]).filter((key) => vars[key] !== baselineVariables[key])
  const affected = (() => {
    const ids = new Set<NodeId>()
    for (const key of changedKeys) {
      const root = inputNode[key]
      if (root) { ids.add(root); descendants[root].forEach((id) => ids.add(id)) }
    }
    if (selectedNode) { ids.add(selectedNode); descendants[selectedNode].forEach((id) => ids.add(id)) }
    return ids
  })()
  const nodes = useMemo<GraphNode[]>(() => [
    { id: 'venue', label: 'Venue', value: money(vars.venueCost), color: '#53ddbd', input: 'venueCost' },
    { id: 'guests', label: 'Guests', value: vars.guestCount.toLocaleString(), color: '#74c9ff', input: 'guestCount' },
    { id: 'catering', label: 'Catering / guest', value: money(vars.cateringCostPerGuest), color: '#b69aff', input: 'cateringCostPerGuest' },
    { id: 'travel', label: 'Travel', value: money(vars.travelCost), color: '#53ddbd', input: 'travelCost' },
    { id: 'budget', label: 'Budget', value: money(vars.availableBudget), color: '#b69aff', input: 'availableBudget' },
    { id: 'days', label: 'Days left', value: `${vars.daysRemaining} days`, color: '#74c9ff', input: 'daysRemaining' },
    { id: 'catering-total', label: 'Catering total', value: money(result.cateringExpenditure), color: '#b69aff' },
    { id: 'total', label: 'Total spend', value: money(result.totalExpenditure), color: '#53ddbd' },
    { id: 'budget-remaining', label: 'Budget remaining', value: `${result.budgetRemaining < 0 ? '−' : ''}${money(result.budgetRemaining)}`, color: result.budgetRemaining < 0 ? '#ff7181' : '#53ddbd' },
    { id: 'budget-deficit', label: 'Budget deficit', value: result.budgetDeficit ? money(result.budgetDeficit) : 'None', color: result.budgetDeficit ? '#ff7181' : '#53ddbd' },
    { id: 'pressure', label: 'Prep pressure', value: `${result.preparationPressure}%`, color: '#74c9ff' },
    { id: 'risk', label: 'Schedule risk', value: `${result.scheduleRisk}%`, color: '#b69aff' },
    { id: 'readiness', label: 'Readiness', value: result.eventReadiness, color: '#53ddbd' },
  ], [vars, result])
  const formatDelta = (key: keyof SimulationVariables) => {
    const delta = vars[key] - baselineVariables[key]
    if (key === 'guestCount' || key === 'daysRemaining') return `${delta > 0 ? '+' : ''}${delta} ${key === 'daysRemaining' ? 'days' : 'guests'}`
    return `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${money(delta)}`
  }
  const applyExperiment = (id: ExperimentId) => setVars((current) => {
    const next = { ...current }
    if (id === 'double-guests') next.guestCount = Math.min(current.guestCount * 2, getVariableRange('guestCount').max)
    if (id === 'expensive-venue') next.venueCost = Math.min(current.venueCost + 150000, getVariableRange('venueCost').max)
    if (id === 'reduced-time') next.daysRemaining = Math.max(7, current.daysRemaining - 30)
    if (id === 'increased-budget') next.availableBudget = Math.min(current.availableBudget + 100000, getVariableRange('availableBudget').max)
    return next
  })
  const reset = () => { setVars({ ...baselineVariables }); setSelectedNode(null) }
  const setVariable = (key: keyof SimulationVariables, raw: number) => {
    if (!Number.isFinite(raw)) return
    const range = getVariableRange(key)
    const value = Math.max(range.min, Math.min(range.max, Math.round(raw / range.step) * range.step))
    setVars((current) => updateVariable(current, key, value))
  }
  const changeStyle = (key: keyof SimulationVariables): CSSProperties => ({ color: vars[key] === baselineVariables[key] ? 'var(--text-dim)' : vars[key] > baselineVariables[key] ? 'var(--accent)' : 'var(--electric-blue)' })

  return <main className="main-container">
    <header className="app-header">
      <div className="eyebrow"><span className="live-dot" /> INTERACTIVE SYSTEMS LAB <span className="header-line" /> EXPERIMENT 01</div>
      <h1>The Butterfly <span>Effect</span></h1>
      <p className="tagline">One small change. A world of consequences.</p>
      <p className="description">Explore a simplified, illustrative model of how event-planning choices can ripple through cost, timing, and readiness.</p>
    </header>

    <div className="dashboard-grid">
      <section className="section card scenario-card" id="scenario-controls">
        <div className="section-heading"><span className="section-index">01</span><div><p className="section-kicker">SET YOUR PARAMETERS</p><h2>Event scenario</h2></div><button className="text-button reset-small" onClick={reset}>Reset ↺</button></div>
        <p className="section-intro">Move a control to see how one decision shifts the whole plan.</p>
        <div className="controls-grid">{(Object.keys(variableLabels) as (keyof SimulationVariables)[]).map((key) => {
          const range = getVariableRange(key)
          return <div className="variable-control" key={key}>
            <div className="control-heading"><label htmlFor={`${key}-number`}>{variableLabels[key]}</label><span style={changeStyle(key)}>{vars[key] === baselineVariables[key] ? 'Baseline' : formatDelta(key)}</span></div>
            <div className="input-wrapper"><input aria-label={variableLabels[key]} type="range" min={range.min} max={range.max} step={range.step} value={vars[key]} onChange={(event) => setVariable(key, Number(event.target.value))} /><input id={`${key}-number`} aria-label={`${variableLabels[key]} value`} type="number" min={range.min} max={range.max} step={range.step} value={vars[key]} onChange={(event) => { if (event.target.value !== '') setVariable(key, Number(event.target.value)) }} /></div>
          </div>
        })}</div>
        <div className="presets-heading"><div><p className="section-kicker">QUICK EXPERIMENTS</p><span>Try a scenario</span></div></div>
        <div className="presets">
          <button className="preset-btn" onClick={() => applyExperiment('double-guests')}><span className="preset-icon">↗</span><span>Double the guests<small>See the catering ripple</small></span></button>
          <button className="preset-btn" onClick={() => applyExperiment('expensive-venue')}><span className="preset-icon">◇</span><span>Choose a grand venue<small>Add ₹150,000 to venue</small></span></button>
          <button className="preset-btn" onClick={() => applyExperiment('reduced-time')}><span className="preset-icon">◷</span><span>Shorten the runway<small>Remove 30 prep days</small></span></button>
          <button className="preset-btn" onClick={() => applyExperiment('increased-budget')}><span className="preset-icon">＋</span><span>Grow the budget<small>Add ₹100,000 to budget</small></span></button>
        </div>
      </section>

      <section className="section card results-card" id="results">
        <div className="section-heading"><span className="section-index">02</span><div><p className="section-kicker">LIVE MODEL OUTPUT</p><h2>Plan outlook</h2></div><span className="live-badge"><span className="live-dot"/> LIVE</span></div>
        <div className="spend-summary"><span>Total estimated spend</span><strong>{money(result.totalExpenditure)}</strong><small>of {money(vars.availableBudget)} available</small><div className="budget-track"><span style={{ width: `${vars.availableBudget === 0 ? result.totalExpenditure > 0 ? 100 : 0 : Math.min(100, result.totalExpenditure / vars.availableBudget * 100)}%`, background: result.budgetDeficit > 0 ? 'var(--danger)' : 'var(--accent)' }} /></div></div>
        <div className="metric-list">
          <div className="metric-row"><span>Budget remaining</span><strong className={result.budgetRemaining < 0 ? 'negative' : ''}>{result.budgetRemaining < 0 ? '−' : ''}{money(result.budgetRemaining)}</strong></div>
          <div className="metric-row"><span>Catering</span><strong>{money(result.cateringExpenditure)}</strong></div>
          <div className="metric-row"><span>Travel</span><strong>{money(result.travelExpenditure)}</strong></div>
          <div className="metric-row"><span>Preparation pressure</span><strong>{result.preparationPressure}<small>%</small></strong></div>
          <div className="metric-row"><span>Schedule risk</span><strong>{result.scheduleRisk}<small>%</small></strong></div>
        </div>
        <div className="readiness-row"><div><span className="section-kicker">EVENT READINESS</span><small>Based on budget health and time remaining</small></div><span className={`badge ${result.eventReadiness}`}>{result.eventReadiness.replace('-', ' ')}</span></div>
      </section>
    </div>

    <section className="section card graph-card" id="visualization">
      <div className="section-heading"><span className="section-index">03</span><div><p className="section-kicker">CAUSE → EFFECT</p><h2>Ripple map</h2></div><span className="graph-hint">Select any node to trace its effects</span></div>
      <div className="graph-legend"><span><i className="legend-dot input-dot"/> Inputs</span><span><i className="legend-dot output-dot"/> Calculated outcomes</span><span><i className="legend-line"/> Affected by current changes</span></div>
      <div className="visualization-container"><svg className="visualization-canvas" viewBox="0 0 800 360" role="img" aria-label="Interactive cause and effect map for the event scenario">
        <defs><pattern id="graph-grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 L 0 0 0 26" fill="none" stroke="rgba(138,153,174,.08)" strokeWidth="1"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>
        <rect width="800" height="360" rx="12" fill="url(#graph-grid)" />
        {graphEdges.map((edge) => { const [x1, y1] = graphPositions[edge.from]; const [x2, y2] = graphPositions[edge.to]; const active = affected.has(edge.from) && affected.has(edge.to); return <g key={`${edge.from}-${edge.to}`}><line x1={x1} y1={y1 + 23} x2={x2} y2={y2 - 22} stroke={active ? '#53ddbd' : '#657185'} strokeWidth={active ? 1.7 : 1} strokeOpacity={active ? .76 : .35} markerEnd="url(#arrow)"/><text className="edge-label" x={(x1 + x2) / 2} y={(y1 + y2) / 2}>{edge.label}</text></g> })}
        {nodes.map((node) => { const [x, y] = graphPositions[node.id]; const active = affected.has(node.id); const selected = selectedNode === node.id; return <g key={node.id} className={`graph-node ${active ? 'affected' : ''} ${selected ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`${node.label}: ${node.value}. Select to trace effects.`} onClick={() => setSelectedNode(selected ? null : node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedNode(selected ? null : node.id) } }}><rect x={x - 58} y={y - 23} width="116" height="46" rx="10" fill={node.input ? '#172833' : '#20252f'} stroke={selected ? '#fff' : active ? node.color : '#3b4655'} strokeWidth={selected ? 2 : 1.2}/><circle cx={x - 46} cy={y - 10} r="3" fill={node.color}/><text x={x} y={y - 2} className="node-label">{node.label}</text><text x={x} y={y + 13} className="node-value" fill={node.color}>{node.value}</text></g> })}
      </svg></div>
      <p className="graph-caption">{selectedNode ? <><strong>{nodes.find((node) => node.id === selectedNode)?.label}</strong> is highlighted with its downstream effects. Select it again to clear.</> : changedKeys.length ? <>{changedKeys.length} input{changedKeys.length === 1 ? '' : 's'} changed. Highlighted paths show where those effects flow.</> : 'Change a scenario input to illuminate the paths that carry its effects.'}</p>
    </section>

    <section className="section card comparison-card" id="comparison">
      <div className="section-heading"><span className="section-index">04</span><div><p className="section-kicker">A CONTROLLED COMPARISON</p><h2>Current vs baseline</h2></div><span className="comparison-note">Original plan stays fixed</span></div>
      <div className="comparison-grid"><div className="comparison-labels"><span>Scenario</span>{(Object.keys(variableLabels) as (keyof SimulationVariables)[]).map((key) => <span key={key}>{variableLabels[key]}</span>)}<span>Total estimated spend</span><span>Budget remaining</span><span>Readiness</span></div>
        <div className="comparison-column current-column"><h3>Current plan <i>LIVE</i></h3>{(Object.keys(variableLabels) as (keyof SimulationVariables)[]).map((key) => <span key={key} style={changeStyle(key)}>{key === 'guestCount' ? vars[key].toLocaleString() : key === 'daysRemaining' ? `${vars[key]} days` : money(vars[key])}</span>)}<strong>{money(result.totalExpenditure)}</strong><strong className={result.budgetRemaining < 0 ? 'negative' : ''}>{result.budgetRemaining < 0 ? '−' : ''}{money(result.budgetRemaining)}</strong><b className={`badge ${result.eventReadiness}`}>{result.eventReadiness.replace('-', ' ')}</b></div>
        <div className="comparison-column baseline-column"><h3>Baseline <i>LOCKED</i></h3>{(Object.keys(variableLabels) as (keyof SimulationVariables)[]).map((key) => <span key={key}>{key === 'guestCount' ? baselineVariables[key].toLocaleString() : key === 'daysRemaining' ? `${baselineVariables[key]} days` : money(baselineVariables[key])}</span>)}<strong>{money(baselineResult.totalExpenditure)}</strong><strong>{money(baselineResult.budgetRemaining)}</strong><b className={`badge ${baselineResult.eventReadiness}`}>{baselineResult.eventReadiness.replace('-', ' ')}</b></div>
      </div>
      <div className="changes-summary"><span className="section-kicker">WHAT CHANGED</span><div>{changedKeys.length ? changedKeys.map((key) => <span className="change-chip" key={key}>{variableLabels[key]} <b>{formatDelta(key)}</b></span>) : <span className="no-changes">The current plan matches the original baseline.</span>}</div></div>
    </section>
    <footer className="app-footer"><span>THE BUTTERFLY EFFECT</span><span>Every variable tells a story.</span><button className="text-button" onClick={reset}>Restore original scenario ↺</button></footer>
  </main>
}

export default App
