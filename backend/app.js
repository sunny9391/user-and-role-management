require('./db');
const express = require('express');
const cors = require('cors');
const app = express();

const cookieParser = require("cookie-parser");
const path = require('path'); 

app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5500","http://127.0.0.1:5500"],
  credentials: true
}));
app.use(express.json());


app.use(express.static(path.join(__dirname, 'public')));


app.use("/api/auth", require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/permissions', require('./routes/permissions'));
app.use("/api/activities", require("./routes/activity"));

app.listen(3000, () => console.log('Server running on port 3000'));