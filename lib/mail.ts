import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMatchNotification(email: string, candidateName: string, jobTitle: string, score: number) {
    try {
        const data = await resend.emails.send({
            from: 'Smart Resume <notifications@resend.dev>', // Update this after verifying domain
            to: [email],
            subject: `New Job Match: ${jobTitle}`,
            html: `
        <h1>Hello ${candidateName},</h1>
        <p>We found a new job match for you!</p>
        <p><strong>Job:</strong> ${jobTitle}</p>
        <p><strong>Match Score:</strong> ${score}%</p>
        <p><a href="${process.env.NEXTAUTH_URL}/dashboard">View details on your dashboard</a></p>
      `,
        });

        return { success: true, data };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}
