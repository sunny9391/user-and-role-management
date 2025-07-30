const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true, required: true },
  name: String,
  email: String,
  username: String,
  phone: String,
  role: String,
  status: String,
  created: Date,
  lastLogin: Date
});

module.exports = mongoose.model('User', userSchema);
