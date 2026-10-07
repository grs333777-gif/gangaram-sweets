import { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function globalSetup() {
  // Start an in-memory MongoDB replica set (required for transactions)
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  await replSet.waitUntilRunning();

  const uri = replSet.getUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';

  // Store reference for teardown
  global.__MONGOD__ = replSet;
}
