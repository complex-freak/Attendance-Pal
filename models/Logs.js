const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The user who performed the action
    action: { type: String, required: true }, // The action performed
    details: { type: String }, // Additional details about the action
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
