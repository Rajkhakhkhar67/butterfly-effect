# The Butterfly Effect — project handover

## Purpose

An interactive event-planning scenario tool for demonstrating how changing a few inputs can affect estimated spend, budget balance, preparation pressure, schedule risk, and readiness. It is a deterministic, simplified teaching model, not a scientific or predictive causal model.

## Implemented features

- Six bounded scenario inputs with range and numeric controls.
- Derived catering and total expenditure, remaining budget/deficit, preparation pressure, schedule risk, and readiness.
- Four scenario presets and reset to the fixed original baseline.
- Baseline/current comparison with per-input deltas.
- Selectable, keyboard-operable cause-and-effect graph with downstream highlights.
- Responsive dark interface; no backend or API key is needed.

## Confirmed technology

- React 19, TypeScript 7, Vite 8.
- Oxlint for linting; Node's built-in test runner for simulation tests.

## Changes made in the final development pass

- Added finite/non-negative input checks to the simulation calculations and finite-value checks to variable updates.
- Ignored non-finite UI edits and made the budget gauge handle a zero budget.
- Labeled the model as simplified and illustrative.
- Removed the remote Google Fonts import so the app does not require a third-party font request to render.
- Added six calculation tests in `tests/simulation.test.mjs` and the `test:simulation` npm script.
- Refined visible keyboard focus styles.

The dashboard, presets, graph interactions, and baseline comparison were present before this pass. The items above are the changes specifically made in this pass.

## Verification record

| Check | Expected | Observed | Status |
| --- | --- | --- | --- |
| Baseline calculation (prior task) | Spend ₹355,000; remaining ₹145,000 | Browser showed those values | Pass, prior task |
| Double guests (prior task) | 150 → 300; spend ₹475,000 | Browser showed 300 and ₹475,000 | Pass, prior task |
| Expensive venue (prior task) | Venue rises ₹150,000; budget deficit shown | Browser showed ₹5,000 deficit | Pass, prior task |
| Reduced prep time (this task) | 45 → 15 days; pressure/risk/readiness update | Browser showed 15 days, 83% pressure, 62% risk, at-risk | Pass |
| Reset (this task) | Restore baseline values and comparison | Browser returned to 45 days and matching baseline | Pass |
| Budget max slider (prior task) | Update input and dependent balance | Browser showed ₹5,000,000 budget and ₹4,645,000 remaining | Pass, prior task |
| Build / lint / new Node tests (this task) | Build, lint, and all six tests pass | Command launcher could not start because C: reported no free space; no result observed | Not verified |
| Browser console (this task) | No runtime errors | Console inspection interface not available in this browser control | Not verified |
| Production preview | Production bundle serves and renders | Not tested in this pass | Not verified |

## Deployment readiness

The app is a frontend-only Vite project and its existing build output consists of `dist/index.html` and hashed CSS/JS assets, suitable for static hosting. No application API calls or localhost URLs were found in the app source. The UI no longer relies on a remote font stylesheet. Build success after the final-pass source changes has not been confirmed, so deployment should wait until checks can run.

Simple route: build locally with `npm run build`, then deploy the generated `dist` directory to a static host such as Netlify Drop or Cloudflare Pages. A host account is generally needed to receive and manage a public URL. Do not upload the project or publish it until the build is confirmed and you choose/authorize a host. No deployment has been performed.

## Run locally

```powershell
cd D:\butterfly-effect
npm run dev
```

The current preview address is `http://127.0.0.1:5173/`.

## Remaining checks

1. Resolve free space on C: sufficiently for the local command launcher/runtime.
2. Run `npm run build`, `npm run lint`, and `npm run test:simulation`.
3. Test both preset cases not retested in this pass (double guests and venue), numeric input bounds, graph keyboard selection, and a zero-budget UI case.
4. Inspect browser console and production preview.
5. Select a static host and deploy the verified `dist` folder to obtain a public URL.
