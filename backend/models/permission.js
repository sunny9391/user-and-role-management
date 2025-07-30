const mongoose = require('mongoose');
const permissionSchema = new mongoose.Schema({
    id:String,
  key: { type: String, unique: true, required: true },
  description: String,
  roles: [String]
});


module.exports = mongoose.model('Permission', permissionSchema);
