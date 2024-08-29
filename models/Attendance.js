const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent'], required: true },
});

const Attendance = mongoose.model('Attendance', attendanceSchema);


const permissionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    reason: { type: String, required: true },
    attachment: {
        data: Buffer,
        contentType: String
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
});

const Permission = mongoose.model('Permission', permissionSchema);


const reportSchema = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    reportData: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON structure to store analytics data
    createdAt: { type: Date, default: Date.now },
});

const Report = mongoose.model('Report', reportSchema);


module.exports = { Attendance, Permission, Report }