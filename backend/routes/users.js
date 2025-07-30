const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const AdminAuth = require('../models/AdminAuth');
const Activity = require('../models/activity');
const authenticate = require('../middleware/auth');

function getAllowedFields(body) {
  return {
    name: body.name,
    email: body.email,
    phone: body.phone,
    role: body.role,
    status: body.status
  };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const lastUser = await User.findOne({ userId: { $regex: /^user\d{3}$/ } }).sort({ userId: -1 });
    let nextNumber = 1;
    if (lastUser && lastUser.userId) {
      nextNumber = parseInt(lastUser.userId.slice(4), 10) + 1;
    }
    const userId = 'user' + String(nextNumber).padStart(3, '0');

    const { username, password, name, email, phone, role, status } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = new User({
      userId,
      name,
      email,
      username,
      phone,
      role,
      status,
      created: new Date(),
      lastLogin: null
    });
    await user.save();

    const passwordHash = await bcrypt.hash(password, 10);
    const auth = new AdminAuth({
      username,
      passwordHash,
      userId: user._id
    });
    await auth.save();

    await Activity.create({
      userId: req.userId,
      action: "Created User",
      target: `User: ${user.userId} (${user.username})`
    });

    res.status(201).json({ message: "User and credentials created successfully", user, needsRefresh: true });
  } catch (error) {
    if (error.code === 11000) {
        return res.status(400).json({ error: "Username or UserId already exists." });
    }
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const updates = getAllowedFields(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    await Activity.create({
      userId: req.userId,
      action: "Updated User",
      target: `User: ${user.userId} (${user.username})`
    });

    res.json({ user, needsRefresh: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await Activity.create({
      userId: req.userId,
      action: "Deleted User",
      target: `User: ${user.userId} (${user.username})`
    });

    res.json({ message: "User deleted", needsRefresh: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;