# FairRoute

## AI-Powered Parametric Income Protection for Gig Workers

FairRoute is an intelligent parametric insurance platform designed to protect gig economy workers from income disruptions caused by external factors beyond their control. Built specifically for India's growing delivery workforce, FairRoute provides automated, transparent, and affordable financial protection.

---

## Table of Contents

1. [Problem & Worker Statistics](#1-problem--worker-statistics)
2. [Persona Scenario](#2-persona-scenario)
3. [Workflow](#3-workflow)
4. [Weekly Pricing Model](#4-weekly-pricing-model)
5. [Parametric Triggers](#5-parametric-triggers)
6. [AI Integration](#6-ai-integration)
7. [Tech Stack](#7-tech-stack)
8. [Database Schema](#8-database-schema)
9. [Market Size](#9-market-size)
10. [Wireframes](#10-wireframes)
11. [Sources](#sources)

---

## 1. Problem & Worker Statistics

### The Core Problem

India's gig economy is expanding rapidly, with millions of delivery partners powering urban commerce and digital logistics. However, these workers face significant financial vulnerability due to:

- Unpredictable earning patterns governed by algorithmic scheduling
- Fluctuating demand and performance-based incentives
- Zero compensation for lost working hours during external disruptions
- Limited access to traditional financial protection mechanisms

**FairRoute addresses the critical gap of income protection for gig workers during verified external disruptions.**

### Worker Statistics: Swiggy Delivery Partners

| Metric | Value |
|--------|-------|
| Daily Working Hours | 8–10 hours |
| Monthly Working Days | ~26 days |
| Peak Delivery Window | 7 PM – 10 PM |

#### Earnings Overview

| Worker Type | Gross Monthly | Net Monthly (after expenses) |
|-------------|---------------|------------------------------|
| Full-Time Partners | ₹26,500 – ₹27,700 | ~₹21,000 |
| Part-Time Partners | ₹7,200 – ₹25,000 | Varies |

| Per-Order Metrics | Value |
|-------------------|-------|
| Delivery Payment | ₹15 – ₹90 per order |
| Daily Deliveries Required | 10 – 25 (for incentive eligibility) |

### Work Pattern Risks

**Peak Hour Challenges (7 PM – 10 PM):**
- Delivery volumes spike significantly
- Traffic congestion increases
- Riders face pressure to complete more deliveries to qualify for incentives

**Associated Risks:**
- Fatigue from extended working hours
- Increased operational stress during peak demand
- Exposure to unsafe delivery conditions at night

**Night Delivery Hazards:**
- Poorly lit delivery areas
- Fake orders or unsafe customer locations
- Reduced emergency support availability

### Environmental & Operational Disruptions

| Condition | Impact |
|-----------|--------|
| Heatwaves | Increased delivery time, health risks |
| Heavy Monsoon Rainfall | Reduced order availability, safety hazards |
| High Humidity | Physical exhaustion, slower deliveries |
| Urban Flooding | Platform demand drops, inaccessible routes |

**Key Problem:** Despite these disruptions, gig workers do not receive compensation for lost working hours.

### Income Volatility Factors

- Order volume fluctuations
- Time of day variations
- Incentive eligibility requirements
- Delivery distance changes
- Dynamic pricing incentive adjustments

### Platform Coverage Shortcomings

**Conditional Benefits:** Platform protections often only apply when workers are:
- Actively completing deliveries
- Maintaining high performance ratings
- Meeting minimum delivery thresholds

**Government Scheme Limitations:**

| Requirement | Challenge |
|-------------|-----------|
| Eligibility Period | 90–120 days of platform engagement |
| Awareness | Limited among gig workers |
| Registration (e-Shram) | Relatively low adoption rates |

### Algorithmic Work Allocation Issues

The algorithmic decision-making process is largely **opaque**—workers have limited visibility into how order allocation decisions are made.

**Algorithm Evaluation Factors:**
- Delivery partner rating
- Order acceptance rate
- Cancellation history
- Delivery location
- Past performance metrics

**Reported Issues:**
- Uneven order distribution across workers in the same location
- Workers with lower ratings receive fewer and lower-paying orders
- Reduced access to peak-time deliveries for some partners

### Account Deactivation Risks

| Cause | Description |
|-------|-------------|
| High Cancellation Rates | Exceeding platform thresholds |
| Low Customer Ratings | Below acceptable performance levels |
| Policy Violations | Breaching platform terms |
| Algorithmic Flags | Automated monitoring triggers |

**Impact:** Workers report deactivation occurs without prior warning, clear explanation, or transparent appeal mechanism—causing immediate financial distress.

### The Protection Gap

| Event Type | Description |
|------------|-------------|
| Low Demand Periods | Insufficient orders despite availability |
| Extreme Weather | Rain, heat, or flooding reducing deliveries |
| Platform Allocation | Algorithmic slowdowns or zone restrictions |
| Shift Inactivity | Worker available but no orders received |

**Why Traditional Insurance Fails:**
- Focuses on health, life, accidents, or asset damage
- Requires manual claim submissions
- Operates on monthly or yearly coverage cycles
- Does not address short-timeframe income disruptions

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

### Ramesh's Typical Day

| Time | Activity |
|------|----------|
| 10:00 AM | Starts shift, logs into Swiggy app |
| 10:00 AM – 2:00 PM | Morning deliveries (moderate demand) |
| 2:00 PM – 5:00 PM | Afternoon lull (low demand period) |
| 5:00 PM – 10:00 PM | Peak hours (high demand, incentive focus) |
| 10:00 PM | Ends shift after 12+ hours |

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
| Weekly Premium Paid | - | ₹49 |

### Other Persona Scenarios

#### Scenario 2: Priya – Heatwave Disruption

- Location: Hyderabad
- Event: Temperature exceeds 45°C
- Impact: Platform reduces order allocation to protect workers
- FairRoute Trigger: Heat advisory + reduced platform activity
- Payout: ₹600 for 6 hours of involuntary downtime

#### Scenario 3: Suresh – Zone Shutdown

- Location: Mumbai
- Event: Government-imposed curfew due to civil disturbance
- Impact: Unable to access delivery zone for 2 days
- FairRoute Trigger: Government restriction notification
- Payout: ₹1,800 for verified shutdown period

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

```
┌────────────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. REGISTRATION                                               │
│     ├─ Mobile number verification (OTP)                        │
│     ├─ Basic profile creation                                  │
│     └─ Platform account linking (Swiggy/Zomato/etc.)           │
│                                                                │
│  2. KYC VERIFICATION                                           │
│     ├─ Aadhaar verification (DigiLocker API)                   │
│     ├─ PAN verification (optional, for tax purposes)           │
│     └─ Bank account linking (UPI/Account details)              │
│                                                                │
│  3. WORK HISTORY SYNC                                          │
│     ├─ Connect delivery platform account                       │
│     ├─ Import last 30 days work history                        │
│     └─ Calculate baseline earning patterns                     │
│                                                                │
│  4. PLAN SELECTION                                             │
│     ├─ View available coverage tiers                           │
│     ├─ AI-recommended plan based on work patterns              │
│     └─ Select and confirm coverage                             │
│                                                                │
│  5. PAYMENT SETUP                                              │
│     ├─ Choose payment method (UPI/Auto-deduct)                 │
│     ├─ Weekly premium auto-deduction authorization             │
│     └─ First premium payment                                   │
│                                                                │
│  ✓ COVERAGE ACTIVE                                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Stage 2: Continuous Monitoring

```
┌────────────────────────────────────────────────────────────────┐
│                 REAL-TIME MONITORING                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  DATA SOURCES                   MONITORING PARAMETERS          │
│  ─────────────                  ─────────────────────          │
│                                                                │
│  Weather APIs ─────────────────▶ Temperature                   │
│  (IMD, OpenWeather)              Rainfall (mm/hour)            │
│                                  Humidity levels               │
│                                  Air quality index             │
│                                                                │
│  Platform APIs ────────────────▶ Order volume (zone-wise)      │
│  (Partner data feed)             Active delivery partners      │
│                                  Average delivery time         │
│                                  Surge pricing status          │
│                                                                │
│  Government APIs ──────────────▶ Curfew notifications          │
│  (Disaster mgmt)                 Zone restrictions             │
│                                  Emergency alerts              │
│                                                                │
│  Worker App ───────────────────▶ Login status                  │
│  (FairRoute)                     GPS location                  │
│                                  Active/idle time              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

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

```
┌────────────────────────────────────────────────────────────────┐
│                  PAYOUT WORKFLOW                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  TRIGGER CONFIRMED                                             │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────┐          │
│  │ PAYOUT CALCULATION                               │          │
│  │                                                  │          │
│  │ Base Amount = (Lost Hours) × (Hourly Rate)      │          │
│  │ Multiplier = Event Severity Factor              │          │
│  │ Cap = Maximum daily/weekly payout limit         │          │
│  │                                                  │          │
│  │ Final Payout = min(Base × Multiplier, Cap)      │          │
│  └──────────────────────────────────────────────────┘          │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────┐          │
│  │ VERIFICATION                                     │          │
│  │                                                  │          │
│  │ ✓ Policy active                                  │          │
│  │ ✓ Premium current                                │          │
│  │ ✓ Within coverage limits                         │          │
│  │ ✓ No duplicate claims                            │          │
│  └──────────────────────────────────────────────────┘          │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────┐          │
│  │ TRANSFER                                         │          │
│  │                                                  │          │
│  │ Method: UPI / Bank Transfer                      │          │
│  │ Timeline: Within 2 hours of trigger confirmation │          │
│  │ Notification: SMS + App push notification        │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Claim-Free Payout Process

Unlike traditional insurance, FairRoute requires **no manual claims**:

| Traditional Insurance | FairRoute |
|-----------------------|-----------|
| Worker files claim | Auto-detected trigger |
| Submit documentation | No documents needed |
| Manual verification | AI-powered validation |
| 15-30 day processing | 2-hour payout |
| Possible rejection | Objective criteria |

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
│  │  ₹29/week       │   │  ₹49/week       │   │  ₹79/week       │           │
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

### Detailed Pricing Breakdown

| Feature | Basic Shield | Standard Shield | Premium Shield |
|---------|--------------|-----------------|----------------|
| **Weekly Premium** | ₹29 | ₹49 | ₹79 |
| **Monthly Equivalent** | ~₹116 | ~₹196 | ~₹316 |
| **Daily Payout Cap** | ₹500 | ₹800 | ₹1,200 |
| **Weekly Payout Cap** | ₹2,000 | ₹3,500 | ₹6,000 |
| **Hourly Rate** | ₹75/hour | ₹100/hour | ₹150/hour |
| **Weather Coverage** | ✅ | ✅ | ✅ |
| **Zone Shutdown** | ✅ | ✅ | ✅ |
| **Demand Drop Coverage** | ❌ | ✅ | ✅ |
| **Heat Alert Coverage** | ❌ | ❌ | ✅ |
| **Platform Outage** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ |

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

### Premium Payment Options

| Method | Description |
|--------|-------------|
| UPI Auto-Deduct | Weekly auto-deduction from linked UPI |
| Wallet Deduction | Deduct from FairRoute wallet balance |
| Manual Payment | Pay each week manually via UPI/card |
| Prepaid Balance | Pre-load 4-12 weeks of premiums |

### Value Proposition

**For a Standard Shield subscriber (₹49/week):**

| Scenario | Premium Paid | Potential Payout | ROI |
|----------|--------------|------------------|-----|
| 1 monsoon event/month | ₹196/month | ₹800+ per event | 4x+ |
| 2 weather events/month | ₹196/month | ₹1,600+ total | 8x+ |
| No events (3 months) | ₹588 | ₹0 | Peace of mind |

---

## 5. Parametric Triggers

### What are Parametric Triggers?

Parametric triggers are **objective, data-driven conditions** that automatically activate insurance payouts without manual claims or subjective assessments.

```
┌─────────────────────────────────────────────────────────────────┐
│                  PARAMETRIC vs TRADITIONAL                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRADITIONAL INSURANCE          PARAMETRIC INSURANCE            │
│  ─────────────────────          ────────────────────            │
│                                                                 │
│  Event occurs                   Event occurs                    │
│       │                              │                          │
│       ▼                              ▼                          │
│  Worker files claim             Sensor detects trigger          │
│       │                              │                          │
│       ▼                              ▼                          │
│  Submit documents               Auto-validate via data          │
│       │                              │                          │
│       ▼                              ▼                          │
│  Manual review                  Algorithm confirms              │
│       │                              │                          │
│       ▼                              ▼                          │
│  Approval/Rejection             Instant payout                  │
│       │                              │                          │
│       ▼                              │                          │
│  Payout (15-30 days)                 │                          │
│       │                              │                          │
│       ▼                              ▼                          │
│  ────────────────               ─────────────                   │
│  Timeline: 2-4 weeks            Timeline: 2 hours               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### FairRoute Trigger Categories

#### 1. Weather-Based Triggers

| Trigger | Threshold | Data Source | Payout Activation |
|---------|-----------|-------------|-------------------|
| Heavy Rainfall | >30mm in 3 hours | IMD API | Automatic |
| Extreme Heat | >42°C sustained | Weather stations | Automatic |
| Urban Flooding | Water logging reported | Municipal + satellite | Automatic |
| Poor Visibility | <100m visibility | Aviation weather | Automatic |
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
| Government Curfew | Official curfew announcement | Govt notifications | Automatic |
| Civil Disturbance | Area safety restrictions | News + official sources | Verified |
| Infrastructure Failure | Major road/transport disruption | Traffic authorities | Verified |
| Public Health Emergency | Health-related restrictions | Health department | Automatic |

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

### Example Trigger Scenarios

**Scenario: Heavy Rainfall in Mumbai**

```
TRIGGER EVENT TIMELINE:
──────────────────────────────────────────────────────────────────

14:00  IMD records rainfall at 35mm/hour in Andheri zone
       ├─ Primary source: IMD API ✓
       └─ Threshold: >30mm in 3 hours ✓

14:15  OpenWeather confirms heavy precipitation
       └─ Secondary source: Weather API ✓

14:30  Swiggy platform data shows:
       ├─ Order volume: -55% vs. hourly average
       ├─ Active riders: -40%
       └─ Platform impact verified ✓

14:45  TRIGGER CONFIRMED
       ├─ Affected zone: Andheri, Goregaon, Malad
       ├─ Severity: Moderate (1.2x multiplier)
       └─ Duration tracking: Started

17:30  Rainfall subsides, trigger ends
       └─ Total trigger duration: 3 hours

17:35  PAYOUTS INITIATED
       ├─ Eligible workers: 847
       ├─ Average payout: ₹360
       └─ Status: Processing via UPI
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

### AI-Powered Capabilities

FairRoute leverages artificial intelligence across multiple system components:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FAIRROUTE AI ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌─────────────────────┐                              │
│                        │     AI CORE         │                              │
│                        │   (ML Platform)     │                              │
│                        └──────────┬──────────┘                              │
│                                   │                                         │
│        ┌──────────────────────────┼──────────────────────────┐              │
│        │                          │                          │              │
│        ▼                          ▼                          ▼              │
│  ┌───────────────┐       ┌───────────────┐       ┌───────────────┐          │
│  │  PREDICTION   │       │   DETECTION   │       │ PERSONALIZATION│         │
│  │    ENGINE     │       │    ENGINE     │       │    ENGINE      │         │
│  └───────────────┘       └───────────────┘       └───────────────┘          │
│        │                          │                          │              │
│        ▼                          ▼                          ▼              │
│  • Weather forecast       • Anomaly detection        • Risk profiling       │
│  • Demand prediction      • Trigger validation       • Premium optimization │
│  • Risk assessment        • Fraud detection          • Coverage suggestions │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Predictive Analytics Engine

**Purpose:** Forecast potential disruption events before they occur

```
┌─────────────────────────────────────────────────────────────────┐
│              PREDICTION MODEL ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT FEATURES                    MODEL OUTPUTS                │
│  ──────────────                    ─────────────                │
│                                                                 │
│  Historical weather data    ┌────────────────┐                  │
│  Seasonal patterns         ─│                │─▶ Weather risk   │
│  IMD forecasts              │   LSTM Neural  │   score (0-100)  │
│                             │    Network     │                  │
│  Platform order history    ─│                │─▶ Demand drop    │
│  Time-of-day patterns       │   + Ensemble   │   probability    │
│  Event calendar             │    Methods     │                  │
│                             │                │─▶ Trigger        │
│  Geographic risk factors   ─│                │   likelihood     │
│  Infrastructure data        └────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Predictions:**
| Prediction Type | Accuracy Target | Update Frequency |
|-----------------|-----------------|------------------|
| Weather disruption (24h) | >85% | Every 3 hours |
| Demand drop (6h) | >75% | Every hour |
| Zone-level risk | >80% | Daily |

### 2. Anomaly Detection Engine

**Purpose:** Identify unusual patterns that indicate disruption events

```python
# Simplified Anomaly Detection Logic

def detect_anomaly(zone_data):
    """
    Detect order volume anomalies indicating disruption
    """
    # Calculate baseline (rolling 7-day average for same hour)
    baseline = calculate_baseline(zone_data, window=7)
    
    # Get current metrics
    current_volume = zone_data.current_order_volume
    current_active_riders = zone_data.active_riders
    
    # Calculate deviation
    volume_deviation = (baseline.avg_volume - current_volume) / baseline.avg_volume
    rider_deviation = (baseline.avg_riders - current_active_riders) / baseline.avg_riders
    
    # Anomaly thresholds
    if volume_deviation > 0.40 and rider_deviation > 0.30:
        return AnomalyResult(
            type="DEMAND_DROP",
            severity=calculate_severity(volume_deviation),
            confidence=calculate_confidence(zone_data)
        )
    
    return None
```

### 3. Trigger Validation AI

**Purpose:** Ensure triggers are legitimate and not false positives

```
┌─────────────────────────────────────────────────────────────────┐
│              TRIGGER VALIDATION PIPELINE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Raw Trigger Event                                              │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STAGE 1: Data Quality Check                             │    │
│  │ └─ Verify data source reliability and freshness         │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STAGE 2: Cross-Source Validation                        │    │
│  │ └─ ML model compares multiple data sources              │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STAGE 3: Historical Pattern Matching                    │    │
│  │ └─ Compare with similar past events                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ STAGE 4: Fraud Detection                                │    │
│  │ └─ Check for manipulation or gaming attempts            │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  Validated Trigger (Confidence Score)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Personalization Engine

**Purpose:** Customize coverage recommendations and pricing

```
┌─────────────────────────────────────────────────────────────────┐
│              PERSONALIZATION FEATURES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WORKER PROFILE ANALYSIS                                        │
│  ────────────────────────                                       │
│                                                                 │
│  Work Pattern Analysis:                                         │
│  ├─ Average daily working hours                                 │
│  ├─ Peak vs. off-peak hour distribution                         │
│  ├─ Weekly consistency score                                    │
│  └─ Seasonal variation patterns                                 │
│                                                                 │
│  Risk Exposure Assessment:                                      │
│  ├─ Primary delivery zones                                      │
│  ├─ Weather vulnerability (zone-based)                          │
│  ├─ Historical disruption frequency                             │
│  └─ Income volatility index                                     │
│                                                                 │
│  RECOMMENDATION OUTPUT                                          │
│  ─────────────────────                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Recommended Plan: STANDARD SHIELD                       │    │
│  │                                                         │    │
│  │ Reasoning:                                              │    │
│  │ • Your zone (Koramangala) has moderate weather risk     │    │
│  │ • You work 75% during peak hours (higher exposure)      │    │
│  │ • Based on your earnings, ₹49/week is <0.25% of income  │    │
│  │ • Historical data suggests 2-3 trigger events/month     │    │
│  │                                                         │    │
│  │ Expected Value: ₹1,200-1,600/month in payouts           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Natural Language Processing

**Purpose:** Enable vernacular support and intelligent chatbot

| Feature | Description |
|---------|-------------|
| Multi-language Support | Hindi, Kannada, Tamil, Telugu, Marathi |
| Voice Interface | Voice-based queries in local languages |
| Smart FAQs | Context-aware FAQ suggestions |
| Claim Assistance | Guided support via conversational AI |

### AI Model Performance Metrics

| Model | Metric | Target | Current |
|-------|--------|--------|---------|
| Weather Prediction | Accuracy | >85% | 87% |
| Demand Forecast | MAE | <15% | 12% |
| Trigger Validation | Precision | >95% | 96% |
| Fraud Detection | Recall | >90% | 92% |
| Personalization | CTR Improvement | >20% | 25% |

---

## 7. Tech Stack

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FAIRROUTE TECH ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         CLIENT LAYER                                │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │ Mobile App  │  │  Web Portal │  │ Partner API │                  │    │
│  │  │ (React      │  │  (React.js) │  │  (REST/     │                  │    │
│  │  │  Native)    │  │             │  │   GraphQL)  │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       API GATEWAY LAYER                             │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │  Kong / AWS API Gateway                                     │    │    │
│  │  │  • Rate limiting  • Auth  • Load balancing  • SSL/TLS       │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      MICROSERVICES LAYER                            │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │    │
│  │  │   User    │ │  Policy   │ │  Trigger  │ │  Payout   │           │    │
│  │  │  Service  │ │  Service  │ │  Service  │ │  Service  │           │    │
│  │  │ (Node.js) │ │ (Node.js) │ │ (Python)  │ │ (Node.js) │           │    │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │    │
│  │  │   Data    │ │    AI     │ │  Weather  │ │   Notif   │           │    │
│  │  │  Ingestion│ │  Engine   │ │  Service  │ │  Service  │           │    │
│  │  │ (Python)  │ │ (Python)  │ │ (Python)  │ │ (Node.js) │           │    │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        DATA LAYER                                   │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │    │
│  │  │PostgreSQL │ │   Redis   │ │  MongoDB  │ │   S3      │           │    │
│  │  │ (Primary  │ │  (Cache   │ │ (Logs &   │ │  (Files   │           │    │
│  │  │    DB)    │ │  & Queue) │ │  Events)  │ │  & Docs)  │           │    │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     INFRASTRUCTURE                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │  AWS / Google Cloud                                         │    │    │
│  │  │  • EKS/GKE (Kubernetes)  • CloudWatch  • Auto-scaling       │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Tech Stack

#### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| Mobile App | React Native | Cross-platform iOS/Android app |
| Web Portal | React.js + TypeScript | Admin dashboard and worker portal |
| UI Framework | Tailwind CSS / Material UI | Consistent design system |
| State Management | Redux Toolkit | Application state |
| API Client | Axios + React Query | API communication |

#### Backend Services

| Service | Technology | Purpose |
|---------|------------|---------|
| User Service | Node.js + Express | Authentication, profiles, KYC |
| Policy Service | Node.js + Express | Coverage management, premiums |
| Trigger Service | Python + FastAPI | Event detection, validation |
| Payout Service | Node.js + Express | Payment processing |
| AI Engine | Python + TensorFlow | ML models, predictions |
| Weather Service | Python + FastAPI | Weather data aggregation |
| Notification Service | Node.js + Express | SMS, push, email |

#### Data Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary Database | PostgreSQL 15 | Transactional data |
| Cache Layer | Redis 7 | Session, rate limiting |
| Document Store | MongoDB | Logs, events, analytics |
| Search Engine | Elasticsearch | Full-text search |
| Message Queue | Redis Streams / Kafka | Event streaming |
| Object Storage | AWS S3 | Documents, backups |

#### AI/ML Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| ML Framework | TensorFlow / PyTorch | Model training |
| Model Serving | TensorFlow Serving | Production inference |
| Feature Store | Feast | Feature management |
| Experiment Tracking | MLflow | Model versioning |
| NLP | Hugging Face Transformers | Language processing |

#### DevOps & Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Container Orchestration | Kubernetes (EKS/GKE) | Service deployment |
| CI/CD | GitHub Actions | Automated pipelines |
| Infrastructure as Code | Terraform | Cloud provisioning |
| Monitoring | Prometheus + Grafana | Metrics & dashboards |
| Logging | ELK Stack | Centralized logging |
| APM | Datadog / New Relic | Performance monitoring |

#### External Integrations

| Integration | Provider | Purpose |
|-------------|----------|---------|
| Weather Data | IMD API, OpenWeather | Trigger detection |
| Payments | Razorpay / PayU | Premium collection, payouts |
| KYC | DigiLocker, UIDAI | Identity verification |
| SMS | Twilio / MSG91 | Notifications |
| Maps | Google Maps API | Location services |
| Platform Data | Swiggy/Zomato APIs | Work data sync |

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRANSPORT SECURITY                                             │
│  ├─ TLS 1.3 encryption                                          │
│  ├─ Certificate pinning (mobile)                                │
│  └─ HSTS headers                                                │
│                                                                 │
│  AUTHENTICATION                                                 │
│  ├─ JWT tokens with short expiry                                │
│  ├─ Refresh token rotation                                      │
│  ├─ OTP-based login                                             │
│  └─ Biometric support (mobile)                                  │
│                                                                 │
│  AUTHORIZATION                                                  │
│  ├─ Role-based access control (RBAC)                            │
│  ├─ API key management for partners                             │
│  └─ Scope-limited tokens                                        │
│                                                                 │
│  DATA PROTECTION                                                │
│  ├─ AES-256 encryption at rest                                  │
│  ├─ PII masking in logs                                         │
│  ├─ Database-level encryption                                   │
│  └─ GDPR/DPDP compliance                                        │
│                                                                 │
│  INFRASTRUCTURE                                                 │
│  ├─ VPC isolation                                               │
│  ├─ WAF protection                                              │
│  ├─ DDoS mitigation                                             │
│  └─ Regular security audits                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │   WORKERS   │────────▶│  POLICIES   │────────▶│   PAYOUTS   │           │
│  └─────────────┘    1:N  └─────────────┘    1:N  └─────────────┘           │
│        │                       │                       │                    │
│        │ 1:N                   │                       │                    │
│        ▼                       │                       │                    │
│  ┌─────────────┐               │                       │                    │
│  │  WORK_LOGS  │               │                       │                    │
│  └─────────────┘               │                       │                    │
│                                │ N:1                   │ N:1                │
│                                ▼                       ▼                    │
│                          ┌─────────────┐         ┌─────────────┐           │
│                          │   PLANS     │         │  TRIGGERS   │           │
│                          └─────────────┘         └─────────────┘           │
│                                                        │                    │
│                                                        │ 1:N                │
│                                                        ▼                    │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │   ZONES     │◀────────│ZONE_TRIGGERS│────────▶│WEATHER_DATA │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Tables

#### Workers Table

```sql
CREATE TABLE workers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(15) UNIQUE NOT NULL,
    email           VARCHAR(255),
    full_name       VARCHAR(255) NOT NULL,
    aadhaar_hash    VARCHAR(64),           -- Hashed for privacy
    pan_hash        VARCHAR(64),
    
    -- Platform Details
    platform        VARCHAR(50) NOT NULL,   -- 'swiggy', 'zomato', etc.
    platform_id     VARCHAR(100),
    
    -- Bank Details (encrypted)
    bank_account_encrypted  BYTEA,
    upi_id_encrypted        BYTEA,
    
    -- Profile
    profile_photo_url   VARCHAR(500),
    primary_zone_id     UUID REFERENCES zones(id),
    
    -- Status
    kyc_status          VARCHAR(20) DEFAULT 'pending',
    account_status      VARCHAR(20) DEFAULT 'active',
    
    -- Timestamps
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at      TIMESTAMP,
    
    -- Indexes
    CONSTRAINT valid_platform CHECK (platform IN ('swiggy', 'zomato', 'dunzo', 'zepto', 'other'))
);

CREATE INDEX idx_workers_phone ON workers(phone);
CREATE INDEX idx_workers_platform ON workers(platform);
CREATE INDEX idx_workers_zone ON workers(primary_zone_id);
```

#### Plans Table

```sql
CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) UNIQUE NOT NULL,
    
    -- Pricing
    weekly_premium      DECIMAL(10, 2) NOT NULL,
    daily_payout_cap    DECIMAL(10, 2) NOT NULL,
    weekly_payout_cap   DECIMAL(10, 2) NOT NULL,
    hourly_rate         DECIMAL(10, 2) NOT NULL,
    
    -- Coverage
    weather_coverage        BOOLEAN DEFAULT true,
    zone_shutdown_coverage  BOOLEAN DEFAULT true,
    demand_drop_coverage    BOOLEAN DEFAULT false,
    heat_alert_coverage     BOOLEAN DEFAULT false,
    platform_outage_coverage BOOLEAN DEFAULT false,
    
    -- Status
    is_active           BOOLEAN DEFAULT true,
    display_order       INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default plans
INSERT INTO plans (name, slug, weekly_premium, daily_payout_cap, weekly_payout_cap, hourly_rate, 
                   weather_coverage, zone_shutdown_coverage, demand_drop_coverage, 
                   heat_alert_coverage, platform_outage_coverage, display_order) 
VALUES 
    ('Basic Shield', 'basic', 29.00, 500.00, 2000.00, 75.00, true, true, false, false, false, 1),
    ('Standard Shield', 'standard', 49.00, 800.00, 3500.00, 100.00, true, true, true, false, false, 2),
    ('Premium Shield', 'premium', 79.00, 1200.00, 6000.00, 150.00, true, true, true, true, true, 3);
```

#### Policies Table

```sql
CREATE TABLE policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id       UUID NOT NULL REFERENCES workers(id),
    plan_id         UUID NOT NULL REFERENCES plans(id),
    
    -- Policy Period
    start_date      DATE NOT NULL,
    end_date        DATE,                   -- NULL for ongoing
    
    -- Status
    status          VARCHAR(20) DEFAULT 'active',
    auto_renew      BOOLEAN DEFAULT true,
    
    -- Payment
    last_premium_date   DATE,
    next_premium_date   DATE,
    payment_method      VARCHAR(20),
    
    -- Counters
    total_premiums_paid     DECIMAL(12, 2) DEFAULT 0,
    total_payouts_received  DECIMAL(12, 2) DEFAULT 0,
    
    -- Timestamps
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at        TIMESTAMP,
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'cancelled', 'expired'))
);

CREATE INDEX idx_policies_worker ON policies(worker_id);
CREATE INDEX idx_policies_status ON policies(status);
```

#### Triggers Table

```sql
CREATE TABLE triggers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trigger Details
    trigger_type    VARCHAR(50) NOT NULL,
    trigger_subtype VARCHAR(50),
    
    -- Geographic Scope
    zone_ids        UUID[] NOT NULL,        -- Array of affected zones
    
    -- Thresholds
    threshold_value     DECIMAL(10, 2),
    measured_value      DECIMAL(10, 2),
    severity            VARCHAR(20),
    severity_multiplier DECIMAL(3, 2) DEFAULT 1.0,
    
    -- Timing
    started_at          TIMESTAMP NOT NULL,
    ended_at            TIMESTAMP,
    duration_minutes    INTEGER,
    
    -- Validation
    data_sources        JSONB,              -- Sources used for validation
    validation_score    DECIMAL(5, 2),      -- Confidence score 0-100
    
    -- Status
    status              VARCHAR(20) DEFAULT 'active',
    
    -- Timestamps
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_trigger_type CHECK (trigger_type IN (
        'weather_rainfall', 'weather_heat', 'weather_flood',
        'demand_drop', 'zone_shutdown', 'platform_outage', 'government_restriction'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('low', 'moderate', 'severe'))
);

CREATE INDEX idx_triggers_type ON triggers(trigger_type);
CREATE INDEX idx_triggers_status ON triggers(status);
CREATE INDEX idx_triggers_started ON triggers(started_at);
```

#### Payouts Table

```sql
CREATE TABLE payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id       UUID NOT NULL REFERENCES policies(id),
    trigger_id      UUID NOT NULL REFERENCES triggers(id),
    
    -- Calculation
    lost_hours          DECIMAL(4, 2) NOT NULL,
    hourly_rate         DECIMAL(10, 2) NOT NULL,
    severity_multiplier DECIMAL(3, 2) NOT NULL,
    calculated_amount   DECIMAL(10, 2) NOT NULL,
    cap_applied         DECIMAL(10, 2),
    final_amount        DECIMAL(10, 2) NOT NULL,
    
    -- Payment Details
    payment_method      VARCHAR(20),
    payment_reference   VARCHAR(100),
    
    -- Status
    status              VARCHAR(20) DEFAULT 'pending',
    
    -- Timestamps
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at        TIMESTAMP,
    failed_at           TIMESTAMP,
    failure_reason      TEXT,
    
    CONSTRAINT valid_payout_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_payouts_policy ON payouts(policy_id);
CREATE INDEX idx_payouts_trigger ON payouts(trigger_id);
CREATE INDEX idx_payouts_status ON payouts(status);
```

#### Zones Table

```sql
CREATE TABLE zones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Zone Identity
    name            VARCHAR(100) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    pincode         VARCHAR(10),
    
    -- Geographic
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    boundary_geojson    JSONB,              -- GeoJSON polygon
    
    -- Risk Profile
    weather_risk_score  INTEGER DEFAULT 50, -- 0-100
    demand_volatility   DECIMAL(5, 2),
    
    -- Status
    is_active           BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zones_city ON zones(city);
CREATE INDEX idx_zones_active ON zones(is_active);
```

#### Weather Data Table

```sql
CREATE TABLE weather_data (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id         UUID NOT NULL REFERENCES zones(id),
    
    -- Weather Metrics
    temperature         DECIMAL(5, 2),      -- Celsius
    humidity            INTEGER,            -- Percentage
    rainfall_mm         DECIMAL(8, 2),
    wind_speed_kmh      DECIMAL(6, 2),
    visibility_km       DECIMAL(6, 2),
    air_quality_index   INTEGER,
    
    -- Conditions
    condition_code      VARCHAR(50),
    condition_text      VARCHAR(100),
    
    -- Source
    data_source         VARCHAR(50),
    
    -- Timestamp
    recorded_at         TIMESTAMP NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite unique constraint
    UNIQUE(zone_id, recorded_at, data_source)
);

CREATE INDEX idx_weather_zone_time ON weather_data(zone_id, recorded_at);
```

#### Work Logs Table

```sql
CREATE TABLE work_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id       UUID NOT NULL REFERENCES workers(id),
    
    -- Session Details
    session_date        DATE NOT NULL,
    login_time          TIMESTAMP NOT NULL,
    logout_time         TIMESTAMP,
    
    -- Location
    zone_id             UUID REFERENCES zones(id),
    
    -- Activity Metrics
    active_hours        DECIMAL(4, 2),
    idle_hours          DECIMAL(4, 2),
    deliveries_completed INTEGER DEFAULT 0,
    estimated_earnings  DECIMAL(10, 2),
    
    -- Source
    data_source         VARCHAR(50),        -- 'platform_sync', 'manual', 'estimated'
    
    -- Timestamps
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_logs_worker ON work_logs(worker_id);
CREATE INDEX idx_work_logs_date ON work_logs(session_date);
```

### Database Views

```sql
-- Active policies with plan details
CREATE VIEW v_active_policies AS
SELECT 
    p.id AS policy_id,
    p.worker_id,
    w.full_name AS worker_name,
    w.phone AS worker_phone,
    pl.name AS plan_name,
    pl.weekly_premium,
    pl.daily_payout_cap,
    p.start_date,
    p.total_premiums_paid,
    p.total_payouts_received
FROM policies p
JOIN workers w ON p.worker_id = w.id
JOIN plans pl ON p.plan_id = pl.id
WHERE p.status = 'active';

-- Trigger summary by zone
CREATE VIEW v_zone_trigger_summary AS
SELECT 
    z.id AS zone_id,
    z.name AS zone_name,
    z.city,
    COUNT(t.id) AS total_triggers_30d,
    SUM(CASE WHEN t.trigger_type LIKE 'weather%' THEN 1 ELSE 0 END) AS weather_triggers,
    SUM(CASE WHEN t.trigger_type = 'demand_drop' THEN 1 ELSE 0 END) AS demand_triggers,
    AVG(t.duration_minutes) AS avg_duration_minutes
FROM zones z
LEFT JOIN LATERAL unnest(
    (SELECT array_agg(tr.id) FROM triggers tr WHERE z.id = ANY(tr.zone_ids) 
     AND tr.started_at > NOW() - INTERVAL '30 days')
) AS trigger_id ON true
LEFT JOIN triggers t ON t.id = trigger_id
GROUP BY z.id, z.name, z.city;
```

---

## 9. Market Size

### India's Gig Economy Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     INDIA GIG ECONOMY MARKET SIZE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURRENT STATE (2024-2025)                                                  │
│  ─────────────────────────                                                  │
│                                                                             │
│  Total Gig Workers:          7.7 million                                    │
│  Platform-based Workers:     3.0+ million                                   │
│  Delivery Partners:          1.5+ million                                   │
│                                                                             │
│  PROJECTED GROWTH (2030)                                                    │
│  ───────────────────────                                                    │
│                                                                             │
│  Total Gig Workers:          23.5 million                                   │
│  Platform-based Workers:     10+ million                                    │
│  Delivery Partners:          4+ million                                     │
│                                                                             │
│  CAGR: 17-20%                                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Total Addressable Market (TAM)

| Segment | Workers (2025) | Workers (2030) | Avg. Monthly Premium | Annual TAM (2030) |
|---------|----------------|----------------|----------------------|-------------------|
| Delivery (Food/Grocery) | 1.5M | 4M | ₹200 | ₹9,600 Cr |
| Ride-hailing | 2M | 5M | ₹200 | ₹12,000 Cr |
| E-commerce Logistics | 0.5M | 1.5M | ₹200 | ₹3,600 Cr |
| Other Platform Workers | 0.5M | 2M | ₹150 | ₹3,600 Cr |
| **Total** | **4.5M** | **12.5M** | - | **₹28,800 Cr** |

### Serviceable Addressable Market (SAM)

**Focus: Food & Grocery Delivery Partners**

| Platform | Estimated Partners | Market Share |
|----------|-------------------|--------------|
| Swiggy | 350,000+ | 35% |
| Zomato | 350,000+ | 35% |
| Zepto | 50,000+ | 5% |
| Blinkit | 50,000+ | 5% |
| Dunzo | 30,000+ | 3% |
| Others | 170,000+ | 17% |
| **Total** | **1,000,000+** | **100%** |

**SAM Calculation:**

| Metric | Value |
|--------|-------|
| Target Delivery Workers | 1,000,000 |
| Average Weekly Premium | ₹49 |
| Annual Premium per Worker | ₹2,548 |
| **Annual SAM** | **₹2,548 Cr** |

### Serviceable Obtainable Market (SOM)

**Year 1-3 Targets:**

| Year | Target Users | Penetration | Annual Revenue |
|------|--------------|-------------|----------------|
| Year 1 | 50,000 | 5% | ₹12.7 Cr |
| Year 2 | 150,000 | 15% | ₹38.2 Cr |
| Year 3 | 300,000 | 30% | ₹76.4 Cr |

### Market Drivers

```
┌─────────────────────────────────────────────────────────────────┐
│                    GROWTH DRIVERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GIG ECONOMY EXPANSION                                       │
│     ├─ Food delivery market growing at 25-30% CAGR              │
│     ├─ Quick commerce creating new delivery demand              │
│     └─ Tier 2/3 city expansion                                  │
│                                                                 │
│  2. REGULATORY TAILWINDS                                        │
│     ├─ Social Security Code 2020 for gig workers                │
│     ├─ State-level gig worker welfare bills                     │
│     └─ IRDAI sandbox for parametric insurance                   │
│                                                                 │
│  3. AWARENESS & DEMAND                                          │
│     ├─ Increasing worker awareness of income risks              │
│     ├─ Platform-level discussions on worker welfare             │
│     └─ Union advocacy for better protections                    │
│                                                                 │
│  4. TECHNOLOGY ENABLEMENT                                       │
│     ├─ UPI enabling micro-transactions                          │
│     ├─ Smartphone penetration among workers                     │
│     └─ Real-time data availability                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Competitive Landscape

| Category | Players | FairRoute Differentiation |
|----------|---------|---------------------------|
| Traditional Insurers | HDFC Ergo, ICICI Lombard | Parametric vs. claim-based |
| Microinsurance | Toffee, Digit | Gig-specific vs. generic |
| Platform Benefits | Swiggy Shield | Independent vs. platform-locked |
| Embedded Insurance | Acko | Income-focused vs. health/accident |

### Unit Economics

**Per User Economics (Standard Shield - ₹49/week):**

| Metric | Value |
|--------|-------|
| Annual Premium per User | ₹2,548 |
| Expected Loss Ratio | 65% |
| Expected Payouts per User | ₹1,656 |
| Gross Margin | ₹892 (35%) |
| CAC (Customer Acquisition) | ₹200 |
| Servicing Cost | ₹150 |
| Net Margin per User | ₹542 (21%) |
| LTV (3-year) | ₹1,626 |
| LTV:CAC Ratio | 8.1x |

---

## 10. Wireframes

### Mobile App Screens

#### 1. Onboarding Flow

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│         WELCOME SCREEN          │     │         KYC VERIFICATION        │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│                                 │     │                                 │
│      ┌─────────────────┐        │     │   Verify Your Identity          │
│      │   FAIRROUTE     │        │     │                                 │
│      │      LOGO       │        │     │   ┌─────────────────────────┐   │
│      └─────────────────┘        │     │   │                         │   │
│                                 │     │   │   Aadhaar Verification  │   │
│   Income Protection for         │     │   │   via DigiLocker        │   │
│   Gig Workers                   │     │   │                         │   │
│                                 │     │   │   [Verify with Aadhaar] │   │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━   │     │   │                         │   │
│                                 │     │   └─────────────────────────┘   │
│   • Automatic payouts during    │     │                                 │
│     weather disruptions         │     │   ┌─────────────────────────┐   │
│                                 │     │   │                         │   │
│   • No manual claims needed     │     │   │   Bank Account/UPI      │   │
│                                 │     │   │   for Payouts           │   │
│   • Affordable weekly           │     │   │                         │   │
│     premiums                    │     │   │   [Link Bank Account]   │   │
│                                 │     │   │                         │   │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━   │     │   └─────────────────────────┘   │
│                                 │     │                                 │
│   ┌─────────────────────────┐   │     │   ┌─────────────────────────┐   │
│   │  Get Started →          │   │     │   │  Continue →             │   │
│   └─────────────────────────┘   │     │   └─────────────────────────┘   │
│                                 │     │                                 │
│   Already have account? Login   │     │   Step 2 of 4                   │
│                                 │     │                                 │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

#### 2. Plan Selection

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│       CHOOSE YOUR PLAN          │     │         PLAN DETAILS            │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│                                 │     │                                 │
│   Select coverage that fits     │     │   STANDARD SHIELD               │
│   your needs                    │     │   ━━━━━━━━━━━━━━━━              │
│                                 │     │                                 │
│   ┌─────────────────────────┐   │     │   ₹49/week                      │
│   │   BASIC SHIELD          │   │     │                                 │
│   │   ₹29/week              │   │     │   Coverage Includes:            │
│   │                         │   │     │                                 │
│   │   Max: ₹500/day         │   │     │   ✓ Heavy Rainfall              │
│   │   Weather + Zone        │   │     │   ✓ Urban Flooding              │
│   └─────────────────────────┘   │     │   ✓ Zone Shutdowns              │
│                                 │     │   ✓ Demand Drops                │
│   ┌─────────────────────────┐   │     │                                 │
│   │   STANDARD SHIELD ⭐    │   │     │   Payout Limits:                │
│   │   ₹49/week   POPULAR    │   │     │   • Up to ₹800/day              │
│   │                         │   │     │   • Up to ₹3,500/week           │
│   │   Max: ₹800/day         │   │     │   • ₹100/hour rate              │
│   │   Weather + Demand      │   │     │                                 │
│   └─────────────────────────┘   │     │   AI Recommendation:            │
│                                 │     │   ┌─────────────────────────┐   │
│   ┌─────────────────────────┐   │     │   │ Based on your zone      │   │
│   │   PREMIUM SHIELD        │   │     │   │ (Koramangala) and work  │   │
│   │   ₹79/week              │   │     │   │ hours, this plan offers │   │
│   │                         │   │     │   │ best value for you.     │   │
│   │   Max: ₹1,200/day       │   │     │   └─────────────────────────┘   │
│   │   All Coverage          │   │     │                                 │
│   └─────────────────────────┘   │     │   ┌─────────────────────────┐   │
│                                 │     │   │  Select This Plan →     │   │
│   Compare Plans →               │     │   └─────────────────────────┘   │
│                                 │     │                                 │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

#### 3. Home Dashboard

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│          HOME SCREEN            │     │       ACTIVE TRIGGER            │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│                                 │     │                                 │
│   Hi, Ramesh 👋                 │     │   ⚠️ TRIGGER ACTIVE             │
│                                 │     │                                 │
│   ┌─────────────────────────┐   │     │   Heavy Rainfall Alert          │
│   │   YOUR COVERAGE         │   │     │   Koramangala Zone              │
│   │                         │   │     │                                 │
│   │   Standard Shield       │   │     │   ━━━━━━━━━━━━━━━━━━━━━━━━━    │
│   │   ✓ Active              │   │     │                                 │
│   │                         │   │     │   Started: 2:30 PM              │
│   │   Next Premium: Mar 10  │   │     │   Duration: 2h 15m              │
│   └─────────────────────────┘   │     │   Rainfall: 45mm                │
│                                 │     │                                 │
│   ┌─────────────────────────┐   │     │   Your Estimated Payout:        │
│   │   ZONE STATUS           │   │     │   ┌─────────────────────────┐   │
│   │                         │   │     │   │                         │   │
│   │   🟢 Normal             │   │     │   │      ₹270               │   │
│   │   No active triggers    │   │     │   │      (so far)           │   │
│   │                         │   │     │   │                         │   │
│   └─────────────────────────┘   │     │   │   2.25 hrs × ₹100/hr    │   │
│                                 │     │   │   × 1.2x severity       │   │
│   ┌─────────────────────────┐   │     │   │                         │   │
│   │   THIS WEEK             │   │     │   └─────────────────────────┘   │
│   │                         │   │     │                                 │
│   │   Premium Paid: ₹49     │   │     │   Payout will be credited       │
│   │   Payouts: ₹0           │   │     │   automatically when trigger    │
│   │   Triggers: 0           │   │     │   ends.                         │
│   └─────────────────────────┘   │     │                                 │
│                                 │     │   ┌─────────────────────────┐   │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━   │     │   │  View Details →         │   │
│   🏠 Home  📊 History  ⚙️ More │     │   └─────────────────────────┘   │
│                                 │     │                                 │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

#### 4. Payout History

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│        PAYOUT HISTORY           │     │        PAYOUT DETAILS           │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│                                 │     │                                 │
│   Your Payouts                  │     │   Payout #FR-2024-0892          │
│                                 │     │                                 │
│   This Month: ₹1,240            │     │   ━━━━━━━━━━━━━━━━━━━━━━━━━    │
│   All Time: ₹4,820              │     │                                 │
│                                 │     │   ✓ COMPLETED                   │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━   │     │   Credited on Jul 15, 5:30 PM   │
│                                 │     │                                 │
│   ┌─────────────────────────┐   │     │   Amount: ₹720                  │
│   │  Jul 15   Heavy Rain    │   │     │                                 │
│   │  ✓ ₹720   Koramangala   │   │     │   ━━━━━━━━━━━━━━━━━━━━━━━━━    │
│   └─────────────────────────┘   │     │                                 │
│                                 │     │   CALCULATION BREAKDOWN         │
│   ┌─────────────────────────┐   │     │                                 │
│   │  Jul 8    Zone Closure  │   │     │   Lost Hours:      6 hours      │
│   │  ✓ ₹520   Indiranagar   │   │     │   Hourly Rate:     ₹100         │
│   └─────────────────────────┘   │     │   Base Amount:     ₹600         │
│                                 │     │   Severity:        1.2x         │
│   ┌─────────────────────────┐   │     │   Final Amount:    ₹720         │
│   │  Jun 29   Demand Drop   │   │     │                                 │
│   │  ✓ ₹380   HSR Layout    │   │     │   ━━━━━━━━━━━━━━━━━━━━━━━━━    │
│   └─────────────────────────┘   │     │                                 │
│                                 │     │   TRIGGER DETAILS               │
│   ┌─────────────────────────┐   │     │                                 │
│   │  Jun 22   Heavy Rain    │   │     │   Type: Heavy Rainfall          │
│   │  ✓ ₹480   BTM Layout    │   │     │   Zone: Koramangala             │
│   └─────────────────────────┘   │     │   Duration: 6 hours             │
│                                 │     │   Rainfall: 52mm                │
│   Show More ↓                   │     │   Source: IMD + OpenWeather     │
│                                 │     │                                 │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━   │     │   ┌─────────────────────────┐   │
│   🏠 Home  📊 History  ⚙️ More │     │   │  Download Receipt →     │   │
│                                 │     │   └─────────────────────────┘   │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

#### 5. Weather Forecast & Alerts

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│      WEATHER & PREDICTIONS      │     │         ZONE DETAILS            │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│                                 │     │                                 │
│   Your Zone: Koramangala        │     │   KORAMANGALA                   │
│                                 │     │   Bengaluru, Karnataka          │
│   ┌─────────────────────────┐   │     │                                 │
│   │   CURRENT CONDITIONS    │   │     │   ━━━━━━━━━━━━━━━━━━━━━━━━━    │
│   │                         │   │     │                                 │
│   │   🌤️ 28°C               │   │     │   RISK ASSESSMENT               │
│   │   Partly Cloudy         │   │     │                                 │
│   │   Humidity: 65%         │   │     │   Weather Risk:    ██████░░ 72  │
│   └─────────────────────────┘   │     │   Demand Stability: █████░░░ 58 │
│                                 │     │   Overall Risk:     █████░░░ 65 │
│   ┌─────────────────────────┐   │     │                                 │
│   │   AI PREDICTION         │   │     │   ━━━━━━━━━━━━━━━━━━━━━━━━━    │
│   │                         │   │     │                                 │
│   │   ⚠️ 68% chance of      │   │     │   RECENT TRIGGERS               │
│   │   heavy rain tomorrow   │   │     │                                 │
│   │   evening (5-9 PM)      │   │     │   Jul 15 - Heavy Rain           │
│   │                         │   │     │   Jul 8  - Zone Closure         │
│   │   Potential trigger     │   │     │   Jun 22 - Heavy Rain           │
│   │   event                 │   │     │                                 │
│   └─────────────────────────┘   │     │   ━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                 │     │                                 │
│   ┌─────────────────────────┐   │     │   COVERAGE STATUS               │
│   │   7-DAY FORECAST        │   │     │                                 │
│   │                         │   │     │   ✓ Weather Coverage Active     │
│   │   Mon  Tue  Wed  Thu    │   │     │   ✓ Zone Shutdown Active        │
│   │   🌤️   🌧️   🌧️   ⛅     │   │     │   ✓ Demand Drop Active          │
│   │   28°  25°  24°  27°    │   │     │                                 │
│   │                         │   │     │   You're protected!             │
│   └─────────────────────────┘   │     │                                 │
│                                 │     │   ┌─────────────────────────┐   │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━   │     │   │  Change Zone →          │   │
│   🏠 Home  📊 History  ⚙️ More │     │   └─────────────────────────┘   │
│                                 │     │                                 │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

### Admin Dashboard Wireframes

```
┌────────────────────────────────────────────────────────────────────────────┐
│  FAIRROUTE ADMIN DASHBOARD                                    👤 Admin ▼  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Overview │ │ Workers  │ │ Triggers │ │ Payouts  │ │ Analytics│         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                            │
│  QUICK STATS                                                               │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ Active Workers │ │ Active Triggers│ │ Today's Payouts│ │ Premium Rev. │ │
│  │    12,847      │ │       3        │ │   ₹2,34,500    │ │  ₹6,29,503   │ │
│  │   ↑ 5.2%       │ │   Mumbai(2)    │ │   847 workers  │ │   This Week  │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └──────────────┘ │
│                                                                            │
│  ┌─────────────────────────────────────┐ ┌────────────────────────────────┐│
│  │ ACTIVE TRIGGERS                     │ │ PAYOUT TREND (7 Days)          ││
│  │                                     │ │                                ││
│  │ ⚠️ Heavy Rain - Mumbai Andheri     │ │    ₹3L ┤      ╭─╮              ││
│  │   Started: 2:30 PM | Duration: 3h   │ │        │    ╭─╯ │              ││
│  │   Affected Workers: 342             │ │    ₹2L ┤ ╭──╯   ╰─╮           ││
│  │                                     │ │        │╭╯        ╰─╮         ││
│  │ ⚠️ Heavy Rain - Mumbai Goregaon    │ │    ₹1L ┼╯            ╰─        ││
│  │   Started: 2:45 PM | Duration: 3h   │ │        │                       ││
│  │   Affected Workers: 198             │ │        └──────────────────────│││
│  │                                     │ │         Mon Tue Wed Thu Fri   ││
│  └─────────────────────────────────────┘ └────────────────────────────────┘│
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ RECENT PAYOUTS                                                      │   │
│  │                                                                     │   │
│  │ Worker          │ Zone           │ Trigger      │ Amount  │ Status │   │
│  │ ────────────────┼────────────────┼──────────────┼─────────┼────────│   │
│  │ Ramesh K.       │ Koramangala    │ Heavy Rain   │ ₹720    │ ✓ Sent │   │
│  │ Priya S.        │ HSR Layout     │ Demand Drop  │ ₹480    │ ✓ Sent │   │
│  │ Suresh M.       │ Whitefield     │ Heavy Rain   │ ₹640    │ Pending│   │
│  │ Lakshmi R.      │ Indiranagar    │ Heavy Rain   │ ₹560    │ Pending│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Sources

### Primary Research Sources

| Source | Topic | Link |
|--------|-------|------|
| Harvard Business Review | Gig Work & Extreme Weather | [HBR Article](https://hbr.org) |
| Inc42 | Gig Economy Report | [Inc42 Report](https://inc42.com) |
| Economic Times | Gig Economy Algorithm Transparency | [ET Article](https://economictimes.com) |
| Fairwork India | Platform Ratings & Audits | [Fairwork Report](https://fair.work) |

### Industry Reports

- NITI Aayog – India's Booming Gig and Platform Economy (2022)
- Boston Consulting Group – Unlocking the Potential of the Gig Economy (2021)
- Nasscom – The Rise of Gig Economy in India
- World Economic Forum – Future of Work Report

### Gig Worker Community Reports

- Indian Federation of App-Based Transport Workers (IFAT)
- Gig Workers Association Reports
- All India Gig Workers Union Publications

### Government & Regulatory Sources

- Ministry of Labour and Employment – Social Security Code 2020
- IRDAI – Regulatory Sandbox Framework
- e-Shram Portal Statistics

### Weather & Environmental Data

- India Meteorological Department (IMD)
- OpenWeather API Documentation
- Central Pollution Control Board – Air Quality Data

---

## License

MIT License - See LICENSE file for details

---

## Contact

**FairRoute Team**

- Website: [fairroute.in](https://fairroute.in)
- Email: contact@fairroute.in
- Twitter: [@FairRouteIndia](https://twitter.com/FairRouteIndia)

---

<p align="center">
  <strong>FairRoute</strong> — Financial Security for the Gig Economy
  <br>
  <em>Protecting India's delivery workforce through AI-powered parametric insurance</em>
</p>
