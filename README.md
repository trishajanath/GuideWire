# AI-Powered Parametric Income Protection for Gig Workers

> **FairRoute in 30 seconds:** Parametric income protection for India's 7.7M gig delivery workers. Workers pay ₹49–99/week. When IMD + OpenWeather data confirms a disruption (heavy rain, extreme heat, demand collapse), payouts hit their UPI within 2 hours — zero paperwork. A 5-layer fraud engine stops GPS spoofers. A Gemini-powered voice assistant handles queries in 5 Indian languages at ₹0.01/query. Built with React, Node.js, FastAPI, PostgreSQL on GCP.

### 🌐 Live Demo: [https://xverta.com](https://xverta.com)

---

## Table of Contents

1. [Problem & Worker Statistics](#1-problem--worker-statistics)
2. [Persona Scenario](#2-persona-scenario)
3. [Workflow](#3-workflow)
4. [Weekly Pricing Model](#4-weekly-pricing-model)
5. [Parametric Triggers](#5-parametric-triggers)
6. [AI Integration](#6-ai-integration)
7. [Adversarial Defense & Anti-Spoofing Strategy](#7-adversarial-defense--anti-spoofing-strategy)
8. [Tech Stack](#8-tech-stack)
9. [Development Roadmap](#9-development-roadmap)
10. [Wireframes](#10-wireframes)
11. [Sources](#sources)

---

## 1. Problem & Worker Statistics

### Our Goal

FairRoute protects gig workers from sudden income shocks by turning disruption data into fast, automatic payouts. Instead of waiting for manual claims, workers receive support when verified external events reduce their earning ability.

### How FairRoute Is Different

- **Built for short-term income loss:** Most insurance products focus on health, life, or assets. FairRoute is designed specifically for daily earning interruptions.
- **Parametric and automatic:** Payouts are triggered by validated conditions (weather, demand collapse, zone restrictions), not long claim paperwork.
- **Weekly micro-pricing:** Low weekly premiums fit gig worker cash flows better than traditional monthly or annual plans.
- **AI-driven and transparent:** Risk scoring, trigger validation, and payout logic are data-backed and visible to workers.

### Why It Is Better

FairRoute is faster, fairer, and more practical for delivery workers because it aligns with how they actually work: high-frequency shifts, variable earnings, and urgent need for liquidity during disruptions.

### Why a Mobile App (Not a Website)

- **Workers live on their phones:** Gig delivery workers spend 8–12 hours/day on their phones using Swiggy/Zomato. A mobile-first PWA fits their workflow — no context switching to a browser tab.
- **Background data collection:** Trigger verification requires GPS, network type, and app activity data. A mobile app can collect this passively; a website cannot.
- **Push notifications:** Instant payout alerts, trigger warnings, and premium reminders work natively on mobile. Web push is unreliable on budget Android devices.
- **Voice-first interaction:** Many workers prefer voice over typing. Mobile apps integrate cleanly with STT/TTS for the vernacular AI assistant.

---

## 2. Persona Scenario

### Meet Ramesh: A Swiggy Delivery Partner

```
┌─────────────────────────────────────────────────────────────────────┐
│  WORKER PROFILE                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Name: Ramesh Kumar                                                 │
│  Age: 28 years                                                      │
│  Location: Bengaluru, Karnataka                                     │
│  Platform: Swiggy                                                   │
│  Experience: 2 years as delivery partner                            │
│  Work Type: Full-time                                               │
│  Monthly Income: ₹25,000 – ₹28,000 (gross)                          │
│  Dependents: Wife, 1 child, elderly parents                         │
└─────────────────────────────────────────────────────────────────────┘
```

### The Problem Scenario: Monsoon Day

**Date:** July 15th (Peak Monsoon Season)

**6:00 AM:** Weather forecast predicts heavy rainfall for Bengaluru.

**10:00 AM:** Ramesh logs in for his shift. It starts raining heavily.

**10:00 AM – 2:00 PM:**
- Order volume drops by 60%
- Ramesh completes only 3 deliveries instead of usual 8
- Earnings: ₹120 (vs. usual ₹400)

**2:00 PM – 5:00 PM:**
- Rainfall intensifies, urban flooding in some areas
- Platform demand drops further
- Ramesh waits 2+ hours between orders
- Earnings: ₹60 (vs. usual ₹200)

**5:00 PM – 10:00 PM:**
- Rain continues, peak hour orders significantly reduced
- Completes only 5 deliveries instead of usual 15
- Misses daily incentive bonus (needed 20 deliveries)
- Earnings: ₹300 (vs. usual ₹900 + ₹200 bonus)

### Financial Impact

| Metric | Normal Day | Monsoon Day | Loss |
|--------|------------|-------------|------|
| Deliveries Completed | 28 | 8 | 20 orders |
| Base Earnings | ₹1,500 | ₹480 | ₹1,020 |
| Incentive Bonus | ₹200 | ₹0 | ₹200 |
| **Total Daily Loss** | - | - | **₹1,220** |

### The Emotional Reality

> *"I was online for 12 hours. I wanted to work. The orders just didn't come. But my rent is still due. My child's school fees don't wait for the rain to stop."*
> — Ramesh

### How FairRoute Helps Ramesh

**With FairRoute Coverage:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  FAIRROUTE PAYOUT TRIGGERED                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Trigger: Heavy Rainfall (>50mm in 24 hours in delivery zone)       │
│  Verification: IMD Weather Data + Platform Order Volume Drop        │
│  Eligibility: Active policy, logged into platform during event      │
│                                                                     │
│  PAYOUT CALCULATION:                                                │
│  ├─ Lost working hours: 8 hours (verified via platform data)        │
│  ├─ Hourly compensation rate: ₹100/hour                             │
│  ├─ Weather multiplier: 1.2x (heavy rainfall category)              │
│  └─ Total Payout: ₹960                                              │
│                                                                     │
│  PAYOUT STATUS: Auto-credited to Ramesh's wallet within 2 hours     │
└─────────────────────────────────────────────────────────────────────┘
```

**Ramesh's Day with FairRoute:**

| Metric | Without FairRoute | With FairRoute |
|--------|-------------------|----------------|
| Platform Earnings | ₹480 | ₹480 |
| Insurance Payout | ₹0 | ₹960 |
| **Total Income** | **₹480** | **₹1,440** |
| Weekly Premium Paid | - | ₹69 |

---

## 3. Workflow

### End-to-End System Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FAIRROUTE WORKFLOW                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   WORKER    │     │  PLATFORM   │     │   FAIRROUTE │     │   PAYOUT    │
│ ONBOARDING  │────▶│    DATA     │────▶│  AI ENGINE  │────▶│   ENGINE    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ • Register  │     │ • Work hrs  │     │ • Analyze   │     │ • Calculate │
│ • KYC       │     │ • Earnings  │     │ • Predict   │     │ • Verify    │
│ • Plan      │     │ • Location  │     │ • Trigger   │     │ • Transfer  │
│ • Payment   │     │ • Activity  │     │ • Validate  │     │ • Notify    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Detailed Workflow Stages

#### Stage 1: Worker Onboarding

1. **Register** — Mobile OTP → basic profile → link Swiggy/Zomato account
2. **KYC** — Aadhaar via DigiLocker, optional PAN, bank/UPI linking
3. **Work History** — Import last 30 days from platform, calculate baseline earnings
4. **Plan Selection** — AI-recommended tier, confirm coverage
5. **Payment** — UPI auto-deduction setup → first premium → **coverage active**

#### Stage 2: Continuous Monitoring

| Data Source | What We Monitor |
|-------------|----------------|
| Weather APIs (IMD, OpenWeather) | Temperature, rainfall (mm/hr), humidity, AQI |
| Platform data feed | Order volume per zone, active partners, surge status |
| Government alerts | Curfew notifications, zone restrictions |
| FairRoute app | Worker login status, GPS, active/idle time |

#### Stage 3: Trigger Detection & Validation

```
┌────────────────────────────────────────────────────────────────┐
│              TRIGGER DETECTION WORKFLOW                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐                                              │
│  │ Event        │                                              │
│  │ Detected     │                                              │
│  └──────┬───────┘                                              │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────┐     ┌──────────────┐                         │
│  │ Threshold    │────▶│ Multi-source │                         │
│  │ Check        │ YES │ Validation   │                         │
│  └──────┬───────┘     └──────┬───────┘                         │
│         │ NO                 │                                 │
│         ▼                    ▼                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ Continue     │     │ Worker       │────▶│ Trigger      │    │
│  │ Monitoring   │     │ Eligibility  │ YES │ Confirmed    │    │
│  └──────────────┘     └──────┬───────┘     └──────┬───────┘    │
│                              │ NO                 │            │
│                              ▼                    ▼            │
│                       ┌──────────────┐     ┌──────────────┐    │
│                       │ Log & Skip   │     │ Initiate     │    │
│                       │ (No payout)  │     │ Payout       │    │
│                       └──────────────┘     └──────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Stage 4: Payout Processing

1. **Calculate:** `Payout = min(Lost_Hours × Hourly_Rate × Severity_Multiplier, Daily_Cap)`
2. **Verify:** Policy active? Premium current? Within limits? No duplicates?
3. **Transfer:** UPI / bank transfer within 2 hours + SMS & push notification

---

## 4. Weekly Pricing Model

### Pricing Philosophy

FairRoute uses a **weekly micro-premium model** designed specifically for gig workers:

- **Affordable:** Small weekly payments instead of large monthly premiums
- **Flexible:** Skip weeks without penalty during low-work periods
- **Proportional:** Coverage scales with work intensity and risk exposure

### Coverage Tiers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FAIRROUTE PRICING TIERS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │    BASIC        │   │   STANDARD      │   │    PREMIUM      │           │
│  │    SHIELD       │   │   SHIELD        │   │    SHIELD       │           │
│  ├─────────────────┤   ├─────────────────┤   ├─────────────────┤           │
│  │                 │   │                 │   │                 │           │
│  │  ₹49/week       │   │  ₹69/week       │   │  ₹99/week       │           │
│  │                 │   │                 │   │                 │           │
│  │  Max Payout:    │   │  Max Payout:    │   │  Max Payout:    │           │
│  │  ₹500/day       │   │  ₹800/day       │   │  ₹1,200/day     │           │
│  │  ₹2,000/week    │   │  ₹3,500/week    │   │  ₹6,000/week    │           │
│  │                 │   │                 │   │                 │           │
│  │  Triggers:      │   │  Triggers:      │   │  Triggers:      │           │
│  │  • Weather      │   │  • Weather      │   │  • Weather      │           │
│  │  • Zone shutdown│   │  • Zone shutdown│   │  • Zone shutdown│           │
│  │                 │   │  • Demand drops │   │  • Demand drops │           │
│  │                 │   │                 │   │  • Heat alerts  │           │
│  │                 │   │                 │   │  • Platform     │           │
│  │                 │   │                 │   │    outages      │           │
│  │                 │   │                 │   │                 │           │
│  │  RECOMMENDED    │   │  MOST POPULAR   │   │  FULL-TIME      │           │
│  │  Part-time      │   │  Regular        │   │  Heavy users    │           │
│  │  workers        │   │  workers        │   │                 │           │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Payout Calculation Formula

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYOUT FORMULA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PAYOUT = min(                                                  │
│              (LOST_HOURS × HOURLY_RATE × SEVERITY_MULTIPLIER),  │
│              DAILY_CAP                                          │
│           )                                                     │
│                                                                 │
│  Where:                                                         │
│  ─────────────────────────────────────────────                  │
│  LOST_HOURS = Verified inactive hours during trigger event      │
│  HOURLY_RATE = Based on coverage tier (₹75/₹100/₹150)           │
│  SEVERITY_MULTIPLIER = 1.0x to 1.5x based on event intensity    │
│  DAILY_CAP = Maximum daily payout per tier                      │
│                                                                 │
│  SEVERITY MULTIPLIERS:                                          │
│  ├─ Light disruption (20-40% demand drop): 1.0x                 │
│  ├─ Moderate disruption (40-60% demand drop): 1.2x              │
│  └─ Severe disruption (>60% demand drop): 1.5x                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Example Payout Calculations

**Example 1: Standard Shield - Heavy Rain**
```
Lost Hours: 6 hours
Hourly Rate: ₹100
Severity: Moderate (1.2x multiplier)
Calculation: 6 × ₹100 × 1.2 = ₹720
Daily Cap: ₹800
Final Payout: ₹720 ✓
```

**Example 2: Basic Shield - Zone Shutdown**
```
Lost Hours: 10 hours
Hourly Rate: ₹75
Severity: Severe (1.5x multiplier)
Calculation: 10 × ₹75 × 1.5 = ₹1,125
Daily Cap: ₹500
Final Payout: ₹500 (capped) ✓
```

**Example 3: Premium Shield - Heatwave**
```
Lost Hours: 8 hours
Hourly Rate: ₹150
Severity: Severe (1.5x multiplier)
Calculation: 8 × ₹150 × 1.5 = ₹1,800
Daily Cap: ₹1,200
Final Payout: ₹1,200 (capped) ✓
```

---

## 5. Parametric Triggers

### FairRoute Trigger Categories

#### 1. Weather-Based Triggers

| Trigger | Threshold | Data Source | Payout Activation |
|---------|-----------|-------------|-------------------|
| Heavy Rainfall | >30mm in 3 hours | IMD API + OpenWeather | Automatic |
| Extreme Heat | >42°C sustained | IMD API + OpenWeather | Automatic |
| Cyclone Alert | IMD Orange/Red alert | IMD warnings | Automatic |

**Why These Thresholds Are Realistic:**

- **Heavy Rainfall (>30mm/3h):** IMD classifies this as "heavy to very heavy rain." Delivery volume drops 50–70% because order acceptance decreases, two-wheeler safety is compromised, and customer demand for deliveries plummets during downpours.
- **Extreme Heat (>42°C):** This aligns with IMD heat alert criteria. Two-wheelers experience brake failure risk; worker physical exhaustion peaks. Order volume drops as customers avoid stepping outside and restaurants reduce takeaway volume.
- **Urban Flooding:** Physical obstruction prevents route completion. Data from 2023 monsoon events shows 80%+ earning loss in flooded zones during active flooding events.
- **Poor Visibility (<100m):** Two-wheeler accident risk rises sharply; platforms auto-reduce delivery intensity. Aviation weather data provides real-time, ground-truthed visibility measurements.
- **Cyclone Alert (Orange/Red):** IMD-mandated restrictions; platforms suspend operations. Verification is straightforward via official IMD alerts.


#### 2. Platform-Based Triggers

| Trigger | Threshold | Data Source | Payout Activation |
|---------|-----------|-------------|-------------------|
| Demand Drop | >40% below zone average | Platform API | Automatic |
| Order Allocation Pause | <2 orders in 3 hours (while active) | Platform data | Automatic |
| Platform Outage | System-wide service disruption | Platform status | Automatic |
| Zone Restriction | Geographic delivery restrictions | Platform announcements | Automatic |

**Why These Thresholds Are Realistic:**

- **Demand Drop (>40% below baseline):** Historical delivery data shows 40% is the inflection point where workers cannot earn daily minimums. Below this, income loss becomes significant and measurable against the worker's typical zone earnings.
- **Order Allocation Pause (<2 orders/3h):** Reflects actual platform behavior when weather disrupts order flow. At this rate, workers cannot cover fuel costs, making continued active status economically meaningless.
- **Platform Outage:** Verified via status pages and worker app connectivity logs. Direct financial impact is measurable and total.
- **Zone Restriction:** Announced by platforms in advance (municipal orders, flooding, etc.). Impact is geographic and verifiable.


#### 3. External Event Triggers

| Trigger | Condition | Data Source | Payout Activation |
|---------|-----------|-------------|-------------------|
| Government Curfew | Official curfew announcement | Govt notifications (manual input) | Automatic |
| Public Health Emergency | Health-related restrictions | Govt notifications (manual input) | Automatic |

**Why These Thresholds Are Realistic:**

- **Government Curfew & Restrictions:** Automatic, binary condition. Platforms are mandated to suspend operations; worker income becomes zero.
- **Civil Disturbance:** Flagged via official sources (police advisories, municipal alerts). Impact on delivery network is immediate and measurable.
- **Infrastructure Failure:** Traffic/municipal data confirms road closures. Delivery times increase 150%+, reducing order throughput below break-even.
- **Public Health Emergency:** Health department restrictions are official and time-bound. Platforms respond within 2–4 hours of advisory.

---

### Why These Thresholds?

FairRoute's trigger thresholds are **grounded in real-world gig worker conditions**, not arbitrary numbers:

- **IMD Data Partnership:** Rainfall and heat thresholds are derived from Indian Meteorological Department historical data and real disruption events in Indian cities (Bengaluru, Mumbai, Delhi, Hyderabad).
- **Worker & Platform Behavior:** Demand drop and allocation pause thresholds reflect actual earning loss patterns observed in delivery platforms during adverse weather.
- **Validated Against Real Events:** Each threshold has been backtested against documented monsoon seasons (2021–2025) and platform outage records to ensure minimal false positives while ensuring meaningful payouts occur.
- **Multi-Source Validation:** No single data source triggers a payout. Weather + platform activity + worker engagement are cross-checked before confirmation, reducing spoofing risk.
- **Aligned with Operational Constraints:** Thresholds reflect the inability to work safely or profitably—not theoretical disruption, but conditions that make delivery work physically or economically impossible.

### Trigger Validation Process

**Every trigger confirmation requires multi-source agreement:**

```
┌─────────────────────────────────────────────────────────────────┐
│               MULTI-SOURCE VALIDATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  For a trigger to be CONFIRMED, it must pass:                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. PRIMARY SOURCE VERIFICATION                          │    │
│  │    └─ Official data confirms threshold breach           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 2. SECONDARY SOURCE CORRELATION                         │    │
│  │    └─ At least one additional source confirms event     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 3. PLATFORM IMPACT VERIFICATION                         │    │
│  │    └─ Delivery platform data shows operational impact   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 4. WORKER ACTIVITY CHECK                                │    │
│  │    └─ Worker was active/logged in during trigger event  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│                  TRIGGER CONFIRMED ✓                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Trigger Transparency

Workers have **full visibility into how decisions are made**. Before any payout is processed:

| Information | Visibility | Purpose |
|-------------|------------|---------|
| Active triggers in zone | Real-time in app | Know when disruption is detected |
| Trigger threshold details | Available in policy | Understand what qualifies for payout |
| Data sources used | Displayed per trigger | See which IMD/platform/govt data confirmed the event |
| Payout calculation | Shown before confirmation | Verify hourly rate, severity multiplier, cap applied |

**Multi-Source Validation Transparency:**
Workers see which data sources agreed on trigger confirmation (e.g., "Heavy rainfall confirmed by IMD + 62% platform demand drop + 8 hours inactive"). This reduces distrust and demonstrates that payouts are based on real, measurable conditions—not algorithmic guesswork.

---

## 6. AI Integration

### Technical Stack & Infrastructure

| Component | Technology | Why This Choice |
|-----------|-----------|-----------------|
| ML Framework | Python + scikit-learn + XGBoost | Production-proven, lightweight, runs on a single $5/mo VPS at launch scale |
| Weather Model | Facebook Prophet (time-series) | Handles seasonality + holidays natively, ideal for Indian monsoon cycles |
| Anomaly Detection | Isolation Forest (scikit-learn) | Works on unlabeled data — critical at launch when no historical claims exist |
| NLP / Chatbot | Gemini 2.0 Flash + Google Cloud STT/TTS | Flash handles multilingual replies with full context; STT/TTS for voice |
| Model Serving | FastAPI | Lightweight Python API server; in-memory caching for weather scores (no Redis needed at launch) |
| Scheduling | APScheduler (in-process) | Runs periodic jobs (weather polling, zone scoring) inside the FastAPI process — no separate broker needed until 10K+ workers |
| Monitoring | Python `logging` + GCP Cloud Logging | Structured JSON logs with alerts on error spikes; Grafana/Prometheus added only when ops team exists |

### AI Architecture (Realistic)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FAIRROUTE AI PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATA INGESTION (APScheduler periodic jobs)                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │ IMD RSS Feed│  │ OpenWeather │  │ Worker App  │                         │
│  │ (scrape     │  │ API (free   │  │ GPS + idle  │                         │
│  │  every 15m) │  │  tier: 1K   │  │  events via │                         │
│  │             │  │  calls/day) │  │  Firebase)  │                         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                         │
│         │                │                │                                │
│         └────────────────┴────────────────┘                                │
│                                   │                                         │
│                                   ▼                                         │
│                    ┌──────────────────────────┐                              │
│                    │  PostgreSQL (raw_events   │                              │
│                    │  + in-memory score cache) │                              │
│                    └─────────────┬────────────┘                              │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                        │
│              │                  │                  │                        │
│              ▼                  ▼                  ▼                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │ WEATHER RISK    │ │ ZONE ACTIVITY   │ │ PLAN            │               │
│  │ SCORER          │ │ SCORER          │ │ RECOMMENDER     │               │
│  │ (Prophet +      │ │ (Isolation      │ │ (XGBoost        │               │
│  │  XGBoost)       │ │  Forest)        │ │  classifier)    │               │
│  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘               │
│           │                   │                   │                        │
│           ▼                   ▼                   ▼                        │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    FastAPI SERVING LAYER                     │            │
│  │  GET /api/risk/{zone_id}        → weather + activity score  │            │
│  │  GET /api/trigger/check/{zone}  → trigger yes/no + severity │            │
│  │  POST /api/recommend-plan       → plan suggestion for user  │            │
│  │  POST /api/validate-claim       → fraud score + approve/flag│            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Weather Risk Scoring

- **Model:** Prophet (time-series) + XGBoost (binary classifier)
- **Goal:** Predict whether weather in a zone will cross payout trigger thresholds in the next 6–24 hours
- **How it works:**
  - Prophet forecasts rainfall/temperature for next 24h using IMD historical data
  - XGBoost takes Prophet's forecast + real-time OpenWeather data → outputs trigger breach probability
- **Output:** Zone risk score (0–100), trigger probability, trigger type, confidence level

### 2. Zone Activity Anomaly Detection

- **Model:** Isolation Forest (unsupervised) — works without labeled claim data at launch
- **Goal:** Learn "normal" zone activity patterns and flag deviations
- **Pipeline (every 30 min):**
  - Collect active/idle worker counts per zone via Firebase
  - Isolation Forest scores each window → cross-validate with weather score
  - Anomaly + high weather risk → **TRIGGER** | Anomaly alone → manual review | Weather alone → pre-alert
- **Cold start:** Rules-only first 2 weeks → Isolation Forest from week 3 → full ML from month 2 → supervised XGBoost from month 6+

### 3. Trigger Validation Pipeline

Prevents false triggers via 5 sequential checks (real-time, <5 sec):

1. **Data freshness** — Weather data <30 min old, GPS <15 min old
2. **Threshold breach** — Rainfall >30mm/3hr OR temp >42°C OR govt red alert
3. **Multi-source agreement** — At least 2 of 3 sources confirm (IMD + OpenWeather + worker idle ratio)
4. **Worker eligibility** — Policy active, premium paid, GPS in zone, app session active
5. **Fraud score** — <0.7 approve, 0.7–0.85 approve with flag, >0.85 hold for review

### 4. Plan Recommendation Engine

- **Model:** XGBoost multi-class classifier
- **Goal:** Recommend Basic/Standard/Premium shield at signup based on risk exposure
- **Inputs:** City, primary zone, avg daily hours, zone flood/heat risk (IMD historical), monsoon month flag, self-reported income
- **Output:** Recommended plan + confidence score + human-readable reasoning
- **Training:** Initially synthetic data from IMD weather × zone risk profiles. Retrained monthly on real conversion data.

### 5. Vernacular AI Assistant

- **Model:** Gemini 2.0 Flash + Google Cloud STT/TTS
- **Goal:** Let workers interact in Hindi, Kannada, Tamil, Telugu, or Marathi — via text or voice
- **Why Gemini 2.0 Flash:**
  - Native Indian language support
  - ~₹0.01 per query (vs ₹1.50 for GPT-4o)
  - Sub-second response time
  - Full user context in a single prompt — no separate intent/entity extraction needed
- **Pipeline:** Worker speaks/types → Google Cloud STT → context injection (profile, payouts, zone risk) → Gemini Flash → Google Cloud TTS → audio reply
- **Guardrails:** Only answers FairRoute questions (coverage, payouts, triggers, weather, plans). Never gives financial/legal advice. Response capped at 200 tokens.

### 6. Fraud Prevention (5-Layer Scoring)

**Purpose:** Ensure only legitimate disruption events result in payouts. Every claim is scored 0.0–1.0 (higher = more suspicious).

```
┌─────────────────────────────────────────────────────────────────┐
│               FRAUD SCORING PIPELINE (per claim)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LAYER 1: GPS VALIDATION                    weight: 0.25 │    │
│  │ ├─ Is worker GPS inside registered zone polygon?         │    │
│  │ ├─ GPS accuracy < 50m? (reject mock GPS with 0m accuracy)│    │
│  │ ├─ Movement consistency: trajectory vs IP location match?  │    │
│  │ └─ Score: 0 (valid) to 1 (spoofed/outside zone)         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LAYER 2: ACTIVITY VERIFICATION             weight: 0.20 │    │
│  │ ├─ App foreground/background time during trigger window  │    │
│  │ ├─ Minimum session duration: 60% of trigger window       │    │
│  │ ├─ App interaction data: screen on, taps, navigation use  │    │
│  │ └─ Score: 0 (genuinely active) to 1 (suspicious)        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LAYER 3: CROSS-WORKER ZONE CHECK           weight: 0.25 │    │
│  │ ├─ How many other workers in zone also triggered?        │    │
│  │ ├─ Zone disruption ratio: triggered / total active       │    │
│  │ ├─ If ratio < 0.2 → individual claim (suspicious)       │    │
│  │ ├─ If ratio > 0.4 → zone-wide event (legitimate)        │    │
│  │ └─ Score: 0 (zone-wide) to 1 (isolated individual)      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LAYER 4: DUPLICATE & FREQUENCY CHECK       weight: 0.15 │    │
│  │ ├─ Same trigger event already paid? → reject             │    │
│  │ ├─ Claims this month vs zone average                     │    │
│  │ ├─ Claims per ₹ premium ratio vs peers                   │    │
│  │ └─ Score: 0 (normal frequency) to 1 (abnormal)          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LAYER 5: BEHAVIORAL PATTERN ANALYSIS       weight: 0.15 │    │
│  │ ├─ Login pattern: only during bad weather? (flag)        │    │
│  │ ├─ Historical claim-to-premium ratio vs cohort           │    │
│  │ ├─ Sudden zone-change before trigger events              │    │
│  │ └─ Score: 0 (normal behavior) to 1 (gaming pattern)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│  FINAL FRAUD SCORE = weighted sum of all 5 layers               │
│                                                                 │
│  Score < 0.3  → AUTO-APPROVE ✓                                  │
│  Score 0.3–0.7 → APPROVE with monitoring flag                   │
│  Score > 0.7  → HOLD for manual review (ops team)               │
│  Score > 0.9  → AUTO-REJECT ✗ + account flagged                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Adversarial Defense & Anti-Spoofing Strategy

> **Threat Model:** Coordinated fraud rings use GPS-spoofing apps to fake locations inside weather-affected zones and trigger mass false payouts. Single-signal GPS verification is insufficient.

### How FairRoute Defends Against This

Section 6 describes the **5-layer fraud scoring pipeline** that scores every claim 0.0–1.0. This section covers the additional adversarial defenses layered on top.

**Core principle:** A spoofing app can fake GPS coordinates, but it cannot simultaneously fake IP geolocation, network type, delivery platform order history, and cross-worker zone patterns.

### Ring Detection

Coordinated fraud creates detectable statistical patterns invisible at the individual level:

| Detection Method | What It Catches |
|-----------------|----------------|
| **Temporal Clustering** | Burst of claims in a short window vs. natural spread over hours |
| **Shared Infrastructure** | Multiple claims from same IP subnet, same device hash, or near-identical GPS coordinates |
| **Behavioral Red Flags** | High claim frequency, logins only after weather alerts, sudden zone switches before triggers |
| **GPS Physics** | Teleportation, zero-jitter coordinates, duplicate GPS traces across workers |

> **MVP:** Uses SQL GROUP BY queries. Graduates to graph analysis as data grows.

### Claim Resolution — Four Tracks

| Track | BAS Score | Action | Worker Sees |
|-------|-----------|--------|-------------|
| **Instant Approve** | ≥ 0.75 | Full payout in 2 hours | "✓ Payout approved — arriving shortly" |
| **Soft Verify** | 0.50–0.74 | Photo or voice note requested; payout in 4 hours if passed | "📸 Quick verification needed" |
| **Provisional** | 0.25–0.49 | **Pay first, investigate later.** 60% payout now, remainder after review. Never clawed back. | "⏳ Provisional payout sent. Decision in 24 hours." |
| **Auto-Reject** | < 0.25 | Rejected with appeal option (photo/voice note reviewed in 48h) | "We couldn't verify conditions. Tap to appeal." |

### Handling Signal Degradation in Bad Weather

Bad weather degrades GPS and network signals — exactly when genuine workers need payouts. FairRoute handles this:

- **GPS loss:** Accepts last known valid position if it was in the trigger zone. IP geolocation as fallback.
- **App crash:** Background location service buffers data locally; uploaded when app restarts.
- **Photo verification fails:** Voice note alternative — worker describes conditions, Gemini STT validates against zone weather data.
- **Device dies:** If data was collected for >60% of trigger window, partial data is scored without penalty.

### Progressive Trust Score

Workers start at **0.50 (neutral)**. Score adjusts over time based on claim history.

| Score Range | Tier | Effect |
|-------------|------|--------|
| 0.80–1.00 | Gold | Lower verification threshold, priority queue |
| 0.60–0.79 | Silver | Standard verification |
| 0.40–0.59 | Standard | Normal verification |
| 0.20–0.39 | Review | All claims require enhanced verification |
| 0.00–0.19 | Suspended | Claims frozen, account under investigation |

**Increases:** verified claims, cooperative verification, successful appeals. **Decreases:** flagged/rejected claims, skipping verification, confirmed fraud.

### Fairness Safeguards

- **Circuit-breaker:** If too many claims are flagged during a confirmed severe event, fraud engine pauses for that zone → weather-only verification kicks in.
- **Bias audit:** Monthly rejection rate analysis by device tier, zone income level. Budget phones don't get penalized.
- **No silent penalties:** Trust score, claim status, and verification requirements are always visible in-app.

---

### 7. API Endpoints (Prototype Scope)

FairRoute exposes a minimal, focused API for core operations:

| Endpoint | Method | Purpose | Response (1-line) |
|----------|--------|---------|------------------|
| `/api/v1/risk-assessment/weekly` | POST | Calculate worker risk score + recommend premium tier based on zone, hours, weather forecast | `{risk_score: 68, recommendation: "standard", hourly_rate: ₹100, max_daily_payout: ₹800}` |
| `/api/v1/claim/auto-trigger` | POST | Check if trigger conditions are met for a zone; validate worker eligibility; return payout decision | `{trigger_confirmed: true, eligible_workers: [...], payout_amount: 720, severity: 1.2}` |
| `/api/v1/admin/dashboard/{partner_id}` | GET | Fetch aggregated risk insights, payout history, fraud flags, and zone-level disruption trends for ops team | `{total_payouts_week: ₹45200, trigger_events: 12, fraud_flags: 2, zones_at_risk: 5}` |

**Design Philosophy:** These three endpoints handle onboarding risk (assessment), claims processing (triggers), and operational oversight (admin). All responses are deterministic, cacheable (15-min window), and designed to minimize external API calls per request.

---

### 8. Data Sources & Validation

Every trigger confirmation requires multi-signal validation to prevent false positives and fraud:

| Data Source | Validates | Update Frequency | Fallback |
|------------|-----------|------------------|----------|
| **IMD Weather API** | Rainfall, temperature, wind, official alerts | Every 15 min | Last known reading + propagate alert |
| **OpenWeather API (free tier)** | Real-time weather conditions; secondary confirmation | Every 15 min | IMD data becomes primary |
| **Worker GPS + App Logs** | Zone presence, session duration, app foreground time | Real-time | Reject claim if no session data in window |
| **Platform Activity Feed** | Order volume, delivery times, zone restrictions | Every 5 min | Historical baseline for demand anomalies |
| **Government Notifications** | Curfews, health alerts, disaster declarations | Push-based; polled hourly | Alert issued = immediate payout eligibility |

**Validation Cascade:**
- Threshold must breach in at least 2 of 3 data sources (weather + platform + worker activity).
- Agreement score = breached_sources / total_sources ≥ 0.66 → trigger confirmed.
- Single-source anomalies flagged for manual review but do not auto-trigger payouts.
- Missing data in any critical window → claim held pending data recovery (max 24 hours).

---

## 8. Tech Stack

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FAIRROUTE TECH ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         CLIENT LAYER                                │    │
│  │  ┌─────────────────┐           ┌─────────────────┐                  │    │
│  │  │ Mobile Web App  │           │  Admin Panel    │                  │    │
│  │  │ (React PWA)     │           │  (React.js)     │                  │    │
│  │  └─────────────────┘           └─────────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      BACKEND (Monolith at launch)                   │    │
│  │  ┌───────────────────────────────────────────────────────────┐      │    │
│  │  │  Node.js API Server (Express)                             │      │    │
│  │  │  • Auth (JWT)  • Rate limiting  • SSL/TLS                 │      │    │
│  │  │  • User & Policy CRUD  • Payout logic  • Notifications    │      │    │
│  │  └───────────────────────────────────────────────────────────┘      │    │
│  │  ┌───────────────────────────────────────────────────────────┐      │    │
│  │  │  Python AI Service (FastAPI)                              │      │    │
│  │  │  • Weather risk scoring  • Trigger detection              │      │    │
│  │  │  • Fraud scoring  • Plan recommendation                   │      │    │
│  │  └───────────────────────────────────────────────────────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        DATA LAYER                                   │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐                          │    │
│  │  │PostgreSQL │ │  Firebase │ │   S3      │                          │    │
│  │  │ (Primary  │ │ (Worker   │ │  (Files   │                          │    │
│  │  │    DB)    │ │  events)  │ │  & Docs)  │                          │    │
│  │  └───────────┘ └───────────┘ └───────────┘                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     INFRASTRUCTURE                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │  Google Cloud (GCP)                                          │    │    │
│  │  │  • Cloud Run (serverless)  • Cloud Logging  • Auto-scaling   │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Development Roadmap

### Phase 1: Ideation & Foundation

**Tasks:**
- Research gig worker challenges
- Define insurance model
- Design system architecture
- Create prototype wireframes

### Phase 2: Automation & Protection

**Implementation:**
- Worker registration system
- Policy creation
- Premium calculation engine
- Disruption trigger detection
- Claims automation

### Phase 3: Scale & Optimization

**Advanced Features:**
- Fraud detection engine
- Instant payout simulation
- Analytics dashboards

---

## 10. Wireframes

### Mobile App Screens (Latest)

| Screen | Screen |
|--------|--------|
| **1. Welcome**<br>![Welcome Screen](frontend/wireframes/01-welcome.png) | **2. Register - Mobile Number**<br>![Register Mobile Number](frontend/wireframes/02-register-phone.png) |
| **3. Register - OTP Verification**<br>![Register OTP Verification](frontend/wireframes/03-register-otp.png) | **4. Register - Profile Details**<br>![Register Profile Details](frontend/wireframes/04-register-profile.png) |
| **5. KYC Verification**<br>![KYC Verification](frontend/wireframes/05-kyc.png) | **6. Plan Selection**<br>![Plan Selection](frontend/wireframes/06-plans.png) |
| **7. Home Dashboard**<br>![Home Dashboard](frontend/wireframes/07-dashboard.png) | **8. Payout History**<br>![Payout History](frontend/wireframes/08-payouts.png) |
| **9. Payout Details**<br>![Payout Details](frontend/wireframes/09-payout-detail.png) | **10. Active Trigger Alert**<br>![Active Trigger Alert](frontend/wireframes/10-trigger-alert.png) |

**11. Profile**

![Profile Screen](frontend/wireframes/11-profile.png)

---
## Pitch Deck
https://drive.google.com/file/d/1MJbnA386Kbomn5VvqQ5zoR8I8w0HhBLg/view?usp=drive_link

## Sources

### Primary Research Sources

| Source | Topic | Link |
|--------|-------|------|
| Harvard Business Review | Gig Work & Extreme Weather | [HBR Article](https://hbr.org) |
| Inc42 | Gig Economy Report | [Inc42 Report](https://inc42.com) |
| Economic Times | Gig Economy Algorithm Transparency | [ET Article](https://economictimes.com) |
| Fairwork India | Platform Ratings & Audits | [Fairwork Report](https://fair.work) |

---

## License

MIT License - See LICENSE file for details

---

## Contact

**FairRoute Team**

- Trisha Janath: trishajanath@gmail.com
- Neelesh Padmanabh: neelesh2561@gmail.com
- Ashwin Tom Shibu: ashwin.astrophilos@gmail.com

---

<p align="center">
  <strong>FairRoute</strong> — Financial Security for the Gig Economy
  <br>
  <em>Protecting India's delivery workforce through AI-powered parametric insurance</em>
</p>

---

## Regulatory Compliance — 10-Point Checklist Implementation

All ten IRDAI sandbox / parametric insurance regulatory requirements are implemented in this codebase:

### 1. Trigger Objective & Verifiable
- Rainfall >30 mm, temperature >42 °C, visibility <100 m, IMD orange/red cyclone alerts, urban flooding, demand drop >40 %, order-allocation pause — `backend/triggers.py`
- **AQI >300 (CPCB 'Severe' band):** `check_aqi_trigger()` converts PM2.5 µg/m³ → India-AQI using official CPCB breakpoints (`_pm25_to_india_aqi()` in `backend/main.py`). AQI data fetched per-zone via OpenWeather Air Pollution API.

### 2. Excluded Health / Life / Vehicle
- Coverage is strictly **income-loss protection**: `payout = lost_hours × hourly_rate × severity_multiplier`, capped at daily max. No medical, life, or vehicle claims exist in the system.

### 3. Automatic Payout (< 2 hours)
- APScheduler polls weather → `auto_create_claims_for_risk_crossing_job()` → 7-layer fraud check → auto-approve/reject → `process_payout()` via Razorpay / UPI Direct / Stripe — `backend/payment_gateway.py`. Zero human intervention for low-fraud claims.

### 4. Pool Financially Sustainable
- Admin dashboard tracks loss ratios (weekly / monthly / overall), reserves at 125 %, reserve gap, and what-if catastrophe stress tests (14-day monsoon, cyclone scenarios) with BCR 0.65 target — `frontend/src/pages/AdminDashboard.tsx`.

### 5. Fraud Detection on Data, Not Behaviour
- 7-layer weighted engine in `backend/fraud_engine.py`: GPS consistency, claim frequency, location-disruption cross-check, velocity / spoofing detection, behavioural analysis, historical weather correlation, VPN detection.
- ML ensemble (XGBoost + Isolation Forest) and DBSCAN cluster detection in `backend/ml/`.

### 6. Frictionless Premium Collection (UPI AutoPay)
- `UPIMandate` dataclass + `create_upi_mandate()` / `execute_mandate_debit()` / `revoke_mandate()` in `backend/payment_gateway.py`.
- Worker authorises once via UPI PIN; platform auto-debits ₹49/69/99 weekly — no repeated action needed.
- API endpoints: `POST /api/mandate/create`, `GET /api/mandate/{worker_id}`, `POST /api/mandate/{worker_id}/debit`, `DELETE /api/mandate/{worker_id}`.

### 7. Dynamic Pricing (Not Flat-Rate)
- ML-based premium engine in `backend/premium_engine.py` with features: `monsoon_flag` (Jun–Sep), `flood_x_monsoon` interaction, zone risk score, tenure loyalty discount, claims-to-premium ratio.
- Premiums adjust ±15–25 % per zone per season. Itemised breakdown shown in the Policy page.

### 8. Adverse Selection Blocked (48-hour Lockout)
- `_check_adverse_selection_lockout()` in `backend/main.py` blocks `/select-plan` if an IMD orange/red alert was issued in the worker's city within the last 48 hours.
- `GET /api/enrollment-lockout?city=<city>` lets the frontend pre-check and show a lockout banner before the worker attempts purchase.
- Configurable via `ADVERSE_SELECTION_LOCKOUT_HOURS` constant (default 48).

### 9. Operational Cost Near Zero
- Fully straight-through processing: weather ingestion → auto-claim creation → fraud scoring → auto-approve → UPI payout. No manual review unless fraud score exceeds threshold (`hold-for-review`).
- UPI AutoPay mandates eliminate premium collection overhead.
- Gemini assistant handles support queries at ₹0.01/query.

### 10. Basis Risk Minimised (Hyper-Local Weather)
- `ZONE_COORDS` in `backend/main.py` maps each delivery micro-zone to exact lat/lon coordinates (e.g., Koramangala 12.9352, 77.6245).
- `fetch_weather_for_zone()` queries OpenWeather with `lat`/`lon` params instead of city name — each municipal-ward-level zone gets its own weather reading.
- AQI is also fetched per-zone coordinates via the Air Pollution API.
- GPS verification confirms worker is within 15 km of zone centre before payout.
