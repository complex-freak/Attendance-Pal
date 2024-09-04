const express = require('express')
const router = express.Router();
const bcrypt = require('bcrypt');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const { Department, Course, Subject} = require('../models/College');
const { Attendance, Report } = require('../models/Attendance');

/* GET home page. */
router.get('/', function(req, res, next) {
  const totalStudents = 12022;
  const totalTeachers = 687;
  const totalColleges = 6;
  const activeSessions = 2346;
  const logs = [
    { message: "Some lorem ispum" },
    { message: "Another Lorem Ipsum" },
    { message: "Here is another lorem ipsum again" }
  ]
  res.render('admin/index', { totalStudents, totalTeachers, totalColleges, activeSessions, logs, layout: "../views/layouts/adminLayout" });
});

router.get('/users', async (req, res) => {
  try {
      const users = await User.find().populate('department').populate('course');
      const departments = await Department.find();
      const courses = await Course.find();
      res.render('admin/userManagement', { users, departments, courses, layout: "../views/layouts/adminLayout" });
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Server Error');
  }
});

// POST /add-user - Add a new user
router.post('/add-user', async (req, res) => {
  try {
      const { username, name, role, department, course, password } = req.body;

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
          username,
          name,
          role,
          department: department || null, // Assign department if provided
          course: course || null, // Assign course if provided
          password: hashedPassword
      });

      await newUser.save();
      res.redirect('/admin/users'); // Redirect back to the User Management page
  } catch (error) {
      console.error('Error adding user:', error);
      res.status(500).send('Server Error');
  }
});

// GET /get-user/:id - Get user data for editing
router.get('/get-user/:id', async (req, res) => {
  try {
      const user = await User.findById(req.params.id).populate('department').populate('course');
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
  } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Server Error' });
  }
});

// POST /edit-user - Edit an existing user
router.post('/edit-user', async (req, res) => {
  try {
      const { userId, username, name, role, department, course, password } = req.body;

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).send('User not found');
      }

      user.username = username;
      user.name = name;
      user.role = role;
      user.department = department || null; // Update department if provided
      user.course = course || null; // Update course if provided

      // Only update password if it's provided
      if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          user.password = hashedPassword;
      }

      await user.save();
      res.redirect('/admin/users'); // Redirect back to the User Management page
  } catch (error) {
      console.error('Error editing user:', error);
      res.status(500).send('Server Error');
  }
});

// DELETE /delete-user/:id - Delete a user
router.delete('/delete-user/:id', async (req, res) => {
  try {
      const user = await User.findByIdAndDelete({_id: req.params.id});
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      res.json({ success: true });
  } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Server Error' });
  }
});


// GET /reports-analytics - Render the Reports & Analytics page with optional filters
router.get('/analytics', async (req, res) => {
  try {
      const { startDate, endDate } = req.query;

      const filter = {};
      if (startDate && endDate) {
          filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      // Aggregating data dynamically for analysis
      const totalAttendance = await Attendance.countDocuments(filter);
      const averageAttendance = await Attendance.aggregate([
          { $match: filter },
          { $group: { _id: null, avgAttendance: { $avg: "$attendancePercentage" } } }
      ]);
      const topPerformer = await getTopPerformer(filter); // Custom function to get top performer
      const lowestPerformer = await getLowestPerformer(filter); // Custom function to get lowest performer
      const reports = []; // Populate with actual report data

      res.render('admin/analytics', {
          totalAttendance,
          averageAttendance: averageAttendance.length > 0 ? averageAttendance[0].avgAttendance.toFixed(2) : 0,
          topPerformer,
          lowestPerformer,
          reports,
          layout: "../views/layouts/adminLayout"
      });
  } catch (error) {
      console.error('Error fetching reports and analytics:', error);
      res.status(500).send('Server Error');
  }
});

// Function to get top performer
async function getTopPerformer(filter) {
  const result = await Attendance.aggregate([
      { $match: filter },
      { $group: { _id: "$student", avgAttendance: { $avg: "$attendancePercentage" } } },
      { $sort: { avgAttendance: -1 } },
      { $limit: 1 }
  ]);
  return result.length ? await User.findById(result[0]._id).select('name') : 'N/A';
}

// Function to get lowest performer
async function getLowestPerformer(filter) {
  const result = await Attendance.aggregate([
      { $match: filter },
      { $group: { _id: "$student", avgAttendance: { $avg: "$attendancePercentage" } } },
      { $sort: { avgAttendance: 1 } },
      { $limit: 1 }
  ]);
  return result.length ? await User.findById(result[0]._id).select('name') : 'N/A';
}

// POST /generate-report - Generate and download report
router.post('/generate-report', async (req, res) => {
  try {
      const { reportType, format } = req.body;

      let data;
      if (reportType === 'attendance') {
          data = await Attendance.find().populate('student').populate('subject').lean();
      } else if (reportType === 'performance') {
          // Assuming performance data is stored or derived similarly
          data = await Attendance.aggregate([
              { $group: { _id: "$subject", averageAttendance: { $avg: "$attendancePercentage" } } }
          ]);
      }

      if (format === 'csv') {
          const parser = new Parser();
          const csv = parser.parse(data);
          res.header('Content-Type', 'text/csv');
          res.attachment(`${reportType}-report.csv`);
          res.send(csv);
      } else if (format === 'excel') {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet(`${reportType} Report`);

          worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));

          data.forEach(record => {
              worksheet.addRow(record);
          });

          res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.attachment(`${reportType}-report.xlsx`);
          await workbook.xlsx.write(res);
          res.end();
      }
  } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).send('Server Error');
  }
});

// Analysis routes
router.get('/reports-analytics/college', async (req, res) => {
  try {
      // Step 1: Aggregate attendance data based on college
      const attendanceByCollege = await Attendance.aggregate([
          {
              $lookup: {
                  from: 'users', // Collection to join with (User collection)
                  localField: 'student', // Field from Attendance to join on
                  foreignField: '_id', // Field from User to join on
                  as: 'studentDetails' // Name of the output array field
              }
          },
          {
              $unwind: '$studentDetails' // Deconstruct the array field
          },
          {
              $lookup: {
                  from: 'courses', // Assuming courses have a reference to colleges
                  localField: 'studentDetails.course',
                  foreignField: '_id',
                  as: 'courseDetails'
              }
          },
          {
              $unwind: '$courseDetails' // Deconstruct the array field
          },
          {
              $lookup: {
                  from: 'departments', // Assuming departments have a reference to colleges
                  localField: 'courseDetails.department',
                  foreignField: '_id',
                  as: 'departmentDetails'
              }
          },
          {
              $unwind: '$departmentDetails' // Deconstruct the array field
          },
          {
              $lookup: {
                  from: 'colleges', // College collection
                  localField: 'departmentDetails.college',
                  foreignField: '_id',
                  as: 'collegeDetails'
              }
          },
          {
              $unwind: '$collegeDetails' // Deconstruct the array field
          },
          {
              $group: {
                  _id: '$collegeDetails._id', // Group by college
                  collegeName: { $first: '$collegeDetails.name' },
                  totalAttendance: { $sum: 1 }, // Count total attendance records
                  presentCount: {
                      $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                  },
                  absentCount: {
                      $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                  },
                  averageAttendance: {
                      $avg: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                  }
              }
          },
          {
              $sort: { averageAttendance: -1 } // Sort by average attendance (descending)
          }
      ]);

      // Step 2: Render the analysis page
      res.render('admin/college-analysis', {
          attendanceByCollege,
          layout: "../views/layouts/adminLayout"
      });
  } catch (error) {
      console.error('Error analyzing attendance by college:', error);
      res.status(500).send('Server Error');
  }
});


router.get('/reports-analytics/department', async (req, res) => {
  try {
      // Step 1: Aggregate attendance data based on department
      const attendanceByDepartment = await Attendance.aggregate([
          {
              $lookup: {
                  from: 'users', // Join with User collection
                  localField: 'student', // Field from Attendance to join on
                  foreignField: '_id', // Field from User to join on
                  as: 'studentDetails' // Name of the output array field
              }
          },
          {
              $unwind: '$studentDetails' // Deconstruct the array field
          },
          {
              $lookup: {
                  from: 'courses', // Join with Course collection
                  localField: 'studentDetails.course',
                  foreignField: '_id',
                  as: 'courseDetails'
              }
          },
          {
              $unwind: '$courseDetails' // Deconstruct the array field
          },
          {
              $lookup: {
                  from: 'departments', // Join with Department collection
                  localField: 'courseDetails.department',
                  foreignField: '_id',
                  as: 'departmentDetails'
              }
          },
          {
              $unwind: '$departmentDetails' // Deconstruct the array field
          },
          {
              $group: {
                  _id: '$departmentDetails._id', // Group by department
                  departmentName: { $first: '$departmentDetails.name' },
                  totalAttendance: { $sum: 1 }, // Count total attendance records
                  presentCount: {
                      $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                  },
                  absentCount: {
                      $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                  },
                  averageAttendance: {
                      $avg: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                  }
              }
          },
          {
              $sort: { averageAttendance: -1 } // Sort by average attendance (descending)
          }
      ]);

      // Step 2: Render the analysis page
      res.render('admin/department-analysis', {
          attendanceByDepartment,
          layout: "../views/layouts/adminLayout"
      });
  } catch (error) {
      console.error('Error analyzing attendance by department:', error);
      res.status(500).send('Server Error');
  }
});


router.get('/reports-analytics/course', async (req, res) => {
  try {
      // Step 1: Aggregate attendance data based on course
      const attendanceByCourse = await Attendance.aggregate([
          {
              $lookup: {
                  from: 'users', // Join with User collection
                  localField: 'student', // Field from Attendance to join on
                  foreignField: '_id', // Field from User to join on
                  as: 'studentDetails' // Name of the output array field
              }
          },
          {
              $unwind: '$studentDetails' // Deconstruct the array field
          },
          {
              $lookup: {
                  from: 'courses', // Join with Course collection
                  localField: 'studentDetails.course',
                  foreignField: '_id',
                  as: 'courseDetails'
              }
          },
          {
              $unwind: '$courseDetails' // Deconstruct the array field
          },
          {
              $group: {
                  _id: '$courseDetails._id', // Group by course
                  courseName: { $first: '$courseDetails.name' },
                  totalAttendance: { $sum: 1 }, // Count total attendance records
                  presentCount: {
                      $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                  },
                  absentCount: {
                      $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                  },
                  averageAttendance: {
                      $avg: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                  }
              }
          },
          {
              $sort: { averageAttendance: -1 } // Sort by average attendance (descending)
          }
      ]);

      // Step 2: Render the analysis page
      res.render('admin/course-analysis', {
          attendanceByCourse,
          layout: "../views/layouts/adminLayout"
      });
  } catch (error) {
      console.error('Error analyzing attendance by course:', error);
      res.status(500).send('Server Error');
  }
});


router.get('/reports-analytics/subject', async (req, res) => {
  try {
      // Step 1: Aggregate attendance data based on subject
      const attendanceBySubject = await Attendance.aggregate([
          {
              $lookup: {
                  from: 'subjects', // Join with Subject collection
                  localField: 'subject', // Field from Attendance to join on
                  foreignField: '_id', // Field from Subject to join on
                  as: 'subjectDetails' // Name of the output array field
              }
          },
          {
              $unwind: '$subjectDetails' // Deconstruct the array field
          },
          {
              $group: {
                  _id: '$subjectDetails._id', // Group by subject
                  subjectName: { $first: '$subjectDetails.name' },
                  totalAttendance: { $sum: 1 }, // Count total attendance records
                  presentCount: {
                      $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                  },
                  absentCount: {
                      $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                  },
                  averageAttendance: {
                      $avg: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                  }
              }
          },
          {
              $sort: { averageAttendance: -1 } // Sort by average attendance (descending)
          }
      ]);

      // Step 2: Render the analysis page
      res.render('admin/subject-analysis', {
          attendanceBySubject,
          layout: "../views/layouts/adminLayout"
      });
  } catch (error) {
      console.error('Error analyzing attendance by subject:', error);
      res.status(500).send('Server Error');
  }
});


router.get('/reports-analytics/student', async (req, res) => {
  // Logic to analyze attendance based on individual student
});
router.get('/reports', (req, res) =>{
  res.render('reports', {  });
});

router.get('/change-password', (req, res) =>{
    res.render('change-password', {  });
});

module.exports = router;