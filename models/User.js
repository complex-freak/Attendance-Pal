const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true }, // Student registration number or teacher/admin username
    password: { type: String, required: true },
    role: { type: String, enum: ['Student', 'Teacher', 'Admin'], required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // For students
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, // For teachers
    level: { type: String }, // For students only
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }] // For students and teachers
});

// Pre-save hook for students to enroll them in all subjects of their course
userSchema.pre('save', async function (next) {
    if (this.isNew && this.role === 'student' && this.course) {
        const Course = mongoose.model('Course');
        const Subject = mongoose.model('Subject');

        const course = await Course.findById(this.course).populate('subjects');
        this.subjects = course.subjects.map(subject => subject._id);
    }
    next();
});

// Hash the password before saving the user
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare hashed password with plain text
userSchema.methods.comparePassword = function(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
