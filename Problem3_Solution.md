# Problem 3 Solution: Food Festival Vendor Selection

## Problem Setup

**Given:**
- 8 vendors available, can accommodate 5 vendor stalls
- Each vendor has individual utility
- Vendors 6, 7, 8 serve drinks; vendors 1-5 do not

**Base Formulation:**
```
Maximize: 13y₁ + 12y₂ + 11y₃ + 10y₄ + 8y₅ + 7y₆ + 6y₇ + 5y₈

Subject to: y₁ + y₂ + y₃ + y₄ + y₅ + y₆ + y₇ + y₈ ≤ 5
            y₁, y₂, ..., y₈ ∈ {0, 1}
```

Where yᵢ = 1 if vendor i is chosen, 0 otherwise.

---

## Part (a): Vendors 1, 2, 3 Theme Bonus (+10 utility if ALL three chosen)

### New Variable:
**z_a ∈ {0, 1}**
- z_a = 1 if ALL three vendors (1, 2, 3) are chosen
- z_a = 0 otherwise

### Objective Function Modification:
Add **+10·z_a** to the objective

**New Objective:**
```
Maximize: 13y₁ + 12y₂ + 11y₃ + 10y₄ + 8y₅ + 7y₆ + 6y₇ + 5y₈ + 10z_a
```

### Constraints:
We need z_a = 1 if and only if y₁ = y₂ = y₃ = 1

**≤ Constraint:**
```
3·z_a ≤ y₁ + y₂ + y₃
```
- Forces: if z_a = 1, then y₁ + y₂ + y₃ ≥ 3, meaning all three must equal 1
- If fewer than 3 chosen, z_a must be 0

**≥ Constraint:**
```
z_a ≥ y₁ + y₂ + y₃ - 2
```
- Forces: if all three chosen (sum = 3), then z_a ≥ 1, so z_a = 1
- If only 2 or fewer chosen, z_a can be 0

**Verification:**
- All three chosen: 3·z_a ≤ 3 and z_a ≥ 1 → z_a = 1 ✓
- Only 2 chosen: 3·z_a ≤ 2 and z_a ≥ 0 → z_a = 0 ✓
- Fewer chosen: z_a forced to 0 ✓

---

## Part (b): Vendors 4, 5, 6 Theme Bonus (+5 utility if at least 2 chosen)

### New Variable:
**z_b ∈ {0, 1}**
- z_b = 1 if at least 2 of vendors {4, 5, 6} are chosen
- z_b = 0 otherwise

### Objective Function Modification:
Add **+5·z_b** to the objective

**Updated Objective:**
```
Maximize: 13y₁ + 12y₂ + 11y₃ + 10y₄ + 8y₅ + 7y₆ + 6y₇ + 5y₈ + 10z_a + 5z_b
```

### Constraints:
We need z_b = 1 if and only if y₄ + y₅ + y₆ ≥ 2

**≤ Constraint:**
```
2·z_b ≤ y₄ + y₅ + y₆
```
- Forces: if z_b = 1, then y₄ + y₅ + y₆ ≥ 2, meaning at least 2 must be chosen
- If fewer than 2 chosen, sum < 2, so z_b ≤ 0.5, forcing z_b = 0

**≥ Constraint:**
```
2·z_b ≥ y₄ + y₅ + y₆ - 1
```
- Forces: if sum = 2, then 2·z_b ≥ 1, so z_b ≥ 0.5, so z_b = 1 (binary)
- Forces: if sum = 3, then 2·z_b ≥ 2, so z_b ≥ 1, so z_b = 1
- Allows: if sum ≤ 1, then 2·z_b ≥ 0, allowing z_b = 0

**Verification:**
- 3 chosen: 2·z_b ≤ 3 and 2·z_b ≥ 2 → z_b = 1 ✓
- 2 chosen: 2·z_b ≤ 2 and 2·z_b ≥ 1 → z_b = 1 ✓
- 1 chosen: 2·z_b ≤ 1 and 2·z_b ≥ 0 → z_b = 0 ✓
- 0 chosen: z_b = 0 ✓

---

## Part (c): No Drinks Penalty (-15 utility if no drink vendors)

### New Variable:
**z_c ∈ {0, 1}**
- z_c = 1 if NO drink vendors (6, 7, 8) are chosen
- z_c = 0 if at least one drink vendor is chosen

### Objective Function Modification:
Add **-15·z_c** to the objective (penalty)

**Updated Objective:**
```
Maximize: 13y₁ + 12y₂ + 11y₃ + 10y₄ + 8y₅ + 7y₆ + 6y₇ + 5y₈ + 10z_a + 5z_b - 15z_c
```

### Constraints:
We need z_c = 1 if and only if y₆ + y₇ + y₈ = 0

**≥ Constraint:**
```
z_c ≥ 1 - (y₆ + y₇ + y₈)
```
- Forces: if no drink vendors (sum = 0), then z_c ≥ 1, so z_c = 1
- Allows: if any drink vendor chosen (sum ≥ 1), then z_c ≥ 0, allowing z_c = 0

**≤ Constraint:**
```
3·z_c ≤ 3 - (y₆ + y₇ + y₈)
```
Or equivalently: z_c ≤ 1 - (y₆ + y₇ + y₈)/3

- Forces: if any drink vendor chosen (sum ≥ 1), then z_c ≤ 2/3, forcing z_c = 0
- Allows: if no drink vendors (sum = 0), then z_c ≤ 1

**Verification:**
- 0 drink vendors: z_c ≥ 1 and 3·z_c ≤ 3 → z_c = 1 ✓
- 1 drink vendor: z_c ≥ 0 and 3·z_c ≤ 2 → z_c = 0 ✓
- 2+ drink vendors: z_c forced to 0 ✓

---

## Part (d): Vendors 7 & 8 Share a Stall (together use only 1 stall)

### New Variable:
**z_d ∈ {0, 1}**
- z_d = 1 if BOTH vendors 7 and 8 are chosen (they share a stall)
- z_d = 0 otherwise

### Constraint Modification:
The stall capacity constraint changes from:
```
y₁ + y₂ + y₃ + y₄ + y₅ + y₆ + y₇ + y₈ ≤ 5
```

To:
```
y₁ + y₂ + y₃ + y₄ + y₅ + y₆ + y₇ + y₈ - z_d ≤ 5
```

**Explanation:**
- If both y₇ and y₈ are chosen (z_d = 1), they count as 2 in the sum but only use 1 stall, so we subtract 1
- This effectively allows the sum to be 6 when vendors 7 and 8 share a stall
- The objective function doesn't change (utilities are unaffected)

### Constraints for z_d:
We need z_d = 1 if and only if y₇ = 1 AND y₈ = 1

**≤ Constraint:**
```
2·z_d ≤ y₇ + y₈
```
- Forces: if z_d = 1, then y₇ + y₈ ≥ 2, meaning both must be 1
- Forces: if only one or neither chosen, z_d must be 0

**≥ Constraint:**
```
z_d ≥ y₇ + y₈ - 1
```
- Forces: if both chosen (sum = 2), then z_d ≥ 1, so z_d = 1
- Allows: if only one chosen (sum = 1), then z_d ≥ 0, allowing z_d = 0
- Allows: if neither chosen (sum = 0), then z_d ≥ -1, allowing z_d = 0

**Verification:**
- Both chosen: 2·z_d ≤ 2 and z_d ≥ 1 → z_d = 1 ✓
- Only y₇ chosen: 2·z_d ≤ 1 and z_d ≥ 0 → z_d = 0 ✓
- Only y₈ chosen: 2·z_d ≤ 1 and z_d ≥ 0 → z_d = 0 ✓
- Neither chosen: z_d = 0 ✓

---

## Complete Final Formulation

### Decision Variables:
- **yᵢ ∈ {0, 1}** for i = 1, ..., 8: whether vendor i is chosen
- **z_a ∈ {0, 1}**: whether all of vendors 1, 2, 3 are chosen
- **z_b ∈ {0, 1}**: whether at least 2 of vendors 4, 5, 6 are chosen
- **z_c ∈ {0, 1}**: whether no drink vendors are chosen
- **z_d ∈ {0, 1}**: whether both vendors 7 and 8 are chosen

### Objective Function:
```
Maximize: 13y₁ + 12y₂ + 11y₃ + 10y₄ + 8y₅ + 7y₆ + 6y₇ + 5y₈
          + 10z_a + 5z_b - 15z_c
```

### Constraints:

**Stall Capacity:**
```
y₁ + y₂ + y₃ + y₄ + y₅ + y₆ + y₇ + y₈ - z_d ≤ 5
```

**Synergy (a) - Vendors 1, 2, 3:**
```
3·z_a ≤ y₁ + y₂ + y₃
z_a ≥ y₁ + y₂ + y₃ - 2
```

**Synergy (b) - Vendors 4, 5, 6:**
```
2·z_b ≤ y₄ + y₅ + y₆
2·z_b ≥ y₄ + y₅ + y₆ - 1
```

**Synergy (c) - No Drinks Penalty:**
```
z_c ≥ 1 - (y₆ + y₇ + y₈)
3·z_c ≤ 3 - (y₆ + y₇ + y₈)
```

**Synergy (d) - Vendors 7 & 8 Share:**
```
2·z_d ≤ y₇ + y₈
z_d ≥ y₇ + y₈ - 1
```

**Binary Constraints:**
```
y₁, y₂, y₃, y₄, y₅, y₆, y₇, y₈, z_a, z_b, z_c, z_d ∈ {0, 1}
```

---

## Summary Table

| Synergy | Variable | Objective Impact | ≤ Constraint | ≥ Constraint |
|---------|----------|------------------|--------------|--------------|
| (a) All of 1,2,3 | z_a | +10 | 3·z_a ≤ y₁+y₂+y₃ | z_a ≥ y₁+y₂+y₃-2 |
| (b) ≥2 of 4,5,6 | z_b | +5 | 2·z_b ≤ y₄+y₅+y₆ | 2·z_b ≥ y₄+y₅+y₆-1 |
| (c) No drinks | z_c | -15 | 3·z_c ≤ 3-(y₆+y₇+y₈) | z_c ≥ 1-(y₆+y₇+y₈) |
| (d) 7&8 share | z_d | 0 | 2·z_d ≤ y₇+y₈ | z_d ≥ y₇+y₈-1 |

**Modified stall constraint:** y₁+y₂+y₃+y₄+y₅+y₆+y₇+y₈ - z_d ≤ 5
