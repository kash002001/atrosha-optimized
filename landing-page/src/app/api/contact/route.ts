import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkOrigin } from '@/lib/csrf';

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_mock_key_for_build');

export async function POST(request: Request) {
    const blocked = checkOrigin(request);
    if (blocked) return blocked;

    try {
        const body = await request.json();
        let { name, email, message } = body;

        // Strip HTML and trim inputs to sanitize
        name = name?.replace(/<[^>]*>?/gm, "")?.trim();
        email = email?.toLowerCase()?.trim();
        message = message?.replace(/<[^>]*>?/gm, "")?.trim();

        // Basic validation
        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Invalid email formatting" }, { status: 400 });
        }

        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Atrosha Contact <kash@atrosha.bond>', // Use verified domain
                to: 'kash@atrosha.bond',
                subject: `New Contact from ${name}`,
                html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong> ${message}</p>`
            });
        } else {
            console.log("Mock Email Sent:", { name, email, message });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Contact API Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
