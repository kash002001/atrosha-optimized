import { Resend } from 'resend';

// Use environment variable or fall back to a mock for build time
export const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key_for_build');

export async function sendWelcomeEmail(email: string, orgName: string) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("⚠️ SKIPPING EMAIL: RESEND_API_KEY is missing.");
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Atrosha <kash@atrosha.bond>', // Updated to verified subdomain
            to: email,
            subject: 'Welcome to Atrosha',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
                .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome to Atrosha, ${orgName}!</h1>
                <p>Your organization has been successfully created. You are now ready to secure your autonomous agents.</p>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>Create your first Policy</li>
                    <li>Issue an API Key for your Agent</li>
                    <li>Set up Spending Limits</li>
                </ul>

                <p style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_DASHBOARD_URL}" class="btn">Go to Dashboard</a>
                </p>

                <p>If you have any questions, reply to this email.</p>

                <div class="footer">
                    &copy; ${new Date().getFullYear()} Atrosha Inc.
                </div>
            </div>
        </body>
        </html>
      `,
        });

        if (error) {
            console.error("Resend API Error:", error);
        } else {
            console.log(`✅ Welcome email sent to ${email} (ID: ${data?.id})`);
        }
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}
