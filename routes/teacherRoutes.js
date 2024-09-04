const express = require("express");
const qr = require('qrcode');
const router = express.Router();

router.get("/", (req, res) => {
  res.render("teacher/index", {  });
});

router.post('/generate-qr-code', async (req, res) => {
  const { courseCode } = req.body;

  if (!courseCode) {
      return res.status(400).json({ error: 'Course code is required' });
  }

  const now = new Date();
  const expiryTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now

  // Data encoded in the QR code
  const qrData = {
      courseCode,
      date: now.toISOString(),
      expiryTime: expiryTime.toISOString(),
  };

  try {
      // Generate the QR code as a data URL
      const qrCodeUrl = await qr.toDataURL(JSON.stringify(qrData));
      
      res.json({ qrCodeUrl });
  } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Middleware to check if the user is a teacher
const isTeacher = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
      return next();
  }
  return res.status(403).json({ message: 'Access denied. Only teachers can register attendance.' });
};

// Route to manually register attendance
router.post('/manual-attendance-register', isTeacher, async (req, res) => {
  try {
      const { studentId, subjectId, date, status } = req.body;

      // Validate the input data
      if (!studentId || !subjectId || !date || !status) {
          return res.status(400).json({ message: 'All fields are required.' });
      }

      // Create a new attendance record
      const attendance = new Attendance({
          student: mongoose.Types.ObjectId(studentId),
          subject: mongoose.Types.ObjectId(subjectId),
          date: new Date(date),
          status: status,
      });

      // Save the attendance record to the database
      await attendance.save();

      return res.status(201).json({ message: 'Attendance registered successfully.', attendance });
  } catch (error) {
      console.error('Error registering attendance:', error);
      return res.status(500).json({ message: 'An error occurred while registering attendance.' });
  }
});

router.get("/verify-permission", (req, res) => {
  res.render("teacher/permission-verification", {  });
});

router.get("/book-venue", (req, res) => {
  res.render("teacher/book-venue", {  });
});

router.get("/analytics", (req, res) => {
  res.render("teacher/attendance-analytics", {  });
});

router.get("/profile", (req, res) => {
  res.render("teacher/profile", {  });
});

router.get('/change-password', (req, res) =>{
    res.render('teacher/change-password', {  });
});

module.exports = router;
