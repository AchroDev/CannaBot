const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Successfully connected to MongoDB.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;