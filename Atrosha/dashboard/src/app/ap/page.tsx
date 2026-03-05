import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import APClient from "./APClient";

export const metadata = {
    title: "Accounts Payable | Atrosha",
};

export default async function APPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1>Accounts Payable Queue</h1>
                    <p>Authorize payments to be executed by the Sovereign Agent.</p>
                </div>
            </header>

            <main>
                <APClient />
            </main>
        </div>
    );
}
