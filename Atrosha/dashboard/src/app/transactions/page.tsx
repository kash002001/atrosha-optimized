import { createClient } from "@/lib/supabase-server";
import TransactionsClient from "./TransactionsClient";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function TransactionsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(process.env.NEXT_PUBLIC_LOGIN_URL || "/login");
    }

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error("Error fetching rules:", error);
    }

    return (
        <>
            <div className="page-header">
                <h2>Transactions</h2>
                <p>Full audit log of all proxied financial operations.</p>
            </div>
            <TransactionsClient initialData={transactions || []} />
        </>
    );
}
