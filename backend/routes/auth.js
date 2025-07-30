const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AdminAuth = require("../models/AdminAuth");
const User = require("../models/user");
const Activity = require("../models/activity");
const authenticate = require("../middleware/auth");
const Role = require("../models/role");

const router = express.Router();
const SECRET = "your_jwt_secret_key";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  //sameSite: 'None',
  maxAge: 2 * 60 * 60 * 1000
};

router.get("/", (req, res) => {
  res.send("✔️ Auth route is working. Use POST /login to authenticate.");
});



router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const auth = await AdminAuth.findOne({ username });

    if (!auth) return res.status(401).json({ error: "Invalid username" });

    const isMatch = await bcrypt.compare(password, auth.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ userId: auth.userId }, SECRET, { expiresIn: "2h" });
    res.cookie("token", token, COOKIE_OPTIONS);

    const user = await User.findById(auth.userId);

    await Activity.create({
      userId: user._id,
      action: "Logged In",
      target: `User: ${user.username}`
    });

    res.json({
      message: "Login successful",
      user: {
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email,
        userId: user._id
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error during login" });
  }
});

router.get("/login", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      userId: user._id
    });
    console.log("🔐 Cookie Token:", req.cookies.token);

  } catch (err) {
    res.status(500).json({ error: "Error fetching user" });
  }
});

router.get("/current-user", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const userRole = await Role.findOne({ name: user.role });
    const userPermissions = userRole ? userRole.permissions : [];

    res.json({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      userId: user._id,
      permissions: userPermissions
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching user data" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
 // console.log("✅ Token cookie set:", token);
  res.json({ message: "Logged out successfully" });
});

router.post("/create-admin", async (req, res) => {
  const { name, username, email, password } = req.body;

  if (!username || !password || !email || !name) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existing = await AdminAuth.findOne({ username });
  if (existing) return res.status(400).json({ error: "Username already exists" });

  const user = new User({
    name,
    username,
    email,
    phone: "",
    role: "Admin",
    status: "Active",
    created: new Date()
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
    userId: user._id,
    action: "Created Admin",
    target: `Admin: ${user.username}`
  });

  res.json({ message: "Admin user created successfully!" });
});

router.post("/manual-register", async (req, res) => {
  const { username, password, userId } = req.body;

  if (!username || !password || !userId) {
    return res.status(400).json({ error: "Missing username, password, or userId" });
  }

  const existing = await AdminAuth.findOne({ username });
  if (existing) return res.status(400).json({ error: "Username already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const auth = new AdminAuth({ username, passwordHash, userId });
  await auth.save();

  await Activity.create({
    userId,
    action: "Registered Credentials",
    target: `Username: ${username}`
  });

  res.json({ message: "AdminAuth created successfully" });
});

module.exports = router;
