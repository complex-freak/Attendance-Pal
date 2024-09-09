const express = require("express");
const qr = require('qrcode');
const { isTeacher } = require('../middlewares/routeAuth');  
const router = express.Router();

const Venue = require('../models/Venue');

router.get("/", isTeacher,  (req, res) => {
  res.render("teacher/index", {  });
});

router.post('/generate-qr-code', isTeacher, async (req, res) => {
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

router.get("/verify-permission", isTeacher, (req, res) => {
  res.render("teacher/permission-verification", {  });
});

// GET route to list venues, available first, then booked
router.get('/book-venue', isTeacher, async (req, res) => {
  try {
      const now = new Date();
      // Release venues where the booking expiry time has passed
      await Venue.updateMany({ isBooked: true, bookingExpiry: { $lt: now } }, { $set: { isBooked: false, bookedBy: null, bookingExpiry: null } });

      const availableVenues = await Venue.find({ isBooked: false }).sort({ name: 1 });
      const bookedVenues = await Venue.find({ isBooked: true }).sort({ name: 1 });

      console.log(bookedVenues)

      res.render('teacher/book-venue', { availableVenues, bookedVenues });
  } catch (error) {
      console.error('Error fetching venues:', error);
      res.status(500).json({ message: 'Error fetching venues.' });
  }
});

// POST route to book a venue
router.post('/book-venue/:id', isTeacher, async (req, res) => {
  try {
      const { id } = req.params;
      const now = new Date();
      const bookingExpiry = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Set expiry time to 3 hours from now

      const venue = await Venue.findById(id);

      if (venue.isBooked) {
          return res.status(400).json({ message: 'Venue is already booked.' });
      }

      venue.isBooked = true;
      venue.bookedBy = req.user._id; // Assuming req.user contains the teacher's data
      venue.bookingExpiry = bookingExpiry;

      await venue.save();

      // Automatically release the venue after 3 hours
      setTimeout(async () => {
          venue.isBooked = false;
          venue.bookedBy = null;
          venue.bookingExpiry = null;
          await venue.save();
      }, 3 * 60 * 60 * 1000); // 3 hours in milliseconds

      res.redirect('/teacher/book-venue');
  } catch (error) {
      console.error('Error booking venue:', error);
      res.status(500).json({ message: 'Error booking venue.' });
  }
});

// POST route to release a booked venue manually
router.post('/release-venue/:id', isTeacher, async (req, res) => {
  try {
      const { id } = req.params;
      const venue = await Venue.findById(id);

      if (!venue.isBooked || venue.bookedBy.toString() !== req.user._id.toString()) {
          return res.status(400).json({ message: 'You cannot release this venue.' });
      }

      venue.isBooked = false;
      venue.bookedBy = null;
      venue.bookingExpiry = null;

      await venue.save();
      res.redirect('/teacher/book-venue');
  } catch (error) {
      console.error('Error releasing venue:', error);
      res.status(500).json({ message: 'Error releasing venue.' });
  }
});

router.get("/analytics", isTeacher, (req, res) => {
  res.render("teacher/attendance-analytics", {  });
});

router.get("/profile", isTeacher, (req, res) => {
  res.render("teacher/profile", {  });
});

router.get('/change-password', isTeacher, (req, res) =>{
    res.render('teacher/change-password', {  });
});

router.get('/logout', (req, res) => {
  const role = req.session.user ? req.session.user.role : null;

  req.session.destroy((err) => {
      if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).send('Failed to log out.');
      }

      res.redirect('/teacher')
  });
});

module.exports = router;
