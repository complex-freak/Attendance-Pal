const express = require('express')
const multer = require('multer');
const router = express.Router();
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;

const { Permission, Attendance } = require('../models/Attendance');
const User = require('../models/User');
const Subject = require('../models/College');
const Venue = require('../models/Venue');
const { isStudent } = require('../middlewares/routeAuth');


// Setup multer for file uploads with memory storage
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find the user by username
        const user = await User.findOne({ username }).populate('course department subjects');
        if (!user) {
            return res.status(400).send('Invalid username or password.');
        }

        // Compare the provided password with the stored hash
        try {
            await user.comparePassword(password);
        } catch (error) {
            console.log(error);
        }

        // Generate a JWT token
        const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, { expiresIn: '1h' });

        // Store the token and user data in the session
        req.session.user = { id: user._id, username: user.username, role: user.role };
        req.session.token = token;

        // Redirect based on role
        if (user.role === 'admin') {
            res.redirect('/admin');
        } else if (user.role === 'teacher') {
            res.redirect('/teacher');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Server Error');
    }
});


/* GET home page. */
router.get('/', isStudent, function(req, res, next) {
  res.render('student/index', { title: 'Express' });
});

router.get('/attendance', isStudent, (req, res) =>{
  res.render('student/attendance', { title: 'Attendance' });
});

router.get('/permission', isStudent, (req, res) =>{
  res.render('student/permission', { title: 'Ask Permission' });
});

router.get('/change-password', isStudent, (req, res) =>{
  res.render('change-password', {  });
});

router.post('/permission', isStudent, upload.single('attachment'), async (req, res) => {
    try {
        const { username, subjectId, reason } = req.body;

        // Find the student
        const student = await User.findOne({ username: username, role: 'student' });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Find the subject and the teacher responsible for it
        const subject = await Subject.findById(subjectId).populate('teachers');
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const teacher = subject.teachers[0]; // Assuming the first teacher in the array is the responsible teacher

        // Prepare the attachment data
        let attachment = null;
        if (req.file) {
            attachment = {
                data: req.file.buffer,
                contentType: req.file.mimetype
            };
        }

        // Create a new Permission document
        const newPermission = new Permission({
            student: student._id,
            subject: subject._id,
            reason: reason,
            attachment: attachment,
            status: 'pending',
        });

        await newPermission.save();

        // Send a notification or email to the teacher (this is just a placeholder)
        console.log(`Notification sent to teacher: ${teacher.name}`);

        res.status(200).json({ message: 'Permission request submitted successfully' });
    } catch (error) {
        console.error('Error submitting permission request:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});

// POST route to handle scanned QR code
router.post('/submit-attendance', isStudent, async (req, res) => {
    try {
        const { username, qrCodeData } = req.body;
        const { subjectCode, venueId, date, time } = qrCodeData;

        // Find the student
        const student = await User.findOne({ username: username, role: 'student' });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Find the subject
        const subject = await Subject.findOne({ code: subjectCode });
        if (!subject) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        // Check if the QR code is within the valid time limit (30 minutes)
        const qrDateTime = new Date(`${date}T${time}`);
        const currentTime = new Date();
        const timeDifference = (currentTime - qrDateTime) / (1000 * 60); // Difference in minutes

        let status;
        if (timeDifference <= 30 && timeDifference >= 0) {
            status = 'present';
        } else {
            status = 'absent';
        }

        // Update or create a new attendance record
        const existingAttendance = await Attendance.findOne({
            student: student._id,
            subject: subject._id,
            date: date,
        });

        if (existingAttendance) {
            existingAttendance.status = status;
            await existingAttendance.save();
        } else {
            const newAttendance = new Attendance({
                student: student._id,
                subject: subject._id,
                date: date,
                status: status,
            });
            await newAttendance.save();
        }

        res.status(200).json({ message: `Attendance marked as ${status}` });
    } catch (error) {
        console.error('Error processing QR code:', error);
        res.status(500).json({ error: 'An error occurred while processing the QR code' });
    }
});

router.get('/logout', (req, res) => {
    const role = req.session.user ? req.session.user.role : null;
  
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Failed to log out.');
        }
  
        res.redirect('/')
    });
  });

module.exports = router;
