# Introduction to Noise

When building quantum circuits, noise is an unavoidable reality. It alters the state of our qubits in unpredictable ways over time.

## Simulating Noise

Using Qiskit's Aer simulator, we can inject depolarizing or thermal relaxation noise to see how our ideal circuits perform under real-world conditions.

> Always test your circuits with at least a small noise model before assuming they will run perfectly on real hardware.
