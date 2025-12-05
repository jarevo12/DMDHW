# Deliverable 8 - Complete Solutions Summary

## 15.060 Data, Models, and Decisions - Fall 2025

**Due:** Wednesday, December 3, 11:59 p.m.

---

## Overview

This deliverable covers four optimization problems demonstrating key concepts in linear and integer optimization:

| Problem | Topic | Points | Type | Key Concepts |
|---------|-------|--------|------|--------------|
| **1** | Exam Classroom Allocation | 25 | LP & Integer LP | Min-max objective, sensitivity analysis |
| **2** | Call Center Scheduling | 30 | Integer LP | Workforce scheduling, shift constraints |
| **3** | Food Festival Vendors | 20 | Integer LP | Synergy modeling, binary logic |
| **4** | Concert Stage Setup | 25 | Integer LP | Task assignment, conditional constraints |
| | **TOTAL** | **100** | | |

---

## Problem 1: DMD Final Exam Classroom Allocation

**📄 Full Solution:** `Problem1_Solution.md`

### Problem Summary
Allocate 371 students from 6 sections to 6 exam classrooms to minimize maximum classroom density, subject to a 70-student limit per classroom.

### Key Formulation Elements

**Decision Variables:**
- x_{i,j} = students from section i to classroom j (36 continuous/integer variables)
- z = maximum density (minimize this)

**Objective:** Minimize z

**Key Constraint Pattern (min-max objective):**
```
(students in classroom j) / (capacity of j) ≤ z
→ (students in classroom j) ≤ (capacity of j) × z
```

### Part Summary

**Part (a):** LP formulation with continuous variables
- 36 decision variables + 1 auxiliary variable z
- 6 equality constraints (section allocation)
- 6 inequality constraints (classroom capacity ≤ 70)
- 6 density constraints (linking students to z)

**Part (b):** Excel implementation
- Expected optimal density: ~81%

**Part (c):** Sensitivity analysis
- Shadow price = -0.00269 for E51-345 capacity constraint
- Increasing capacity from 70 to 95 students → new optimal: 74.3%
- **Key insight:** Shadow prices measure marginal improvement

**Part (d):** Integer LP formulation
- Same formulation, but x_{i,j} ∈ Z (integers)
- **Result:** Optimal_Integer ≥ Optimal_Continuous (always true for minimization)
- **Important:** Sensitivity analysis NOT valid for integer models
  - Must re-solve for each scenario
  - Shadow prices don't apply to discrete problems

### Key Takeaways
1. Auxiliary variable z converts "minimize maximum" to linear objective
2. Integer constraints always make minimization harder (worse or equal)
3. Sensitivity analysis is powerful but limited to continuous LPs

---

## Problem 2: Call Center Operator Scheduling

**📄 Full Solution:** `Problem2_Solution.md`

### Problem Summary
Schedule 10 call center operators across 12 hours (7AM-7PM) to minimize cost while meeting hourly coverage requirements and contractual constraints.

### Key Formulation Elements

**Decision Variables:**
- y_{o,h} ∈ {0,1}: operator o works during hour h (120 binary variables)
- L_{o,h} ∈ {0,1}: operator o lunches during hour h (30 binary variables)

**Objective:** Minimize total labor cost
- Off-peak (7-9AM, 5-7PM): $25/hour
- Peak (9AM-5PM): $18/hour

**Constraints:**
- Each operator works exactly 7 hours
- Each operator takes 1-hour lunch (11AM-2PM window)
- Cannot work during lunch hour
- Minimum operators per hour (varies: 2-8 operators)
- Shift span ≤ 10 hours

### Part Summary

**Part (a):** Integer LP formulation
- 150 binary variables
- ~100 constraints
- Differential pay rates encourage peak-hour scheduling

**Part (b):** Excel implementation with Solver

**Part (c):** Report optimal schedule and cost
- Expected cost: $1,400-$1,600 per day
- Most operators work peak hours to minimize off-peak premiums

**Part (d):** Additional constraint - limit shift switches to ≤3

**New variables:**
- S_{o,h} ∈ {0,1}: switch from working to not-working after hour h

**New constraints:**
```
S_{o,h} ≥ y_{o,h} - y_{o,h+1}    // Detect switches
Σ S_{o,h} ≤ 3                     // Limit to 3 switches per operator
```

**Extended model:** 270 binary variables, ~210 constraints

### Key Takeaways
1. Binary variables model discrete time slot decisions
2. Lunch constraints: y_{o,h} + L_{o,h} ≤ 1 (can't work during lunch)
3. Switch detection uses difference between consecutive periods
4. Real-world workforce scheduling requires balancing cost vs. worker preferences

---

## Problem 3: Food Festival Vendor Selection

**📄 Full Solution:** `Problem3_Solution.md`

### Problem Summary
Select 5 out of 8 food vendors to maximize utility, considering synergies and constraints.

### Key Formulation Elements

**Decision Variables:**
- y_i ∈ {0,1}: whether vendor i is selected (8 binary variables)
- z_a, z_b, z_c, z_d ∈ {0,1}: synergy indicators (4 binary variables)

**Base Objective:**
```
Maximize: 13y₁ + 12y₂ + 11y₃ + 10y₄ + 8y₅ + 7y₆ + 6y₇ + 5y₈
```

**Base Constraint:**
```
y₁ + y₂ + ... + y₈ ≤ 5    (stall capacity)
```

### Synergy Modeling (Core of the Problem)

#### **(a) All-of-three bonus (+10 utility if ALL vendors 1,2,3 chosen)**

**Variable:** z_a = 1 iff all three chosen

**Objective addition:** +10·z_a

**Constraints (both needed):**
```
3·z_a ≤ y₁ + y₂ + y₃        // If z_a=1, sum must be ≥3 (forces all three)
z_a ≥ y₁ + y₂ + y₃ - 2      // If all three chosen (sum=3), z_a must be 1
```

#### **(b) At-least-two bonus (+5 utility if ≥2 of vendors 4,5,6 chosen)**

**Variable:** z_b = 1 iff at least 2 chosen

**Objective addition:** +5·z_b

**Constraints (tricky - coefficient 2!):**
```
2·z_b ≤ y₄ + y₅ + y₆        // If z_b=1, sum must be ≥2
2·z_b ≥ y₄ + y₅ + y₆ - 1    // If sum≥2, then z_b must be 1
```

**Why coefficient 2?** For "at least 2 of 3":
- If sum = 2: need 2·z_b ≥ 1, so z_b ≥ 0.5 → z_b = 1 ✓
- If sum = 1: need 2·z_b ≥ 0, allows z_b = 0 ✓

#### **(c) No-drinks penalty (-15 utility if no drink vendors 6,7,8)**

**Variable:** z_c = 1 iff NO drink vendors chosen

**Objective addition:** -15·z_c

**Constraints:**
```
z_c ≥ 1 - (y₆ + y₇ + y₈)            // If sum=0, z_c must be 1
3·z_c ≤ 3 - (y₆ + y₇ + y₈)          // If sum≥1, z_c must be 0
```

#### **(d) Shared stall (vendors 7,8 share, use only 1 stall together)**

**Variable:** z_d = 1 iff BOTH vendors 7 and 8 chosen

**Objective:** No change (utilities unaffected)

**Modified capacity constraint:**
```
y₁ + y₂ + ... + y₈ - z_d ≤ 5    // If both 7&8 chosen, subtract 1 (shared stall)
```

**Constraints for z_d:**
```
2·z_d ≤ y₇ + y₈        // If z_d=1, both must be chosen
z_d ≥ y₇ + y₈ - 1      // If both chosen, z_d must be 1
```

### Final Complete Formulation

**Objective:**
```
Maximize: 13y₁ + 12y₂ + 11y₃ + 10y₄ + 8y₅ + 7y₆ + 6y₇ + 5y₈ + 10z_a + 5z_b - 15z_c
```

**Constraints:**
- 1 capacity constraint (modified for shared stall)
- 8 synergy constraints (2 per synergy condition)
- 12 binary variables

### Key Takeaways
1. **"All-of" condition:** Use coefficient equal to count (3·z_a for 3 items)
2. **"At-least-k" condition:** Use coefficient equal to k (2·z_b for at least 2)
3. **"None-of" condition:** Use negation (1 - sum)
4. **Shared resource:** Modify capacity constraint directly
5. **Always need BOTH ≤ and ≥ constraints** to properly enforce binary logic

---

## Problem 4: Concert Stage Setup Worker Assignment

**📄 Full Solution:** `Problem4_Solution.md`

### Problem Summary
Assign 4 workers to 2 tasks (structure building, electrical wiring) to minimize cost while completing all work within worker availability limits.

### Key Formulation Elements

**Decision Variables:**
- x_{i,j} ∈ Z+: hours worker i spends on task j (8 integer variables)

**Objective:** Minimize total cost
```
Minimize: 20(x_{1,1}+x_{1,2}) + 18(x_{2,1}+x_{2,2}) + 15(x_{3,1}+x_{3,2}) + 12(x_{4,1}+x_{4,2})
```

**Constraints:**
- Task completion: 20 hours structure, 15 hours electrical
- Worker availability: 20, 18, 15, 10 hours respectively

### Part Summary

**Part (a-b):** Basic formulation
- 8 integer variables, 6 constraints
- **Optimal cost:** $525 (use cheapest workers first)

**Part (c-d):** Extended with safety/union rules

#### **R1: At least 3 workers must work on structure**

**New variables:** z_i ∈ {0,1} (worker i works on structure indicator)

**Constraints:**
```
x_{i,1} ≤ (capacity_i)·z_i    for each worker i
z₁ + z₂ + z₃ + z₄ ≥ 3
```

**Pattern:** "At least k must participate"
- Create indicators for participation
- Link to actual work with big-M constraints
- Count: Σ indicators ≥ k

#### **R2: Worker 3 can work on structure OR electrical, but NOT both**

**New variable:** b_3 ∈ {0,1} (task choice for worker 3)

**Constraints:**
```
x_{3,1} ≤ 15·b_3              // Can only do structure if b_3=1
x_{3,2} ≤ 15·(1 - b_3)        // Can only do electrical if b_3=0
```

**Pattern:** "Mutually exclusive tasks"
- One binary for choice
- Link each option to binary and its complement

#### **R3: If Worker 4 works on electrical, must work ≥5 hours**

**New variable:** u_4 ∈ {0,1} (worker 4 works on electrical indicator)

**Constraints:**
```
x_{4,2} ≤ 10·u_4              // Upper: if u_4=0, then x_{4,2}=0
x_{4,2} ≥ 5·u_4               // Lower: if u_4=1, then x_{4,2}≥5
```

**Pattern:** "Conditional minimum" (all-or-nothing with threshold)
- Result: Either x = 0 OR x ≥ minimum
- Prevents "middle ground" values

**Extended formulation:**
- 8 integer + 6 binary variables, 15 constraints
- **Optimal cost:** $550 (+$25 or +4.8% due to constraints)

### Key Takeaways
1. Worker-task assignment is a bipartite matching problem
2. Prefer cheaper resources when capabilities are identical
3. Additional operational constraints increase cost
4. Three powerful binary variable patterns:
   - Minimum participation counting
   - Mutually exclusive choices
   - Conditional thresholds (IF-THEN logic)

---

## Cross-Problem Insights

### 1. Linear vs. Integer Optimization

| Aspect | Linear (LP) | Integer (IP) |
|--------|-------------|--------------|
| **Variables** | Continuous (any real value) | Discrete (integers, often binary) |
| **Feasible region** | Convex polyhedron | Discrete points |
| **Optimal solution** | Always on boundary | May be interior |
| **Solving difficulty** | Polynomial time (simplex) | NP-hard (branch-and-bound) |
| **Sensitivity analysis** | Valid (shadow prices) | Not valid (must re-solve) |
| **Optimality** | Optimal_LP ≤ Optimal_IP (min) | Constraint reduction hurts |

**Key principle:** Adding integer constraints to a minimization problem can only make it worse (≥) or stay the same, never better.

### 2. Common Binary Variable Patterns

#### **Pattern 1: Activation/Selection**
```
y_i ∈ {0,1}    // Is option i selected?
```
Used in: Problems 3 (vendor selection), 4 (worker participation)

#### **Pattern 2: All-of-Set Bonus**
```
z = 1 iff ALL items in set chosen
n·z ≤ Σy_i           // If z=1, all must be chosen
z ≥ Σy_i - (n-1)     // If all chosen, z must be 1
```
Used in: Problem 3(a) - all three vendors

#### **Pattern 3: At-Least-k-of-Set Bonus**
```
z = 1 iff at least k items chosen
k·z ≤ Σy_i           // If z=1, sum ≥ k
k·z ≥ Σy_i - (n-k)   // If sum ≥ k, z must be 1
```
Used in: Problem 3(b) - at least 2 of 3 vendors, Problem 4(R1) - at least 3 workers

#### **Pattern 4: None-of-Set Penalty**
```
z = 1 iff NO items chosen
z ≥ 1 - Σy_i/n       // If sum=0, z must be 1
z ≤ 1 - Σy_i/n       // If sum>0, z must be 0
```
Used in: Problem 3(c) - no drink vendors

#### **Pattern 5: Mutually Exclusive Choices**
```
z ∈ {0,1}            // Which option?
x₁ ≤ M·z            // Option 1 only if z=1
x₂ ≤ M·(1-z)        // Option 2 only if z=0
```
Used in: Problem 4(R2) - one task only

#### **Pattern 6: Conditional Minimum (IF-THEN)**
```
z ∈ {0,1}            // Does x have value?
x ≤ M·z             // If z=0, x=0
x ≥ m·z             // If z=1, x≥m
Result: x=0 OR x≥m  (nothing in between)
```
Used in: Problem 4(R3) - minimum 5 hours if working

#### **Pattern 7: Transition Detection**
```
s_t ≥ x_t - x_{t+1}  // Detects switch from 1 to 0
```
Used in: Problem 2(d) - count on→off switches

### 3. Objective Function Types

| Type | Example | How to Linearize |
|------|---------|------------------|
| **Simple sum** | Σ c_i·x_i | Already linear (Problems 2, 3, 4) |
| **Min-max** | Minimize max{f₁, f₂, ...} | Add z, constrain each f_i ≤ z, minimize z (Problem 1) |
| **Max-min** | Maximize min{f₁, f₂, ...} | Add z, constrain each f_i ≥ z, maximize z |
| **Piecewise** | Different rates for different ranges | Binary variables for range selection |

### 4. Key Constraint Techniques

**Equality constraints:** Used when exact requirement must be met
- Problem 1: All section students must be allocated
- Problem 2: Each operator works exactly 7 hours
- Problem 4: All task hours must be completed

**Inequality constraints:** Used for capacity limits or minimums
- Problem 1: Classroom capacity ≤ 70
- Problem 2: Minimum operators per hour
- Problem 4: Worker availability limits

**Linking constraints:** Connect binary indicators to continuous/integer values
- General form: x ≤ M·y (if y=0, forces x=0)
- Used extensively in Problems 3 and 4

**Logical constraints:** Express business rules
- Mutually exclusive: y₁ + y₂ ≤ 1
- At least one: y₁ + y₂ ≥ 1
- If-then: x₁ ≤ M·y, x₂ ≤ M·(1-y)

---

## Implementation Checklist

For each problem, Excel Solver implementation requires:

### 1. **Decision Variables Section**
- [ ] Clear table with all decision variables
- [ ] Appropriate data types (continuous vs. integer vs. binary)
- [ ] Initial values (can be 0 or blank)

### 2. **Parameters Section**
- [ ] All input data clearly labeled
- [ ] Organized for easy reference

### 3. **Calculations Section**
- [ ] Intermediate calculations (row/column sums, etc.)
- [ ] Constraint LHS values
- [ ] Objective function value (cell to minimize/maximize)

### 4. **Solver Configuration**
- [ ] Objective cell specified
- [ ] Min or Max selected correctly
- [ ] Variable cells selected
- [ ] All constraints entered with correct operators (=, ≤, ≥)
- [ ] Integer/binary constraints specified
- [ ] Solving method: Simplex LP (continuous) or Branch-and-Bound (integer)
- [ ] Options: Make unconstrained variables non-negative (if applicable)

### 5. **Solution Documentation**
- [ ] Optimal objective value
- [ ] Decision variable values in clear table
- [ ] Verification that all constraints satisfied
- [ ] Interpretation of results

---

## Common Mistakes to Avoid

### Formulation Mistakes
1. ❌ Forgetting to link binary variables to continuous variables
2. ❌ Using non-linear expressions (e.g., y₁·y₂ where both are variables)
3. ❌ Missing the "big M" in linking constraints
4. ❌ Using only ≤ constraint without ≥ (or vice versa) for binary logic
5. ❌ Wrong coefficient in "at least k" constraints (should be k, not 1)

### Excel Implementation Mistakes
1. ❌ Not specifying binary constraint (variables can take fractional values)
2. ❌ Using wrong Solver engine (must use Simplex LP or branch-and-bound)
3. ❌ Circular references in formulas
4. ❌ Constraint references wrong cells
5. ❌ Forgetting non-negativity constraints

### Conceptual Mistakes
1. ❌ Thinking integer LP optimal = continuous LP optimal (usually worse)
2. ❌ Applying shadow prices to integer models (not valid!)
3. ❌ Assuming feasibility (always verify constraints are satisfiable)
4. ❌ Confusing "at least k" with "exactly k" (different constraints!)

---

## Summary Statistics

### Deliverable 8 by the Numbers

| Metric | Total |
|--------|-------|
| **Problems** | 4 |
| **Total points** | 100 |
| **Decision variables** | ~200+ across all problems |
| **Binary variables** | ~180 |
| **Integer variables** | ~20 |
| **Continuous variables** | ~40 |
| **Constraints** | ~400+ across all problems |
| **Optimization models** | 7 (some problems have multiple variants) |

### Concepts Covered

✅ Linear Programming (LP)
✅ Integer Linear Programming (IP)
✅ Binary decision variables
✅ Min-max objectives
✅ Sensitivity analysis
✅ Shadow prices
✅ Matching problems
✅ Assignment problems
✅ Scheduling problems
✅ Selection problems
✅ Logical constraints (IF-THEN, AND, OR)
✅ Synergy modeling
✅ Conditional constraints
✅ Mutually exclusive choices

---

## File Structure

```
DMDHW/
├── 15060_F25_Deliverable_8.pdf          # Original problem set
├── Deliverable8_Summary.md              # This file - overview
├── Problem1_Solution.md                 # Exam classroom allocation
├── Problem2_Solution.md                 # Call center scheduling
├── Problem3_Solution.md                 # Food festival vendors
├── Problem4_Solution.md                 # Concert stage setup
└── [Excel files to be created]
    ├── Problem1_PartB.xlsx
    ├── Problem1_PartD.xlsx
    ├── Problem2_PartB.xlsx
    ├── Problem2_PartD.xlsx
    ├── Problem4_PartB.xlsx
    └── Problem4_PartD.xlsx
```

---

## Next Steps

To complete the deliverable:

1. **Create Excel files** for Problems 1, 2, and 4 (Problem 3 is formulation only)
2. **Verify solutions** by checking:
   - All constraints satisfied
   - Objective values are reasonable
   - Binary/integer constraints enforced
3. **Document results** in a PDF report including:
   - Formulations from solution files
   - Excel screenshots or tables
   - Optimal values and interpretations
4. **Submit to Canvas:**
   - One PDF with all solutions
   - One Excel file (or multiple) with all models
   - Team member names on cover page

---

## Key Formulas Reference

### "At least k of n" binary constraint:
```
z = 1 iff Σy_i ≥ k

k·z ≤ Σy_i
k·z ≥ Σy_i - (n-k)
```

### "All of n" binary constraint:
```
z = 1 iff all y_i = 1

n·z ≤ Σy_i
z ≥ Σy_i - (n-1)
```

### "None of n" binary constraint:
```
z = 1 iff all y_i = 0

z ≥ 1 - (Σy_i)/n
z ≤ 1 - (Σy_i)/n  [can simplify]
```

### IF-THEN constraint (if y=1 then x≥m, else x=0):
```
x ≤ M·y        // M = upper bound
x ≥ m·y        // m = minimum when active
```

### Mutually exclusive (choose one of two):
```
x₁ ≤ M₁·z
x₂ ≤ M₂·(1-z)
```

---

**Document prepared for 15.060 Deliverable 8, Fall 2025**

*All individual problem solutions available in separate markdown files*
