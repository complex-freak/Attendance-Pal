const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true }, // Student registration number or teacher/admin username
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher", "admin"], required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // For students
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" }, // For teachers
  level: { type: String }, // For students only
});

module.exports = mongoose.model("User", userSchema);
