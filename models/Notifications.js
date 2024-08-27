const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The user receiving the notification
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false }, // Whether the notification has been read
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
