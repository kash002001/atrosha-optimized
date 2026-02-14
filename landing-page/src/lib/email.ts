import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function sendWelcomeEmail(email: string, name: string) {
    if (!process.env.RESEND_API_KEY) {
        console.log("Resend API Key missing. Skipping email.");
        return;
    }

    try {
        await resend.emails.send({
            from: 'Atrosha <onboarding@resend.dev>', // Use resend.dev for testing if domain not verified
            to: email,
            subject: 'Welcome to Atrosha',
            html: `
        <h1>Welcome to Atrosha, ${name}!</h1>
        <p>Your organization has been created securely.</p>
        <p>Get started by <a href="${process.env.NEXT_PUBLIC_DASHBOARD_URL}">logging into your dashboard</a>.</p>
      `,
        });
        console.log(`Welcome email sent to ${email}`);
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}
