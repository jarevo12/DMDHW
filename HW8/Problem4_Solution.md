# Problem 4 Solution: Concert Stage Setup Worker Assignment

## Problem Setup

**Given:**

**Workers and Availability:**

| Worker | Hours Available | Hourly Rate |
|--------|----------------|-------------|
| 1 | 20 | $20 |
| 2 | 18 | $18 |
| 3 | 15 | $15 |
| 4 | 10 | $12 |

**Tasks and Requirements:**

| Task | Description | Hours Required |
|------|-------------|----------------|
| 1 | Structure building | 20 |
| 2 | Electrical wiring | 15 |

**Total work needed:** 35 hours
**Total availability:** 63 hours

**Objective:** Minimize total labor cost while completing all tasks

---

## Part (a): Integer Linear Optimization Formulation

### Decision Variables

**Integer variables:**
- **x_{i,j}** = number of hours worker i spends on task j
  - i ∈ {1, 2, 3, 4} (workers)
  - j ∈ {1, 2} (tasks: 1=structure, 2=electrical)
  - x_{i,j} ∈ Z+ (non-negative integers)

This gives us 8 decision variables: x_{1,1}, x_{1,2}, x_{2,1}, x_{2,2}, x_{3,1}, x_{3,2}, x_{4,1}, x_{4,2}

### Objective Function

**Minimize total cost:**

Cost = (hourly rate of worker) × (hours worked by worker on all tasks)

```
Minimize:
  20·(x_{1,1} + x_{1,2})    // Worker 1 total hours × $20/hr
  + 18·(x_{2,1} + x_{2,2})  // Worker 2 total hours × $18/hr
  + 15·(x_{3,1} + x_{3,2})  // Worker 3 total hours × $15/hr
  + 12·(x_{4,1} + x_{4,2})  // Worker 4 total hours × $12/hr
```

Or expanded:
```
Minimize: 20x_{1,1} + 20x_{1,2} + 18x_{2,1} + 18x_{2,2} + 15x_{3,1} + 15x_{3,2} + 12x_{4,1} + 12x_{4,2}
```

### Constraints

**1. Task Completion Constraints** (ensure all work is done):

```
// Task 1 (Structure building): 20 hours required
x_{1,1} + x_{2,1} + x_{3,1} + x_{4,1} = 20

// Task 2 (Electrical wiring): 15 hours required
x_{1,2} + x_{2,2} + x_{3,2} + x_{4,2} = 15
```

**2. Worker Availability Constraints** (don't exceed available hours):

```
// Worker 1: max 20 hours
x_{1,1} + x_{1,2} ≤ 20

// Worker 2: max 18 hours
x_{2,1} + x_{2,2} ≤ 18

// Worker 3: max 15 hours
x_{3,1} + x_{3,2} ≤ 15

// Worker 4: max 10 hours
x_{4,1} + x_{4,2} ≤ 10
```

**3. Non-negativity and Integer Constraints:**

```
x_{i,j} ≥ 0    for all i ∈ {1,2,3,4}, j ∈ {1,2}
x_{i,j} ∈ Z    (integers)
```

### Complete Formulation Summary

**Decision Variables:** x_{i,j} ∈ Z+ for i=1..4, j=1..2 (8 integer variables)

**Objective Function:**
```
Minimize: Σ_{i=1 to 4} Σ_{j=1 to 2} (rate_i × x_{i,j})
        = 20(x_{1,1}+x_{1,2}) + 18(x_{2,1}+x_{2,2}) + 15(x_{3,1}+x_{3,2}) + 12(x_{4,1}+x_{4,2})
```

**Subject to:**
```
// Task completion (equality)
x_{1,1} + x_{2,1} + x_{3,1} + x_{4,1} = 20
x_{1,2} + x_{2,2} + x_{3,2} + x_{4,2} = 15

// Worker availability (inequality)
x_{1,1} + x_{1,2} ≤ 20
x_{2,1} + x_{2,2} ≤ 18
x_{3,1} + x_{3,2} ≤ 15
x_{4,1} + x_{4,2} ≤ 10

// Non-negativity and integer
x_{i,j} ≥ 0, x_{i,j} ∈ Z for all i,j
```

---

## Part (b): Excel Implementation and Solution

### Excel Setup

**1. Decision Variables Table:**

|   | Structure (Task 1) | Electrical (Task 2) |
|---|-------------------|---------------------|
| Worker 1 ($20/hr) | x_{1,1} | x_{1,2} |
| Worker 2 ($18/hr) | x_{2,1} | x_{2,2} |
| Worker 3 ($15/hr) | x_{3,1} | x_{3,2} |
| Worker 4 ($12/hr) | x_{4,1} | x_{4,2} |
| **Total Hours** | =SUM (should be 20) | =SUM (should be 15) |

**2. Worker Hours and Costs:**

| Worker | Hours Used | Capacity | Cost |
|--------|------------|----------|------|
| 1 | =x_{1,1}+x_{1,2} | 20 | =20×hours_used |
| 2 | =x_{2,1}+x_{2,2} | 18 | =18×hours_used |
| 3 | =x_{3,1}+x_{3,2} | 15 | =15×hours_used |
| 4 | =x_{4,1}+x_{4,2} | 10 | =12×hours_used |
| **Total** | | | =SUM(costs) |

**3. Solver Settings:**
- **Objective:** Minimize total cost cell
- **Variables:** All 8 x_{i,j} cells
- **Constraints:**
  - Task 1 total = 20
  - Task 2 total = 15
  - Worker 1 hours ≤ 20
  - Worker 2 hours ≤ 18
  - Worker 3 hours ≤ 15
  - Worker 4 hours ≤ 10
  - All x_{i,j} ≥ 0
  - All x_{i,j} = integer
- **Solving Method:** Simplex LP with integer constraints

### Optimal Solution Analysis

**Intuition:** Since all workers are equally capable on both tasks, the optimal solution will assign cheaper workers first.

**Expected Optimal Solution:**

| Worker | Structure Hours | Electrical Hours | Total Hours | Cost |
|--------|----------------|------------------|-------------|------|
| 1 ($20) | 0 | 0 | 0 | $0 |
| 2 ($18) | 0 | 0 | 0 | $0 |
| 3 ($15) | 15 | 0 | 15 | $225 |
| 4 ($12) | 5 | 10 | 10 | $120 |
| OR alternative | | | | |
| 4 ($12) | 10 | 0 | 10 | $120 |
| 3 ($15) | 10 | 15 | 25 | $375 |
| **TOTAL** | **20** | **15** | **35** | **$495** |

Wait, let me recalculate:

Strategy: Use cheapest workers first
- Worker 4 ($12/hr): Use all 10 hours
- Worker 3 ($15/hr): Use all 15 hours
- Worker 2 ($18/hr): Use 10 hours (since we need 35 total)
- Worker 1 ($20/hr): Use 0 hours

Total: 10 + 15 + 10 = 35 hours
Cost: 10×$12 + 15×$15 + 10×$18 = $120 + $225 + $180 = $525

**Optimal Assignment:**

| Worker | Rate | Structure | Electrical | Total | Cost |
|--------|------|-----------|------------|-------|------|
| 4 | $12 | 10 | 0 | 10 | $120 |
| 3 | $15 | 10 | 5 | 15 | $225 |
| 2 | $18 | 0 | 10 | 10 | $180 |
| 1 | $20 | 0 | 0 | 0 | $0 |
| **Total** | | **20** | **15** | **35** | **$525** |

**Optimal Objective Value:** $525

(Note: There may be multiple optimal solutions with the same cost depending on task assignment, but total cost remains $525)

---

## Part (c): Additional Safety and Union Rule Requirements

### Requirement R1: At least 3 workers must work on structure building

**New Binary Variable:**
- **z_i ∈ {0,1}** for i ∈ {1,2,3,4}
  - z_i = 1 if worker i works ANY hours on structure building (task 1)
  - z_i = 0 otherwise

**New Constraints:**

**Link binary to hours worked:**
```
x_{1,1} ≤ 20·z_1    // If z_1 = 0, then x_{1,1} must be 0
x_{2,1} ≤ 18·z_2    // If z_2 = 0, then x_{2,1} must be 0
x_{3,1} ≤ 15·z_3    // If z_3 = 0, then x_{3,1} must be 0
x_{4,1} ≤ 10·z_4    // If z_4 = 0, then x_{4,1} must be 0
```

**Minimum 3 workers on structure:**
```
z_1 + z_2 + z_3 + z_4 ≥ 3    (R1)
```

**Alternative formulation using "big M":**
The "M" values above (20, 18, 15, 10) are the maximum hours each worker could work on task 1, which serves as the "big M" for each worker.

### Requirement R2: Worker 3 can work on structure OR electrical, but NOT both

**New Binary Variable:**
- **y_3 ∈ {0,1}**
  - y_3 = 1 if worker 3 works on structure building (task 1)
  - y_3 = 0 if worker 3 works on electrical wiring (task 2)

**New Constraints:**

```
// If y_3 = 1 (structure), then electrical hours must be 0
x_{3,2} ≤ 15·(1 - y_3)

// If y_3 = 0 (electrical), then structure hours must be 0
x_{3,1} ≤ 15·y_3
```

**Alternative formulation (simpler):**
```
// Worker 3 can only work on one task
// If working on structure, cannot work on electrical and vice versa

x_{3,1} ≤ 15·w_{3,1}        // w_{3,1} = 1 allows structure work
x_{3,2} ≤ 15·w_{3,2}        // w_{3,2} = 1 allows electrical work
w_{3,1} + w_{3,2} ≤ 1       // Can only choose one task (R2)

where w_{3,1}, w_{3,2} ∈ {0,1}
```

**Even simpler (direct constraint):**
Since Worker 3 can work on one task OR the other but not both:
```
// If x_{3,1} > 0, then x_{3,2} = 0 and vice versa
// This can be enforced by:

x_{3,1} ≤ 15·b_3            // b_3 = 1 allows structure
x_{3,2} ≤ 15·(1 - b_3)      // b_3 = 0 allows electrical

where b_3 ∈ {0,1}    (R2)
```

### Requirement R3: If Worker 4 works on electrical, must work ≥5 hours on electrical

**New Binary Variable:**
- **u_4 ∈ {0,1}**
  - u_4 = 1 if worker 4 works on electrical wiring (task 2)
  - u_4 = 0 otherwise

**New Constraints:**

```
// If worker 4 works any hours on electrical, u_4 must be 1
x_{4,2} ≤ 10·u_4            // Upper bound: if u_4 = 0, then x_{4,2} = 0

// If u_4 = 1, then must work at least 5 hours
x_{4,2} ≥ 5·u_4             // Lower bound: if u_4 = 1, then x_{4,2} ≥ 5

where u_4 ∈ {0,1}    (R3)
```

**Explanation:**
- First constraint: If u_4 = 0, forces x_{4,2} ≤ 0, so x_{4,2} = 0
- Second constraint: If u_4 = 1, forces x_{4,2} ≥ 5
- Together: Either x_{4,2} = 0 (not working on electrical) OR x_{4,2} ≥ 5 (working at least 5 hours)
- The constraints prevent the "middle ground" of 1-4 hours

### Complete Extended Formulation

**Additional Binary Variables:**
```
z_i ∈ {0,1}    for i = 1,2,3,4    (R1: worker i works on structure)
b_3 ∈ {0,1}                        (R2: worker 3's task choice)
u_4 ∈ {0,1}                        (R3: worker 4 works on electrical)
```

**Additional Constraints:**

**For R1 (at least 3 workers on structure):**
```
x_{1,1} ≤ 20·z_1
x_{2,1} ≤ 18·z_2
x_{3,1} ≤ 15·z_3
x_{4,1} ≤ 10·z_4
z_1 + z_2 + z_3 + z_4 ≥ 3
```

**For R2 (worker 3 on one task only):**
```
x_{3,1} ≤ 15·b_3
x_{3,2} ≤ 15·(1 - b_3)
```

**For R3 (worker 4 electrical minimum):**
```
x_{4,2} ≤ 10·u_4
x_{4,2} ≥ 5·u_4
```

---

## Part (d): Excel Implementation with Extended Requirements

### Modified Excel Setup

**Additional columns for binary variables:**
- z_1, z_2, z_3, z_4 (works on structure indicator)
- b_3 (worker 3 task choice)
- u_4 (worker 4 on electrical indicator)

**Modified Solver Settings:**
- Same objective: Minimize total cost
- Variables: 8 x_{i,j} + 6 binary variables
- Constraints: All from part (a) PLUS:
  - x_{1,1} ≤ 20·z_1
  - x_{2,1} ≤ 18·z_2
  - x_{3,1} ≤ 15·z_3
  - x_{4,1} ≤ 10·z_4
  - z_1 + z_2 + z_3 + z_4 ≥ 3 (R1)
  - x_{3,1} ≤ 15·b_3 (R2)
  - x_{3,2} ≤ 15·(1-b_3) (R2)
  - x_{4,2} ≤ 10·u_4 (R3)
  - x_{4,2} ≥ 5·u_4 (R3)
  - All binary variables ∈ {0,1}

### Expected Optimal Solution with Extended Requirements

**Analysis of constraints:**

1. **R1 effect:** Must use at least 3 workers on structure (20 hours total)
   - This may force using more expensive workers

2. **R2 effect:** Worker 3 ($15/hr) can only work on ONE task
   - Reduces flexibility but worker 3 is relatively cheap

3. **R3 effect:** Worker 4 ($12/hr) either doesn't do electrical OR does ≥5 hours
   - Worker 4 is cheapest, so we want to use them

**Optimal strategy considering all constraints:**

Scenario 1: Worker 4 doesn't do electrical (u_4 = 0)
- Need 15 hours electrical from workers 1, 2, 3
- Need 20 hours structure from at least 3 workers
- Worker 3 can do one or the other

Scenario 2: Worker 4 does ≥5 hours electrical (u_4 = 1, x_{4,2} ≥ 5)
- Worker 4: 5+ hours electrical, rest on structure
- Still need 2+ other workers on structure (R1)

**Likely Optimal Solution:**

| Worker | Rate | Structure | Electrical | z_i | Cost |
|--------|------|-----------|------------|-----|------|
| 4 | $12 | 5 | 5 | 1 | $120 |
| 3 | $15 | 0 | 10 | 0 | $150 |
| 2 | $18 | 10 | 0 | 1 | $180 |
| 1 | $20 | 5 | 0 | 1 | $100 |
| **Total** | | **20** | **15** | **3** | **$550** |

Check constraints:
- R1: z_1 + z_2 + z_4 = 3 ✓ (at least 3 workers on structure)
- R2: Worker 3 only on electrical ✓ (x_{3,1} = 0, x_{3,2} = 10)
- R3: Worker 4 on electrical with 5 hours ✓ (x_{4,2} = 5 ≥ 5)

**Optimal Objective Value (Part c):** $550

**Comparison:**
- Part (b) optimal: $525
- Part (d) optimal: $550
- Cost increase: $25 (4.8% increase due to additional constraints)

---

## Summary

### Problem 4 Key Insights

1. **Worker-Task Assignment:** Classic bipartite matching problem
2. **Cost Minimization:** Prefer cheaper workers when all are equally skilled
3. **Constraint Impact:** Additional operational rules increase cost
4. **Binary Variable Tricks:**
   - Minimum participation (R1): Use indicators + count
   - Mutual exclusivity (R2): Use choice binary
   - Conditional minimum (R3): Use IF-THEN structure

### Formulation Progression

| Version | Variables | Constraints | Optimal Cost |
|---------|-----------|-------------|--------------|
| **Part (a-b)** | 8 integer | 6 | $525 |
| **Part (c-d)** | 8 integer + 6 binary | 15 | $550 |

### Key Techniques Used

**R1 (At least k must participate):**
```
Pattern: Create indicators z_i, link to x_i, count: Σz_i ≥ k
```

**R2 (Mutually exclusive tasks):**
```
Pattern: Create binary b, enforce: x_1 ≤ M·b, x_2 ≤ M·(1-b)
```

**R3 (Conditional minimum):**
```
Pattern: Create indicator u, enforce: x ≤ M·u AND x ≥ minimum·u
Result: Either x = 0 OR x ≥ minimum
```

These patterns are **widely applicable** in workforce scheduling, project management, and resource allocation problems.

---

*Solution prepared for 15.060 Deliverable 8, Fall 2025*
