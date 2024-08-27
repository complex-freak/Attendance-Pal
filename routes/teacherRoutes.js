const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("teacher/index", {  });
});

router.get("/attendance-analytics", (req, res) => {
  res.render("teacher/attendance-analytics", {  });
});

router.get("/verify-permission", (req, res) => {
  res.render("teacher/permission-verification", {  });
});

router.get("/book-venue", (req, res) => {
  res.render("teacher/book-venue", {  });
});

router.get('/change-password', (req, res) =>{
    res.render('teacher/change-password', {  });
});

module.exports = router;
