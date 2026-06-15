"""Jet graph data containers and PyTorch dataloaders."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from qcuit._optional import missing_extra


def _torch():
    try:
        import torch
    except ImportError as exc:
        raise missing_extra("torch", "hep", "Qcuit HEP data loaders") from exc
    return torch


def _optional_import(package: str, extra: str, feature: str):
    try:
        return __import__(package)
    except ImportError as exc:
        raise missing_extra(package, extra, feature) from exc


TOP_TAGGING_P4_KEYS = ("p4s", "particles", "constituents", "X", "features")
LABEL_KEYS = ("labels", "label", "y", "target", "targets", "is_signal", "is_signal_new", "jet_label")
JETCLASS_LABEL_KEYS = ("label", "labels", "jet_label", "class_id", "target", "y")
JETCLASS_P4_ALIASES = {
    "energy": ("part_energy", "part_e", "part_E", "energy", "E"),
    "px": ("part_px", "px"),
    "py": ("part_py", "py"),
    "pz": ("part_pz", "pz"),
    "pt": ("part_pt", "pt"),
    "eta": ("part_eta", "eta"),
    "phi": ("part_phi", "phi"),
    "mass": ("part_mass", "part_m", "mass", "m"),
}
DEFAULT_JETCLASS_SCALARS = (
    "part_pt",
    "part_eta",
    "part_phi",
    "part_mass",
    "part_charge",
    "part_isChargedHadron",
    "part_isNeutralHadron",
    "part_isPhoton",
    "part_isElectron",
    "part_isMuon",
)


@dataclass
class JetBatch:
    """A collated batch of jet graphs flattened for LorentzNet-style models."""

    labels: Any
    p4s: Any
    scalars: Any
    node_mask: Any
    edge_mask: Any
    edges: list[Any]
    batch_size: int
    n_nodes: int

    def to(self, device: Any, dtype: Any | None = None) -> "JetBatch":
        torch = _torch()
        float_dtype = dtype or self.p4s.dtype
        return JetBatch(
            labels=self.labels.to(device),
            p4s=self.p4s.to(device=device, dtype=float_dtype),
            scalars=self.scalars.to(device=device, dtype=float_dtype),
            node_mask=self.node_mask.to(device=device, dtype=float_dtype),
            edge_mask=self.edge_mask.to(device=device),
            edges=[edge.to(device=device) for edge in self.edges],
            batch_size=self.batch_size,
            n_nodes=self.n_nodes,
        )


def _as_tensor(value: Any, *, dtype: Any | None = None):
    torch = _torch()
    if hasattr(value, "detach"):
        return value.to(dtype=dtype) if dtype is not None else value
    return torch.as_tensor(value, dtype=dtype)


def _to_numpy(value: Any) -> np.ndarray:
    if hasattr(value, "detach"):
        return value.detach().cpu().numpy()
    try:
        ak = __import__("awkward")
    except ImportError:
        ak = None
    if ak is not None and hasattr(value, "layout"):
        return np.asarray(ak.to_numpy(value))
    return np.asarray(value)


def _pad_jagged(values: Any, max_nodes: int | None = None, *, fill: float = 0.0) -> np.ndarray:
    """Pad dense, awkward, or Python jagged arrays to ``[jets, max_nodes]``."""
    if hasattr(values, "layout"):
        ak = _optional_import("awkward", "hep-io", "Qcuit ROOT/JetClass loaders")
        counts = ak.num(values, axis=1)
        if max_nodes is None:
            max_nodes = int(ak.max(counts)) if len(counts) else 0
        padded = ak.pad_none(values, max_nodes, axis=1, clip=True)
        return np.asarray(ak.to_numpy(ak.fill_none(padded, fill)), dtype=np.float32)

    try:
        arr = np.asarray(values)
    except ValueError:
        arr = np.asarray(values, dtype=object)
    if arr.dtype != object and arr.ndim >= 2:
        if max_nodes is not None:
            arr = arr[:, :max_nodes]
        return np.asarray(arr, dtype=np.float32)

    rows = [np.asarray(row, dtype=np.float32).reshape(-1) for row in values]
    if max_nodes is None:
        max_nodes = max((row.shape[0] for row in rows), default=0)
    out = np.full((len(rows), max_nodes), fill, dtype=np.float32)
    for idx, row in enumerate(rows):
        width = min(max_nodes, row.shape[0])
        if width:
            out[idx, :width] = row[:width]
    return out


def _stack_scalar_features(features: Mapping[str, Any] | Sequence[Any] | np.ndarray, max_nodes: int | None) -> np.ndarray:
    if isinstance(features, Mapping):
        arrays = [_pad_jagged(value, max_nodes) for value in features.values()]
        return np.stack(arrays, axis=-1)

    if hasattr(features, "shape") and len(features.shape) == 3:
        arr = _to_numpy(features)
        if max_nodes is not None:
            arr = arr[:, :max_nodes, :]
        return np.asarray(arr, dtype=np.float32)

    arrays = [_pad_jagged(value, max_nodes) for value in features]
    return np.stack(arrays, axis=-1)


def _sort_by_pt(p4s: np.ndarray, scalars: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray | None]:
    pt = np.sqrt(p4s[..., 1] ** 2 + p4s[..., 2] ** 2)
    order = np.argsort(-pt, axis=1)
    p4_sorted = np.take_along_axis(p4s, order[..., None], axis=1)
    scalar_sorted = None
    if scalars is not None:
        scalar_sorted = np.take_along_axis(scalars, order[..., None], axis=1)
    return p4_sorted, scalar_sorted


def _scalars_from_p4(p4s: Any) -> np.ndarray:
    p4_np = _to_numpy(p4s).astype(np.float32)
    pt = np.sqrt(p4_np[..., 1] ** 2 + p4_np[..., 2] ** 2)
    mass2 = p4_np[..., 0] ** 2 - np.sum(p4_np[..., 1:] ** 2, axis=-1)
    mass = np.sqrt(np.clip(mass2, 0.0, None))
    pt_sum = np.clip(pt.sum(axis=1, keepdims=True), 1.0e-8, None)
    return np.stack([mass, pt / pt_sum], axis=-1).astype(np.float32)


def four_vectors_from_ptetaphim(
    pt: Any,
    eta: Any,
    phi: Any,
    mass: Any | None = None,
    *,
    max_nodes: int | None = None,
) -> np.ndarray:
    """Convert particle ``pt, eta, phi, mass`` arrays to ``[E, px, py, pz]``.

    Inputs may be dense arrays, awkward arrays, or Python jagged lists. The
    output is padded to ``[num_jets, max_nodes, 4]``.
    """
    pt_np = _pad_jagged(pt, max_nodes)
    eta_np = _pad_jagged(eta, pt_np.shape[1])
    phi_np = _pad_jagged(phi, pt_np.shape[1])
    mass_np = np.zeros_like(pt_np) if mass is None else _pad_jagged(mass, pt_np.shape[1])

    px = pt_np * np.cos(phi_np)
    py = pt_np * np.sin(phi_np)
    pz = pt_np * np.sinh(eta_np)
    energy = np.sqrt(np.clip(px * px + py * py + pz * pz + mass_np * mass_np, 0.0, None))
    return np.stack([energy, px, py, pz], axis=-1).astype(np.float32)


def _default_node_mask(p4s: Any):
    torch = _torch()
    active = torch.linalg.norm(p4s, dim=-1) > 0
    return active.to(dtype=p4s.dtype).unsqueeze(-1)


def _default_edge_mask(node_mask: Any):
    torch = _torch()
    active = node_mask.squeeze(-1).bool()
    edge_mask = active.unsqueeze(1) & active.unsqueeze(2)
    n_nodes = edge_mask.shape[-1]
    diag = torch.eye(n_nodes, dtype=torch.bool, device=edge_mask.device).unsqueeze(0)
    return edge_mask & ~diag


def edges_from_mask(edge_mask: Any) -> list[Any]:
    """Build flat batched edge indices from a dense ``[B, N, N]`` mask."""
    torch = _torch()
    mask = edge_mask.bool()
    batch_size, n_nodes, _ = mask.shape
    rows, cols = torch.nonzero(mask, as_tuple=True)[1:]
    batch = torch.nonzero(mask, as_tuple=True)[0]
    offsets = batch * n_nodes
    return [(offsets + rows).long(), (offsets + cols).long()]


def collate_jets(samples: list[tuple[Any, Any, Any, Any, Any]]) -> JetBatch:
    """Collate ``JetDataset`` samples into a flattened model batch."""
    torch = _torch()
    labels, p4s, scalars, node_mask, edge_mask = zip(*samples)
    labels_t = torch.stack(labels).long()
    p4s_t = torch.stack(p4s)
    scalars_t = torch.stack(scalars)
    node_mask_t = torch.stack(node_mask)
    edge_mask_t = torch.stack(edge_mask)
    batch_size, n_nodes, _ = p4s_t.shape

    return JetBatch(
        labels=labels_t,
        p4s=p4s_t.reshape(batch_size * n_nodes, -1),
        scalars=scalars_t.reshape(batch_size * n_nodes, -1),
        node_mask=node_mask_t.reshape(batch_size * n_nodes, -1),
        edge_mask=edge_mask_t,
        edges=edges_from_mask(edge_mask_t),
        batch_size=batch_size,
        n_nodes=n_nodes,
    )


class JetDataset:
    """PyTorch-compatible quark/gluon jet graph dataset."""

    def __init__(self, p4s: Any, scalars: Any, labels: Any, node_mask: Any | None = None, edge_mask: Any | None = None):
        torch = _torch()
        self.p4s = _as_tensor(p4s, dtype=torch.float32)
        self.scalars = _as_tensor(scalars, dtype=torch.float32)
        self.labels = _as_tensor(labels, dtype=torch.long)
        if self.p4s.ndim != 3 or self.p4s.shape[-1] != 4:
            raise ValueError("p4s must have shape [num_jets, num_nodes, 4]")
        if self.scalars.ndim != 3 or self.scalars.shape[:2] != self.p4s.shape[:2]:
            raise ValueError("scalars must have shape [num_jets, num_nodes, features]")
        if self.labels.ndim != 1 or self.labels.shape[0] != self.p4s.shape[0]:
            raise ValueError("labels must have shape [num_jets]")

        self.node_mask = _as_tensor(node_mask, dtype=torch.float32) if node_mask is not None else _default_node_mask(self.p4s)
        if self.node_mask.ndim == 2:
            self.node_mask = self.node_mask.unsqueeze(-1)
        self.edge_mask = _as_tensor(edge_mask).bool() if edge_mask is not None else _default_edge_mask(self.node_mask)

    @classmethod
    def from_arrays(
        cls,
        p4s: Any,
        scalars: Any,
        labels: Any,
        node_mask: Any | None = None,
        edge_mask: Any | None = None,
    ) -> "JetDataset":
        return cls(p4s=p4s, scalars=scalars, labels=labels, node_mask=node_mask, edge_mask=edge_mask)

    @classmethod
    def from_kinematics(
        cls,
        *,
        pt: Any,
        eta: Any,
        phi: Any,
        labels: Any,
        mass: Any | None = None,
        scalar_features: Mapping[str, Any] | Sequence[Any] | np.ndarray | None = None,
        max_nodes: int | None = None,
        sort_by_pt: bool = True,
    ) -> "JetDataset":
        """Build a jet graph dataset from constituent kinematics.

        ``pt``, ``eta``, ``phi``, and ``mass`` may be dense arrays, awkward
        arrays, or Python jagged lists. By default the scalar node features are
        ``[pt, eta, phi, mass]``; pass ``scalar_features`` to use dataset-native
        features such as particle ID flags.
        """
        p4s = four_vectors_from_ptetaphim(pt, eta, phi, mass, max_nodes=max_nodes)
        width = p4s.shape[1]
        pt_np = _pad_jagged(pt, width)
        eta_np = _pad_jagged(eta, width)
        phi_np = _pad_jagged(phi, width)
        mass_np = np.zeros_like(pt_np) if mass is None else _pad_jagged(mass, width)
        if scalar_features is None:
            scalars = np.stack([pt_np, eta_np, phi_np, mass_np], axis=-1).astype(np.float32)
        else:
            scalars = _stack_scalar_features(scalar_features, width)

        if sort_by_pt:
            p4s, scalars = _sort_by_pt(p4s, scalars)
        node_mask = (np.linalg.norm(p4s, axis=-1) > 0).astype(np.float32)[..., None]
        return cls.from_arrays(p4s=p4s, scalars=scalars, labels=labels, node_mask=node_mask)

    @classmethod
    def from_npz(cls, path: str | Path) -> "JetDataset":
        data = np.load(Path(path))
        node_mask = None
        if "node_mask" in data:
            node_mask = data["node_mask"]
        elif "atom_mask" in data:
            node_mask = data["atom_mask"]
        return cls.from_arrays(
            p4s=data["p4s"],
            scalars=data["scalars"] if "scalars" in data else data["nodes"],
            labels=data["labels"],
            node_mask=node_mask,
            edge_mask=data["edge_mask"] if "edge_mask" in data else None,
        )

    @classmethod
    def from_top_tagging(
        cls,
        path: str | Path,
        *,
        p4_key: str | None = None,
        label_key: str | None = None,
        scalar_key: str | None = None,
        max_nodes: int | None = 200,
        limit: int | None = None,
    ) -> "JetDataset":
        return load_top_tagging(
            path,
            p4_key=p4_key,
            label_key=label_key,
            scalar_key=scalar_key,
            max_nodes=max_nodes,
            limit=limit,
        )

    @classmethod
    def from_jetclass(
        cls,
        path: str | Path,
        **kwargs: Any,
    ) -> "JetDataset":
        return load_jetclass(path, **kwargs)

    @property
    def n_scalar(self) -> int:
        return int(self.scalars.shape[-1])

    @property
    def n_nodes(self) -> int:
        return int(self.p4s.shape[1])

    def __len__(self) -> int:
        return int(self.labels.shape[0])

    def __getitem__(self, index: int):
        return (
            self.labels[index],
            self.p4s[index],
            self.scalars[index],
            self.node_mask[index],
            self.edge_mask[index],
        )

    def split(self, train: float = 0.8, val: float = 0.1, test: float | None = None, *, seed: int = 0):
        torch = _torch()
        if test is None:
            test = 1.0 - train - val
        if not np.isclose(train + val + test, 1.0):
            raise ValueError("train + val + test must equal 1")
        total = len(self)
        if total < 3:
            raise ValueError("at least 3 jets are required for train/val/test splits")
        train_n = max(1, int(total * train))
        val_n = max(1, int(total * val)) if val > 0 else 0
        test_n = total - train_n - val_n
        if test_n <= 0:
            test_n = 1
            train_n = total - val_n - test_n
        if train_n <= 0:
            raise ValueError("split ratios leave no training samples")
        generator = torch.Generator().manual_seed(seed)
        return torch.utils.data.random_split(self, [train_n, val_n, test_n], generator=generator)

    def dataloaders(
        self,
        *,
        batch_size: int = 32,
        train: float = 0.8,
        val: float = 0.1,
        test: float | None = None,
        seed: int = 0,
        num_workers: int = 0,
    ) -> dict[str, Any]:
        torch = _torch()
        train_ds, val_ds, test_ds = self.split(train=train, val=val, test=test, seed=seed)
        return {
            "train": torch.utils.data.DataLoader(
                train_ds, batch_size=batch_size, shuffle=True, collate_fn=collate_jets, num_workers=num_workers
            ),
            "val": torch.utils.data.DataLoader(
                val_ds, batch_size=batch_size, shuffle=False, collate_fn=collate_jets, num_workers=num_workers
            ),
            "test": torch.utils.data.DataLoader(
                test_ds, batch_size=batch_size, shuffle=False, collate_fn=collate_jets, num_workers=num_workers
            ),
        }

    def to_pyg_data_list(self) -> list[Any]:
        """Convert this dataset to PyTorch Geometric ``Data`` objects."""
        torch = _torch()
        try:
            from torch_geometric.data import Data
        except ImportError as exc:
            raise missing_extra("torch-geometric", "pyg", "JetDataset.to_pyg_data_list") from exc

        graphs = []
        for idx in range(len(self)):
            label, p4, scalars, node_mask, edge_mask = self[idx]
            active = node_mask.squeeze(-1).bool()
            x = scalars[active]
            p4_active = p4[active]
            local_edge_mask = edge_mask[active][:, active]
            if local_edge_mask.numel():
                src, dst = torch.nonzero(local_edge_mask, as_tuple=True)
                edge_index = torch.stack([src.long(), dst.long()], dim=0)
            else:
                edge_index = torch.empty((2, 0), dtype=torch.long)
            graphs.append(Data(x=x, p4=p4_active, edge_index=edge_index, y=label.reshape(1)))
        return graphs


def _hdf5_arrays(handle: Any) -> dict[str, Any]:
    arrays: dict[str, Any] = {}

    def visit(name: str, obj: Any) -> None:
        if hasattr(obj, "shape") and hasattr(obj, "dtype"):
            arrays[name] = obj

    handle.visititems(visit)
    return arrays


def _find_key(arrays: Mapping[str, Any], candidates: Sequence[str], explicit: str | None = None) -> str:
    if explicit is not None:
        if explicit not in arrays:
            raise KeyError(f"dataset key '{explicit}' was not found")
        return explicit
    for candidate in candidates:
        if candidate in arrays:
            return candidate
        for key in arrays:
            if key.split("/")[-1] == candidate:
                return key
    available = ", ".join(sorted(arrays)[:12])
    raise KeyError(f"could not find any of {tuple(candidates)}. Available keys include: {available}")


def _read_hdf5_dataset(dataset: Any, limit: int | None = None) -> np.ndarray:
    if limit is None:
        return np.asarray(dataset)
    return np.asarray(dataset[:limit])


def load_top_tagging(
    path: str | Path,
    *,
    p4_key: str | None = None,
    label_key: str | None = None,
    scalar_key: str | None = None,
    max_nodes: int | None = 200,
    limit: int | None = None,
) -> JetDataset:
    """Load a local Top Tagging-style HDF5/NPZ file.

    The loader accepts common particle array keys such as ``X``, ``particles``,
    ``constituents``, or ``p4s`` and label keys such as ``y``, ``labels``, or
    ``is_signal_new``. It does not download data; labs can point it at their
    mirrored dataset location on a workstation or cluster filesystem.
    """
    path = Path(path)
    if path.suffix == ".npz":
        dataset = JetDataset.from_npz(path)
        if limit is not None:
            dataset = JetDataset.from_arrays(
                dataset.p4s[:limit],
                dataset.scalars[:limit],
                dataset.labels[:limit],
                node_mask=dataset.node_mask[:limit],
                edge_mask=dataset.edge_mask[:limit],
            )
        return dataset

    h5py = _optional_import("h5py", "hep-io", "Qcuit Top Tagging loader")
    with h5py.File(path, "r") as handle:
        arrays = _hdf5_arrays(handle)
        p4_name = _find_key(arrays, TOP_TAGGING_P4_KEYS, p4_key)
        label_name = _find_key(arrays, LABEL_KEYS, label_key)
        p4s = _read_hdf5_dataset(arrays[p4_name], limit=limit).astype(np.float32)
        labels = _read_hdf5_dataset(arrays[label_name], limit=limit)
        if labels.ndim == 2 and labels.shape[1] > 1:
            labels = labels.argmax(axis=1)
        else:
            labels = labels.reshape(-1)
        if max_nodes is not None:
            p4s = p4s[:, :max_nodes, :]
        if p4s.ndim != 3 or p4s.shape[-1] < 4:
            raise ValueError(f"{p4_name} must have shape [num_jets, num_nodes, >=4]")
        p4s = p4s[..., :4]
        if scalar_key is not None:
            scalars = _read_hdf5_dataset(arrays[_find_key(arrays, (scalar_key,), scalar_key)], limit=limit).astype(np.float32)
            if max_nodes is not None:
                scalars = scalars[:, :max_nodes, :]
        else:
            scalars = _scalars_from_p4(p4s)
    return JetDataset.from_arrays(p4s=p4s, scalars=scalars, labels=labels)


def _root_tree(root_file: Any, tree: str | None) -> Any:
    if tree is not None and tree in root_file:
        return root_file[tree]
    if tree is not None and tree != "tree":
        return root_file[tree]
    for key in root_file.keys():
        obj = root_file[key]
        if hasattr(obj, "arrays"):
            return obj
    raise KeyError("could not find a TTree in the ROOT file")


def _branch_map(tree: Any) -> dict[str, str]:
    names = {}
    for name in tree.keys():
        clean = str(name).split(";")[0]
        names[clean] = str(name)
    return names


def _resolve_branch(branches: Mapping[str, str], candidates: Sequence[str]) -> str | None:
    for candidate in candidates:
        if candidate in branches:
            return branches[candidate]
    return None


def load_jetclass(
    path: str | Path,
    *,
    tree: str | None = "tree",
    max_jets: int | None = None,
    max_nodes: int | None = 128,
    p4_branches: Mapping[str, str] | None = None,
    label_branches: Sequence[str] | None = None,
    scalar_branches: Sequence[str] | None = None,
    sort_by_pt: bool = True,
) -> JetDataset:
    """Load a local JetClass-style ROOT file into ``JetDataset``.

    The default branch resolver handles common ``part_px/part_py/part_pz`` +
    ``part_energy`` files as well as ``part_pt/part_eta/part_phi/part_mass``
    files. Pass explicit branch mappings when working with a site-specific
    ntuple.
    """
    uproot = _optional_import("uproot", "hep-io", "Qcuit JetClass ROOT loader")
    _optional_import("awkward", "hep-io", "Qcuit JetClass ROOT loader")
    with uproot.open(path) as root_file:
        root_tree = _root_tree(root_file, tree)
        branches = _branch_map(root_tree)

        if p4_branches is None:
            resolved_p4 = {key: _resolve_branch(branches, aliases) for key, aliases in JETCLASS_P4_ALIASES.items()}
        else:
            resolved_p4 = {key: branches.get(value, value) for key, value in p4_branches.items()}

        if label_branches is None:
            label_single = _resolve_branch(branches, JETCLASS_LABEL_KEYS)
            if label_single is not None:
                resolved_labels = [label_single]
            else:
                resolved_labels = [branches[name] for name in sorted(branches) if name.startswith("label_")]
        else:
            resolved_labels = [branches.get(name, name) for name in label_branches]
        if not resolved_labels:
            raise KeyError("could not find label, jet_label, or label_* branches")

        if scalar_branches is None:
            resolved_scalars = [branches[name] for name in DEFAULT_JETCLASS_SCALARS if name in branches]
        else:
            resolved_scalars = [branches.get(name, name) for name in scalar_branches]

        p4_values = [value for value in resolved_p4.values() if value is not None]
        expressions = sorted(set(p4_values + resolved_labels + resolved_scalars))
        arrays = root_tree.arrays(expressions, entry_stop=max_jets, library="ak")

    if all(resolved_p4.get(key) is not None for key in ("energy", "px", "py", "pz")):
        energy = _pad_jagged(arrays[resolved_p4["energy"]], max_nodes)
        px = _pad_jagged(arrays[resolved_p4["px"]], energy.shape[1])
        py = _pad_jagged(arrays[resolved_p4["py"]], energy.shape[1])
        pz = _pad_jagged(arrays[resolved_p4["pz"]], energy.shape[1])
        p4s = np.stack([energy, px, py, pz], axis=-1).astype(np.float32)
        scalars = (
            _stack_scalar_features({name: arrays[name] for name in resolved_scalars}, p4s.shape[1])
            if resolved_scalars
            else _scalars_from_p4(p4s)
        )
        if sort_by_pt:
            p4s, scalars = _sort_by_pt(p4s, scalars)
        labels = _labels_from_branches(arrays, resolved_labels)
        return JetDataset.from_arrays(p4s=p4s, scalars=scalars, labels=labels)

    if all(resolved_p4.get(key) is not None for key in ("pt", "eta", "phi")):
        labels = _labels_from_branches(arrays, resolved_labels)
        mass_branch = resolved_p4.get("mass")
        scalar_features = {name: arrays[name] for name in resolved_scalars} if resolved_scalars else None
        return JetDataset.from_kinematics(
            pt=arrays[resolved_p4["pt"]],
            eta=arrays[resolved_p4["eta"]],
            phi=arrays[resolved_p4["phi"]],
            mass=arrays[mass_branch] if mass_branch is not None else None,
            labels=labels,
            scalar_features=scalar_features,
            max_nodes=max_nodes,
            sort_by_pt=sort_by_pt,
        )

    raise KeyError("could not resolve either E/px/py/pz or pt/eta/phi particle branches")


def _labels_from_branches(arrays: Mapping[str, Any], label_branches: Sequence[str]) -> np.ndarray:
    if len(label_branches) == 1:
        labels = _to_numpy(arrays[label_branches[0]])
        if labels.ndim > 1:
            labels = labels.argmax(axis=-1)
        return labels.astype(np.int64).reshape(-1)

    one_hot = np.stack([_to_numpy(arrays[name]).reshape(-1) for name in label_branches], axis=-1)
    return one_hot.argmax(axis=-1).astype(np.int64)


def toy_quark_gluon_jets(
    *,
    num_jets: int = 32,
    n_nodes: int = 6,
    n_scalar: int = 2,
    seed: int = 7,
) -> JetDataset:
    """Generate a tiny balanced quark/gluon-like toy dataset.

    This is for smoke tests, tutorials, and pitch notebooks.  It is not a
    replacement for CMS/Open Data.  The toy separation is deliberately simple:
    quark-like jets have fewer, harder constituents; gluon-like jets have more
    diffuse constituents.
    """
    torch = _torch()
    if num_jets < 6:
        raise ValueError("num_jets must be at least 6")
    if n_nodes < 2:
        raise ValueError("n_nodes must be at least 2")
    generator = torch.Generator().manual_seed(seed)
    p4s = torch.zeros(num_jets, n_nodes, 4, dtype=torch.float32)
    scalars = torch.zeros(num_jets, n_nodes, n_scalar, dtype=torch.float32)
    labels = torch.zeros(num_jets, dtype=torch.long)
    node_mask = torch.zeros(num_jets, n_nodes, 1, dtype=torch.float32)
    edge_mask = torch.zeros(num_jets, n_nodes, n_nodes, dtype=torch.bool)

    for idx in range(num_jets):
        label = idx % 2
        labels[idx] = label
        active = max(2, int(round((0.65 if label == 0 else 1.0) * n_nodes)))
        node_mask[idx, :active, 0] = 1.0
        edge_mask[idx, :active, :active] = True
        edge_mask[idx].fill_diagonal_(False)

        rank = torch.arange(active, dtype=torch.float32)
        if label == 0:
            pt = 4.5 * torch.exp(-0.65 * rank) + 0.15 * torch.rand(active, generator=generator)
            eta = 0.18 * torch.randn(active, generator=generator)
            phi = 0.25 * torch.randn(active, generator=generator)
        else:
            pt = 1.15 + 0.85 * torch.rand(active, generator=generator)
            eta = 0.55 * torch.randn(active, generator=generator)
            phi = 0.85 * torch.randn(active, generator=generator)

        mass = 0.08 + 0.03 * torch.rand(active, generator=generator)
        px = pt * torch.cos(phi)
        py = pt * torch.sin(phi)
        pz = pt * torch.sinh(eta)
        energy = torch.sqrt(px * px + py * py + pz * pz + mass * mass)
        p4s[idx, :active, 0] = energy
        p4s[idx, :active, 1] = px
        p4s[idx, :active, 2] = py
        p4s[idx, :active, 3] = pz

        features = [mass.unsqueeze(1), (pt / pt.sum()).unsqueeze(1)]
        if n_scalar > 2:
            pad = torch.zeros(active, n_scalar - 2)
            features.append(pad)
        scalars[idx, :active, :] = torch.cat(features, dim=1)[:, :n_scalar]

    return JetDataset.from_arrays(p4s, scalars, labels, node_mask=node_mask, edge_mask=edge_mask)
