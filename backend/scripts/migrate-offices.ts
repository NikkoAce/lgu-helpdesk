import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Office from '../src/features/identity/office.model';
import User from '../src/features/auth/user.model';

const runMigration = async () => {
    console.log('Starting Office Migration...');

    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('FATAL ERROR: MONGO_URI environment variable is not defined.');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to Database');

        // 1. Fetch from PPeMS
        const gsoApiUrl = process.env.GSO_API_URL || 'https://gso-backend-mns8.onrender.com';
        const ppemsApiKey = process.env.PPEMS_API_KEY;

        console.log(`Fetching offices from ${gsoApiUrl}/api/offices/public...`);
        const response = await fetch(`${gsoApiUrl}/api/offices/public`, {
            headers: ppemsApiKey ? { 'x-api-key': ppemsApiKey } : {}
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch from PPeMS. Status: ${response.status}`);
        }

        const ppemsOffices = await response.json();
        console.log(`Fetched ${ppemsOffices.length} offices from PPeMS.`);

        // 2. Insert into IT Helpdesk
        console.log('Inserting into IT Helpdesk...');
        const localOffices = [];
        for (const ppemsOffice of ppemsOffices) {
            let office = await Office.findOne({ officeName: ppemsOffice.name });
            if (!office) {
                // Determine code. If PPeMS gives code, use it. Else generate a slug.
                const code = ppemsOffice.code || ppemsOffice.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 5);
                
                // Ensure unique code
                let officeCode = code;
                let counter = 1;
                while (await Office.findOne({ officeCode })) {
                    officeCode = `${code}${counter}`;
                    counter++;
                }

                office = await Office.create({
                    officeCode,
                    officeName: ppemsOffice.name,
                    isActive: true
                });
                console.log(`Created office: ${office.officeName} (${office.officeCode})`);
            }
            localOffices.push(office);
        }

        // 3. Migrate Users
        console.log('Migrating Users...');
        const users = await User.find({ officeId: { $exists: false } });
        console.log(`Found ${users.length} users needing migration.`);

        let updatedCount = 0;
        for (const user of users) {
            if (user.office && user.office !== 'Unassigned') {
                const matchedOffice = await Office.findOne({ officeName: user.office });
                if (matchedOffice) {
                    user.officeId = matchedOffice._id;
                    await user.save();
                    updatedCount++;
                    console.log(`Mapped User ${user.email} to ${matchedOffice.officeName}`);
                } else {
                    console.warn(`Warning: User ${user.email} has unknown office '${user.office}'`);
                }
            }
        }

        console.log(`Successfully mapped ${updatedCount} users to officeIds.`);
        console.log('Migration Complete.');

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

runMigration();
