# AI-Powered Parametric Income Protection for Gig Workers

> **FairRoute in 30 seconds:** Parametric income protection for India's 7.7M gig delivery workers. Workers pay ₹49–99/week. When IMD + OpenWeather data confirms a disruption (heavy rain, extreme heat, demand collapse), payouts hit their UPI within 2 hours — zero paperwork. A 5-layer fraud engine stops GPS spoofers. A Gemini-powered voice assistant handles queries in 5 Indian languages at ₹0.01/query. Built with React, Node.js, FastAPI, PostgreSQL on GCP.

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

#### 2. Platform-Based Triggers

| Trigger | Threshold | Data Source | Payout Activation |
|---------|-----------|-------------|-------------------|
| Demand Drop | >40% below zone average | Platform API | Automatic |
| Order Allocation Pause | <2 orders in 3 hours (while active) | Platform data | Automatic |
| Platform Outage | System-wide service disruption | Platform status | Automatic |
| Zone Restriction | Geographic delivery restrictions | Platform announcements | Automatic |

#### 3. External Event Triggers

| Trigger | Condition | Data Source | Payout Activation |
|---------|-----------|-------------|-------------------|
| Government Curfew | Official curfew announcement | Govt notifications (manual input) | Automatic |
| Public Health Emergency | Health-related restrictions | Govt notifications (manual input) | Automatic |

### Trigger Validation Process

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

Workers can view trigger status in real-time:

| Information | Visibility |
|-------------|------------|
| Active triggers in zone | Real-time in app |
| Trigger threshold details | Available in policy |
| Data sources used | Displayed per trigger |
| Payout calculation | Shown before confirmation |

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
│         │                │                │                │               │
│         └────────────────┴────────────────┴────────────────┘               │
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

### 1. Weather Risk Scoring (Prophet + XGBoost)

Predicts whether weather in a zone will cross payout trigger thresholds in the next 6–24 hours.

- **Prophet** — trained on 3+ years of IMD historical data per city, handles monsoon seasonality. Outputs predicted rainfall/temperature for next 24h in 3-hour intervals.
- **XGBoost** — takes Prophet's forecast + real-time OpenWeather data (rainfall, humidity, wind, temp, IMD warning level). Binary classification: will threshold be breached? (yes/no + probability).
- **Training data:** IMD open archives (2019–2025) mapped against known disruption events. Bengaluru and Mumbai have the densest records.
- **Output:** zone risk score (0–100), trigger probability, trigger type, confidence level.

### 2. Zone Activity Anomaly Detection (Isolation Forest)

At launch we have zero claim data. Isolation Forest (unsupervised) learns "normal" zone activity and flags deviations without labeled examples.

**Pipeline (runs every 30 min):** Collect active/idle worker counts + avg distance per zone via Firebase → compute idle_ratio, activity_vs_baseline, time features → Isolation Forest scores each window (-1 = anomaly, +1 = normal) → cross-validate with weather score:
- Anomaly + high weather risk → **TRIGGER**
- Anomaly alone → flag for manual review
- Weather risk alone → pre-alert (no payout yet)

**Cold start:** Week 1–2 uses rules-only (IMD thresholds). Week 3–6 trains Isolation Forest on accumulating snapshots. Month 2+ full ML scoring. Month 6+ supervised XGBoost replaces Isolation Forest once labeled claim data exists.

### 3. Trigger Validation Pipeline

Prevents false triggers via 5 sequential checks (real-time, <5 sec):

1. **Data freshness** — Weather data <30 min old, GPS <15 min old
2. **Threshold breach** — Rainfall >30mm/3hr OR temp >42°C OR govt red alert
3. **Multi-source agreement** — At least 2 of 3 sources confirm: IMD + OpenWeather + worker idle ratio
4. **Worker eligibility** — Policy active, premium paid, GPS in zone, app session active
5. **Fraud score** — <0.7 approve, 0.7–0.85 approve with flag, >0.85 hold for review

### 4. Plan Recommendation Engine (XGBoost Classifier)

XGBoost multi-class classifier recommends Basic/Standard/Premium shield at signup based on risk exposure.

**Input features:** city, primary zone (GPS from first 7 days), avg daily hours, peak hour ratio, zone flood/heat risk (IMD historical), monsoon month flag, self-reported income and platform.

**Output:** Recommended plan + confidence score + human-readable reasoning (e.g., "Your zone has high flood risk, Standard covers demand drops") + expected monthly payouts.

**Training:** Initially synthetic data from IMD weather patterns × zone risk profiles × pricing tiers. Retrained monthly on actual conversion data once real users onboard.

### 5. Vernacular AI Assistant (STT → Gemini 2.0 Flash → TTS)

**Purpose:** Let workers interact with FairRoute in Hindi, Kannada, Tamil, Telugu, or Marathi — via text or voice — with a context-aware AI that understands their policy, payouts, and zone status.

**Why Gemini 2.0 Flash?** It supports Hindi and other Indian languages natively, costs ~$0.10/1M input tokens (making it ~₹0.01 per query), responds in under 1 second, and can hold full user context in a single prompt — no need for separate intent/entity extraction layers.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│           VERNACULAR AI ASSISTANT PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Worker speaks/types in any supported language                   │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STEP 1: SPEECH-TO-TEXT                                  │    │
│  │ Google Cloud Speech-to-Text API v2                      │    │
│  │ ├─ Supports: hi-IN, kn-IN, ta-IN, te-IN, mr-IN          │    │
│  │ ├─ Auto language detection (chirp_2 model)               │    │
│  │ └─ Output: transcribed text + detected_language          │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STEP 2: CONTEXT INJECTION (server-side)                 │    │
│  │ Before sending to Gemini, attach user-specific context: │    │
│  │ ├─ Worker profile (name, zone, plan, premium status)     │    │
│  │ ├─ Last 5 payouts (date, amount, trigger type)           │    │
│  │ ├─ Current zone risk score + active triggers             │    │
│  │ ├─ Policy details (tier, daily cap, hourly rate)         │    │
│  │ └─ System prompt with FairRoute guardrails               │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STEP 3: GEMINI 2.0 FLASH (via Google AI API)           │    │
│  │ ├─ Model: gemini-2.0-flash                               │    │
│  │ ├─ System prompt: "You are FairRoute assistant.          │    │
│  │ │   Reply in the worker's language. Be concise.          │    │
│  │ │   Only answer about coverage, payouts, triggers,       │    │
│  │ │   weather, and plans. Never give financial advice."     │    │
│  │ ├─ Input: system_prompt + user_context + user_query      │    │
│  │ ├─ Max output tokens: 200 (keeps responses short)        │    │
│  │ └─ Output: reply text in worker's detected language      │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STEP 4: TEXT-TO-SPEECH                                  │    │
│  │ Google Cloud TTS (WaveNet voices)                       │    │
│  │ ├─ Voice: language-matched (hi-IN-Wavenet-A, etc.)       │    │
│  │ ├─ Speaking rate: 0.9x (slightly slower for clarity)     │    │
│  │ └─ Output: audio stream played in-app                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Guardrails (system prompt enforced):**
- Only answers questions about FairRoute (coverage, payouts, triggers, weather, plans)
- Never gives financial, legal, or medical advice
- Refuses off-topic queries: "मैं सिर्फ FairRoute से जुड़े सवालों में मदद कर सकता हूं"
- Never reveals internal system details, fraud scores, or other workers' data
- Response capped at 200 tokens to keep replies concise and costs low

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

- Website: [fairroute.in](https://fairroute.in)
- Contact: Trisha Janath: trishajanath@gmail.com
- Contact: Neelesh Padmanabh: neelesh2561@gmail.com
- Contact: Ashwin Tom Shibu: ashwin.astrophilos@gmail.com
- Twitter: [@FairRouteIndia](https://twitter.com/FairRouteIndia)

---

<p align="center">
  <strong>FairRoute</strong> — Financial Security for the Gig Economy
  <br>
  <em>Protecting India's delivery workforce through AI-powered parametric insurance</em>
</p>
