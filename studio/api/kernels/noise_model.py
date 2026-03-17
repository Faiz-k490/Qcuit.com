"""Noise Model - Kraus Operator Implementation for Decoherence

Implements realistic noise models:
- T1 (Amplitude Damping): Energy relaxation |1⟩ → |0⟩
- T2 (Phase Damping): Dephasing without energy loss
- Depolarizing: Random Pauli errors
- Readout (SPAM) Errors: Confusion matrix for measurements
"""
from __future__ import annotations
import numpy as np
from typing import Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .statevector import StatevectorKernel


class NoiseModel:
    """Configurable noise model with per-qubit error rates."""
    
    def __init__(self, config: Optional[Dict] = None):
        """Initialize noise model.
        
        Config format:
        {
            "global": {"T1": 50e-6, "T2": 70e-6, "gate_time": 35e-9},
            "qubit_0": {"T1": 45e-6, "T2": 65e-6},
            "readout": {"qubit_0": [[0.98, 0.02], [0.03, 0.97]]}
        }
        """
        self.config = config or {}
        self.global_t1 = self.config.get('global', {}).get('T1', 50e-6)
        self.global_t2 = self.config.get('global', {}).get('T2', 70e-6)
        self.gate_time = self.config.get('global', {}).get('gate_time', 35e-9)
        self.depolarizing_rate = self.config.get('global', {}).get('depolarizing', 0.0)
    
    def get_qubit_params(self, qubit: int) -> Dict[str, float]:
        """Get T1/T2 parameters for a specific qubit."""
        qubit_config = self.config.get(f'qubit_{qubit}', {})
        return {
            'T1': qubit_config.get('T1', self.global_t1),
            'T2': qubit_config.get('T2', self.global_t2),
        }
    
    def apply_gate_noise(self, kernel: 'StatevectorKernel', qubit: int, gate_type: str) -> None:
        """Apply noise after a gate operation."""
        if self.depolarizing_rate > 0:
            self._apply_depolarizing(kernel, qubit, self.depolarizing_rate)
        
        # Apply T1/T2 decoherence based on gate time
        params = self.get_qubit_params(qubit)
        t = self.gate_time
        
        if params['T1'] > 0:
            gamma = 1 - np.exp(-t / params['T1'])
            if gamma > 1e-10:
                self._apply_amplitude_damping(kernel, qubit, gamma)
        
        if params['T2'] > 0:
            # T2 includes T1 effects, so compute pure dephasing
            t2_star = params['T2']
            t1 = params['T1']
            if t1 > 0:
                # Pure dephasing rate
                gamma_phi = max(0, 1/t2_star - 1/(2*t1))
                lambda_param = 1 - np.exp(-gamma_phi * t)
            else:
                lambda_param = 1 - np.exp(-t / t2_star)
            
            if lambda_param > 1e-10:
                self._apply_phase_damping(kernel, qubit, lambda_param)
    
    def _apply_amplitude_damping(self, kernel: 'StatevectorKernel', qubit: int, gamma: float) -> None:
        """Apply amplitude damping channel using Kraus operators.
        
        K0 = [[1, 0], [0, sqrt(1-γ)]]
        K1 = [[0, sqrt(γ)], [0, 0]]
        
        This is a Monte Carlo trajectory approach - randomly apply K0 or K1.
        """
        sqrt_gamma = np.sqrt(gamma)
        sqrt_1_gamma = np.sqrt(1 - gamma)
        
        # Calculate probability of decay
        prob_decay = 0.0
        mask = 1 << qubit
        
        for i in range(2 ** kernel.num_qubits):
            if i & mask:  # |1⟩ state
                prob_decay += gamma * np.abs(kernel.state[i]) ** 2
        
        if np.random.random() < prob_decay and prob_decay > 0:
            # Apply K1 (decay happened)
            for i in range(2 ** kernel.num_qubits):
                if i & mask:  # |1⟩ → |0⟩
                    j = i ^ mask  # Clear the qubit bit
                    kernel.state[j] += sqrt_gamma * kernel.state[i]
                    kernel.state[i] = 0
            # Renormalize
            norm = np.linalg.norm(kernel.state)
            if norm > 0:
                kernel.state /= norm
        else:
            # Apply K0 (no decay)
            for i in range(2 ** kernel.num_qubits):
                if i & mask:
                    kernel.state[i] *= sqrt_1_gamma
            # Renormalize
            norm = np.linalg.norm(kernel.state)
            if norm > 0:
                kernel.state /= norm
    
    def _apply_phase_damping(self, kernel: 'StatevectorKernel', qubit: int, lambda_param: float) -> None:
        """Apply phase damping channel.
        
        K0 = [[1, 0], [0, sqrt(1-λ)]]
        K1 = [[0, 0], [0, sqrt(λ)]]
        """
        sqrt_lambda = np.sqrt(lambda_param)
        sqrt_1_lambda = np.sqrt(1 - lambda_param)
        mask = 1 << qubit
        
        # Monte Carlo: randomly apply phase kick
        prob_dephase = 0.0
        for i in range(2 ** kernel.num_qubits):
            if i & mask:
                prob_dephase += lambda_param * np.abs(kernel.state[i]) ** 2
        
        if np.random.random() < prob_dephase and prob_dephase > 0:
            # K1: Phase kick on |1⟩ component
            for i in range(2 ** kernel.num_qubits):
                if i & mask:
                    kernel.state[i] *= sqrt_lambda
            norm = np.linalg.norm(kernel.state)
            if norm > 0:
                kernel.state /= norm
        else:
            # K0: Slight damping
            for i in range(2 ** kernel.num_qubits):
                if i & mask:
                    kernel.state[i] *= sqrt_1_lambda
            norm = np.linalg.norm(kernel.state)
            if norm > 0:
                kernel.state /= norm
    
    def _apply_depolarizing(self, kernel: 'StatevectorKernel', qubit: int, p: float) -> None:
        """Apply depolarizing channel - random X, Y, or Z with prob p/3 each."""
        if p <= 0:
            return
        
        r = np.random.random()
        p_gate = p / 3.0
        
        if r < p_gate:
            kernel.apply_gate('X', qubit)
        elif r < 2 * p_gate:
            kernel.apply_gate('Y', qubit)
        elif r < 3 * p_gate:
            kernel.apply_gate('Z', qubit)
    
    def apply_readout_error(self, qubit: int, result: int) -> int:
        """Apply SPAM error using confusion matrix."""
        readout_config = self.config.get('readout', {}).get(f'qubit_{qubit}')
        
        if readout_config is None:
            return result
        
        # Confusion matrix: [[P(0|0), P(1|0)], [P(0|1), P(1|1)]]
        confusion = np.array(readout_config)
        
        if np.random.random() < confusion[result][1 - result]:
            return 1 - result  # Flip the result
        
        return result


def create_ibm_noise_model(backend_name: str = 'ibm_brisbane') -> NoiseModel:
    """Create a noise model based on IBM backend properties."""
    # Approximate values for IBM backends
    configs = {
        'ibm_brisbane': {
            'global': {'T1': 200e-6, 'T2': 150e-6, 'gate_time': 35e-9, 'depolarizing': 0.001}
        },
        'ibm_osaka': {
            'global': {'T1': 180e-6, 'T2': 120e-6, 'gate_time': 35e-9, 'depolarizing': 0.002}
        },
        'ibm_kyoto': {
            'global': {'T1': 220e-6, 'T2': 180e-6, 'gate_time': 35e-9, 'depolarizing': 0.0008}
        },
    }
    
    config = configs.get(backend_name, configs['ibm_brisbane'])
    return NoiseModel(config)
