const HttpError = require("../models/http-error");
const pool = require("../db/db");
const md5 = require('md5');
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");

const getUsersName = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT id, name FROM users;');
    if ( results.length > 0 ) {
      res.json(results)
    }
  } catch ( error ) {
    return next(new HttpError('Cannot retrieve all users', 500));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
}

const getUserInfos = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if (!userIdUrl || isNaN(userIdUrl)) {
    return next(new HttpError('Invalid user ID', 400));
  }
  let connection;
  try {
    connection = await pool.getConnection();
    const [userResults] = await connection.execute(
      'SELECT u.name, u.createdAt, u.email, COUNT(p.id) AS projectsCount ' +
      'FROM users u ' +
      'LEFT JOIN projects p ON u.id = p.fk_user ' +
      'WHERE u.id = ? ' +
      'GROUP BY u.id;',
      [userIdUrl]
    );
    if ( userResults.length > 0 ) {
      res.json({
        userName: userResults[0].name,
        userEmail: md5(userResults[0].email),
        creationDate: userResults[0].createdAt,
        projectsCount: userResults[0].projectsCount
      });
    } else {
      return next(new HttpError("Couldn't retrieve information on the user", 500));
    }
  } catch ( error ) {
    return next(new HttpError("Couldn't retrieve information on the user", 500));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

const deleteUser = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if (!userIdUrl || isNaN(userIdUrl)) {
    return next(new HttpError('Invalid user ID', 400));
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessage = errors.array().map(error => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId } = req.body;
  if (userIdUrl !== req.userData.userId || userId !== req.userData.userId) {
    return next(new HttpError("You're not allowed to delete this user", 401));
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query('DELETE FROM users_favorites WHERE user_id = ? OR favUser_id = ?', [userId, userId]);
    const [projects] = await connection.query('SELECT id FROM projects WHERE fk_user = ?', [userId]);
    for (const project of projects) {
      await connection.query('DELETE FROM projects_technologies WHERE project_id = ?', [project.id]);
    }
    await connection.query('DELETE FROM projects WHERE fk_user = ?', [userId]);
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    await connection.commit();
    res.status(200).json({ userDeleted: true });
  } catch (error) {
    await connection.rollback();
    return next(new HttpError('Error deleting user and associated data', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


const editUser = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if (!userIdUrl || isNaN(userIdUrl)) {
    return next(new HttpError('Invalid user ID', 400));
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId, name, email, currentPassword, newPassword } = req.body;
  if (userIdUrl !== req.userData.userId || userId !== req.userData.userId) {
    return next(new HttpError('You\'re not allowed to update this user', 401));
  }
  const connection = await pool.getConnection();
  try {
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?;',
      [email, userId]
    );
    if (existingUser.length > 0) {
      return next(new HttpError('Email already in use by another user', 422));
    }
    if (currentPassword === undefined || newPassword === undefined) {
      await connection.execute(
        'UPDATE users SET name = ?, email = ?, updatedAt = DEFAULT WHERE id = ?;',
        [name, email, userId]
      );
    } else {
      const [user] = await connection.execute(
        'SELECT password FROM users WHERE id = ?;',
        [userId]
      );
      if (user.length === 0) {
        return next(new HttpError('User not found', 404));
      }
      const isPasswordValid = await bcrypt.compare(currentPassword, user[0].password);
      if (!isPasswordValid) {
        return next(new HttpError('Current password is incorrect', 401));
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await connection.execute(
        'UPDATE users SET name = ?, email = ?, password = ?, updatedAt = DEFAULT WHERE id = ?;',
        [name, email, hashedPassword, userId]
      );
    }
    res.status(200).json({ userUpdated: true });
  } catch (error) {
    return next(new HttpError('Could not edit this user', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.getUsersName = getUsersName;
exports.getUserInfos = getUserInfos;
exports.deleteUser = deleteUser;
exports.editUser = editUser;