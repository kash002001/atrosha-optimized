from __future__ import annotations
import numpy as np
from dataclasses import dataclass


@dataclass
class ATEResult:
    ate: float        # average treatment effect
    p_value: float    # quasi-p-value from permutation test
    treated: float    # E[Y | do(X=1)]
    control: float    # E[Y | do(X=0)]
    n_permutations: int


class ATEstimator:
    """
    Estimates causal effect of intent (treatment) on action (outcome)
    via backdoor adjustment and permutation-based inference.

    Uses embedding-space similarity as the continuous outcome Y.
    """

    def __init__(self, n_permutations: int = 200, rng_seed: int = 42):
        self.n_perms = n_permutations
        self.rng = np.random.default_rng(rng_seed)

    def cosine_sim(self, a: np.ndarray, b: np.ndarray) -> float:
        na = np.linalg.norm(a)
        nb = np.linalg.norm(b)
        if na < 1e-9 or nb < 1e-9:
            return 0.0
        return float(np.dot(a, b) / (na * nb))

    def backdoor_adjust(
        self,
        intent_emb: np.ndarray,
        action_emb: np.ndarray,
        confounder_embs: list[np.ndarray],
    ) -> tuple[float, float]:
        """
        Implements the backdoor adjustment formula:
          P(Y | do(X)) = Sigma_z P(Y | X, Z) * P(Z)

        In embedding space:
          - Y = action similarity to intent
          - X = intent (treatment=present vs absent)
          - Z = confounders (context, memory)

        Returns (treated_outcome, control_outcome).
        """
        # treated: similarity when intent is present
        treated = self.cosine_sim(intent_emb, action_emb)

        if not confounder_embs:
            # no confounders -> control is expected similarity under null
            # monte carlo: random unit vectors in d dimensions
            ctrl_sims = []
            for _ in range(50):
                rand_vec = self.rng.standard_normal(len(intent_emb))
                rand_vec /= np.linalg.norm(rand_vec)
                ctrl_sims.append(self.cosine_sim(rand_vec, action_emb))
            control = float(np.mean(ctrl_sims))
            return treated, control

        # with confounders: compute adjusted estimand
        weights = []
        treated_vals = []
        ctrl_vals = []

        for z in confounder_embs:
            w = 1.0 / len(confounder_embs)
            weights.append(w)

            # P(Y | X=1, Z): intent + confounder jointly predict action
            combined_treated = self._fuse(intent_emb, z)
            treated_vals.append(self.cosine_sim(combined_treated, action_emb))

            # P(Y | X=0, Z): only confounder predicts action (intent removed)
            ctrl_vals.append(self.cosine_sim(z, action_emb))

        treated_adj = sum(w * t for w, t in zip(weights, treated_vals))
        control_adj = sum(w * c for w, c in zip(weights, ctrl_vals))

        return float(treated_adj), float(control_adj)

    def estimate_ate(
        self,
        intent_emb: np.ndarray,
        action_emb: np.ndarray,
        confounder_embs: list[np.ndarray],
    ) -> ATEResult:
        """
        Computes ATE = E[Y|do(X=1)] - E[Y|do(X=0)]
        with permutation test for statistical significance.
        """
        treated, control = self.backdoor_adjust(intent_emb, action_emb, confounder_embs)
        obs_ate = treated - control

        # permutation test: randomly rotate intent embedding,
        # recompute ATE under null hypothesis (intent has no effect)
        null_ates = []
        for _ in range(self.n_perms):
            shuffled = self.rng.permutation(intent_emb.copy())
            norm = np.linalg.norm(shuffled)
            if norm > 1e-9:
                shuffled = shuffled / norm
            t, c = self.backdoor_adjust(shuffled, action_emb, confounder_embs)
            null_ates.append(t - c)

        null_ates = np.array(null_ates)
        # two-sided: fraction of null ATEs with |ATE| >= |observed|
        p_val = float(np.mean(np.abs(null_ates) >= np.abs(obs_ate)))

        return ATEResult(
            ate=round(obs_ate, 6),
            p_value=round(p_val, 6),
            treated=round(treated, 6),
            control=round(control, 6),
            n_permutations=self.n_perms,
        )

    def _fuse(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        combined = (a + b) / 2.0
        norm = np.linalg.norm(combined)
        return combined / norm if norm > 1e-9 else combined
