const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  users: { type: Number, default: 0 }, 
  permissions: [String],               
  status: { type: String, required: true },
  createdBy: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Role', roleSchema);
