const express = require('express')
const bodyParser = require('body-parser')
require('dotenv').config()

const authRoutes = require('./routes/auth-routes');
const usersRoutes = require('./routes/users-routes');
const projectsRoutes = require('./routes/projects-routes');
const favoritesRoutes = require('./routes/favorites-routes');
const HttpError = require('./models/http-error')

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://codify.henchoz.org/');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/favorites', favoritesRoutes)

app.use(() => {
  throw new HttpError('Could not find this route.', 404);
});

app.use((err, req, res, next) => {
  res.status(err.code || 500).json({ message: err.message || 'An unknown error occured' });
});

app.listen(process.env.SERVER_PORT, () => {
  console.log(`Server running : http://localhost:${process.env.SERVER_PORT}/`)
});