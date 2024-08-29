const express = require('express')
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('auth', {  });
});

router.get('/analytics', (req, res) =>{
  res.render('analytics', {  });
});

router.get('/reports', (req, res) =>{
  res.render('reports', {  });
});

router.get('/change-password', (req, res) =>{
    res.render('change-password', {  });
});

module.exports = router;