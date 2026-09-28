const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to a new in-memory MongoDB instance before all tests.
 * Tests NEVER touch the real Atlas cluster.
 */
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Set JWT_SECRET for test environment so tokens work
  process.env.JWT_SECRET = 'test_jwt_secret_for_integration_tests';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(uri);
});

/**
 * Clear all collections between test files to prevent cross-contamination.
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

/**
 * Disconnect mongoose and stop the in-memory server after all tests.
 */
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
