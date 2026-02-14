import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_mock_key_for_build');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, message } = body;

        // Basic validation
        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Atrosha Contact <onboarding@resend.dev>', // Default Resend testing domain
                to: 'delivered@resend.dev', // Default Resend testing email, changeable in Prod
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
