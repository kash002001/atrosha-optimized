import sqlite3
import os
import json
import threading
from datetime import datetime

DB_PATH = os.getenv("ATROSHA_DB_PATH", os.path.join(os.path.dirname(__file__), "atrosha.db"))


class AtroshaDB:
    _local = threading.local()

    def _conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA foreign_keys=ON")
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def __init__(self):
        self._migrate()

    def _migrate(self):
        c = self._conn()
        c.executescript("""
            CREATE TABLE IF NOT EXISTS entities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                tax_id TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL DEFAULT 'AUDITOR',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS intents (
                session_id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                pub_key TEXT,
                signature TEXT,
                locked_at TEXT NOT NULL,
                expired INTEGER DEFAULT 0,
                entity_id INTEGER,
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'USD',
                due_date TEXT,
                invoice_number TEXT,
                confidence TEXT,
                raw_text TEXT,
                source TEXT DEFAULT 'regex',
                created_at TEXT NOT NULL,
                session_id TEXT,
                entity_id INTEGER,
                FOREIGN KEY (session_id) REFERENCES intents(session_id),
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                idempotency_key TEXT UNIQUE NOT NULL,
                vendor TEXT,
                amount REAL,
                status TEXT NOT NULL DEFAULT 'pending',
                tx_ref TEXT,
                reason TEXT,
                executed_at TEXT NOT NULL,
                entity_id INTEGER,
                FOREIGN KEY (session_id) REFERENCES intents(session_id),
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                session_id TEXT,
                detail TEXT,
                actor TEXT DEFAULT 'system',
                entity_id INTEGER,
                user_id INTEGER,
                hash TEXT,
                FOREIGN KEY (entity_id) REFERENCES entities(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                auto_approve_below REAL DEFAULT 0,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                total_paid REAL DEFAULT 0,
                entity_id INTEGER,
                UNIQUE(name, entity_id),
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS webhooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                created_at TEXT NOT NULL,
                entity_id INTEGER,
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                entity_id INTEGER NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nl_text TEXT NOT NULL,
                compiled_policy TEXT NOT NULL,
                agent_id TEXT,
                entity_id INTEGER NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS auth_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                provider_type TEXT NOT NULL, -- 'SAML', 'OIDC'
                metadata_url TEXT,
                client_id TEXT,
                client_secret TEXT,
                redirect_uri TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(entity_id, provider_type),
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                vendor_name TEXT,
                amount REAL,
                currency TEXT DEFAULT 'USD',
                date TEXT,
                receipt_path TEXT,
                status TEXT DEFAULT 'pending_match', -- 'pending_match', 'matched', 'flagged'
                matched_tx_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS employee_master (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                base_salary REAL,
                currency TEXT DEFAULT 'USD',
                joined_at TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS payroll_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_id INTEGER NOT NULL,
                employee_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                period TEXT NOT NULL, -- '2026-03'
                status TEXT DEFAULT 'completed',
                hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entity_id) REFERENCES entities(id),
                FOREIGN KEY (employee_id) REFERENCES employee_master(id)
            );
        """)
        
        now = datetime.utcnow().isoformat()
        c.execute("INSERT OR IGNORE INTO entities (id, name, created_at) VALUES (1, 'Main Entity', ?)", (now,))
        c.execute("INSERT OR IGNORE INTO users (id, username, role, created_at) VALUES (1, 'admin', 'ADMIN', ?)", (now,))
        
        c.execute("UPDATE intents SET entity_id = 1 WHERE entity_id IS NULL")
        c.execute("UPDATE invoices SET entity_id = 1 WHERE entity_id IS NULL")
        c.execute("UPDATE executions SET entity_id = 1 WHERE entity_id IS NULL")
        c.execute("UPDATE audit_log SET entity_id = 1 WHERE entity_id IS NULL")
        c.execute("UPDATE vendors SET entity_id = 1 WHERE entity_id IS NULL")
        c.execute("UPDATE webhooks SET entity_id = 1 WHERE entity_id IS NULL")
        
        c.commit()

    # ── intents ─────────────────────────────────────────

    def lock_intent(self, session_id: str, prompt: str, pub_key: str = "", signature: str = "", entity_id: int = 1):
        c = self._conn()
        c.execute(
            "INSERT OR REPLACE INTO intents (session_id, prompt, pub_key, signature, locked_at, entity_id) VALUES (?,?,?,?,?,?)",
            (session_id, prompt, pub_key, signature, datetime.utcnow().isoformat(), entity_id),
        )
        c.commit()
        self.log("intent_locked", session_id, f"prompt={prompt[:80]}", entity_id=entity_id)

    def get_intent(self, session_id: str) -> dict | None:
        row = self._conn().execute("SELECT * FROM intents WHERE session_id=?", (session_id,)).fetchone()
        return dict(row) if row else None

    # ── invoices ────────────────────────────────────────

    def save_invoice(self, vendor: str, amount: float, currency: str, due_date: str | None,
                     invoice_number: str | None, confidence: str, raw_text: str, source: str,
                     session_id: str | None = None, entity_id: int = 1) -> int:
        c = self._conn()
        cur = c.execute(
            """INSERT INTO invoices (vendor, amount, currency, due_date, invoice_number,
               confidence, raw_text, source, created_at, session_id, entity_id)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (vendor, amount, currency, due_date, invoice_number, confidence,
             raw_text, source, datetime.utcnow().isoformat(), session_id, entity_id),
        )
        c.commit()
        self._upsert_vendor(vendor, entity_id=entity_id)
        return cur.lastrowid

    def list_invoices(self, limit: int = 50, entity_id: int = 1) -> list[dict]:
        rows = self._conn().execute(
            "SELECT * FROM invoices WHERE entity_id=? ORDER BY created_at DESC LIMIT ?", (entity_id, limit)
        ).fetchall()
        return [dict(r) for r in rows]

    # ── anomaly detection ──────────────────────────────────
    
    def detect_anomalies(self, vendor: str, amount: float, entity_id: int = 1) -> str:
        """Returns an anomaly reason string if anomalous, else empty string."""
        c = self._conn()
        history = c.execute("SELECT amount FROM invoices WHERE vendor=? AND entity_id=? ORDER BY created_at DESC LIMIT 5", (vendor, entity_id)).fetchall()
        if len(history) < 3:
            return "" # Not enough history

        amounts = [r["amount"] for r in history]
        avg_amount = sum(amounts) / len(amounts)
        
        if avg_amount > 0:
            if amount > avg_amount * 1.5:
                return f"Amount ${amount:.2f} is > 50% higher than average ${avg_amount:.2f}"
            if amount < avg_amount * 0.5:
                return f"Amount ${amount:.2f} is > 50% lower than average ${avg_amount:.2f}"
                
        return ""

    # --- Webhooks ──────────────────────────────────────

    def add_webhook(self, url: str, entity_id: int = 1) -> dict:
        c = self._conn()
        now = datetime.utcnow().isoformat()
        cursor = c.execute("INSERT INTO webhooks (url, created_at, entity_id) VALUES (?,?,?)", (url, now, entity_id))
        c.commit()
        return {"id": cursor.lastrowid, "url": url}

    def list_webhooks(self, entity_id: int = 1) -> list[dict]:
        c = self._conn()
        return [dict(row) for row in c.execute("SELECT * FROM webhooks WHERE entity_id=? ORDER BY created_at DESC", (entity_id,)).fetchall()]
            
    def delete_webhook(self, webhook_id: int, entity_id: int = 1):
        c = self._conn()
        c.execute("DELETE FROM webhooks WHERE id = ? AND entity_id = ?", (webhook_id, entity_id))
        c.commit()

    # ── executions ──────────────────────────────────────

    def get_execution(self, idempotency_key: str) -> dict | None:
        row = self._conn().execute(
            "SELECT * FROM executions WHERE idempotency_key=?", (idempotency_key,)
        ).fetchone()
        return dict(row) if row else None

    def save_execution(self, session_id: str, idempotency_key: str, vendor: str,
                       amount: float, status: str, tx_ref: str = None, reason: str = None, entity_id: int = 1):
        c = self._conn()
        c.execute(
            """INSERT OR REPLACE INTO executions
               (session_id, idempotency_key, vendor, amount, status, tx_ref, reason, executed_at, entity_id)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (session_id, idempotency_key, vendor, amount, status, tx_ref, reason,
             datetime.utcnow().isoformat(), entity_id),
        )
        c.commit()
        self.log("execution", session_id, f"status={status} vendor={vendor} amount={amount}", entity_id=entity_id)

    def update_execution_status(self, idempotency_key: str, status: str, tx_ref: str = None, reason: str = None):
        c = self._conn()
        c.execute(
            "UPDATE executions SET status=?, tx_ref=?, reason=? WHERE idempotency_key=?",
            (status, tx_ref, reason, idempotency_key),
        )
        c.commit()

    # ── audit log ───────────────────────────────────────

    # handled in server.py background_tasks
    def log(self, event_type: str, session_id: str = None, detail: str = None, actor: str = 'system', entity_id: int = 1, user_id: int = None):
        import hashlib
        c = self._conn()
        ts = datetime.utcnow().isoformat()
        
        # get last hash to chain it
        last = c.execute("SELECT hash FROM audit_log WHERE entity_id=? ORDER BY id DESC LIMIT 1", (entity_id,)).fetchone()
        prev_hash = last[0] if last and last[0] else "0" * 64
        
        # manifest data for hashing
        manifest = f"{ts}{event_type}{session_id or ''}{detail or ''}{actor}{entity_id}{user_id or ''}{prev_hash}"
        current_hash = hashlib.sha256(manifest.encode()).hexdigest()
        
        c.execute(
            "INSERT INTO audit_log (timestamp, event_type, session_id, detail, actor, entity_id, user_id, hash) VALUES (?,?,?,?,?,?,?,?)",
            (ts, event_type, session_id, detail, actor, entity_id, user_id, current_hash),
        )
        c.commit()

    def verify_audit_chain(self, entity_id: int) -> dict:
        import hashlib
        c = self._conn()
        rows = c.execute("SELECT * FROM audit_log WHERE entity_id=? ORDER BY id ASC", (entity_id,)).fetchall()
        
        prev_hash = "0" * 64
        broken_id = None
        is_valid = True
        
        for row in rows:
            manifest = f"{row['timestamp']}{row['event_type']}{row['session_id'] or ''}{row['detail'] or ''}{row['actor']}{row['entity_id']}{row['user_id'] or ''}{prev_hash}"
            expected = hashlib.sha256(manifest.encode()).hexdigest()
            if row['hash'] != expected:
                is_valid = False
                broken_id = row['id']
                break
            prev_hash = row['hash']
            
        return {
            "valid": is_valid,
            "broken_at_id": broken_id,
            "checked_count": len(rows)
        }

    def get_audit_log(self, limit: int = 100, event_type: str = None, entity_id: int = 1) -> list[dict]:
        if event_type:
            rows = self._conn().execute(
                "SELECT * FROM audit_log WHERE event_type=? AND entity_id=? ORDER BY timestamp DESC LIMIT ?",
                (event_type, entity_id, limit),
            ).fetchall()
        else:
            rows = self._conn().execute(
                "SELECT * FROM audit_log WHERE entity_id=? ORDER BY timestamp DESC LIMIT ?", (entity_id, limit),
            ).fetchall()
        return [dict(r) for r in rows]

    # ── vendors ─────────────────────────────────────────

    def _upsert_vendor(self, name: str, entity_id: int = 1):
        c = self._conn()
        now = datetime.utcnow().isoformat()
        existing = c.execute("SELECT id FROM vendors WHERE name=? AND entity_id=?", (name, entity_id)).fetchone()
        if existing:
            c.execute("UPDATE vendors SET last_seen=? WHERE name=? AND entity_id=?", (now, name, entity_id))
        else:
            c.execute("INSERT INTO vendors (name, first_seen, last_seen, entity_id) VALUES (?,?,?,?)", (name, now, now, entity_id))
        c.commit()

    def list_vendors(self, entity_id: int = 1) -> list[dict]:
        rows = self._conn().execute("SELECT * FROM vendors WHERE entity_id=? ORDER BY last_seen DESC", (entity_id,)).fetchall()
        return [dict(r) for r in rows]

    def get_vendor(self, vendor_id: int, entity_id: int = 1) -> dict | None:
        row = self._conn().execute("SELECT * FROM vendors WHERE id=? AND entity_id=?", (vendor_id, entity_id)).fetchone()
        return dict(row) if row else None

    def get_vendor_by_name(self, name: str, entity_id: int = 1) -> dict | None:
        row = self._conn().execute("SELECT * FROM vendors WHERE name=? AND entity_id=?", (name, entity_id)).fetchone()
        return dict(row) if row else None

    def update_vendor_threshold(self, vendor_id: int, threshold: float, entity_id: int = 1):
        c = self._conn()
        c.execute("UPDATE vendors SET auto_approve_below=? WHERE id=? AND entity_id=?", (threshold, vendor_id, entity_id))
        c.commit()

    # ── stats ───────────────────────────────────────────

    def stats(self, entity_id: int = 1) -> dict:
        c = self._conn()
        invoices_total = c.execute("SELECT COUNT(*) FROM invoices WHERE entity_id=?", (entity_id,)).fetchone()[0]
        executions_total = c.execute("SELECT COUNT(*) FROM executions WHERE entity_id=?", (entity_id,)).fetchone()[0]
        blocked = c.execute("SELECT COUNT(*) FROM executions WHERE status='blocked' AND entity_id=?", (entity_id,)).fetchone()[0]
        vendors_count = c.execute("SELECT COUNT(*) FROM vendors WHERE entity_id=?", (entity_id,)).fetchone()[0]
        return {
            "invoices_processed": invoices_total,
            "payments_executed": executions_total,
            "drift_blocks": blocked,
            "known_vendors": vendors_count,
        }

    # ── users & entities ────────────────────────────────
    
    def get_user_by_username(self, username: str) -> dict | None:
        row = self._conn().execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        return dict(row) if row else None

    def list_entities(self) -> list[dict]:
        rows = self._conn().execute("SELECT * FROM entities ORDER BY name ASC").fetchall()
        return [dict(r) for r in rows]

    def add_user(self, username: str, role: str) -> dict:
        c = self._conn()
        now = datetime.utcnow().isoformat()
        cursor = c.execute("INSERT INTO users (username, role, created_at) VALUES (?,?,?)", (username, role, now))
        c.commit()
        return {"id": cursor.lastrowid, "username": username, "role": role}

    def list_agents(self, entity_id: int):
        with self._get_conn() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM agents WHERE entity_id = ?", (entity_id,))
            return [dict(row) for row in cursor.fetchall()]

    def add_agent(self, agent_id: str, name: str, entity_id: int):
        with self._conn() as c:
            c.execute("INSERT INTO agents (id, name, entity_id) VALUES (?, ?, ?)",
                         (agent_id, name, entity_id))
            c.commit()

    def list_rules(self, entity_id: int):
        with self._conn() as c:
            cursor = c.execute("SELECT * FROM rules WHERE entity_id = ?", (entity_id,))
            return [dict(row) for row in cursor.fetchall()]

    def add_rule(self, nl_text: str, compiled_policy: str, agent_id: str, entity_id: int):
        with self._conn() as c:
            c.execute("INSERT INTO rules (nl_text, compiled_policy, agent_id, entity_id) VALUES (?, ?, ?, ?)",
                         (nl_text, compiled_policy, agent_id, entity_id))
            c.commit()

    def delete_rule(self, rule_id: int, entity_id: int):
        with self._conn() as c:
            c.execute("DELETE FROM rules WHERE id = ? AND entity_id = ?", (rule_id, entity_id))
            c.commit()

    def list_executions(self, entity_id: int, limit: int = 100):
        with self._conn() as c:
            cursor = c.execute("SELECT * FROM executions WHERE entity_id = ? ORDER BY executed_at DESC LIMIT ?", 
                         (entity_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    def _get_conn(self):
        return self._conn()

    # ── auth settings ───────────────────────────────────

    def get_auth_settings(self, entity_id: int) -> list[dict]:
        with self._conn() as c:
            rows = c.execute("SELECT * FROM auth_settings WHERE entity_id=?", (entity_id,)).fetchall()
            return [dict(r) for r in rows]

    def add_auth_settings(self, entity_id: int, provider: str, metadata_url: str = None, client_id: str = None, client_secret: str = None, redirect_uri: str = None):
        with self._conn() as c:
            c.execute(
                "INSERT OR REPLACE INTO auth_settings (entity_id, provider_type, metadata_url, client_id, client_secret, redirect_uri) VALUES (?,?,?,?,?,?)",
                (entity_id, provider, metadata_url, client_id, client_secret, redirect_uri)
            )
            c.commit()

    def delete_auth_settings(self, settings_id: int, entity_id: int):
        with self._conn() as c:
            c.execute("DELETE FROM auth_settings WHERE id=? AND entity_id=?", (settings_id, entity_id))
            c.commit()

    # ── expenses ────────────────────────────────────────

    def list_expenses(self, entity_id: int) -> list[dict]:
        with self._conn() as c:
            rows = c.execute("SELECT * FROM expenses WHERE entity_id=? ORDER BY created_at DESC", (entity_id,)).fetchall()
            return [dict(r) for r in rows]

    def add_expense(self, entity_id: int, vendor: str, amount: float, date: str, receipt_path: str):
        with self._conn() as c:
            c.execute(
                "INSERT INTO expenses (entity_id, vendor_name, amount, date, receipt_path) VALUES (?,?,?,?,?)",
                (entity_id, vendor, amount, date, receipt_path)
            )
            c.commit()

    def update_expense_status(self, expense_id: int, status: str, matched_tx_id: str = None):
        with self._conn() as c:
            c.execute(
                "UPDATE expenses SET status=?, matched_tx_id=? WHERE id=?",
                (status, matched_tx_id, expense_id)
            )
            c.commit()

    # ── payroll ─────────────────────────────────────────

    def get_employee_master(self, employee_id: int, entity_id: int):
        with self._conn() as c:
            row = c.execute("SELECT * FROM employee_master WHERE id=? AND entity_id=?", (employee_id, entity_id)).fetchone()
            return dict(row) if row else None

    def get_employee_payroll_history(self, employee_id: int, entity_id: int, limit: int = 6):
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM payroll_history WHERE employee_id=? AND entity_id=? ORDER BY created_at DESC LIMIT ?",
                (employee_id, entity_id, limit)
            ).fetchall()
            return [dict(r) for r in rows]

    def add_payroll_record(self, entity_id: int, employee_id: int, amount: float, period: str):
        with self._conn() as c:
            c.execute(
                "INSERT INTO payroll_history (entity_id, employee_id, amount, period) VALUES (?, ?, ?, ?)",
                (entity_id, employee_id, amount, period)
            )
            c.commit()

    def list_employees(self, entity_id: int) -> list[dict]:
        with self._conn() as c:
            rows = c.execute("SELECT * FROM employee_master WHERE entity_id=?", (entity_id,)).fetchall()
            return [dict(r) for r in rows]

    def add_employee(self, entity_id: int, name: str, email: str, base_salary: float, currency: str = 'USD'):
        with self._conn() as c:
            c.execute(
                "INSERT INTO employee_master (entity_id, name, email, base_salary, currency) VALUES (?, ?, ?, ?, ?)",
                (entity_id, name, email, base_salary, currency)
            )
            c.commit()
