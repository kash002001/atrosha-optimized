import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "atrosha.db")

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Clear existing for clean demo
    c.execute("DELETE FROM employee_master")
    c.execute("DELETE FROM payroll_history")
    
    # 2. Add Employees
    employees = [
        (1, "John Smith", "john@example.com", 5000, "USD", "2024-01-01"),
        (1, "Jane Doe", "jane@example.com", 6000, "USD", "2024-02-15"),
        (1, "Alice Wong", "alice@example.com", 4500, "USD", "2024-03-01"),
    ]
    c.executemany("INSERT INTO employee_master (entity_id, name, email, base_salary, currency, joined_at) VALUES (?,?,?,?,?,?)", employees)
    
    # 3. Add History for John (Stable)
    history_john = [
        (1, 1, 5000, "2025-09"),
        (1, 1, 5000, "2025-10"),
        (1, 1, 5100, "2025-11"),
        (1, 1, 5000, "2025-12"),
        (1, 1, 5000, "2026-01"),
        (1, 1, 5000, "2026-02"),
    ]
    c.executemany("INSERT INTO payroll_history (entity_id, employee_id, amount, period) VALUES (?,?,?,?)", history_john)
    
    # 4. Add History for Jane (Recent Increase)
    history_jane = [
        (1, 2, 5900, "2025-12"),
        (1, 2, 6000, "2026-01"),
        (1, 2, 6000, "2026-02"),
    ]
    c.executemany("INSERT INTO payroll_history (entity_id, employee_id, amount, period) VALUES (?,?,?,?)", history_jane)

    conn.commit()
    conn.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed()
