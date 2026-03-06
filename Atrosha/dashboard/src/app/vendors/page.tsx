import VendorClient from "./VendorClient";

export const metadata = {
    title: "Vendors — Atrosha",
    description: "Manage vendor risk profiles and auto-approval thresholds.",
};

export default function VendorsPage() {
    return <VendorClient />;
}
