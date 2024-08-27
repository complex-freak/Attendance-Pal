const express = require('express')
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('student/index', { title: 'Express' });
});

router.get('/attendance', (req, res) =>{
  res.render('student/attendance', { title: 'Attendance' });
});

router.get('/permission', (req, res) =>{
  res.render('student/permission', { title: 'Ask Permission' });
});

router.get('/change-password', (req, res) =>{
  res.render('change-password', {  });
});


module.exports = router;
