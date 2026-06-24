import { z } from 'zod';

export const hrisSyncPayloadSchema = z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    status: z.enum(['Active', 'Inactive', 'Terminated', 'Suspended']),
    departmentCode: z.string().optional(),
    position: z.string().optional(),
    email: z.string().email().optional()
});

export type HrisSyncPayload = z.infer<typeof hrisSyncPayloadSchema>;
