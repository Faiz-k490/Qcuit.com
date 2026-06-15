import numpy as np

from qcuit.hep import apply_lorentz_transform, lorentz_boost, minkowski_norm


def test_lorentz_boost_preserves_minkowski_norm():
    vectors = np.array(
        [
            [10.0, 2.0, 1.0, 3.0],
            [7.0, -1.5, 0.3, 2.2],
        ]
    )
    boosted = apply_lorentz_transform(vectors, lorentz_boost(0.31, axis="x"))

    assert np.allclose(minkowski_norm(vectors), minkowski_norm(boosted), atol=1e-8)
