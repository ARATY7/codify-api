const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require('../db/db');

const email = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty() || !req.body.email) {
    handleErrors(errors, next);
    return;
  }
  const existingUser = await checkUserExistence(req.body.email);
  res.json({ emailExists: !!existingUser });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty() || !req.body.name || !req.body.email || !req.body.password) {
    handleErrors(errors, next);
    return;
  }
  const { name, email, password } = req.body;
  const existingUser = await checkUserExistence(email);
  if (existingUser) {
    return next(new HttpError('User already exists. Please log in with your credentials.', 422));
  }
  const hashedPassword = await hashPassword(password);
  const newUser = await createUser(email, name, hashedPassword);
  const token = generateToken(newUser.insertId, email);
  res.json({
    userId: newUser.insertId,
    userName: name,
    userEmail: email,
    token
  });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty() || !req.body.email || !req.body.password) {
    handleErrors(errors, next);
    return;
  }
  const { email, password } = req.body;
  const existingUser = await checkUserExistence(email);
  if (!existingUser) {
    return next(new HttpError('User not found. Please check your email or sign up if you don\'t have an account.', 401));
  }
  const isValid = await validatePassword(password, existingUser.password);
  if (!isValid) {
    return next(new HttpError('Incorrect email or password. Please verify your login credentials and try again.', 401));
  }
  const token = generateToken(existingUser.id, email);
  res.json({
    userId: existingUser.id,
    userName: existingUser.name,
    userEmail: existingUser.email,
    token
  });
};

const handleErrors = (errors, next) => {
  if (!errors.isEmpty()) {
    const errorMessage = errors.array().map(error => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
};

const executeQuery = async (query, values) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(query, values);
    return results;
  } catch (error) {
    console.error('Error executing the MySQL query:', error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const checkUserExistence = async (email) => {
  const query = 'SELECT * FROM users WHERE email = ?;';
  const results = await executeQuery(query, [email]);
  return results.length > 0 ? results[0] : null;
};

const createUser = async (email, name, hashedPassword) => {
  const query = 'INSERT INTO users (email, name, password) VALUES (?, ?, ?);';
  return await executeQuery(query, [email, name, hashedPassword]);
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const validatePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

exports.email = email;
exports.signup = signup;
exports.login = login;