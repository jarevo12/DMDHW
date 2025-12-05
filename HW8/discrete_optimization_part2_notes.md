# Discrete Optimization Part 2 - Key Learnings

## Course: 15.060 Data, Models, and Decisions
**Topic**: Integer Linear Optimization with Binary Variables
**Date**: Class 17 (November 19)

---

## 1. Overview of Optimization Problem Types

### Classification Matrix

| Decision Variables | Objective/Constraints | Problem Type |
|-------------------|----------------------|--------------|
| All continuous | All linear | **Linear Optimization** ✓ |
| Some/all integer | All linear | **Integer Linear Optimization** (Discrete Optimization) |
| All continuous | Some non-linear | Nonlinear Optimization |
| Some/all integer | Some non-linear | Integer Nonlinear Optimization |

---

## 2. The Power of Binary Variables

### What Are Binary Variables?
- Variables that can only take values 0 or 1
- Model "yes/no" or "do/don't do" decisions
- More challenging to solve than continuous variables

### Key Capabilities
1. **IF-THEN relationships** - Enable conditional logic in linear models
2. **Non-linearities** - Can represent non-linear concepts while keeping formulation linear
3. **Real-world decisions** - Model discrete choices like:
   - Which suppliers to use
   - Which facilities to open
   - Which routes to activate

---

## 3. Case Study: European Apparel Retailer Supply Chain

### Problem Setup

**Network Structure:**
- **Suppliers (3)**: Amadora (A), Bergamo (B), Casablanca (C)
- **Production Facilities (5)**: Valencia (V), Wiesbaden (W), Xanten (X), York (Y), Zaragoza (Z)

**Given Data:**
- Supplier capacities: A=4,000 tons, B=2,000 tons, C=1,000 tons
- Facility demands: V=1,000, W=500, X=1,500, Y=1,500, Z=500 tons
- Variable costs: e.g., €1.78 per ton from A to V

### Base Formulation (Linear Optimization)

**Decision Variables:**
- s_{i,j} = tons of fabric from supplier i to facility j (continuous)

**Objective Function:**
```
Minimize: 1.78·s_{A,V} + 2.26·s_{A,W} + ... + 1.95·s_{C,Z}
```

**Constraints:**
- **Supply side**: s_{A,V} + s_{A,W} + ... + s_{A,Z} ≤ 4,000 (capacity at A)
- **Demand side**: s_{A,V} + s_{B,V} + s_{C,V} ≥ 1,000 (demand at V)
- **Non-negativity**: All s_{i,j} ≥ 0

**Optimal Cost**: €8.995 million

---

## 4. Key Modeling Techniques with Binary Variables

### Technique 1: Supplier Consolidation
**Business Problem**: Use exactly 2 suppliers (instead of 3)

**Formulation:**
- **New binary variables**: y_A, y_B, y_C ∈ {0,1}
  - y_i = 1 if we use supplier i, 0 otherwise

- **New constraint**: y_A + y_B + y_C = 2

- **Modified capacity constraints**:
  - s_{A,V} + s_{A,W} + s_{A,X} + s_{A,Y} + s_{A,Z} ≤ 4,000 · **y_A**
  - Similar for B and C

**How It Works:**
- If y_A = 1: Can order up to 4,000 tons from A
- If y_A = 0: Cannot order anything from A (capacity becomes 0)

**Result**: €9.395 million (+4.44% increase)

---

### Technique 2: Single Sourcing
**Business Problem**: Valencia must be supplied by exactly ONE supplier

**Formulation:**
- **Binary variables**: y_{A,V}, y_{B,V}, y_{C,V} ∈ {0,1}
  - y_{i,V} = 1 if supplier i serves Valencia

- **Single sourcing constraint**: y_{A,V} + y_{B,V} + y_{C,V} = 1

- **Linking constraints**:
  - s_{A,V} ≤ 4,000 · y_{A,V}
  - s_{B,V} ≤ 2,000 · y_{B,V}
  - s_{C,V} ≤ 1,000 · y_{C,V}

**Result**: €9.035 million (+0.44% increase)

---

### Technique 3: Fixed Costs
**Business Problem**: Bergamo charges €1 million fixed cost if we order ANY amount

**Formulation:**
- **Binary variable**: y_B ∈ {0,1}

- **Modified objective function**:
  ```
  Minimize: ... + 1,000 · y_B + ...
            (variable costs) + (fixed cost)
  ```

- **Linking constraint**:
  - s_{B,V} + s_{B,W} + s_{B,X} + s_{B,Y} + s_{B,Z} ≤ 2,000 · y_B

**How It Works:**
- Model decides whether fixed cost is worth paying
- If y_B = 1: Pay €1M but can order from B
- If y_B = 0: Don't pay, can't order from B

**Result**: €9.395 million (optimal solution: drop Bergamo entirely)

---

### Technique 4: Minimum Order Quantities
**Business Problem**: Amadora requires minimum order of 3,000 tons (or nothing)

**Formulation:**
- **Binary variable**: y_A ∈ {0,1}

- **Two constraints**:
  - **Upper bound**: s_{A,V} + s_{A,W} + ... + s_{A,Z} ≤ 4,000 · y_A
  - **Lower bound**: s_{A,V} + s_{A,W} + ... + s_{A,Z} ≥ 3,000 · y_A

**How It Works:**
- If y_A = 1: Must order between 3,000 and 4,000 tons
- If y_A = 0: Must order exactly 0 tons
- No in-between allowed!

**Result**: €9.175 million (+2.00% increase)

---

## 5. Cost Comparison Summary

| Scenario | Without Bergamo Fixed Cost | With Bergamo Fixed Cost |
|----------|---------------------------|------------------------|
| **Without Amadora Min Order** | €8.995M (base) | €9.395M (+4.44%) |
| **With Amadora Min Order** | €9.175M (+2.00%) | (optional) |

| Scenario | Without Supplier Consolidation | With Supplier Consolidation |
|----------|-------------------------------|---------------------------|
| **Without Single Sourcing** | €8.995M (base) | €9.395M (+4.44%) |
| **With Single Sourcing** | €9.035M (+0.44%) | (optional) |

---

## 6. Matching Problems

### General Framework
**Definition**: Allocate resources from supply nodes to demand nodes optimally

**Components:**
- **Supply nodes**: Sources of resources
- **Demand nodes**: Destinations needing resources
- **Resource**: What flows between nodes (physical goods, time, etc.)
- **Objective**: Minimize cost or maximize utility

### Real-World Applications

| Domain | Supply Nodes | Demand Nodes | Resource | Objective |
|--------|--------------|--------------|----------|-----------|
| **Supply Chain** | Suppliers | Production Facilities | Raw materials | Minimize cost |
| **Healthcare Staffing** | Available nurses | Hospital shifts | Labor hours | Maximize satisfaction |
| **School Assignment** | Students (with preferences) | Schools | Student seats | Maximize satisfaction |
| **Ride Sharing** | Available drivers | Passengers | Rides | Minimize wait time |

**Key Insight**: Discrete optimization is exceptionally well-suited for these problems!

---

## 7. Real-World Example: Newspaper Distribution

### Problem Context
- Evaluate acquisition of distribution assets (depots + routes)
- Determine maximum bid price based on cost savings

### Network Structure
```
Printing Plants → Distribution Depots → Delivery Routes
```

### Optimization Model

**Decision Variables:**
- x_D ∈ {0,1}: Use depot D?
- y_R ∈ {0,1}: Use route R?

**Constraints:**
1. Each subscriber covered by at least one route
2. Route can only be used if its depot is operational: y_R ≤ x_D

**Objective Function:**
```
Minimize: Σ(all depots) C_D · x_D + Σ(all routes) L_R · y_R
          (fixed depot costs)     (variable route costs)
```

**Business Impact:**
- Compare optimized cost vs. current delivery cost
- Estimate incremental savings
- Inform maximum acquisition price

---

## 8. Key Takeaways

### 1. Binary Variable "Tricks"
Binary variables enable modeling complex real-world constraints **while keeping the formulation linear**:

- **Activation/Deactivation**: Turn on/off supply routes
- **Fixed Costs**: "Pay to play" decisions
- **Minimum Thresholds**: All-or-nothing requirements
- **Conditional Logic**: IF-THEN relationships

### 2. General Modeling Pattern

```
For "IF we do X THEN we can do Y" relationships:

1. Create binary variable: z ∈ {0,1}
2. Add to objective (if X has a cost): Cost · z
3. Link to continuous variables: y ≤ UpperBound · z
4. Add logical constraints: (conditions on z)
```

### 3. The Power of Optimization

Optimization is not just a computational tool—it's:
- ✓ A **framework** for structured decision-making
- ✓ A **bridge** from data/predictions to actions
- ✓ A **must-have fluency** for analytics professionals

### 4. Practical Considerations

**When to use binary variables:**
- Discrete choices (select/don't select)
- How much vs. whether to do something
- Fixed costs or fixed benefits
- Conditional relationships

**What makes problems harder:**
- More binary variables
- More complex constraint interactions
- But modern solvers can handle thousands of binary variables!

---

## 9. Important Formulation Rules

### Always Remember:
1. **Objective and constraints MUST be linear**
2. **Non-negativity constraints** for continuous variables
3. **Binary constraints** explicitly stated
4. **Linking constraints** to connect binary and continuous variables
5. Use **"big M" method**: Set upper bounds using capacity × binary variable

### Common Mistakes to Avoid:
- ❌ Forgetting to link binary variables to continuous variables
- ❌ Using non-linear expressions (like y · z where both are variables)
- ❌ Not specifying what binary variables represent clearly
- ❌ Missing the "big M" (large enough upper bound)

---

## 10. Extensions and Variations

The base supply chain model can be extended to include:
- Fixed costs ✓
- Economies of scale (bulk discounts)
- Multiple time periods
- Multiple products
- Transportation mode options + lead times
- Capacity constraints on routes
- Risk and uncertainty considerations

**Key insight**: The formulation framework is extremely flexible and adaptable!

---

## Summary

**Discrete Optimization = Linear Optimization + Integer/Binary Variables**

This simple addition enables modeling:
- Complex business logic
- Real-world operational constraints
- Strategic decisions with significant business impact

The European apparel case demonstrated how small percentage increases in cost (0.44% to 4.44%) can be quantified precisely, enabling informed strategic decisions worth millions of euros.

---

*Document created from 15.060 Class 17 lecture materials*
