const express = require("express");
const Activity = require("../models/activity");
const authenticate = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("userId", "username");

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

module.exports = router;
