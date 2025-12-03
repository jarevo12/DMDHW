# Problem 2 Solution: Call Center Operator Scheduling

## Problem Setup

**Given:**
- 10 operators (A through J)
- Operating hours: 7AM - 7PM (12 hours total)
- Hourly requirements vary by time slot

**Minimum Required Operators by Hour:**

| Hour | 7-8 | 8-9 | 9-10 | 10-11 | 11-12 | 12-1 | 1-2 | 2-3 | 3-4 | 4-5 | 5-6 | 6-7 |
|------|-----|-----|------|-------|-------|------|-----|-----|-----|-----|-----|-----|
| Min  | 2   | 3   | 5    | 8     | 7     | 5    | 6   | 7   | 5   | 5   | 4   | 4   |

**Pay Rates:**
- **Peak hours** (9AM-5PM): $18/hour (including lunch break)
- **Off-peak hours** (7-9AM, 5-7PM): $25/hour

**Constraints:**
1. Each operator works exactly 7 hours (not counting lunch)
2. Each operator gets 1-hour lunch between 11AM-2PM
3. Total shift span ≤ 10 hours (first hour to last hour)

**Objective:** Minimize total daily cost

---

## Part (a): Integer Linear Optimization Formulation

### Decision Variables

**Primary Binary Variables:**
- **y_{o,h} ∈ {0,1}** for operator o ∈ {A,B,C,D,E,F,G,H,I,J} and hour h ∈ {1,2,...,12}
  - y_{o,h} = 1 if operator o works during hour h
  - y_{o,h} = 0 otherwise

**Hour numbering:**
- h=1: 7-8AM
- h=2: 8-9AM
- h=3: 9-10AM (start of $18 rate)
- h=4: 10-11AM
- h=5: 11-12PM
- h=6: 12-1PM
- h=7: 1-2PM
- h=8: 2-3PM
- h=9: 3-4PM (end of $18 rate)
- h=10: 4-5PM
- h=11: 5-6PM (start of $25 rate)
- h=12: 6-7PM

**Auxiliary Binary Variables for Lunch:**
- **L_{o,h} ∈ {0,1}** for operator o and h ∈ {5,6,7} (11AM-12PM, 12-1PM, 1-2PM)
  - L_{o,h} = 1 if operator o takes lunch during hour h
  - L_{o,h} = 0 otherwise

### Objective Function

**Cost Calculation:**
- Hours 1-2 (7-9AM): $25/hour
- Hours 3-10 (9AM-5PM): $18/hour (including lunch - operators paid during lunch)
- Hours 11-12 (5-7PM): $25/hour

Note: Lunch hours (11AM-2PM) are all within the $18 rate period, so lunches are paid at $18/hour.

```
Minimize:
  Σ_{o=A to J} [
    25·(y_{o,1} + y_{o,2})                    // 7-9AM at $25/hour
    + 18·(y_{o,3} + y_{o,4} + y_{o,5} + y_{o,6} + y_{o,7} + y_{o,8} + y_{o,9} + y_{o,10})  // 9AM-5PM at $18/hour
    + 25·(y_{o,11} + y_{o,12})                // 5-7PM at $25/hour
    + 18·(L_{o,5} + L_{o,6} + L_{o,7})        // Lunch hours paid at $18/hour
  ]
```

Simplified:
```
Minimize:
  25·Σ_{o,h∈{1,2}} y_{o,h}
  + 18·Σ_{o,h∈{3,...,10}} y_{o,h}
  + 25·Σ_{o,h∈{11,12}} y_{o,h}
  + 18·Σ_{o,h∈{5,6,7}} L_{o,h}
```

### Constraints

**1. Work Exactly 7 Hours (per operator):**
```
Σ_{h=1 to 12} y_{o,h} = 7    for each operator o ∈ {A,...,J}
```

**2. Exactly One Lunch Hour (per operator):**
```
L_{o,5} + L_{o,6} + L_{o,7} = 1    for each operator o
```
Each operator takes exactly one lunch during 11AM-2PM window.

**3. Cannot Work During Lunch:**
```
y_{o,h} + L_{o,h} ≤ 1    for each operator o and h ∈ {5,6,7}
```
If taking lunch at hour h, cannot also work during hour h.

**4. Minimum Coverage Requirements:**
```
Σ_{o=A to J} y_{o,1} ≥ 2     // 7-8AM
Σ_{o=A to J} y_{o,2} ≥ 3     // 8-9AM
Σ_{o=A to J} y_{o,3} ≥ 5     // 9-10AM
Σ_{o=A to J} y_{o,4} ≥ 8     // 10-11AM
Σ_{o=A to J} y_{o,5} ≥ 7     // 11-12PM
Σ_{o=A to J} y_{o,6} ≥ 5     // 12-1PM
Σ_{o=A to J} y_{o,7} ≥ 6     // 1-2PM
Σ_{o=A to J} y_{o,8} ≥ 7     // 2-3PM
Σ_{o=A to J} y_{o,9} ≥ 5     // 3-4PM
Σ_{o=A to J} y_{o,10} ≥ 5    // 4-5PM
Σ_{o=A to J} y_{o,11} ≥ 4    // 5-6PM
Σ_{o=A to J} y_{o,12} ≥ 4    // 6-7PM
```

**5. Shift Span ≤ 10 Hours (per operator):**

This constraint requires that if operator o works, the time from their first working hour to their last working hour cannot exceed 10 hours.

Need auxiliary binary variables:
- **F_{o,h} ∈ {0,1}**: F_{o,h} = 1 if hour h is the first hour operator o works
- **La_{o,h} ∈ {0,1}**: La_{o,h} = 1 if hour h is the last hour operator o works

Constraints to define first and last hours:
```
// Exactly one first hour per operator (if they work)
Σ_{h=1 to 12} F_{o,h} = 1    for each operator o

// Exactly one last hour per operator (if they work)
Σ_{h=1 to 12} La_{o,h} = 1    for each operator o

// If F_{o,h} = 1, then all hours before h must be 0
Σ_{t=1 to h-1} y_{o,t} ≤ (h-1)·(1 - F_{o,h})    for each o, h

// If F_{o,h} = 1, then hour h must be worked
y_{o,h} ≥ F_{o,h}    for each o, h

// If La_{o,h} = 1, then all hours after h must be 0
Σ_{t=h+1 to 12} y_{o,t} ≤ (12-h)·(1 - La_{o,h})    for each o, h

// If La_{o,h} = 1, then hour h must be worked
y_{o,h} ≥ La_{o,h}    for each o, h

// Span constraint: last hour - first hour ≤ 9 (10-hour span)
Σ_{h=1 to 12} h·La_{o,h} - Σ_{h=1 to 12} h·F_{o,h} ≤ 9    for each o
```

**Alternative formulation for span constraint** (simpler):

Specific prohibitions based on span:
```
// If work hour 1 (7-8AM), cannot work hours 11-12 (5-7PM)
y_{o,1} + y_{o,11} ≤ 1    for each operator o
y_{o,1} + y_{o,12} ≤ 1    for each operator o

// If work hour 2 (8-9AM), cannot work hour 12 (6-7PM)
y_{o,2} + y_{o,12} ≤ 1    for each operator o
```

This simpler approach directly implements the constraint that "hours cannot span more than 10 hours."

**6. Binary Constraints:**
```
y_{o,h} ∈ {0,1}    for all operators o and hours h
L_{o,h} ∈ {0,1}    for all operators o and lunch hours h ∈ {5,6,7}
```

### Complete Formulation Summary

**Decision Variables:**
- y_{o,h} ∈ {0,1}: Whether operator o works during hour h (10 operators × 12 hours = 120 variables)
- L_{o,h} ∈ {0,1}: Whether operator o lunches during hour h (10 operators × 3 hours = 30 variables)

**Objective Function:**
```
Minimize: Cost = 25·Σ(off-peak y's) + 18·Σ(peak y's) + 18·Σ(lunch L's)
```

**Constraints:**
- 10 constraints: Each operator works 7 hours
- 10 constraints: Each operator takes 1 lunch
- 30 constraints: Cannot work during lunch hour
- 12 constraints: Minimum operator coverage per hour
- 30 constraints: Shift span ≤ 10 hours (prohibition constraints)
- Binary constraints on all variables

---

## Part (b): Excel Implementation

**Excel Setup:**

1. **Decision Variables Table:**
   - Rows: Operators A-J
   - Columns: Hours 1-12 (plus 3 lunch columns for hours 5-7)
   - Cell values: y_{o,h} (binary) and L_{o,h} (binary)

2. **Parameters Table:**
   - Hour requirements: 2, 3, 5, 8, 7, 5, 6, 7, 5, 5, 4, 4
   - Pay rates by hour: 25, 25, 18, 18, 18, 18, 18, 18, 18, 18, 25, 25

3. **Calculated Values:**
   - Hours worked per operator (row sums of y columns)
   - Operators per hour (column sums)
   - Cost per operator per hour
   - Total cost (objective)

4. **Solver Settings:**
   - Objective: Minimize total cost
   - Variables: All y_{o,h} and L_{o,h}
   - Constraints:
     - Hours per operator = 7
     - Lunch per operator = 1
     - y + L ≤ 1 for lunch hours
     - Operators per hour ≥ requirements
     - Span constraints
     - All variables binary
   - Method: Branch-and-bound / Integer programming

---

## Part (c): Optimal Schedule Report

**Note:** Without actually solving in Excel, I'll describe the expected output format:

**Optimal Schedule Table:**

| Operator | 7-8 | 8-9 | 9-10 | 10-11 | 11-12 | 12-1 | 1-2 | 2-3 | 3-4 | 4-5 | 5-6 | 6-7 | Hours | Lunch | Cost |
|----------|-----|-----|------|-------|-------|------|-----|-----|-----|-----|-----|-----|-------|-------|------|
| A | X | X | X | X | X | | X | X | | | | | 7 | 12-1 | $169 |
| B | | | X | X | X | X | | X | X | X | | | 7 | 1-2 | $144 |
| ... | | | | | | | | | | | | | | | |

Legend:
- X = Working hour
- Blank = Not working
- Hours = Total working hours (should be 7 for all)
- Lunch = Lunch hour time slot
- Cost = Daily cost for that operator

**Expected Total Daily Cost:** Approximately $1,400-$1,600 (exact value depends on solver)

**Key Insights from Optimal Solution:**
- Peak demand hours (10-11AM, 1-2PM with 8 and 7 operators) will be fully staffed
- Off-peak hours will have minimum coverage (2-4 operators)
- Lunches will be staggered to maintain coverage during 11AM-2PM
- Most operators will work during peak hours (9AM-5PM) to minimize $25/hour costs
- Very few operators will work early (7-9AM) or late (5-7PM) due to higher cost

---

## Part (d): Limiting Shift Switches (≤3 switches)

### Problem Extension

Add constraint: Each operator has **at most 3 switches** from working (on) to not working (off) during the day, including lunch breaks and end of day.

**What counts as a switch:**
- Working hour → not working hour (includes lunch)
- Last working hour → end of day

**Example:**
- Schedule: Work, Work, Off, Work, Lunch, Work, Work, Off
- Switches: [Work→Off], [Off→Work], [Work→Lunch], [Work→Off] = 4 switches
- This would violate the constraint (needs ≤3)

### New Binary Variables

**Switch indicator variables:**
- **S_{o,h} ∈ {0,1}** for operator o and hour h ∈ {1,2,...,12}
  - S_{o,h} = 1 if there is a switch from ON to OFF after hour h
  - S_{o,h} = 0 otherwise

**Working status** (for convenience):
- **W_{o,h} ∈ {0,1}** where W_{o,h} = 1 if operator o is "on duty" during hour h
  - W_{o,h} = y_{o,h} (working that hour means on duty)
  - During lunch hours: W_{o,h} = 0 (lunch counts as "off")

### New Constraints

**1. Define working status including lunch:**
```
W_{o,h} = y_{o,h}    for h ∉ {5,6,7} (non-lunch hours)
W_{o,h} ≤ 1 - L_{o,h}    for h ∈ {5,6,7} (if lunching, then not "working")
```

Actually, simpler to think of it as:
```
// For lunch hours, working status is 0 if taking lunch
W_{o,5} = y_{o,5}
W_{o,6} = y_{o,6}
W_{o,7} = y_{o,7}

// These are already constrained by y_{o,h} + L_{o,h} ≤ 1
```

**2. Identify switches (from working to not working):**

A switch occurs at hour h if:
- Operator is working/on in hour h (W_{o,h} = 1), AND
- Operator is not working/on in hour h+1 (W_{o,h+1} = 0)

```
S_{o,h} ≥ W_{o,h} - W_{o,h+1}    for h ∈ {1,2,...,11}, all operators o
```

This constraint forces:
- If W_{o,h} = 1 and W_{o,h+1} = 0, then S_{o,h} ≥ 1, so S_{o,h} = 1
- Otherwise, S_{o,h} can be 0 (will be 0 in minimization if not forced to 1)

**3. Count end-of-day switch:**

Need to detect if the operator is still working at hour 12:
```
S_{o,12} ≥ W_{o,12}    for all operators o
```

If working in the last hour, this counts as a switch (to off-duty at end of day).

**4. Limit total switches to 3:**
```
Σ_{h=1 to 12} S_{o,h} ≤ 3    for each operator o
```

**Alternative formulation without W variables:**

Since W_{o,h} is essentially y_{o,h} except during lunch:

```
// For non-lunch hours (h ∉ {5,6,7}):
S_{o,h} ≥ y_{o,h} - y_{o,h+1}    for h ∈ {1,2,3,4}, all operators o

// For lunch hours (need to account for lunch taking):
// Hour 5 (11-12PM): working → (working or lunch)
S_{o,5} ≥ y_{o,5} - y_{o,6} - L_{o,6}    for all operators o

// Hour 6 (12-1PM): (working or lunch) → (working or lunch)
S_{o,6} ≥ y_{o,6} + L_{o,6} - y_{o,7} - L_{o,7}    for all operators o
// This doesn't quite work...
```

**Better approach - explicit working status:**

Define working status for each hour including lunch:
```
// Active_{o,h} = 1 if operator is "active" (working, not at lunch) during hour h
Active_{o,h} ≤ y_{o,h}    for all o, h
Active_{o,h} ≤ 1 - L_{o,h}    for h ∈ {5,6,7}, all o
Active_{o,h} ≥ y_{o,h} - L_{o,h}    for h ∈ {5,6,7}, all o
Active_{o,h} = y_{o,h}    for h ∉ {5,6,7}, all o
```

Wait, this is getting complicated. Let me simplify:

**Cleaner formulation:**

```
// Define "on-status" O_{o,h} ∈ {0,1} for each operator and hour
// O_{o,h} = 1 means operator is actively working (not at lunch)
// O_{o,h} = 0 means operator is not working (includes lunch)

// For hours 1-4 (before lunch window):
O_{o,h} = y_{o,h}    for h ∈ {1,2,3,4}

// For hours 5-7 (lunch window):
O_{o,h} = y_{o,h}    (because y_{o,h} + L_{o,h} ≤ 1 already ensures if lunching, then not working)

// For hours 8-12 (after lunch window):
O_{o,h} = y_{o,h}    for h ∈ {8,9,10,11,12}
```

So actually, O_{o,h} = y_{o,h} for all hours, because the lunch constraints already ensure you can't work during lunch.

**Final Clean Formulation:**

**New Binary Variables:**
- **S_{o,h} ∈ {0,1}** for operator o and hour h ∈ {1,...,11}
  - S_{o,h} = 1 if operator switches from working to not-working after hour h

**New Constraints:**

**Detect switches:**
```
S_{o,h} ≥ y_{o,h} - y_{o,h+1}    for h = 1, 2, ..., 11, all operators o
```

**End-of-day switch:**
```
S_{o,12} ≥ y_{o,12}    for all operators o
```

**Limit switches:**
```
Σ_{h=1 to 12} S_{o,h} ≤ 3    for all operators o
```

**Binary:**
```
S_{o,h} ∈ {0,1}    for all o, h
```

**Explanation:**
- The constraint `S_{o,h} ≥ y_{o,h} - y_{o,h+1}` forces S_{o,h} = 1 when there's a transition from working (1) to not working (0)
- Since we're minimizing cost (not maximizing switches), S_{o,h} will be 0 unless forced to be 1
- The lunch hours are already handled because y_{o,h} = 0 during lunch (due to y_{o,h} + L_{o,h} ≤ 1 and L_{o,h} = 1)
- This counts: work→lunch, lunch→not-work, work→not-work, etc.
- The sum counts all transitions plus end-of-day

---

## Summary

### Problem 2 Key Points

1. **Binary Decision Variables:** y_{o,h} for work assignments, L_{o,h} for lunch timing
2. **Differential Pay Rates:** Higher cost for off-peak hours encourages peak-hour scheduling
3. **Coverage Requirements:** Minimum operators per hour ensures service level
4. **Span Constraints:** Limits operator inconvenience (max 10-hour window)
5. **Switch Constraints:** Reduces fragmentation of operator schedules (part d)

### Formulation Complexity

| Component | Variables | Constraints | Type |
|-----------|-----------|-------------|------|
| **Base Model (a-c)** | 150 binary | ~100 | Integer LP |
| **With Switch Limits (d)** | 270 binary | ~210 | Integer LP |

This is a classic **workforce scheduling** problem, commonly used in:
- Call centers
- Healthcare (nurse scheduling)
- Retail staffing
- Service operations

---

*Solution prepared for 15.060 Deliverable 8, Fall 2025*
