import { Request, Response } from 'express';
import { sendEmail } from '../../services/email.service';
import { NotificationLog } from './notification.model';

export const sendNotification = async (req: Request, res: Response) => {
    try {
        const { to, subject, htmlContent, textContent, system, senderName } = req.body;

        if (!to || !subject || !htmlContent || !system) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        try {
            await sendEmail({ to, subject, htmlContent, textContent: textContent || 'Please view this email in an HTML compatible mail client.', senderName });
            
            await NotificationLog.create({
                to,
                subject,
                status: 'sent',
                system
            });

            res.status(200).json({ success: true, message: 'Notification sent successfully' });
        } catch (emailError: any) {
            await NotificationLog.create({
                to,
                subject,
                status: 'failed',
                errorDetails: emailError.message,
                system
            });

            return res.status(500).json({ success: false, message: 'Failed to send notification' });
        }
    } catch (error: any) {
        console.error('[InternalController] Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
