const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("teacher", {  });
});

router.get("/attendance-analytics", (req, res) => {
  res.render("attendance-analytics", {  });
});

router.get("/verify-permission", (req, res) => {
  res.render("permission-verification", {  });
});

router.get("/book-venue", (req, res) => {
  res.render("book-venue", {  });
});

router.get('/change-password', (req, res) =>{
    res.render('change-password', {  });
});

module.exports = router;
