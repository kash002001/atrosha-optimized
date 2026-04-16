from __future__ import annotations
import hashlib
from dataclasses import dataclass, field
from enum import Enum


class NodeKind(str, Enum):
    INTENT = "intent"       # human prompt / locked intent
    REASONING = "reasoning" # intermediate LLM thought
    TOOL_CALL = "tool_call" # tool invocation (api, db, etc)
    CONTEXT = "context"     # retrieved context / memory
    ACTION = "action"       # final outbound action (payment, api call)
    CONFOUNDER = "confounder"


@dataclass
class TraceNode:
    id: str
    kind: NodeKind
    content: str
    embedding: list[float] | None = None
    # monotonic step index within the trace
    step: int = 0

    def fingerprint(self) -> str:
        return hashlib.sha256(f"{self.kind}:{self.content}".encode()).hexdigest()[:16]


@dataclass
class CausalDAG:
    """
    Directed Acyclic Graph representing the causal structure
    of an agent's reasoning trace.

    Edges go from cause → effect: if (A, B) in edges, then A influences B.
    """
    nodes: dict[str, TraceNode] = field(default_factory=dict)
    edges: list[tuple[str, str]] = field(default_factory=list)

    def add_node(self, node: TraceNode):
        self.nodes[node.id] = node

    def add_edge(self, src: str, dst: str):
        if src not in self.nodes or dst not in self.nodes:
            raise ValueError(f"both nodes must exist: {src}, {dst}")
        self.edges.append((src, dst))

    def parents(self, node_id: str) -> list[str]:
        return [s for s, d in self.edges if d == node_id]

    def children(self, node_id: str) -> list[str]:
        return [d for s, d in self.edges if s == node_id]

    def get_by_kind(self, kind: NodeKind) -> list[TraceNode]:
        return [n for n in self.nodes.values() if n.kind == kind]

    def topo_sort(self) -> list[str]:
        in_deg = {nid: 0 for nid in self.nodes}
        for s, d in self.edges:
            in_deg[d] += 1
        queue = [nid for nid, deg in in_deg.items() if deg == 0]
        order = []
        while queue:
            nid = queue.pop(0)
            order.append(nid)
            for child in self.children(nid):
                in_deg[child] -= 1
                if in_deg[child] == 0:
                    queue.append(child)
        return order

    @staticmethod
    def from_trace(intent: str, trace_steps: list[dict], action: str) -> CausalDAG:
        """
        Build a DAG from a structured agent trace.

        trace_steps: [{"step": 0, "kind": "reasoning", "content": "..."}, ...]
        """
        dag = CausalDAG()

        # root: human intent
        intent_node = TraceNode(id="intent_0", kind=NodeKind.INTENT, content=intent, step=0)
        dag.add_node(intent_node)

        prev_id = intent_node.id
        for i, step in enumerate(trace_steps):
            kind = NodeKind(step.get("kind", "reasoning"))
            nid = f"{kind.value}_{i+1}"
            node = TraceNode(id=nid, kind=kind, content=step["content"], step=i + 1)
            dag.add_node(node)
            dag.add_edge(prev_id, nid)

            # context nodes are confounders — they also influence the action
            # but aren't caused by intent
            if kind == NodeKind.CONTEXT:
                node.kind = NodeKind.CONFOUNDER

            prev_id = nid

        # terminal: the outbound action
        action_node = TraceNode(
            id="action_final",
            kind=NodeKind.ACTION,
            content=action,
            step=len(trace_steps) + 1,
        )
        dag.add_node(action_node)
        dag.add_edge(prev_id, action_node.id)

        return dag
