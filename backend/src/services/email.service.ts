import * as SibApiV3Sdk from '@sendinblue/client';

interface SendEmailOptions {
    to: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    senderName?: string;
}

export const sendEmail = async ({ to, subject, htmlContent, textContent, senderName }: SendEmailOptions): Promise<void> => {
    try {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        // Cast apiInstance to any to access dynamic authentication attributes
        const apiKey = (apiInstance as any).authentications['apiKey'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        sendSmtpEmail.textContent = textContent;
        sendSmtpEmail.sender = {
            name: senderName || process.env.BREVO_FROM_NAME || 'LGU Employee Portal',
            email: process.env.BREVO_FROM_EMAIL || 'noreply@lgudaet.gov.ph',
        };
        sendSmtpEmail.to = [{ email: to }];

        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.info(`Email sent successfully to ${to}`);

    } catch (err: any) {
        console.error('Error sending email via Brevo:', err.response ? err.response.body : err.message);
        throw new Error('Failed to send transactional email.');
    }
};