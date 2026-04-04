# Design Decisions & Rationale

> "Creative, opinionated, unexpected thinking" — This document explains **why** we built FairRoute the way we did, what alternatives we rejected, and where we made deliberate tradeoffs.

---

## 1. Fraud Engine: Why Weighted Signals, Not ML

### Decision
We use a **5-layer weighted-signal fraud engine** instead of a single ML classifier.

### Why
- **Interpretability**: Workers and regulators need to understand WHY a claim was flagged. A weighted score with per-layer breakdown (GPS, frequency, location-disruption match, velocity, behavioral) is auditable. A black-box classifier is not.
- **Cold start**: We have zero real fraud labels. Training an ML model on synthetic fraud data produces a model that detects synthetic fraud — not real fraud. A rule engine encoding domain knowledge (from insurance actuaries and gig-platform fraud research) is more honest.
- **Tunability**: Each layer's weight can be adjusted independently. When we gather real data post-launch, we can replace individual layers with ML without rebuilding the whole pipeline.

### Alternatives Rejected
| Alternative | Why Rejected |
|---|---|
| `random.uniform(0, 1)` | No signal. VC dealbreaker. Literally a coin flip deciding someone's income. |
| Single logistic regression | Can't explain individual fraud dimensions to the worker or regulator |
| Hard pass/fail rules | Too brittle. Real fraud is a spectrum — a worker 16km from zone isn't necessarily fraudulent, just suspicious |
| Graph neural network | Overkill for MVP. No social graph data. Would be synthetic-on-synthetic. |

### Layer Weights (sum to 1.0)
```
GPS Consistency:          0.25  — Most direct signal of physical presence
Claim Frequency:          0.25  — Strongest behavioral pattern indicator
Location-Disruption:      0.20  — Cross-references claim with real conditions
Velocity / Spoofing:      0.15  — Catches obvious GPS manipulation
Behavioral Patterns:      0.15  — Session timing, login-claim gaps, bot patterns
```

---

## 2. Isolation Forest: Why 20% Contamination

### Decision
We set `contamination=0.20` for the zone anomaly Isolation Forest model.

### Why
- India's gig delivery market experiences disruptions roughly **15-25% of the time** across monsoon season (June-September), festivals, and demand fluctuation cycles.
- 20% is our best estimate of the **base disruption rate** — the fraction of zone-time-windows that represent genuine anomalies (demand collapse, weather shutdown, etc.).
- Setting it lower (e.g., 5%) would make the model too conservative — it would miss genuine disruptions during monsoon weeks when disruptions are frequent.
- Setting it higher (e.g., 40%) would over-trigger, paying out when conditions are merely below-average.

### Alternatives Rejected
| Contamination | Why Rejected |
|---|---|
| 5% | Misses monsoon-season disruptions entirely. Workers would never get payouts when they need them most. |
| 10% | Reasonable for low-disruption cities (Jaipur, Indore). Too low for Mumbai/Chennai monsoon belt. |
| 30% | Would trigger on mild slowdowns that are normal weekend patterns. |
| 40%+ | Would bankrupt the insurance pool within a month. |

### Future Direction
Per-city contamination rates: Mumbai monsoon (25%), Jaipur dry season (8%). Requires 3+ months of real data per city.

---

## 3. Payout Formula: Why `lost_hours × rate × severity`

### Decision
```
payout = min(lost_hours × hourly_rate × severity_multiplier, daily_cap)
```

### Why This Formula
- **lost_hours**: Directly measures what the worker lost. Not a flat amount — a worker who lost 2 hours gets less than one who lost 8 hours. Fair.
- **hourly_rate**: Tied to plan tier. Premium workers get ₹150/hr, Basic gets ₹75/hr. This maps to their actual earning rate and premium paid.
- **severity_multiplier**: Weather severity affects how much disruption costs. Heavy rain (1.2x) vs cyclone (1.5x) — a cyclone day genuinely costs more because the entire city shuts down, not just one zone.
- **daily_cap**: Prevents moral hazard. Without a cap, workers could claim infinite hours. Cap maps to plan tier: ₹500 (Basic), ₹800 (Standard), ₹1200 (Premium).

### Alternatives Rejected
| Alternative | Why Rejected |
|---|---|
| Flat payout (₹500) | Doesn't scale with severity or hours lost. A 2-hour drizzle pays the same as an 8-hour cyclone. Unfair. |
| Percentage of average daily earnings | Requires platform earnings API integration we don't have yet. Would be ideal in Phase 3. |
| Real-time delivery tracking delta | Would require Swiggy/Zomato API access to compare actual vs expected deliveries. Not available to third parties. |
| Hourly bid system | Too complex for target users. Ramesh on a budget Android in rain doesn't want to "bid" on his payout. |

---

## 4. UX: Why Rain Mode, Not Just Dark Mode

### Decision
The app dynamically switches to a **blue-tinted dark theme** when weather risk exceeds 40% in the worker's zone.

### Why
- Our users are delivery workers **on budget Android phones in rain**. Standard high-contrast dark mode with pure black (#0a0a0a) and white text causes harsh glare on wet screens.
- Blue-tinted dark mode reduces perceived brightness while maintaining readability in low-light rainy conditions.
- It's also a **status signal**: when the app looks different, the worker knows "something is happening with weather" before they even read the data.

### Alternatives Rejected
| Alternative | Why Rejected |
|---|---|
| Standard dark mode only | Already implemented as default. Doesn't communicate weather state. |
| Light mode for rain | Higher battery drain on OLED. Glare on wet screens. Opposite of what budget Android users need. |
| Manual toggle | Workers in rain won't hunt for a theme toggle. It should be automatic. |
| Full dark + orange alerts | Orange on black is readable but doesn't create the ambient awareness that blue-tint provides. |

---

## 5. Touch Targets: Why 48px Minimum

### Decision
All interactive elements have a minimum touch target of **48×48px** (Material Design recommendation for mobile).

### Why
- Target users use budget Android phones (₹8,000-12,000 range) with **lower touch precision** than flagship devices.
- They're interacting while **wet-fingered** (rain) or **gloved** (cold weather).
- They're often on **moving two-wheelers** during brief stops.
- Google's own research shows touch error rate drops by 40% going from 36px to 48px targets.

---

## 6. Offline-First: Why Cache-Then-Network

### Decision
Dashboard data uses a **cache-first** pattern: show cached data immediately, then refresh from network.

### Why
- Delivery workers are frequently in **network dead zones** (basements, underpasses, rural roads between zones).
- Indian mobile networks (Jio, Airtel) on budget plans drop to 2G speeds regularly.
- A blank loading screen for 10 seconds while fetching weather data is unacceptable for someone trying to check if they should file a claim.
- **Stale data is better than no data**: showing yesterday's weather risk as "cached" is more useful than a spinner.

---

## 7. Zero-Touch Auto-Claim: Why Automatic, Not Manual

### Decision
When a trigger is detected, we **automatically file the claim** with no user action.

### Why
- Parametric insurance's entire value proposition is **no paperwork, no manual claims**. If the worker has to tap "Claim Now", we're just traditional insurance with a prettier UI.
- The fraud engine runs in real-time. If the 5-layer check passes, there's no reason to wait for human action.
- Workers in disruption situations (heavy rain, flooding) may not have time or inclination to open the app and tap buttons.

### Safeguard
The fraud engine prevents abuse. Auto-claims with high fraud scores go to `under_review` status, not automatic approval.
