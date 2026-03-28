# Qcuit.com — Complete Documentation
## v4.0 · *The Heritage of Future Logic*
### Dual-Format Guide: Technical Deep Dive + Simply Put

---

> *"If you think you understand quantum mechanics, you don't understand quantum mechanics."*
> — Richard P. Feynman

---

# The Qcuit Platform

Qcuit is an educational ecosystem for quantum computing, built on the philosophy of **Digital Heritage** — where the gravitas of established science meets the fluidity of modern technology.

The platform rests on **three pillars**:

| Pillar | Purpose | Description |
|--------|---------|-------------|
| **The Studio** | Circuit Builder & Simulator | A visual editor for quantum circuits. Drag gates, simulate results, and generate code for Qiskit, Braket, and OpenQASM. |
| **The Q-cuit Sphere** | Visualization Engine | A proprietary 3D engine that renders 2ⁿ-dimensional Hilbert spaces as comprehensible projections — magnitude as size, phase as color. |
| **The Q-Hub** | Community & Discourse | A forum for students, researchers, and mentors. Channels for homework help, theory discussion, and circuit showcases — with native LaTeX support. |

Additionally, the **Exploratorium** provides an interactive, narrative-driven introduction to quantum concepts via the "Read-Watch-Do" pedagogical pattern.

---

# Table of Contents

0. [Platform Overview](#the-qcuit-platform)

1. [Quantum Gates](#1-quantum-gates)
   - Single-Qubit Gates
   - Phase Gates
   - Rotation Gates
   - Multi-Qubit Gates
   - Measurement

2. [Q-cuit Sphere](#2-q-cuit-sphere)

3. [Bloch Sphere](#3-bloch-sphere)

4. [Entanglement Tab](#4-entanglement-tab)

5. [Resources Tab](#5-resources-tab)

6. [Debug Tab](#6-debug-tab)

7. [Presets Tab](#7-presets-tab)

8. [Optimize Tab](#8-optimize-tab)

9. [Summary Cheat Sheet](#9-summary-cheat-sheet)

10. [Architecture & API Reference](#10-architecture)

---

# 1. QUANTUM GATES

## Single-Qubit Gates

### H - Hadamard Gate

**🔬 Technical Deep Dive**

- **Matrix Representation**: H = (1/√2) × [[1, 1], [1, -1]]
- **Eigenvalues**: +1 and -1, with eigenstates |+⟩ and |−⟩
- **State Transformation**: 
  - |0⟩ → (|0⟩ + |1⟩)/√2 = |+⟩
  - |1⟩ → (|0⟩ − |1⟩)/√2 = |−⟩
- **Properties**: Hermitian (H = H†), Unitary (HH† = I), Self-inverse (H² = I)
- **Bloch Sphere**: Rotation of π radians about the axis (X+Z)/√2
- **Complexity**: O(1) single-qubit operation, ~20-50ns on superconducting hardware
- **Native Gate**: Directly implemented on most hardware platforms

**💡 Simply Put**

Think of the H gate as a **quantum coin flipper**. 

In the classical world, a coin is either heads or tails. But the H gate creates a *quantum* coin that's somehow both at once until you look at it.

- **Before H**: Your qubit is definitely 0 (like a coin showing heads)
- **After H**: Your qubit is in a "blur" of 0 AND 1 simultaneously

This is the starting point for almost every quantum algorithm. It's like saying "let's explore all possibilities at once" – which is exactly what gives quantum computers their power!

**When to use it**: At the beginning of circuits to create superposition, or to "undo" a previous H gate.

---

### X - Pauli-X Gate (NOT Gate)

**🔬 Technical Deep Dive**

- **Matrix Representation**: X = [[0, 1], [1, 0]]
- **Eigenvalues**: +1 and -1, with eigenstates |+⟩ and |−⟩
- **State Transformation**:
  - |0⟩ → |1⟩
  - |1⟩ → |0⟩
- **Properties**: Hermitian, Unitary, Self-inverse (X² = I)
- **Bloch Sphere**: Rotation of π radians about the X-axis
- **Pauli Algebra**: X² = I, XY = iZ, XZ = -iY
- **Complexity**: O(1), typically fastest single-qubit gate (~15-30ns)

**💡 Simply Put**

The X gate is the **quantum version of a light switch**.

- If the qubit is 0, flip it to 1
- If the qubit is 1, flip it to 0

It's the simplest gate to understand because it works exactly like the NOT gate you might know from regular computing. The only difference is that in quantum, it can also flip *superpositions* in a special way.

**When to use it**: Initializing qubits, error correction, or whenever you need to flip a value.

---

### Y - Pauli-Y Gate

**🔬 Technical Deep Dive**

- **Matrix Representation**: Y = [[0, -i], [i, 0]]
- **Eigenvalues**: +1 and -1, with eigenstates |+i⟩ and |−i⟩
- **State Transformation**:
  - |0⟩ → i|1⟩
  - |1⟩ → -i|0⟩
- **Properties**: Hermitian, Unitary, Self-inverse (Y² = I)
- **Bloch Sphere**: Rotation of π radians about the Y-axis
- **Pauli Algebra**: Y² = I, YZ = iX, YX = -iZ
- **Note**: Introduces complex phase factors (imaginary unit i)

**💡 Simply Put**

The Y gate is like a **twist and flip combined**.

It does two things at once:
1. Flips the qubit (like the X gate)
2. Adds a special "twist" (a phase factor)

You can't see this twist directly when you measure, but it affects how your qubit interacts with others – like how spinning a basketball while passing affects its trajectory.

**When to use it**: Specific quantum algorithms, state preparation, and when you need combined amplitude and phase changes.

---

### Z - Pauli-Z Gate

**🔬 Technical Deep Dive**

- **Matrix Representation**: Z = [[1, 0], [0, -1]]
- **Eigenvalues**: +1 and -1, with eigenstates |0⟩ and |1⟩
- **State Transformation**:
  - |0⟩ → |0⟩
  - |1⟩ → -|1⟩
- **Properties**: Hermitian, Unitary, Self-inverse (Z² = I)
- **Bloch Sphere**: Rotation of π radians about the Z-axis
- **Computational Basis**: |0⟩ and |1⟩ are Z eigenstates
- **Phase Gate**: Adds π phase to |1⟩ component

**💡 Simply Put**

The Z gate is the **invisible gate** – it seems to do nothing, but it actually does something sneaky.

- If you measure right after a Z gate, you'll see no difference
- But the Z gate adds a "negative sign" to the |1⟩ part

Think of it like this: imagine two waves that look identical, but one is flipped upside down. They'll cancel each other out when combined! That's what phase does – it's invisible alone but powerful in combinations.

**When to use it**: Phase corrections, interference effects, error correction codes.

---

## Phase Gates

### S Gate (√Z)

**🔬 Technical Deep Dive**

- **Matrix Representation**: S = [[1, 0], [0, i]]
- **Relation to Z**: S² = Z (square root of Z)
- **State Transformation**:
  - |0⟩ → |0⟩
  - |1⟩ → i|1⟩
- **Phase Added**: π/2 (90°) to |1⟩ component
- **Bloch Sphere**: Rotation of π/2 radians about Z-axis
- **Not Self-Inverse**: S† ≠ S

### S† Gate (S-dagger)

**🔬 Technical Deep Dive**

- **Matrix Representation**: S† = [[1, 0], [0, -i]]
- **State Transformation**: |1⟩ → -i|1⟩
- **Phase Added**: -π/2 (-90°) to |1⟩ component
- **Inverse**: SS† = I

**💡 Simply Put**

Think of the S gate as a **quarter turn** of the phase dial.

If Z is a full flip (180°) of the phase, then S is just a quarter of that (90°). It's like gently nudging a spinner instead of slamming it.

- **S gate**: Turns phase clockwise by 90°
- **S† gate**: Turns phase counter-clockwise by 90° (undoes S)

These subtle phase adjustments are crucial for precision quantum algorithms.

---

### T Gate (π/8 Gate)

**🔬 Technical Deep Dive**

- **Matrix Representation**: T = [[1, 0], [0, e^(iπ/4)]]
- **Relation to Z**: T⁴ = Z (fourth root of Z)
- **State Transformation**:
  - |0⟩ → |0⟩
  - |1⟩ → e^(iπ/4)|1⟩
- **Phase Added**: π/4 (45°) to |1⟩ component
- **Universal Computation**: H + T + CNOT forms a universal gate set
- **Magic State Distillation**: T gates are expensive in fault-tolerant QC

### T† Gate (T-dagger)

**🔬 Technical Deep Dive**

- **Matrix Representation**: T† = [[1, 0], [0, e^(-iπ/4)]]
- **Phase Added**: -π/4 (-45°)
- **Inverse**: TT† = I

**💡 Simply Put**

The T gate is an **eighth of a turn** – the finest phase adjustment in the standard toolkit.

Why does this tiny turn matter so much? Because when combined with H and CNOT gates, the T gate lets you build *any* quantum operation! It's like having a fine-tuning knob that unlocks infinite possibilities.

- **T gate**: Tiny clockwise phase nudge (45°)
- **T† gate**: Tiny counter-clockwise nudge (undoes T)

Fun fact: On real fault-tolerant quantum computers, T gates are actually the most "expensive" gates – they require special tricks (magic state distillation) to implement reliably.

---

## Rotation Gates (Parametric)

### RX(θ), RY(θ), RZ(θ)

**🔬 Technical Deep Dive**

- **RX(θ) Matrix**: [[cos(θ/2), -i·sin(θ/2)], [-i·sin(θ/2), cos(θ/2)]]
- **RY(θ) Matrix**: [[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]]
- **RZ(θ) Matrix**: [[e^(-iθ/2), 0], [0, e^(iθ/2)]]
- **Bloch Sphere**: Rotation by angle θ about the respective axis
- **Decomposition**: Any single-qubit gate U = e^(iα)·RZ(β)·RY(γ)·RZ(δ)
- **Period**: All rotation gates have period 4π (not 2π due to spinor nature)
- **Special Cases**:
  - RX(π) = -iX
  - RY(π) = -iY
  - RZ(π) = -iZ

**💡 Simply Put**

Rotation gates are like **volume knobs** for quantum operations.

Instead of fixed gates like X or Z, rotation gates let you dial in *exactly* how much rotation you want:

- **RX(θ)**: Spin around the X-axis by any angle θ
- **RY(θ)**: Spin around the Y-axis by any angle θ
- **RZ(θ)**: Spin around the Z-axis by any angle θ

Think of it like steering a ship. The fixed gates (X, Y, Z) are like hard turns, but rotation gates let you make gentle curves of any degree.

**Pro tip**: θ is measured in radians, so π = 180° and π/2 = 90°.

---

## Multi-Qubit Gates

### CNOT (Controlled-NOT)

**🔬 Technical Deep Dive**

- **Matrix Representation** (4×4):
  ```
  [[1,0,0,0],
   [0,1,0,0],
   [0,0,0,1],
   [0,0,1,0]]
  ```
- **Operation**: |c,t⟩ → |c, t⊕c⟩ where ⊕ is XOR
- **Tensor Structure**: |0⟩⟨0| ⊗ I + |1⟩⟨1| ⊗ X
- **Entanglement Generation**: Creates Bell states from product states
- **Universality**: H + CNOT + T = universal gate set
- **Native Implementation**: Varies by hardware (CR, CZ+H, iSWAP-based)
- **Error Rate**: Typically 0.5-2% on current hardware (10-100x higher than single-qubit)
- **Gate Time**: ~200-500ns on superconducting qubits

**💡 Simply Put**

The CNOT is the **quantum "if-then" gate** – and it's the key to quantum entanglement!

Here's how it works:
- You have two qubits: a **control** and a **target**
- **IF** the control qubit is 1, **THEN** flip the target qubit
- If the control is 0, do nothing

Simple, right? But here's where it gets magical: if the control qubit is in *superposition*, the CNOT creates **entanglement** – a spooky connection where the two qubits become mysteriously linked.

**The Bell State Recipe**:
```
Step 1: H gate on qubit 0 (creates superposition)
Step 2: CNOT from qubit 0 to qubit 1 (creates entanglement)
Result: Two qubits that are forever correlated!
```

---

### CZ (Controlled-Z)

**🔬 Technical Deep Dive**

- **Matrix Representation**: diag(1, 1, 1, -1)
- **Operation**: Adds phase of -1 to |11⟩ state only
- **Symmetry**: CZ is symmetric – control and target are interchangeable
- **Relation to CNOT**: CZ = (I ⊗ H)·CNOT·(I ⊗ H)
- **Native Gate**: Often the native two-qubit gate on transmon qubits
- **Graph States**: Primary gate for creating cluster states

**💡 Simply Put**

The CZ gate is the **secret handshake** of quantum computing.

When two qubits are both in state |1⟩, the CZ gate adds a subtle phase flip. It's like two friends having a secret signal – if they both raise their hands, something special happens (a phase flip), otherwise nothing changes.

**Cool property**: Unlike CNOT, the CZ gate is *symmetric* – it doesn't matter which qubit you call the control or target!

---

### SWAP Gate

**🔬 Technical Deep Dive**

- **Matrix Representation**:
  ```
  [[1,0,0,0],
   [0,0,1,0],
   [0,1,0,0],
   [0,0,0,1]]
  ```
- **Operation**: |a,b⟩ → |b,a⟩
- **Decomposition**: SWAP = CNOT₁₂ · CNOT₂₁ · CNOT₁₂ (3 CNOTs)
- **Eigenvalues**: +1 (triplet states) and -1 (singlet state)
- **Hardware Cost**: Expensive – requires 3 two-qubit gates
- **Use Case**: Routing qubits when hardware connectivity is limited

**💡 Simply Put**

The SWAP gate is the **quantum switcheroo** – it exchanges the states of two qubits.

Imagine you have two boxes, one with a red ball and one with a blue ball. SWAP moves the red ball to the blue box and vice versa.

Why do we need this? Real quantum computers have *connectivity limits* – not every qubit can directly talk to every other qubit. SWAP lets you move quantum information around the chip, like passing notes in class when you can't reach someone directly.

**Cost warning**: SWAP gates are expensive (equal to 3 CNOTs), so good circuit design minimizes them!

---

### CCNOT/CCX (Toffoli Gate)

**🔬 Technical Deep Dive**

- **Matrix**: 8×8 identity with bottom-right 2×2 block being X
- **Operation**: |c₁,c₂,t⟩ → |c₁,c₂,t⊕(c₁·c₂)⟩
- **Classical Universality**: Can implement any classical Boolean function reversibly
- **Quantum Decomposition**: Requires 6 CNOTs + single-qubit gates
- **T-count**: Requires 7 T gates in standard decomposition
- **AND Gate**: With ancilla, implements reversible AND

**💡 Simply Put**

The Toffoli gate is the **quantum AND gate** – it needs *two* controls to agree before flipping the target.

- **IF** control 1 is 1 **AND** control 2 is 1, **THEN** flip the target
- Otherwise, do nothing

This gate is special because it can do everything a classical computer can do! It's proof that quantum computers include classical computers as a subset. 

In Qcuit, you'll see it labeled as **CCX** (Controlled-Controlled-X).

---

### M - Measurement

**🔬 Technical Deep Dive**

- **Mathematical Operation**: Projection onto computational basis
- **Projectors**: P₀ = |0⟩⟨0|, P₁ = |1⟩⟨1|
- **Born Rule**: Pr(outcome) = |⟨outcome|ψ⟩|²
- **Post-Measurement State**: |ψ⟩ → Pₖ|ψ⟩ / ||Pₖ|ψ⟩||
- **Irreversible**: Only non-unitary operation in standard QC
- **Wavefunction Collapse**: Destroys superposition and entanglement with measured qubit
- **Classical Output**: Produces classical bit stored in classical register

**💡 Simply Put**

Measurement is the **moment of truth** – it's how you get answers from your quantum computer.

Before measurement, a qubit can be in a fuzzy superposition of 0 and 1. But when you measure:

1. The quantum "fuzziness" **collapses** into a definite answer
2. You get either 0 or 1 (never both!)
3. The probability of each outcome depends on the quantum state

**Important**: Measurement is irreversible! Once you look, you can't un-look. The superposition is gone forever.

Think of it like opening a box that contains Schrödinger's cat – the act of looking forces reality to "pick" one option.

---

# 2. Q-CUIT SPHERE

**🔬 Technical Deep Dive**

- **Mathematical Basis**: Visualization of 2ⁿ-dimensional Hilbert space onto a sphere
- **State Mapping**: Each computational basis state |x⟩ (where x ∈ {0,1}ⁿ) is mapped to a point
- **Hamming Weight Latitude**: States with same Hamming weight (number of 1s) are at same latitude
  - |000...0⟩ at north pole (Hamming weight 0)
  - |111...1⟩ at south pole (Hamming weight n)
- **Amplitude Encoding**:
  - **Magnitude**: |αₓ|² determines bubble size (probability)
  - **Phase**: arg(αₓ) encoded as color (typically using HSL color wheel)
- **Complexity**: Displays O(2ⁿ) basis states – exponential in qubit count
- **Entanglement Signature**: Non-separable states show characteristic multi-bubble patterns
- **Implementation**: Three.js WebGL rendering with spherical coordinate mapping

**💡 Simply Put**

The Q-cuit Sphere is like a **magical snow globe** that shows your entire quantum state at once!

Imagine a globe where:
- **North pole** = All qubits are 0 (like |0000⟩)
- **South pole** = All qubits are 1 (like |1111⟩)
- **In between** = Mixtures (like |0011⟩ or |1010⟩)

**The bubbles tell the story**:
- **Big bubble** = "This state is very likely"
- **Small bubble** = "This state is possible but rare"
- **No bubble** = "This state will never happen"
- **Bubble color** = The quantum phase (invisible but important!)

**What patterns mean**:
- **One big bubble at top** → Your qubits are all definitely 0
- **One big bubble at bottom** → Your qubits are all definitely 1
- **Bubbles at equator** → You're in superposition!
- **Two equal bubbles at opposite ends** → You might have entanglement!

It's the best way to "see" your quantum state – like having quantum X-ray vision!

---

# 3. BLOCH SPHERE

**🔬 Technical Deep Dive**

- **Mathematical Representation**: Maps single-qubit pure states to S² (unit sphere in R³)
- **Parameterization**: |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
  - θ ∈ [0,π]: polar angle from +Z axis
  - φ ∈ [0,2π): azimuthal angle in XY plane
- **Bloch Vector**: r⃗ = (sin θ cos φ, sin θ sin φ, cos θ)
- **Pauli Expectation Values**: 
  - x = ⟨X⟩ = sin θ cos φ
  - y = ⟨Y⟩ = sin θ sin φ
  - z = ⟨Z⟩ = cos θ
- **Density Matrix**: ρ = (I + r⃗·σ⃗)/2 where σ⃗ = (X,Y,Z)
- **Gate Actions**: All single-qubit unitaries are rotations on the Bloch sphere
- **Mixed States**: Interior points (|r⃗| < 1) represent mixed states
- **Measurement Basis**: Z-axis corresponds to computational basis measurement

**💡 Simply Put**

The Bloch Sphere is your **quantum compass** for a single qubit.

Think of it as a globe with an arrow inside:
- **Arrow pointing up (North)** = Qubit is definitely 0
- **Arrow pointing down (South)** = Qubit is definitely 1
- **Arrow pointing sideways** = Qubit is in superposition!

**What gates do to the arrow**:
- **X gate**: Flips the arrow upside down (like a somersault)
- **Y gate**: Flips with a twist
- **Z gate**: Spins the arrow around the vertical axis
- **H gate**: Tips the arrow from vertical to horizontal

**Reading the compass**:
- Arrow near the top? High chance of measuring 0
- Arrow near the bottom? High chance of measuring 1
- Arrow at the equator? 50/50 coin flip!

The Bloch Sphere shows you that quantum gates are just *rotations* – they spin the arrow around different axes. That's all quantum computing is at the single-qubit level: carefully choreographed spinning!

---

# 4. ENTANGLEMENT TAB

**🔬 Technical Deep Dive**

- **Entanglement Detection**: Uses reduced density matrix analysis
- **Calculation Method**:
  1. Compute full density matrix ρ = |ψ⟩⟨ψ|
  2. For each qubit pair (i,j), compute partial trace ρᵢⱼ = Tr_{other}(ρ)
  3. Calculate concurrence: C = max(0, λ₁ - λ₂ - λ₃ - λ₄)
  4. Or use mutual information: I(A:B) = S(A) + S(B) - S(AB)
- **Von Neumann Entropy**: S(ρ) = -Tr(ρ log ρ) measures entanglement with rest of system
- **Graph Representation**:
  - Nodes: Individual qubits
  - Edge weight: Entanglement measure (concurrence, negativity, or mutual information)
  - Layout: Force-directed graph algorithm
- **Complexity**: O(4ⁿ) for full density matrix, optimized for small qubit counts
- **Separability Criterion**: Product states have zero entanglement; maximally entangled states have maximum

**💡 Simply Put**

The Entanglement Tab is your **quantum friendship map**!

Entanglement is the spookiest thing about quantum mechanics – when qubits get entangled, they become mysteriously connected, like two coins that always land the same way even when flipped on opposite sides of the universe.

**What the diagram shows**:
- **Circles** = Your qubits (labeled q0, q1, q2...)
- **Lines between circles** = Entanglement connections
- **Thick lines** = Strong entanglement ("best friends")
- **Thin lines** = Weak entanglement ("acquaintances")
- **No line** = No entanglement ("strangers")

**Common patterns**:
- **○───○** (two connected) = Bell pair (perfect entanglement between 2 qubits)
- **Star pattern** = GHZ state (one qubit connected to many)
- **All separate** = No quantum advantage (could be classical)

**Why it matters**: Entanglement is the *source of quantum power*. No entanglement = no quantum speedup. This tab helps you verify your circuit is actually doing something quantum!

---

# 5. RESOURCES TAB

**🔬 Technical Deep Dive**

- **Circuit Depth**: Longest path through circuit DAG (critical path)
- **Gate Count Metrics**:
  - Single-qubit gates: O(1) error, ~20-50ns
  - Two-qubit gates: O(10⁻²) error, ~200-500ns
  - T-gates: Special tracking for fault-tolerant resource estimation
- **Execution Time Estimation**: Σ(gate_times) + scheduling overhead
- **Fidelity Estimation**: F ≈ ∏(1 - εᵢ) where εᵢ is gate error rate
- **Hardware Parameters Database**:
  - IBM Brisbane: 127 qubits, heavy-hex topology, T1≈200μs, 2Q error≈1%
  - IonQ Aria: 25 qubits, all-to-all connectivity, T1≈10s, 2Q error≈0.5%
- **Transpilation Cost**: Estimates SWAP overhead for target topology
- **Coherence Budget**: Circuit time vs T1/T2 decoherence times

**💡 Simply Put**

The Resources Tab is your **quantum reality check**!

Real quantum computers are noisy and limited. This tab tells you:

**What you'll see**:
- **Total Gates**: How many operations your circuit uses
- **Circuit Depth**: How many "layers" deep (affects error accumulation)
- **Estimated Fidelity**: How likely your circuit will work correctly (higher = better)
- **Qubit Usage**: How many of the hardware's qubits you need

**Why it matters**:
- **Too many gates?** → More errors accumulate
- **Too deep?** → Qubits "forget" before you finish (decoherence)
- **Low fidelity?** → Your results will be garbage

**Hardware dropdown**: Shows how your circuit would perform on real quantum computers like IBM Brisbane or IonQ Aria.

Think of it like checking if your recipe is too complicated for your kitchen. Sure, you *could* make a 20-layer cake, but will it actually work with your oven and skills?

---

# 6. DEBUG TAB

**🔬 Technical Deep Dive**

- **State Evolution Tracking**: Stores statevector at each timestep
- **Complexity**: O(2ⁿ × d) where d = circuit depth
- **Amplitude Precision**: Complex128 (double precision complex)
- **Keyframe Storage**: Full statevector snapshot per gate application
- **Visualization**:
  - Probability bars: |αᵢ|² for each basis state
  - Phase encoding: arg(αᵢ) shown as color
  - Sparse display: Only shows non-zero amplitudes (threshold: 10⁻¹⁰)
- **Playback Controls**: 
  - Linear interpolation between keyframes for smooth animation
  - O(1) random access to any timestep
- **Memory Optimization**: Lazy evaluation, garbage collection between views

**💡 Simply Put**

The Debug Tab is your **quantum DVR** – it lets you watch your circuit in slow motion, frame by frame!

**How to use it**:
1. Click "Compute Timeline"
2. Use the slider to scrub through time
3. Watch how the quantum state changes at each step

**What you see at each step**:
- **Top States**: Which outcomes are possible and their probabilities
- **Timeline position**: Where you are in the circuit
- **Gate applied**: What operation just happened

**Why it's magical**:
- **See superposition form**: Watch 100% |0⟩ become 50%|0⟩ + 50%|1⟩ after an H gate
- **Watch entanglement happen**: See correlations appear after CNOT
- **Debug problems**: "Why is my circuit giving wrong results?" – trace through step by step!

It's like having a **quantum microscope** that lets you see the invisible. Normal quantum mechanics says you can't watch without disturbing – but in simulation, you can peek at everything!

---

# 7. PRESETS TAB

**🔬 Technical Deep Dive**

- **Preset Data Structure**: JSON encoding of CircuitState objects
- **Included Circuits**:
  - **Bell State**: H(0), CNOT(0,1) – 2 qubits, depth 2
  - **GHZ State**: H(0), CNOT(0,1), CNOT(1,2) – 3 qubits, depth 3
  - **QFT**: Hadamards + controlled-phase gates – O(n²) gates
  - **Grover's Oracle**: Problem-specific unitary
- **Circuit Loading**: Dispatches LOAD_CIRCUIT action to Redux-style reducer
- **Validation**: Schema validation ensures well-formed CircuitState
- **Extensibility**: JSON format allows user-defined preset import

**💡 Simply Put**

The Presets Tab is your **quantum recipe book**!

Instead of building circuits from scratch, you can load famous, pre-built circuits with one click:

- **Bell State**: The simplest entangled state – great for learning!
- **GHZ State**: Three qubits all entangled together
- **Superposition**: Basic H gate demonstrations

**Why use presets**:
1. **Learning**: See how experts build circuits
2. **Starting point**: Load a preset, then modify it
3. **Testing**: Verify your simulator gives expected results

It's like having a cooking show where the chef already prepped the ingredients. You can see the final dish, understand the recipe, and then try your own variations!

---

# 8. OPTIMIZE TAB

**🔬 Technical Deep Dive**

- **Optimization Passes**:
  1. **Gate Cancellation**: Detect U·U† = I patterns (e.g., HH, XX)
  2. **Gate Merging**: Combine consecutive rotations: RZ(θ₁)·RZ(θ₂) = RZ(θ₁+θ₂)
  3. **Commutation**: Reorder commuting gates for depth reduction
  4. **Template Matching**: Pattern database of known equivalences
- **DAG Representation**: Circuit as directed acyclic graph
  - Nodes: Gates
  - Edges: Qubit dependencies
  - Critical path = circuit depth
- **Optimization Levels**:
  - Level 1: O(n) local optimizations
  - Level 2: O(n²) commutation analysis
  - Level 3: O(n³) global resynthesis
- **Verification**: Unitary equivalence check: ||U_original - U_optimized|| < ε
- **Hardware-Aware**: Topology-constrained optimization when backend specified

**💡 Simply Put**

The Optimize Tab is your **quantum efficiency expert**!

It takes your circuit and makes it *better* – fewer gates, shorter execution, fewer errors.

**What it does**:
- **Removes redundant gates**: Two H gates in a row? They cancel out!
- **Combines operations**: Multiple rotations? Merge them into one!
- **Reorganizes**: Finds ways to run gates in parallel

**Before vs After example**:
```
Before: H─X─H─Z─H─X─H  (7 gates)
After:  X─Z─X          (3 gates)
Same result, but 57% fewer gates!
```

**Why optimize?**:
- **Fewer errors**: Every gate has a chance of error. Fewer gates = fewer chances to mess up.
- **Faster execution**: Shorter circuits finish before qubits decohere
- **Lower cost**: Cloud quantum computing charges by gate/time

**Pro tip**: Always optimize before running on real hardware. It's free improvement!

---

# 9. SUMMARY CHEAT SHEET

| Feature | Technical Purpose | Simply Put |
|---------|------------------|------------|
| **Gates** | Unitary transformations on Hilbert space | Quantum LEGO blocks that manipulate qubits |
| **Q-cuit Sphere** | 2ⁿ-dimensional state visualization | Snow globe showing all possible outcomes |
| **Bloch Sphere** | Single-qubit S² representation | Compass showing where one qubit is pointing |
| **Entanglement** | Reduced density matrix analysis | Friendship map between qubits |
| **Resources** | Hardware feasibility estimation | Reality check for your circuit |
| **Debug** | Statevector evolution tracking | Quantum DVR – watch in slow motion |
| **Presets** | Pre-built circuit templates | Recipe book of famous circuits |
| **Optimize** | DAG-based circuit transformation | Efficiency expert that removes waste |

---

## Quick Reference

### Essential Gate Combinations
- **Bell State**: H(0), CNOT(0,1)
- **GHZ State**: H(0), CNOT(0,1), CNOT(1,2)
- **Universal Set**: H, T, CNOT

### Common Patterns
- **Superposition**: H gate
- **Entanglement**: CNOT after H
- **Phase Control**: S, T, Z gates
- **Measurement**: M gate

### Optimization Tips
1. Cancel opposite gates (H·H = I)
2. Merge consecutive rotations
3. Parallelize independent operations
4. Minimize SWAP gates

### Debug Workflow
1. Build circuit
2. Run simulation
3. Check debug timeline
4. Verify each step
5. Optimize if needed

---

## About Qcuit.com

Qcuit.com is an educational ecosystem for quantum computing, rooted in the philosophy of **Digital Heritage** — the belief that quantum mechanics is not a fleeting trend, but a foundational truth of the universe, deserving of the gravitas of an established institution and the clarity of great design.

**The Three Pillars**:
- **The Studio** — Visual circuit editor with drag-and-drop, real-time simulation, and code generation (Qiskit, Braket, OpenQASM)
- **The Q-cuit Sphere** — Proprietary 3D visualization engine for quantum state exploration
- **The Q-Hub** — Community discourse space with channels, mentorship, and LaTeX support

**The Exploratorium**:
An interactive, narrative-driven learning interface following the "Read-Watch-Do" pedagogical pattern. Concepts are presented with editorial text, visual demonstrations, and hands-on interactive widgets.

**Mission**: Demystifying quantum mechanics for the modern mind — transforming confusion into clarity, one concept at a time.

---

# 10. ARCHITECTURE

## Backend API Reference

The Qcuit platform is built on Flask (Python) with the Application Factory pattern and modular Blueprints.

### Simulation API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/simulate` | POST | Run quantum circuit simulation with noise modeling |
| `/api/statevector` | POST | Get full statevector for Q-cuit Sphere visualization |
| `/api/optimize` | POST | DAG-based circuit optimization |
| `/api/transpile` | POST | Transpile circuit for hardware topology |
| `/api/estimate` | POST | Estimate hardware resources and fidelity |
| `/api/dynamic` | POST | Run dynamic circuits with mid-circuit measurement |

### Community API (Authenticated)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Register new community user |
| `/api/auth/login` | POST | No | Authenticate and receive JWT |
| `/api/auth/me` | GET | Yes | Get current user profile |
| `/api/posts` | GET | No | List published articles (paginated) |
| `/api/posts` | POST | Yes (Author+) | Create new article |
| `/api/posts/<slug>` | GET | No | Fetch single article |
| `/api/posts/<slug>` | PUT | Yes (Owner/Admin) | Update article |
| `/api/posts/<slug>/comments` | GET | No | Fetch comments |
| `/api/posts/<slug>/comments` | POST | Yes | Add comment |
| `/api/posts/pending` | GET | Yes (Editor+) | List posts awaiting moderation |
| `/api/posts/<slug>/approve` | POST | Yes (Editor+) | Approve pending post |
| `/api/user/profile` | PUT | Yes | Update bio and avatar |

### User Roles (RBAC)

| Role | Permissions |
|------|------------|
| **Admin** | Full access — publish, moderate, manage users |
| **Editor** | Publish and moderate community posts |
| **Author** | Submit posts (pending approval unless Editor+) |
| **Reader** | Read content, comment on posts |

---

*This documentation is maintained by the Qcuit.com team. For the most up-to-date information, visit [qcuit.com](https://qcuit.com).*

*Built by Faizan Khan · Computer Science · Presidential Scholar · University of Alabama*

---

*© 2026 Qcuit.com. The Heritage of Future Logic. All rights reserved.*
