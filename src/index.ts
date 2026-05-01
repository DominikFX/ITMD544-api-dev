import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/init';
import restRouter from './routes/rest';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { createLoaders } from './graphql/loaders';

dotenv.config();

async function startServer() {
  const app = express();

  try {
    await initializeDatabase();
  } catch (err) {
    console.error('Failed to start server due to database connection error:', err);
    process.exit(1);
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(cors());
  app.use(express.json());

  app.use('/', restRouter);

  const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({
      loaders: createLoaders()
    })
  }));

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}/graphql`);
  });
}

startServer();
