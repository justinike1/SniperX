# IKE Automotive Group — Local Brokerage Prototype (Demo Only)

Reviewed and implemented: October 25, 2026.

This prototype is a **local, reversible demonstration** for an automotive brokerage operating model.
It does **not** create real customer records, dealer outreach, payments, credit applications, signatures, or vehicle transactions.

## What this demo includes

- Public-facing **website + marketing** layer with:
  - conversion-oriented hero copy and package framing
  - local lead capture form (demo only, no outbound)
  - lead source + package-interest tracking
  - optional “create case on lead capture” workflow
- Marketing workspace with:
  - editable funnel assumptions
  - CPL/CAC/book/close metrics
  - gross vs refunds vs net collections
  - channel execution board and message stack
- Lease Desk workspace with:
  - residual, money factor, APR-estimate, cap-cost, and payment calculations
  - editable credit-tier matrix (`min score`, `buy-rate MF`, `residual adjustment`)
  - tier scenario comparison for payment sensitivity
  - lender profile + program presets (term/mileage/residual/acquisition + tier buy-rate grids)
  - print-ready desk sheet export for internal quote walkthroughs
  - explicit warning flags for high MF / low residual / risky cap reduction assumptions
- Customer-facing demo page with:
  - persistent pre-launch/demo notice
  - brokerage service explanation and exclusions
  - intake form (fictional data only)
  - FAQ for fee timing, refunds/cancellation uncertainty, disclosure model, and who sells the vehicle
- Internal case workspace with:
  - searchable/filterable case list
  - case detail editing (owner, status, next action, due date, notes)
  - activity history
  - vehicle candidate and fictional quote entry
  - quote comparison with incompleteness/comparability flags
  - separate fee fields (`proposed`, `due`, `collected`, `refunds`)
- Economics workspace with editable assumptions and scenario math
- Readiness + evidence workspace using explicit status taxonomy:
  - `Proposed`
  - `Unverified`
  - `In progress with evidence`
  - `Verified`
  - `Blocked`
  - `Not applicable`
- Metrics/dependency planning section with denominator/timing definitions

## Demo boundaries

- Local browser storage only (`localStorage`)
- Resettable state from the UI
- No external API calls
- No outbound email/SMS or dealer contact automation
- No legal or regulatory approval implied by checklist state

## Run locally

From repository root:

```bash
python3 -m http.server 4173
```

Open:

- `http://127.0.0.1:4173/ike-automotive-brokerage-demo/`

## Test the model logic

```bash
node --test ike-automotive-brokerage-demo/tests/*.test.mjs
```

## Internal planning note

The original "masterpiece blueprint" remains planning input only.
This prototype intentionally distinguishes:

- historical evidence from current verification status
- proposals from confirmed operating authority
- engineering/demo completion from launch authorization
