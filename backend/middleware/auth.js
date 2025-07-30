const jwt = require("jsonwebtoken");

const SECRET = "your_jwt_secret_key";

module.exports = function (req, res, next) {
  const token = req.cookies.token;

  console.log("Cookie Token:", token); 

  if (!token) return res.status(401).json({ error: "Unauthorized - No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    console.log("Decoded User ID:", decoded.userId); 
    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.error("JWT Error:", err);
    res.status(403).json({ error: "Invalid token" });
  }
};
