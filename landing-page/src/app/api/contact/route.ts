import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkOrigin } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_mock_key_for_build');

export async function POST(request: Request) {
    const blocked = checkOrigin(request);
    if (blocked) return blocked;

    // 5 contact submissions per IP per hour
    // M2: parse to single IP — x-forwarded-for is a comma-chain behind a proxy
    const ip = (
        request.headers.get('x-real-ip') ??
        request.headers.get('x-forwarded-for')?.split(',')[0]
    )?.trim() ?? 'anonymous';
    const { success } = checkRateLimit(`contact:${ip}`, 5, 3_600_000);
    if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const body = await request.json();
        let { name, email, message } = body;

        name = name?.replace(/<[^>]*>?/gm, "")?.trim();
        email = email?.toLowerCase()?.trim();
        message = message?.replace(/<[^>]*>?/gm, "")?.trim();

        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (name.length > 200 || message.length > 5000) {
            return NextResponse.json({ error: 'Input too long' }, { status: 400 });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Invalid email formatting" }, { status: 400 });
        }

        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        if (process.env.RESEND_API_KEY) {
            // L8: escape all user content before HTML interpolation
            await resend.emails.send({
                from: 'Atrosha Contact <kash@atrosha.bond>',
                to: 'kash@atrosha.bond',
                subject: `New Contact from ${esc(name)}`,
                html: `<p><strong>Name:</strong> ${esc(name)}</p><p><strong>Email:</strong> ${esc(email)}</p><p><strong>Message:</strong> ${esc(message)}</p>`
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
