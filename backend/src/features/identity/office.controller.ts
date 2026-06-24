import { Request, Response } from 'express';
import Office from './office.model';
import AuditLog from '../internal/auditLog.model';

export const getOffices = async (req: Request, res: Response): Promise<any> => {
    try {
        const offices = await Office.find().sort({ officeName: 1 });
        res.status(200).json(offices);
    } catch (error) {
        console.error('Error fetching offices:', error);
        res.status(500).json({ message: 'Failed to fetch offices' });
    }
};

export const createOffice = async (req: any, res: Response): Promise<any> => {
    try {
        const { officeCode, officeName, shortName, isActive, parentOfficeId } = req.body;

        const existingCode = await Office.findOne({ officeCode });
        if (existingCode) {
            return res.status(400).json({ message: 'Office code already exists' });
        }

        const existingName = await Office.findOne({ officeName });
        if (existingName) {
            return res.status(400).json({ message: 'Office name already exists' });
        }

        const newOffice = new Office({
            officeCode,
            officeName,
            shortName,
            isActive,
            parentOfficeId
        });

        await newOffice.save();

        await AuditLog.create({
            action: 'office_created',
            performedBy: req.user._id,
            details: `Created office: ${officeName} (${officeCode})`
        });

        res.status(201).json(newOffice);
    } catch (error) {
        console.error('Error creating office:', error);
        res.status(500).json({ message: 'Failed to create office' });
    }
};

export const updateOffice = async (req: any, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { officeCode, officeName, shortName, isActive, parentOfficeId } = req.body;

        const office = await Office.findById(id);
        if (!office) {
            return res.status(404).json({ message: 'Office not found' });
        }

        const updates: string[] = [];

        if (officeCode && officeCode !== office.officeCode) {
            const existingCode = await Office.findOne({ officeCode });
            if (existingCode && existingCode._id.toString() !== id) {
                return res.status(400).json({ message: 'Office code already exists' });
            }
            updates.push(`Code: ${office.officeCode} -> ${officeCode}`);
            office.officeCode = officeCode;
        }

        if (officeName && officeName !== office.officeName) {
            const existingName = await Office.findOne({ officeName });
            if (existingName && existingName._id.toString() !== id) {
                return res.status(400).json({ message: 'Office name already exists' });
            }
            updates.push(`Name: ${office.officeName} -> ${officeName}`);
            office.officeName = officeName;
        }

        if (shortName !== undefined && shortName !== office.shortName) {
            updates.push(`ShortName updated`);
            office.shortName = shortName;
        }

        if (parentOfficeId !== undefined && parentOfficeId !== office.parentOfficeId?.toString()) {
            updates.push(`ParentOffice updated`);
            office.parentOfficeId = parentOfficeId;
        }

        if (isActive !== undefined && isActive !== office.isActive) {
            updates.push(`Status: ${office.isActive ? 'Active' : 'Inactive'} -> ${isActive ? 'Active' : 'Inactive'}`);
            office.isActive = isActive;
        }

        if (updates.length === 0) {
            return res.status(200).json(office);
        }

        await office.save();

        const action = (isActive !== undefined && isActive !== office.isActive) 
            ? (isActive ? 'office_enabled' : 'office_disabled') 
            : 'office_updated';

        await AuditLog.create({
            action,
            performedBy: req.user._id,
            details: `Updated office ${office.officeName}. Changes: ${updates.join(', ')}`
        });

        res.status(200).json(office);
    } catch (error) {
        console.error('Error updating office:', error);
        res.status(500).json({ message: 'Failed to update office' });
    }
};

export const deleteOffice = async (req: any, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        
        const office = await Office.findById(id);
        if (!office) {
            return res.status(404).json({ message: 'Office not found' });
        }

        // Soft delete
        office.isActive = false;
        await office.save();

        await AuditLog.create({
            action: 'office_disabled',
            performedBy: req.user._id,
            details: `Soft deleted/disabled office ${office.officeName} (${office.officeCode})`
        });

        res.status(200).json({ message: 'Office disabled successfully' });
    } catch (error) {
        console.error('Error deleting office:', error);
        res.status(500).json({ message: 'Failed to delete office' });
    }
};
