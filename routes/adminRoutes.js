const express = require("express");
const router = express.Router();
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const { College, Department, Course, Subject } = require("../models/College");
const Venue = require('../models/Venue');
const { Attendance, Report } = require("../models/Attendance");
const { isAdmin } = require("../middlewares/routeAuth");
const { getTopPerformer, getLowestPerformer } = require('../middlewares/helper');

const adminLayout = "../views/layouts/adminLayout";



/* GET home page. */
router.get("/", isAdmin, function (req, res, next) {
  const totalStudents = 12022;
  const totalTeachers = 687;
  const totalColleges = 6;
  const activeSessions = 2346;
  const logs = [
    { message: "Some lorem ispum" },
    { message: "Another Lorem Ipsum" },
    { message: "Here is another lorem ipsum again" },
  ];
  res.render("admin/index", {
    totalStudents,
    totalTeachers,
    totalColleges,
    activeSessions,
    logs,
    layout: adminLayout,
  });

});

router.get("/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find().populate("department").populate("course");
    const departments = await Department.find();
    const courses = await Course.find();
    res.render("admin/users", {
      users,
      departments,
      courses,
      layout: adminLayout,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Server Error");
  }
});

// POST /add-user - Add a new user
router.post("/add-user", isAdmin, async (req, res) => {
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
      password: hashedPassword,
    });

    await newUser.save();
    res.redirect("/admin/users"); // Redirect back to the User Management page
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).send("Server Error");
  }
});

// GET /get-user/:id - Get user data for editing
router.get("/get-user/:id", isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("department")
      .populate("course");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// POST /edit-user - Edit an existing user
router.post("/edit-user", isAdmin, async (req, res) => {
  try {
    const { userId, username, name, role, department, course, password } =
      req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
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
    res.redirect("/admin/users"); // Redirect back to the User Management page
  } catch (error) {
    console.error("Error editing user:", error);
    res.status(500).send("Server Error");
  }
});

// DELETE /delete-user/:id - Delete a user
router.delete("/delete-user/:id", isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete({ _id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// GET /reports-analytics - Render the Reports & Analytics page with optional filters
router.get("/analytics", isAdmin, async (req, res) => {
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
      {
        $group: { _id: null, avgAttendance: { $avg: "$attendancePercentage" } },
      },
    ]);
    const topPerformer = await getTopPerformer(filter); // Custom function to get top performer
    const lowestPerformer = await getLowestPerformer(filter); // Custom function to get lowest performer
    const reports = []; // Populate with actual report data

    res.render("admin/analytics", {
      totalAttendance,
      averageAttendance:
        averageAttendance.length > 0
          ? averageAttendance[0].avgAttendance.toFixed(2)
          : 0,
      topPerformer,
      lowestPerformer,
      reports,
      layout: adminLayout,
    });
  } catch (error) {
    console.error("Error fetching reports and analytics:", error);
    res.status(500).send("Server Error");
  }
});

// POST /generate-report - Generate and download report
router.post("/generate-report", isAdmin, async (req, res) => {
  try {
    const { reportType, format } = req.body;

    let data;
    if (reportType === "attendance") {
      data = await Attendance.find()
        .populate("student")
        .populate("subject")
        .lean();
    } else if (reportType === "performance") {
      // Assuming performance data is stored or derived similarly
      data = await Attendance.aggregate([
        {
          $group: {
            _id: "$subject",
            averageAttendance: { $avg: "$attendancePercentage" },
          },
        },
      ]);
    }

    if (format === "csv") {
      const parser = new Parser();
      const csv = parser.parse(data);
      res.header("Content-Type", "text/csv");
      res.attachment(`${reportType}-report.csv`);
      res.send(csv);
    } else if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`${reportType} Report`);

      worksheet.columns = Object.keys(data[0]).map((key) => ({
        header: key,
        key,
      }));

      data.forEach((record) => {
        worksheet.addRow(record);
      });

      res.header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.attachment(`${reportType}-report.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).send("Server Error");
  }
});

// Analysis routes
router.get("/reports-analytics/college", isAdmin, async (req, res) => {
  try {
    // Step 1: Aggregate attendance data based on college
    const attendanceByCollege = await Attendance.aggregate([
      {
        $lookup: {
          from: "users", // Collection to join with (User collection)
          localField: "student", // Field from Attendance to join on
          foreignField: "_id", // Field from User to join on
          as: "studentDetails", // Name of the output array field
        },
      },
      {
        $unwind: "$studentDetails", // Deconstruct the array field
      },
      {
        $lookup: {
          from: "courses", // Assuming courses have a reference to colleges
          localField: "studentDetails.course",
          foreignField: "_id",
          as: "courseDetails",
        },
      },
      {
        $unwind: "$courseDetails", // Deconstruct the array field
      },
      {
        $lookup: {
          from: "departments", // Assuming departments have a reference to colleges
          localField: "courseDetails.department",
          foreignField: "_id",
          as: "departmentDetails",
        },
      },
      {
        $unwind: "$departmentDetails", // Deconstruct the array field
      },
      {
        $lookup: {
          from: "colleges", // College collection
          localField: "departmentDetails.college",
          foreignField: "_id",
          as: "collegeDetails",
        },
      },
      {
        $unwind: "$collegeDetails", // Deconstruct the array field
      },
      {
        $group: {
          _id: "$collegeDetails._id", // Group by college
          collegeName: { $first: "$collegeDetails.name" },
          totalAttendance: { $sum: 1 }, // Count total attendance records
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          averageAttendance: {
            $avg: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
        },
      },
      {
        $sort: { averageAttendance: -1 }, // Sort by average attendance (descending)
      },
    ]);

    // Step 2: Render the analysis page
    res.render("admin/college-analysis", {
      attendanceByCollege,
      layout: adminLayout,
    });
  } catch (error) {
    console.error("Error analyzing attendance by college:", error);
    res.status(500).send("Server Error");
  }
});

router.get("/reports-analytics/department", isAdmin, async (req, res) => {
  try {
    // Step 1: Aggregate attendance data based on department
    const attendanceByDepartment = await Attendance.aggregate([
      {
        $lookup: {
          from: "users", // Join with User collection
          localField: "student", // Field from Attendance to join on
          foreignField: "_id", // Field from User to join on
          as: "studentDetails", // Name of the output array field
        },
      },
      {
        $unwind: "$studentDetails", // Deconstruct the array field
      },
      {
        $lookup: {
          from: "courses", // Join with Course collection
          localField: "studentDetails.course",
          foreignField: "_id",
          as: "courseDetails",
        },
      },
      {
        $unwind: "$courseDetails", // Deconstruct the array field
      },
      {
        $lookup: {
          from: "departments", // Join with Department collection
          localField: "courseDetails.department",
          foreignField: "_id",
          as: "departmentDetails",
        },
      },
      {
        $unwind: "$departmentDetails", // Deconstruct the array field
      },
      {
        $group: {
          _id: "$departmentDetails._id", // Group by department
          departmentName: { $first: "$departmentDetails.name" },
          totalAttendance: { $sum: 1 }, // Count total attendance records
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          averageAttendance: {
            $avg: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
        },
      },
      {
        $sort: { averageAttendance: -1 }, // Sort by average attendance (descending)
      },
    ]);

    // Step 2: Render the analysis page
    res.render("admin/department-analysis", {
      attendanceByDepartment,
      layout: adminLayout,
    });
  } catch (error) {
    console.error("Error analyzing attendance by department:", error);
    res.status(500).send("Server Error");
  }
});

router.get("/reports-analytics/course", isAdmin, async (req, res) => {
  try {
    // Step 1: Aggregate attendance data based on course
    const attendanceByCourse = await Attendance.aggregate([
      {
        $lookup: {
          from: "users", // Join with User collection
          localField: "student", // Field from Attendance to join on
          foreignField: "_id", // Field from User to join on
          as: "studentDetails", // Name of the output array field
        },
      },
      {
        $unwind: "$studentDetails", // Deconstruct the array field
      },
      {
        $lookup: {
          from: "courses", // Join with Course collection
          localField: "studentDetails.course",
          foreignField: "_id",
          as: "courseDetails",
        },
      },
      {
        $unwind: "$courseDetails", // Deconstruct the array field
      },
      {
        $group: {
          _id: "$courseDetails._id", // Group by course
          courseName: { $first: "$courseDetails.name" },
          totalAttendance: { $sum: 1 }, // Count total attendance records
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          averageAttendance: {
            $avg: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
        },
      },
      {
        $sort: { averageAttendance: -1 }, // Sort by average attendance (descending)
      },
    ]);

    // Step 2: Render the analysis page
    res.render("admin/course-analysis", {
      attendanceByCourse,
      layout: adminLayout,
    });
  } catch (error) {
    console.error("Error analyzing attendance by course:", error);
    res.status(500).send("Server Error");
  }
});

router.get("/reports-analytics/subject", isAdmin, async (req, res) => {
  try {
    // Step 1: Aggregate attendance data based on subject
    const attendanceBySubject = await Attendance.aggregate([
      {
        $lookup: {
          from: "subjects", // Join with Subject collection
          localField: "subject", // Field from Attendance to join on
          foreignField: "_id", // Field from Subject to join on
          as: "subjectDetails", // Name of the output array field
        },
      },
      {
        $unwind: "$subjectDetails", // Deconstruct the array field
      },
      {
        $group: {
          _id: "$subjectDetails._id", // Group by subject
          subjectName: { $first: "$subjectDetails.name" },
          totalAttendance: { $sum: 1 }, // Count total attendance records
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          averageAttendance: {
            $avg: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
        },
      },
      {
        $sort: { averageAttendance: -1 }, // Sort by average attendance (descending)
      },
    ]);

    // Step 2: Render the analysis page
    res.render("admin/subject-analysis", {
      attendanceBySubject,
      layout: adminLayout,
    });
  } catch (error) {
    console.error("Error analyzing attendance by subject:", error);
    res.status(500).send("Server Error");
  }
});

router.get("/reports-analytics/student", isAdmin, async (req, res) => {
  // Logic to analyze attendance based on individual student
});

// GET route to display the college management page
router.get("/college-management", isAdmin, async (req, res) => {
  try {
    // Fetch all colleges
    const colleges = await College.find();

    // For each college, fetch the associated departments, courses, and subjects
    const data = await Promise.all(
      colleges.map(async (college) => {
        const departments = await Department.find({ college: college._id });

        const departmentData = await Promise.all(
          departments.map(async (department) => {
            const courses = await Course.find({ department: department._id });

            const courseData = await Promise.all(
              courses.map(async (course) => {
                const subjects = await Subject.find({ course: course._id });
                return { ...course.toObject(), subjects };
              })
            );

            return { ...department.toObject(), courses: courseData };
          })
        );

        return { ...college.toObject(), departments: departmentData };
      })
    );

    res.render("admin/college-management", { colleges: data });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    res.status(500).json({ message: "Error fetching colleges." });
  }
});

// POST route to add a new college
router.post("/college", isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const newCollege = new College({ name });
    await newCollege.save();
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error adding college:", error);
    res.status(500).json({ message: "Error adding college." });
  }
});

// PUT route to edit a college
router.put("/college/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await College.findByIdAndUpdate(id, { name });
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error editing college:", error);
    res.status(500).json({ message: "Error editing college." });
  }
});

// DELETE route to delete a college
router.delete("/college/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await College.findByIdAndDelete(id);
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error deleting college:", error);
    res.status(500).json({ message: "Error deleting college." });
  }
});

// POST route to add a new department
router.post("/college/:collegeId/department", isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const { collegeId } = req.params;
    const newDepartment = new Department({ name, college: collegeId });
    await newDepartment.save();
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error adding department:", error);
    res.status(500).json({ message: "Error adding department." });
  }
});

// PUT route to edit a department
router.put("/department/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await Department.findByIdAndUpdate(id, { name });
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error editing department:", error);
    res.status(500).json({ message: "Error editing department." });
  }
});

// DELETE route to delete a department
router.delete("/department/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Department.findByIdAndDelete(id);
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ message: "Error deleting department." });
  }
});

// POST route to add a new course
router.post("/department/:departmentId/course", isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const { departmentId } = req.params;
    const newCourse = new Course({ name, department: departmentId });
    await newCourse.save();
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error adding course:", error);
    res.status(500).json({ message: "Error adding course." });
  }
});

// PUT route to edit a course
router.put("/course/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await Course.findByIdAndUpdate(id, { name });
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error editing course:", error);
    res.status(500).json({ message: "Error editing course." });
  }
});

// DELETE route to delete a course
router.delete("/course/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Course.findByIdAndDelete(id);
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: "Error deleting course." });
  }
});

// POST route to add a new subject
router.post("/course/:courseId/subject", isAdmin, async (req, res) => {
  try {
    const { name, code } = req.body;
    const { courseId } = req.params;
    const newSubject = new Subject({ name, code, course: courseId });
    await newSubject.save();
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error adding subject:", error);
    res.status(500).json({ message: "Error adding subject." });
  }
});

// PUT route to edit a subject
router.put("/subject/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    await Subject.findByIdAndUpdate(id, { name, code });
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error editing subject:", error);
    res.status(500).json({ message: "Error editing subject." });
  }
});

// DELETE route to delete a subject
router.delete("/subject/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Subject.findByIdAndDelete(id);
    res.redirect("/admin/college-management");
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ message: "Error deleting subject." });
  }
});

router.get('/settings', isAdmin, (req, res) => {
  res.render('admin/settings', {
      appName: 'Attendance Management System',
      appEmail: 'support@example.com',
      appTimezone: 'UTC',
      passwordPolicy: 'strong',
      sessionTimeout: 30,
      serverStatus: 'Online',
      appVersion: '1.0.0',
      nodeVersion: process.version,
      memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      uptime: (process.uptime() / 3600).toFixed(2),
      layout: adminLayout
  });
});

router.post('/settings/application', isAdmin, (req, res) => {
  // Save application settings here
  res.redirect('/admin/settings');
});

router.post('/settings/security', isAdmin, (req, res) => {
  // Save security settings here
  res.redirect('/admin/settings');
});

// GET route to fetch all venues (for displaying in the management interface)
router.get('/venues', async (req, res) => {
  try {
      const venues = await Venue.find();
      res.render('venue-management', { venues }); // Pass venues to the EJS template
  } catch (error) {
      console.error('Error fetching venues:', error);
      res.status(500).json({ message: 'Error fetching venues.' });
  }
});

// POST route to add a new venue
router.post('/venue', async (req, res) => {
  try {
      const { name, capacity } = req.body;
      const newVenue = new Venue({ name, capacity });
      await newVenue.save();
      res.redirect('/admin/venues');
  } catch (error) {
      console.error('Error adding venue:', error);
      res.status(500).json({ message: 'Error adding venue.' });
  }
});

// PUT route to edit an existing venue
router.put('/venue/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const { name, capacity, isBooked, bookingExpiry } = req.body;

      const venue = await Venue.findById(id);
      if (!venue) {
          return res.status(404).json({ message: 'Venue not found.' });
      }

      venue.name = name;
      venue.capacity = capacity;
      venue.isBooked = isBooked;
      venue.bookingExpiry = bookingExpiry ? new Date(bookingExpiry) : null;

      await venue.save();
      res.redirect('/venues');
  } catch (error) {
      console.error('Error updating venue:', error);
      res.status(500).json({ message: 'Error updating venue.' });
  }
});

// DELETE route to remove an existing venue
router.delete('/venue/:id', async (req, res) => {
  try {
      const { id } = req.params;
      await Venue.findByIdAndDelete(id);
      res.redirect('/admin/venues');
  } catch (error) {
      console.error('Error deleting venue:', error);
      res.status(500).json({ message: 'Error deleting venue.' });
  }
});

router.get("/reports", isAdmin, (req, res) => {
  res.render("reports", {});
});

router.get("/change-password", isAdmin, (req, res) => {
  res.render("change-password", {});
});

router.get("/faqs", isAdmin, (req, res) => {
  res.render("admin/faqs", {});
});

router.get('/logout', (req, res) => {
  const role = req.session.user ? req.session.user.role : null;

  req.session.destroy((err) => {
      if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).send('Failed to log out.');
      }

      res.redirect('/admin')
  });
});



module.exports = router;
