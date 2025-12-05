# Problem 1 Solution: DMD Final Exam Classroom Allocation

## Problem Setup

**Given:**
- 6 sections (A, B, C, D, E, F) with enrollments: 63, 62, 63, 61, 62, 60
- Total students: 371
- 6 exam classrooms with capacities: 86, 86, 76, 128, 54, 70
- Total capacity: 500 seats

**Objective:** Minimize the maximum classroom density (students/capacity)

**Constraint:** Each classroom holds at most 70 students

---

## Part (a): Linear Optimization Formulation

### Decision Variables

**Continuous variables:**
- **x_{i,j}** = number of students from section i allocated to classroom j
  - i ∈ {A, B, C, D, E, F} (6 sections)
  - j ∈ {1, 2, 3, 4, 5, 6} (6 classrooms)
  - x_{i,j} ≥ 0 (non-negativity)

**Additional variable:**
- **z** = upper bound on classroom density (minimize this)

### Objective Function

```
Minimize: z
```

### Constraints

**1. Section Allocation Constraints** (each section's students must be fully allocated):
```
x_{A,1} + x_{A,2} + x_{A,3} + x_{A,4} + x_{A,5} + x_{A,6} = 63
x_{B,1} + x_{B,2} + x_{B,3} + x_{B,4} + x_{B,5} + x_{B,6} = 62
x_{C,1} + x_{C,2} + x_{C,3} + x_{C,4} + x_{C,5} + x_{C,6} = 63
x_{D,1} + x_{D,2} + x_{D,3} + x_{D,4} + x_{D,5} + x_{D,6} = 61
x_{E,1} + x_{E,2} + x_{E,3} + x_{E,4} + x_{E,5} + x_{E,6} = 62
x_{F,1} + x_{F,2} + x_{F,3} + x_{F,4} + x_{F,5} + x_{F,6} = 60
```

**2. Classroom Capacity Constraints** (at most 70 students per classroom):
```
x_{A,1} + x_{B,1} + x_{C,1} + x_{D,1} + x_{E,1} + x_{F,1} ≤ 70  (Classroom 1: E51-315)
x_{A,2} + x_{B,2} + x_{C,2} + x_{D,2} + x_{E,2} + x_{F,2} ≤ 70  (Classroom 2: E51-325)
x_{A,3} + x_{B,3} + x_{C,3} + x_{D,3} + x_{E,3} + x_{F,3} ≤ 70  (Classroom 3: E51-335)
x_{A,4} + x_{B,4} + x_{C,4} + x_{D,4} + x_{E,4} + x_{F,4} ≤ 70  (Classroom 4: E51-345)
x_{A,5} + x_{B,5} + x_{C,5} + x_{D,5} + x_{E,5} + x_{F,5} ≤ 70  (Classroom 5: E51-376)
x_{A,6} + x_{B,6} + x_{C,6} + x_{D,6} + x_{E,6} + x_{F,6} ≤ 70  (Classroom 6: E51-395)
```

**3. Density Constraints** (density of each classroom ≤ z):

Let S_j = total students in classroom j = sum of all x_{i,j} for all sections i

Density of classroom j = S_j / Capacity_j

```
(x_{A,1} + x_{B,1} + x_{C,1} + x_{D,1} + x_{E,1} + x_{F,1}) / 86 ≤ z
(x_{A,2} + x_{B,2} + x_{C,2} + x_{D,2} + x_{E,2} + x_{F,2}) / 86 ≤ z
(x_{A,3} + x_{B,3} + x_{C,3} + x_{D,3} + x_{E,3} + x_{F,3}) / 76 ≤ z
(x_{A,4} + x_{B,4} + x_{C,4} + x_{D,4} + x_{E,4} + x_{F,4}) / 128 ≤ z
(x_{A,5} + x_{B,5} + x_{C,5} + x_{D,5} + x_{E,5} + x_{F,5}) / 54 ≤ z
(x_{A,6} + x_{B,6} + x_{C,6} + x_{D,6} + x_{E,6} + x_{F,6}) / 70 ≤ z
```

Or in linear form (multiply both sides by capacity):
```
x_{A,1} + x_{B,1} + x_{C,1} + x_{D,1} + x_{E,1} + x_{F,1} ≤ 86z
x_{A,2} + x_{B,2} + x_{C,2} + x_{D,2} + x_{E,2} + x_{F,2} ≤ 86z
x_{A,3} + x_{B,3} + x_{C,3} + x_{D,3} + x_{E,3} + x_{F,3} ≤ 76z
x_{A,4} + x_{B,4} + x_{C,4} + x_{D,4} + x_{E,4} + x_{F,4} ≤ 128z
x_{A,5} + x_{B,5} + x_{C,5} + x_{D,5} + x_{E,5} + x_{F,5} ≤ 54z
x_{A,6} + x_{B,6} + x_{C,6} + x_{D,6} + x_{E,6} + x_{F,6} ≤ 70z
```

**4. Non-negativity:**
```
x_{i,j} ≥ 0 for all i, j
z ≥ 0
```

### Complete Formulation Summary

**Decision Variables:**
- x_{i,j} ≥ 0 for i ∈ {A,B,C,D,E,F}, j ∈ {1,2,3,4,5,6}
- z ≥ 0 (maximum density)

**Objective:**
```
Minimize: z
```

**Subject to:**
- 6 section allocation constraints (equality)
- 6 classroom capacity constraints (≤ 70)
- 6 density constraints (linking students to z)
- Non-negativity constraints

---

## Part (b): Excel Implementation

**Excel Setup:**

1. **Decision Variable Table** (6 sections × 6 classrooms):
   - Rows: Sections A-F
   - Columns: Classrooms 1-6
   - Each cell contains x_{i,j}

2. **Parameters:**
   - Section enrollments: 63, 62, 63, 61, 62, 60
   - Classroom capacities: 86, 86, 76, 128, 54, 70

3. **Calculated Values:**
   - Row sums (students allocated per section)
   - Column sums (students per classroom)
   - Density per classroom = (students in classroom) / capacity
   - Maximum density = MAX of all densities
   - Variable z

4. **Solver Settings:**
   - Objective: Minimize z
   - Variables: All x_{i,j} values and z
   - Constraints:
     - Row sums = enrollment values
     - Column sums ≤ 70
     - Each classroom's student count ≤ capacity × z
     - All variables ≥ 0
   - Solving method: Simplex LP

**Expected Optimal Value:** ~0.81 or 81% (given in part c)

---

## Part (c): Sensitivity Analysis

**Given Information:**
- Optimal density: **81%**
- Shadow price for E51-345 (classroom 4) constraint (≤ 70): **-0.00269**
- Allowable increase: **25 students**
- Allowable decrease: **2 students**
- New capacity being considered: **95 students** (increase of 25)

**Analysis:**

The shadow price of -0.00269 means that for each additional student allowed in classroom E51-345, the optimal density will **decrease** by 0.00269 (or 0.269%).

Current constraint: x_{·,4} ≤ 70
New constraint: x_{·,4} ≤ 95
Change: +25 students

Since the increase of 25 students is **exactly equal to the allowable increase**, we can use the shadow price directly:

**New optimal density = 0.81 + (25 × (-0.00269))**
**New optimal density = 0.81 - 0.06725**
**New optimal density = 0.74275 or approximately 74.3%**

**Interpretation:**
By allowing 25 more students in the large classroom E51-345, we can better distribute students, reducing the maximum classroom density from 81% to 74.3%. This is a significant improvement (reduction of 6.7 percentage points).

---

## Part (d): Integer Linear Optimization

### Modified Formulation

**Change:** All decision variables x_{i,j} must now be **integers** (whole numbers of students).

**New constraint:**
```
x_{i,j} ∈ Z+ (non-negative integers) for all i, j
```

Everything else remains the same:
- Same objective: Minimize z
- Same constraints (section allocation, capacity, density)
- z remains continuous

### Excel Implementation for Integer Model

**Solver Settings:**
- Same setup as part (b)
- Add constraint: x_{i,j} = integer for all 36 variables
- Solving method: **Simplex LP with integer constraints** (or branch-and-bound)

### Theoretical Analysis

**Question:** "You should observe that the optimal objective value of the integer model is no less than that of the LP model. Is this a coincidence or must be the case?"

**Answer:** This **must always be the case**, not a coincidence.

**Reasoning:**

1. **Feasible Region Relationship:**
   - The integer LP feasible region is a **subset** of the continuous LP feasible region
   - Every integer solution is also a feasible solution to the continuous LP
   - But not every continuous LP solution is feasible for the integer LP

2. **Optimization Principle:**
   - The continuous LP optimizer can explore ALL points in the feasible region (including non-integer)
   - The integer LP optimizer can only explore integer points
   - Since the integer LP has fewer options, it cannot do better than (and typically does worse than) the continuous LP

3. **Mathematical Statement:**
   ```
   Optimal_Integer_LP ≥ Optimal_Continuous_LP (for minimization)
   ```

This is a fundamental principle in optimization theory.

**Question:** "Can you still do sensitivity analysis as in part c) for the integer model?"

**Answer:** **No, traditional sensitivity analysis is NOT valid for integer models.**

**Reasons:**

1. **Shadow Prices Don't Exist:**
   - Shadow prices (dual values) are based on the LP relaxation's optimal basis
   - They represent marginal changes assuming continuous adjustments
   - Integer constraints create discontinuous changes

2. **Non-Convex Feasible Region:**
   - Integer LP feasible regions consist of discrete points
   - Small changes in RHS can cause large jumps in the optimal solution
   - No smooth "sensitivity" relationship

3. **Computational Approach:**
   - To understand sensitivity in integer models, you must **re-solve** the problem with the new parameter
   - You cannot simply apply shadow prices and allowable ranges
   - Each scenario requires a new optimization run

**What you CAN do:**
- Scenario analysis: Solve the integer LP multiple times with different parameters
- Parameter sweeping: Systematically vary constraints and observe results
- But NOT: Direct application of shadow prices and allowable ranges

---

## Summary Table

| Model Type | Optimal Density | Sensitivity Analysis | Solution Method |
|------------|----------------|---------------------|-----------------|
| **Continuous LP** | ~81% | Valid (shadow prices work) | Simplex algorithm |
| **Integer LP** | ≥81% (likely higher) | Not valid (must re-solve) | Branch-and-bound |

---

## Key Insights

1. **Min-Max Objective:** The z variable converts a "minimize maximum" objective into a linear objective
2. **Density Constraints:** Linking constraints ensure z represents the highest density classroom
3. **Integer vs. Continuous:** Integer constraints always make minimization problems harder (worse or equal objective)
4. **Sensitivity Limitations:** Shadow price analysis is powerful but only applies to continuous LPs

---

*Solution prepared for 15.060 Deliverable 8, Fall 2025*
