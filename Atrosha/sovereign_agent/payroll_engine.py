import math
from typing import List, Dict

class PayrollEngine:
    def __init__(self, db):
        self.db = db

    def analyze_draft(self, entity_id: int, payroll_draft: List[Dict]):
        """
        Analyzes a payroll draft for anomalies.
        Draft format: [{"employee_id": 1, "amount": 5000, "period": "2026-03"}, ...]
        """
        results = []
        for entry in payroll_draft:
            emp_id = entry.get("employee_id")
            amount = entry.get("amount")
            period = entry.get("period")
            
            # 1. Contract Match
            contract = self.db.get_employee_master(emp_id, entity_id)
            contract_violation = False
            if contract:
                base = contract.get("base_salary", 0)
                # Allow 5% variance for minor adjustments/overtime without flagging
                if amount > base * 1.05:
                    contract_violation = True
            
            # 2. Historical Z-Score
            history = self.db.get_employee_payroll_history(emp_id, entity_id, limit=6)
            z_score = 0
            if len(history) >= 3:
                amounts = [h["amount"] for h in history]
                avg = sum(amounts) / len(amounts)
                variance = sum((x - avg)**2 for x in amounts) / len(amounts)
                std_dev = math.sqrt(variance)
                
                if std_dev > 0:
                    z_score = (amount - avg) / std_dev
            
            # 3. Decision
            status = "low_risk"
            reasons = []
            if contract_violation:
                status = "high_risk"
                reasons.append(f"Exceeds contract base ({contract.get('base_salary')})")
            if abs(z_score) > 2.5:
                status = "high_risk"
                reasons.append(f"Statistical anomaly (Z-score: {z_score:.2f})")
            elif abs(z_score) > 1.5:
                status = "medium_risk"
                reasons.append(f"Minor variance detected (Z-score: {z_score:.2f})")
                
            results.append({
                "employee_id": emp_id,
                "employee_name": contract.get("name") if contract else "Unknown",
                "amount": amount,
                "period": period,
                "status": status,
                "reasons": reasons,
                "z_score": z_score
            })
            
        return results
