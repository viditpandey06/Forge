const mongoose = require('mongoose');
const { JobModel } = require('./models/Job.model');
const { JobRepository } = require('./repositories/JobRepository');

let connected = false;

async function connectMongo(uri) {
  if (connected) return;
  await mongoose.connect(uri);
  connected = true;
  console.log('[Mongo] Connected');
}

async function disconnectMongo() {
  await mongoose.disconnect();
  connected = false;
}

module.exports = { connectMongo, disconnectMongo, JobModel, JobRepository };
