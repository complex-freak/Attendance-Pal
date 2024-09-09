const jwt = require("jsonwebtoken");
const User = require("../models/User");
const jwtSecret = process.env.JWT_SECRET;

const isAdmin = async function (req, res, next) {
  if (req.session.token) {
    try {
      const decoded = jwt.verify(req.session.token, jwtSecret);
      req.user = decoded;
      if (req.user.role === "admin") {
        const user = await User.findById( req.user.userId);
        res.locals.user = user;
        next();
      } else {
        res.render("auth");
      }
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        req.session.destroy(() => {
          res.render("auth");
        });
      } else {
        req.session.destroy(() => {
          res.render("auth");
        });
      }
    }
  } else {
    res.render("auth");
  }
};

const isTeacher = async function (req, res, next) {
  if (req.session.token) {
    try {
      const decoded = jwt.verify(req.session.token, jwtSecret);
      req.user = decoded;
      if (req.user.role === "teacher") {
        const user = await User.findById( req.user.userId)
        res.locals.user = user;
        next();
      } else {
        res.render("auth");
      }
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        req.session.destroy(() => {
          res.render("auth");
        });
      } else {
        req.session.destroy(() => {
          res.render("auth");
        });
      }
    }
  } else {
    res.render("auth");
  }
};

const isStudent = async function (req, res, next) {
  if (req.session.token) {
    try {
      const decoded = jwt.verify(req.session.token, jwtSecret);
      req.user = decoded;
      if (req.user.role === "student") {
        const user = await User.findById( req.user.userId)
        res.locals.user = user;
        next();
      } else {
        res.render("auth");
      }
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        req.session.destroy(() => {
          res.render("auth");
        });
      } else {
        req.session.destroy(() => {
          res.render("auth");
        });
      }
    }
  } else {
    res.render("auth");
  }
};

module.exports = { isAdmin, isTeacher, isStudent };
