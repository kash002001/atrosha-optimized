import WebhookClient from "./WebhookClient";

export const metadata = {
    title: "Webhooks — Atrosha",
    description: "Manage programmatic subscriptions to agent events.",
};

export default function WebhooksPage() {
    return <WebhookClient />;
}
