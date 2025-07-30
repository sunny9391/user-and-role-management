const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://sunny:Nadipineni0$@cluster0.wkmyneh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch((err) => console.log('DB connection error:', err));
