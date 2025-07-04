const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Discord User ID
  username: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  coins: { type: Number, default: 100 },
  inventory: [{
    name: String,
    quantity: Number,
  }],
  plots: { type: Array, default: [{ hasPlant: false, plantType: null, plantedAt: null }] },
  lastDaily: { type: Date, default: null } // Adding this now for our next step
});

module.exports = mongoose.model('User', userSchema);