const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
    name: { type: String, required: true },
});

const College = mongoose.model('College', collegeSchema);


const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    college: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
});

const Department = mongoose.model('Department', departmentSchema);


const courseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }] // Subjects that are part of this course
});

const Course = mongoose.model('Course', courseSchema);


const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Teachers who teach this subject
});

const Subject = mongoose.model('Subject', subjectSchema);


module.exports = { College, Department, Course, Subject }