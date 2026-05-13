const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
const { authRoutes } = require('./routes/auth.routes');
const { metaRoutes } = require('./routes/meta.routes');
const { knowledgeRoutes } = require('./routes/knowledge.routes');
const { chatRoutes } = require('./routes/chat.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(morgan(env.isProduction ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true
  })
);
app.use(
  express.json({
    limit: '2mb'
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);

const clientBuildPath = path.resolve(__dirname, '..', 'client', 'dist');

if (env.isProduction) {
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
