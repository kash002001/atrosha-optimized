import AuditClient from "./AuditClient";

export const metadata = {
    title: "Audit Log — Atrosha",
    description: "Complete audit trail of all sovereign agent decisions and payment executions.",
};

export default function AuditPage() {
    return <AuditClient />;
}
