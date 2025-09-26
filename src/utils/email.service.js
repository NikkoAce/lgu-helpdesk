const SibApiV3Sdk = require('@sendinblue/client');

/**
 * Sends an email using the Brevo (Sendinblue) API.
 * @param {object} options - The email options.
 * @param {string} options.to - The recipient's email address.
 * @param {string} options.subject - The email subject.
 * @param {string} options.htmlContent - The HTML content of the email.
 * @param {string} options.textContent - The plain text content of the email.
 * @returns {Promise<void>}
 */
exports.sendEmail = async ({ to, subject, htmlContent, textContent }) => {
    try {
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const apiKey = apiInstance.authentications['apiKey'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        sendSmtpEmail.textContent = textContent;
        sendSmtpEmail.sender = {
            name: process.env.BREVO_FROM_NAME || 'LGU Employee Portal',
            email: process.env.BREVO_FROM_EMAIL,
        };
        sendSmtpEmail.to = [{ email: to }];

        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Email sent successfully to ${to}`);

    } catch (err) {
        console.error('Error sending email via Brevo:', err.response ? err.response.body : err.message);
        // Re-throw the error so the calling function can handle it (e.g., by not deleting a user record on failure)
        // This prevents a state where the email fails but the action (like password reset token) is still committed.
        throw new Error('Failed to send transactional email.');
    }
};