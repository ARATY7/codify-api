const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const pool = require('../db/db');

const checkIfUserIsFav = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if (!userIdUrl || isNaN(userIdUrl)) {
    return next(new HttpError('Invalid user ID', 400));
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId } = req.body;
  if (userId !== req.userData.userId) {
    return next(new HttpError('You\'re not allowed to check if this user is in your favorites.', 401));
  }
  if (userIdUrl === userId) {
    return next(new HttpError('You cannot check if you are in your own favorites.', 401));
  }
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(
      'SELECT * FROM users_favorites WHERE user_id = ? AND favUser_id = ? AND NOT (user_id = ? AND favUser_id = ?)',
      [userId, userIdUrl, userIdUrl, userId]
    );
    if (result.length > 0) {
      res.json({ isFav: true });
    } else {
      res.json({ isFav: false });
    }
  } catch (error) {
    return next(new HttpError('Could not check if the user is in your favorites.', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const addUserFav = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if ( !userIdUrl || isNaN(userIdUrl) ) {
    return next(new HttpError('Invalid user ID', 400));
  }
  const errors = validationResult(req);
  if ( !errors.isEmpty() ) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId } = req.body;
  if ( userId !== req.userData.userId ) {
    return next(new HttpError("You're not allowed to add to favorites for this user.", 401));
  }
  if ( userId === userIdUrl ) {
    return next(new HttpError("You can't add yourself to favorites.", 422));
  }
  const connection = await pool.getConnection();
  try {
    const [userExists] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
    const [favUserExists] = await connection.execute('SELECT id FROM users WHERE id = ?', [userIdUrl]);
    if ( userExists.length === 0 || favUserExists.length === 0 ) {
      return next(new HttpError('One or both users do not exist.', 404));
    }
    const [existingRelationship] = await connection.execute(
      'SELECT * FROM users_favorites WHERE user_id = ? AND favUser_id = ?',
      [userId, userIdUrl]
    );
    if ( existingRelationship.length > 0 ) {
      return next(new HttpError('This relationship already exists.', 422));
    }
    await connection.execute('INSERT INTO users_favorites (user_id, favUser_id) VALUES (?, ?)', [userId, userIdUrl]);
    res.status(201).json({ userAdded: true });
  } catch ( error ) {
    next(new HttpError('Could not add this user to favorites', 500));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

const removeUserFav = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if ( !userIdUrl || isNaN(userIdUrl) ) {
    return next(new HttpError('Invalid user ID', 400));
  }
  const errors = validationResult(req);
  if ( !errors.isEmpty() ) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId } = req.body;
  if ( userId !== req.userData.userId ) {
    return next(new HttpError("You're not allowed to add to favorites for this user.", 401));
  }
  if ( userId === userIdUrl ) {
    return next(new HttpError("You can't remove yourself to favorites.", 422));
  }
  const connection = await pool.getConnection();
  try {
    const [userExists] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
    const [favUserExists] = await connection.execute('SELECT id FROM users WHERE id = ?', [userIdUrl]);
    if (userExists.length === 0 || favUserExists.length === 0) {
      return next(new HttpError('One or both users do not exist.', 404));
    }
    const [existingRelationship] = await connection.execute(
      'SELECT * FROM users_favorites WHERE user_id = ? AND favUser_id = ?',
      [userId, userIdUrl]
    );
    if (existingRelationship.length === 0) {
      return next(new HttpError('This relationship does not exist.', 404));
    }
    await connection.execute('DELETE FROM users_favorites WHERE user_id = ? AND favUser_id = ?', [userId, userIdUrl]);
    res.status(200).json({ userRemoved: true });
  } catch (error) {
    next(new HttpError('Could not remove this user from favorites', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const checkProjectsFav = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if (!userIdUrl || isNaN(userIdUrl)) {
    return next(new HttpError('Invalid user ID', 400));
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId } = req.body;
  if (userId !== req.userData.userId) {
    return next(new HttpError('You\'re not allowed to check the favorites projects of this user.', 401));
  }
  const connection = await pool.getConnection();
  try {
    const sql = `
      SELECT projects.id
      FROM projects
      INNER JOIN projects_favorites ON projects.id = projects_favorites.project_id
      WHERE projects_favorites.user_id = ?;
    `;

    const [projectsFavRows] = await connection.query(sql, [userId]);

    const projectsFav = projectsFavRows.map((project) => ({
      id: project.id
    }));

    res.status(200).json({
      projectsFav,
    });
  } catch (error) {
    return next(new HttpError('Could not get the favorite projects of this user.', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

const addProjectFav = async (req, res, next) => {
  const projectIdUrl = +req.params.pid;
  if ( !projectIdUrl || isNaN(projectIdUrl) ) {
    return next(new HttpError('Invalid project ID', 400));
  }
  const errors = validationResult(req);
  if ( !errors.isEmpty() ) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId } = req.body;
  if ( userId !== req.userData.userId ) {
    return next(new HttpError("You're not allowed to add this project to your favorites.", 401));
  }
  const connection = await pool.getConnection();
  try {
    const projectExistsQuery = 'SELECT id FROM projects WHERE id = ?';
    const [projectExistsRows] = await connection.execute(projectExistsQuery, [projectIdUrl]);
    if (projectExistsRows.length === 0) {
      return next(new HttpError('Project not found', 404));
    }
    const addProjectFavQuery = 'INSERT INTO projects_favorites (user_id, project_id) VALUES (?, ?)';
    await connection.execute(addProjectFavQuery, [userId, projectIdUrl]);
    res.status(201).json({ projectAdded: true });
  } catch (error) {
    next(new HttpError('Could not add this project to favorites', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

const removeProjectFav = async (req, res, next) => {
  const projectIdUrl = +req.params.pid;
  if ( !projectIdUrl || isNaN(projectIdUrl) ) {
    return next(new HttpError('Invalid project ID', 400));
  }
  const errors = validationResult(req);
  if ( !errors.isEmpty() ) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId } = req.body;
  if ( userId !== req.userData.userId ) {
    return next(new HttpError("You're not allowed to remove this project to your favorites.", 401));
  }
  const connection = await pool.getConnection();
  try {
    const projectExistsQuery = 'SELECT id FROM projects WHERE id = ?';
    const [projectExistsRows] = await connection.execute(projectExistsQuery, [projectIdUrl]);
    if (projectExistsRows.length === 0) {
      return next(new HttpError('Project not found', 404));
    }
    const existingRelationshipQuery = 'SELECT * FROM projects_favorites WHERE user_id = ? AND project_id = ?';
    const [existingRelationshipRows] = await connection.execute(existingRelationshipQuery, [userId, projectIdUrl]);
    if (existingRelationshipRows.length === 0) {
      return next(new HttpError('This project is not in your favorites.', 404));
    }
    const removeProjectFavQuery = 'DELETE FROM projects_favorites WHERE user_id = ? AND project_id = ?';
    await connection.execute(removeProjectFavQuery, [userId, projectIdUrl]);

    res.status(200).json({ projectRemoved: true });
  } catch (error) {
    next(new HttpError('Could not remove this user from favorites', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

const getUsersFavorites = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if (!userIdUrl || isNaN(userIdUrl)) {
    return next(new HttpError('Invalid user ID', 400));
  }
  const connection = await pool.getConnection();
  try {
    const query = `
      SELECT u.id, u.name
      FROM users u
      JOIN users_favorites uf ON u.id = uf.favUser_id
      WHERE uf.user_id = ?
    `;
    const [rows] = await connection.execute(query, [userIdUrl]);
    res.status(200).json(rows);
  } catch (error) {
    next(new HttpError('Could not retrieve the favorites users.', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
};


const getProjectsFavorites = async (req, res, next) => {
  const userIdUrl = +req.params.uid;
  if (!userIdUrl || isNaN(userIdUrl)) {
    return next(new HttpError('Invalid user ID', 400));
  }
  const connection = await pool.getConnection();
  try {
    const query = `
      SELECT 
        projects.id AS project_id,
        projects.name AS project_name,
        projects.description AS project_description,
        projects.updatedAt AS project_updatedAt,
        projects.fk_user AS creator_id,
        technologies.id AS technology_id,
        technologies.name AS technology_name
      FROM projects_favorites
      JOIN projects ON projects_favorites.project_id = projects.id
      LEFT JOIN projects_technologies ON projects.id = projects_technologies.project_id
      LEFT JOIN technologies ON projects_technologies.technology_id = technologies.id
      WHERE projects_favorites.user_id = ?
    `;

    const [results] = await connection.execute(query, [userIdUrl]);
    const projects = results.reduce((acc, row) => {
      const existingProject = acc.find((p) => p.id === row.project_id);
      if (existingProject) {
        if (row.technology_id) {
          existingProject.technologies.push({
            id: row.technology_id,
            name: row.technology_name,
          });
        }
      } else {
        acc.push({
          id: row.project_id,
          name: row.project_name,
          description: row.project_description,
          updatedAt: row.project_updatedAt,
          creatorId: row.creator_id,
          technologies: row.technology_id
            ? [{ id: row.technology_id, name: row.technology_name }]
            : [],
        });
      }
      return acc;
    }, []);
    res.status(200).json(projects);
  } catch (error) {
    console.error(error);
    next(new HttpError('Could not retrieve the favorite projects.', 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
};



exports.checkIfUserIsFav = checkIfUserIsFav;
exports.addUserFav = addUserFav;
exports.removeUserFav = removeUserFav;
exports.checkProjectsFav = checkProjectsFav;
exports.addProjectFav = addProjectFav;
exports.removeProjectFav = removeProjectFav;
exports.getUsersFavorites = getUsersFavorites;
exports.getProjectsFavorites = getProjectsFavorites;