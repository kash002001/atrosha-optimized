import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        }

        const supabase = getSupabase();

        const { data: existing } = await supabase
            .from("waitlist")
            .select("id")
            .eq("email", email.toLowerCase().trim())
            .single();

        if (existing) {
            return NextResponse.json({ message: "You're already on the list! We'll reach out soon." });
        }

        const { error } = await supabase
            .from("waitlist")
            .insert({ email: email.toLowerCase().trim() });

        if (error) {
            console.error("supabase insert error:", error);
            return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
        }

        return NextResponse.json({ message: "Welcome aboard! We'll email you when it's ready." });
    } catch (err) {
        console.error("waitlist error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
