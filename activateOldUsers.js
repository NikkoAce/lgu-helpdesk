require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

/**
 * This is a one-time-use script to update old user accounts.
 * It finds all users that do not have a 'status' field and sets it to 'Active'.
 */
async function activateOldUsers() {
    if (!MONGO_URI) {
        console.error('MONGO_URI not found in .env file. Please add it.');
        process.exit(1);
    }

    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('Database connected.');

        console.log("Finding users without a 'status' field and updating them to 'Active'...");

        const result = await User.updateMany(
            { status: { $exists: false } }, // Find all documents where the 'status' field does not exist
            { $set: { status: 'Active' } }    // Set the 'status' field to 'Active'
        );

        console.log('-----------------------------------------');
        console.log(`Update complete. ${result.modifiedCount} user(s) were updated.`);
        console.log('-----------------------------------------');

    } catch (error) {
        console.error('An error occurred during the update process:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed.');
    }
}

activateOldUsers();