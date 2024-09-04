// Function to get top performer
const getTopPerformer = async function (filter) {
  const result = await Attendance.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$student",
        avgAttendance: { $avg: "$attendancePercentage" },
      },
    },
    { $sort: { avgAttendance: -1 } },
    { $limit: 1 },
  ]);
  return result.length
    ? await User.findById(result[0]._id).select("name")
    : "N/A";
};

// Function to get lowest performer
const getLowestPerformer = async function (filter) {
  const result = await Attendance.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$student",
        avgAttendance: { $avg: "$attendancePercentage" },
      },
    },
    { $sort: { avgAttendance: 1 } },
    { $limit: 1 },
  ]);
  return result.length
    ? await User.findById(result[0]._id).select("name")
    : "N/A";
};

module.exports = { getTopPerformer, getLowestPerformer };
