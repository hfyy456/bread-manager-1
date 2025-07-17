const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, '门店名称是必填项'], 
    unique: true,
    trim: true 
  },
  address: { 
    type: String,
    trim: true 
  },
  // 可以在此添加更多门店相关信息，例如联系电话、营业时间等
}, { timestamps: true });

const Store = mongoose.model('Store', storeSchema);

module.exports = Store; 