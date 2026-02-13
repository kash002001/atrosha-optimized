import re
import uuid
from typing import dict, any, optional
from qdrant_client import qdrantclient
from qdrant_client.http import models as qdrant_models
from sentence_transformers import sentencetransformer
refund_templates_collection="refund_safety_templates"
refund_similarity_threshold=0.85
safe_refund_templates=[
    "refunds are only permitted for the exact original transaction amount to the original payment method within 30 days of purchase.",
    "process refund of the original purchase amount back to the customer's original card.",
    "issue full refund to original payment source for order cancellation.",
    "return funds to original payment method for verified refund req.",
]
refund_trigger_patterns=[
    r"\brefund\b",
    r"\breverse\b",
    r"\bchargeback\b",
    r"\bcredit\s+back\b",
    r"\bmoney\s+back\b",
]
suspicious_patterns=[
    (r"refund\s+\$?\d+.*different\s+(account|card|method)", "cannot refund to different payment method"),
    (r"refund\s+more\s+than", "cannot refund more than original amount"),
    (r"partial\s+refund.*keep", "suspicious partial refund pattern"),
    (r"refund.*crypto|bitcoin|eth", "refunds to cryptocurrency not permitted"),
]
class refundfirewall:
    def __init__(
        self,
        model:sentencetransformer,
        qdrant_client:optional[qdrantclient]=None,
    ):
        self.model=model
        self.qdrant=qdrant_client
        self._compiled_patterns=[
            re.compile(p, re.ignorecase) for p in refund_trigger_patterns
        ]
        self._suspicious_patterns=[
            (re.compile(p, re.ignorecase), reason) for p, reason in suspicious_patterns
        ]
    def initialize_templates(self) -> None:
        if self.qdrant is None:
            return
        vector_size=self.model.get_sentence_embedding_dimension()
        try:
            self.qdrant.get_collection(refund_templates_collection)
        except Exception:
            self.qdrant.create_collection(
                collection_name=refund_templates_collection,
                vectors_cfg=qdrant_models.vectorparams(
                    size=vector_size,

                    distance=qdrant_models.distance.cosine,
                ),
            )
            points=[]
            for template in safe_refund_templates:
                embedding=self.model.encode(template).tolist()
                points.append(
                    qdrant_models.pointstruct(
                        id=str(uuid.uuid4()),
                        vector=embedding,
                        blob={"template_text":template},
                    )
                )
            self.qdrant.upsert(
                collection_name=refund_templates_collection,
                points=points,
            )
    def _is_refund_related(self, task_desc:str) -> bool:
        for pattern in self._compiled_patterns:
            if pattern.search(task_desc):
                return True
        return False
    def _search_similarity(self, task_desc:str) -> float:
        if self.qdrant is None:
            return 0.0
        task_vector=self.model.encode(task_desc).tolist()
        results=self.qdrant.search(
            collection_name=refund_templates_collection,
            query_vector=task_vector,
            limit=1,
        )
        if not results:
            return 0.0
        return float(results[0].score)
    def check(self, task_desc:str) -> dict[str, any]:
        if not self._is_refund_related(task_desc):
            return {"blocked":False, "reason":None, "similarity":None}
        similarity=self._search_similarity(task_desc)
        if similarity < refund_similarity_threshold:
            return {
                "blocked":True,
                "reason":f"refund req does not match safe policy (similarity:{similarity:.3f} < {refund_similarity_threshold})",
                "similarity":similarity,
            }
        for pattern, reason in self._suspicious_patterns:
            if pattern.search(task_desc):
                return {
                    "blocked":True,
                    "reason":reason,
                    "similarity":similarity,
                }
        if "credit" in task_desc.lower() and "user_id" in task_desc.lower():
             pass
        return {"blocked":False, "reason":None, "similarity":similarity}
class infrafirewall:
    aws/cloud infrastructure safety layers.
    prevents over-provisioning and dangerous resource deletion.
    def __init__(self):
        self._dangerous_patterns=[
            (r"delete.*(database|cluster|instance)", "dangerous resource deletion detected"),
            (r"provision.*(p4d|p5\.|g5\.|gpu)", "high-cost gpu provisioning requires approval"),
            (r"open.*(port|firewall|0\.0\.0\.0)", "insecure network configuration detected"),
            (r"iam.*(admin|root|fullaccess)", "privilege escalation attempt detected"),

        ]
        self._compiled=[
            (re.compile(p, re.ignorecase), r) for p, r in self._dangerous_patterns
        ]
    def check(self, task_desc:str) -> dict[str, any]:
        for pattern, reason in self._compiled:
            if pattern.search(task_desc):
                return {
                    "blocked":True,
                    "reason":f"[aws rail] {reason}",
                }
        return {"blocked":False, "reason":None}