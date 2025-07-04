const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Discord User ID
  username: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  coins: { type: Number, default: 100 },
  inventory: { type: Array, default: [] }, // Will store items like seeds, tools, etc.
  plots: { type: Array, default: [ { hasPlant: false, plantType: null, plantedAt: null } ] }, // Start with one plot
  // Add titles/ranks later
});

module.exports = mongoose.model('User', userSchema);