from __future__ import annotations
import time
import numpy as np
from dataclasses import dataclass

from .dag import CausalDAG, TraceNode, NodeKind
from .estimator import ATEstimator, ATEResult


@dataclass
class CausalVerdict:
    verdict: str         # CAUSAL or ACAUSAL
    ate: float           # average treatment effect
    p_value: float
    treated: float       # E[Y|do(intent)]
    control: float       # E[Y|do(¬intent)]
    dag_nodes: int
    dag_edges: int
    latency_ms: float
    reason: str = ""


# ate below this threshold → intent is not causally driving the action
DEFAULT_ATE_THRESHOLD = 0.15
# p-value above this → we can't reject H0 (intent has no effect)
DEFAULT_P_THRESHOLD = 0.10


class CausalEngine:
    """
    Top-level orchestrator: builds DAG, embeds nodes, runs ATE estimation.
    """

    def __init__(
        self,
        embed_fn=None,
        ate_threshold: float = DEFAULT_ATE_THRESHOLD,
        p_threshold: float = DEFAULT_P_THRESHOLD,
        n_permutations: int = 200,
    ):
        self.embed_fn = embed_fn  # callable: str → np.ndarray
        self.ate_threshold = ate_threshold
        self.p_threshold = p_threshold
        self.estimator = ATEstimator(n_permutations=n_permutations)

    def verify(
        self,
        intent: str,
        action: str,
        trace_steps: list[dict] | None = None,
    ) -> CausalVerdict:
        t0 = time.perf_counter()

        if self.embed_fn is None:
            raise RuntimeError("embed_fn not set — need sentence-transformer")

        # build the DAG
        dag = CausalDAG.from_trace(intent, trace_steps or [], action)

        # embed all nodes
        for node in dag.nodes.values():
            node.embedding = self.embed_fn(node.content).tolist()

        intent_nodes = dag.get_by_kind(NodeKind.INTENT)
        action_nodes = dag.get_by_kind(NodeKind.ACTION)
        confounders = dag.get_by_kind(NodeKind.CONFOUNDER)

        if not intent_nodes or not action_nodes:
            dt = (time.perf_counter() - t0) * 1000
            return CausalVerdict(
                verdict="ACAUSAL", ate=0.0, p_value=1.0,
                treated=0.0, control=0.0,
                dag_nodes=len(dag.nodes), dag_edges=len(dag.edges),
                latency_ms=round(dt, 2),
                reason="missing intent or action node",
            )

        intent_emb = np.array(intent_nodes[0].embedding)
        action_emb = np.array(action_nodes[0].embedding)
        conf_embs = [np.array(c.embedding) for c in confounders]

        result: ATEResult = self.estimator.estimate_ate(intent_emb, action_emb, conf_embs)

        # decision logic
        if result.ate >= self.ate_threshold and result.p_value <= self.p_threshold:
            verdict = "CAUSAL"
            reason = f"intent causally drives action (ATE={result.ate:.4f}, p={result.p_value:.4f})"
        elif result.ate >= self.ate_threshold:
            # ate high but p-value not significant — borderline
            verdict = "CAUSAL"
            reason = f"high ATE but weak significance (ATE={result.ate:.4f}, p={result.p_value:.4f})"
        else:
            verdict = "ACAUSAL"
            reason = f"intent not causally linked to action (ATE={result.ate:.4f}, p={result.p_value:.4f})"

        dt = (time.perf_counter() - t0) * 1000

        return CausalVerdict(
            verdict=verdict,
            ate=result.ate,
            p_value=result.p_value,
            treated=result.treated,
            control=result.control,
            dag_nodes=len(dag.nodes),
            dag_edges=len(dag.edges),
            latency_ms=round(dt, 2),
            reason=reason,
        )
