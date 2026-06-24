import { HrisSyncPayload } from './identity.validator';
import AuditLog from '../internal/auditLog.model';

export const processHrisSync = async (payload: HrisSyncPayload): Promise<void> => {
    // Currently, this phase only logs the sync payload without modifying local DB.
    // Business logic for actual HRIS syncing will be implemented in future phases.
    try {
        await AuditLog.create({
            action: 'hris_sync_received',
            performedBy: 'system',
            details: `Received valid HRIS sync for employee ${payload.employeeId}`
        });
    } catch (err) {
        console.error('Failed to log hris_sync_received:', err);
    }
};

export const logHrisSyncRejection = async (reason: string): Promise<void> => {
    try {
        await AuditLog.create({
            action: 'hris_sync_rejected',
            performedBy: 'system',
            details: `HRIS sync rejected: ${reason}`
        });
    } catch (err) {
        console.error('Failed to log hris_sync_rejected:', err);
    }
};
