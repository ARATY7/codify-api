const HttpError = require("../models/http-error");
const pool = require("../db/db");
const { validationResult } = require("express-validator");
const md5 = require('md5')

const getProjects = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const query = `
        SELECT projects.id          AS projectId,
               projects.name        AS projectName,
               projects.description AS projectDescription,
               projects.updatedAt   AS projectUpdatedAt,
               users.name           AS creator,
               users.id             AS creatorId,
               users.email          AS creatorEmail,
               technologies.name    AS technologyName
        FROM projects
                 JOIN users ON projects.fk_user = users.id
                 LEFT JOIN projects_technologies ON projects.id = projects_technologies.project_id
                 LEFT JOIN technologies ON projects_technologies.technology_id = technologies.id
    `;
    const [results] = await connection.execute(query);
    const projects = [];
    results.forEach((result) => {
      const existingProject = projects.find((project) => project.projectId === result.projectId);
      if ( existingProject ) {
        existingProject.technologies.push(result.technologyName);
      } else {
        projects.push({
          projectId: result.projectId,
          projectName: result.projectName,
          projectDescription: result.projectDescription,
          projectUpdatedAt: result.projectUpdatedAt,
          creator: result.creator,
          creatorId: result.creatorId,
          creatorEmail: md5(result.creatorEmail),
          technologies: [result.technologyName],
        });
      }
    });
    res.status(200).json(projects);
  } catch ( error ) {
    console.error(error);
    next(new HttpError('Error'));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

const getProjectsByUserId = async (req, res, next) => {
  const userId = +req.params.uid;
  if ( !userId || isNaN(userId) ) {
    return next(new HttpError('Invalid project ID', 400));
  }
  let connection;
  try {
    connection = await pool.getConnection();
    const query = `
        SELECT projects.id          AS projectId,
               projects.name        AS projectName,
               projects.description AS projectDescription,
               projects.createdAt   AS projectCreatedAt,
               projects.updatedAt   AS projectUpdatedAt,
               technologies.name    AS technologyName
        FROM projects
                 JOIN users ON projects.fk_user = users.id
                 LEFT JOIN projects_technologies ON projects.id = projects_technologies.project_id
                 LEFT JOIN technologies ON projects_technologies.technology_id = technologies.id
        WHERE users.id = ?;
    `;
    const [results] = await connection.execute(query, [userId]);
    const projects = [];
    results.forEach((result) => {
      const existingProject = projects.find((project) => project.projectId === result.projectId);
      if ( existingProject ) {
        existingProject.technologies.push(result.technologyName);
      } else {
        projects.push({
          projectId: result.projectId,
          projectName: result.projectName,
          projectDescription: result.projectDescription,
          projectCreatedAt: result.projectCreatedAt,
          projectUpdatedAt: result.projectUpdatedAt,
          creator: result.creator,
          creatorId: result.creatorId,
          technologies: [result.technologyName],
        });
      }
    });
    res.status(200).json(projects);
  } catch ( error ) {
    console.error(error);
    next(new HttpError('Error'));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

const getTechnologies = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute('SELECT id, name FROM technologies;');
    if ( results.length > 0 ) {
      res.json(results)
    }
  } catch ( error ) {
    return next(new HttpError('Cannot retrieve all technologies', 500));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
}

const addProject = async (req, res, next) => {
  const errors = validationResult(req);
  if ( !errors.isEmpty() ) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId, projectName, projectDesc, technologies } = req.body;
  if ( userId !== req.userData.userId ) {
    return next(new HttpError("You're not allowed to add a project", 401));
  }
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const [projectResult] = await connection.execute(
      'INSERT INTO projects (name, description, fk_user) VALUES (?, ?, ?)',
      [projectName, projectDesc, userId]
    );
    const projectId = projectResult.insertId;
    if ( technologies && technologies.length > 0 ) {
      for ( const techId of technologies ) {
        await connection.execute(
          'INSERT INTO projects_technologies (project_id, technology_id) VALUES (?, ?)',
          [projectId, techId]
        );
      }
    }
    await connection.commit();
    res.status(201).json({ projectAdded: true });
  } catch ( error ) {
    await connection.rollback();
    next(new HttpError('Could not add the project', 500));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

const deleteProject = async (req, res, next) => {
  const errors = validationResult(req);
  if ( !errors.isEmpty() ) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId } = req.body;
  if ( userId !== req.userData.userId ) {
    return next(new HttpError("You're not allowed to delete this project.", 401));
  }
  const projectId = +req.params.pid;
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    await connection.execute('DELETE FROM projects_technologies WHERE project_id = ?', [projectId]);
    await connection.execute('DELETE FROM projects WHERE id = ?', [projectId]);
    await connection.commit();
    res.status(200).json({ projectDeleted: true });
  } catch ( error ) {
    await connection.rollback();
    next(new HttpError('Could not delete project.', 500));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

const getProjectById = async (req, res, next) => {
  const projectIdUrl = +req.params.pid;
  if ( !projectIdUrl || isNaN(projectIdUrl) ) {
    return next(new HttpError('Invalid project ID', 400));
  }
  let connection;
  try {
    connection = await pool.getConnection();
    const query = `
        SELECT projects.name        AS projectName,
               projects.description AS projectDescription,
               users.id             AS creatorId,
               technologies.id      AS technologyId,
               technologies.name    AS technologyName
        FROM projects
                 JOIN users ON projects.fk_user = users.id
                 LEFT JOIN projects_technologies ON projects.id = projects_technologies.project_id
                 LEFT JOIN technologies ON projects_technologies.technology_id = technologies.id
        WHERE projects.id = ?
    `;
    const [results] = await connection.execute(query, [projectIdUrl]);
    if ( results.length === 0 ) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const project = {
      projectName: results[0].projectName,
      projectDescription: results[0].projectDescription,
      creatorId: results[0].creatorId,
      technologies: results.map((result) => ({
        id: result.technologyId,
        name: result.technologyName,
      })),
    };
    res.status(200).json(project);
  } catch ( error ) {
    console.error(error);
    next(new HttpError('Error'));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

const editProject = async (req, res, next) => {
  const projectId = +req.params.pid;
  if (!projectId || isNaN(projectId)) {
    return next(new HttpError('Invalid project ID', 400));
  }
  const errors = validationResult(req);
  if ( !errors.isEmpty() ) {
    const errorMessage = errors.array().map((error) => error.msg).join(' ');
    return next(new HttpError(errorMessage, 422));
  }
  const { userId, projectName, projectDesc, technologies } = req.body;
  const creatorId = await getProjectCreatorId(projectId);
  if ( userId !== req.userData.userId || userId !== creatorId ) {
    return next(new HttpError("You're not allowed to edit this project", 401));
  }
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    await connection.execute(
      'UPDATE projects SET name = ?, description = ?, updatedAt = DEFAULT WHERE id = ? AND fk_user = ?',
      [projectName, projectDesc, projectId, userId]
    );
    await connection.execute('DELETE FROM projects_technologies WHERE project_id = ?', [projectId]);
    if ( technologies && technologies.length > 0 ) {
      for ( const techId of technologies ) {
        await connection.execute(
          'INSERT INTO projects_technologies (project_id, technology_id) VALUES (?, ?)',
          [projectId, techId]
        );
      }
    }
    await connection.commit();
    res.status(200).json({ projectEdited: true });
  } catch ( error ) {
    await connection.rollback();
    next(new HttpError('Could not edit the project', 500));
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

const getProjectCreatorId = async (projectId) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT fk_user FROM projects WHERE id = ?',
      [projectId]
    );

    if ( rows.length === 0 ) {
      throw new HttpError('Project not found', 404);
    }

    return rows[0].fk_user;
  } catch ( error ) {
    throw error;
  } finally {
    if ( connection ) {
      connection.release();
    }
  }
};

exports.getProjects = getProjects;
exports.getProjectsByUserId = getProjectsByUserId;
exports.getTechnologies = getTechnologies;
exports.addProject = addProject;
exports.deleteProject = deleteProject;
exports.getProjectById = getProjectById;
exports.editProject = editProject;