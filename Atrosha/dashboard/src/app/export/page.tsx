import ExportClient from "./ExportClient";

export const metadata = {
    title: "Accounting Export — Atrosha",
    description: "Export processed payments and invoices to your accounting software.",
};

export default function ExportPage() {
    return <ExportClient />;
}
