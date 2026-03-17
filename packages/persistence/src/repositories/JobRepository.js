const { JobModel } = require('../models/Job.model');

class JobRepository {
  async create(data) {
    const job = new JobModel(data);
    await job.save();
    return job.toObject();
  }

  async findById(id) {
    return JobModel.findById(id).lean();
  }

  async updateStatus(id, status, extra = {}) {
    return JobModel.findByIdAndUpdate(
      id,
      { $set: { status, ...extra } },
      { new: true }
    ).lean();
  }

  async claimJob(id) {
    return JobModel.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      { $set: { status: 'PROCESSING', claimed_at: new Date() } },
      { new: true }
    ).lean();
  }

  async incrementAttempts(id, error, errorStack) {
    return JobModel.findByIdAndUpdate(
      id,
      {
        $inc: { attempts: 1 },
        $set: { error, error_stack: errorStack },
      },
      { new: true }
    ).lean();
  }

  async listJobs(filter = {}) {
    const query = {};
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.priority) query.priority = filter.priority;
    if (filter.from || filter.to) {
      query.created_at = {};
      if (filter.from) query.created_at.$gte = filter.from;
      if (filter.to) query.created_at.$lte = filter.to;
    }

    const limit = filter.limit ?? 50;
    const skip = filter.skip ?? 0;

    const [jobs, total] = await Promise.all([
      JobModel.find(query).sort({ created_at: -1 }).limit(limit).skip(skip).lean(),
      JobModel.countDocuments(query),
    ]);
    return { jobs, total };
  }

  async findOrphans(olderThanMs) {
    const cutoff = new Date(Date.now() - olderThanMs);
    return JobModel.find({ status: 'PROCESSING', claimed_at: { $lt: cutoff } }).lean();
  }

  async findByIdempotencyKey(key) {
    return JobModel.findOne({ idempotency_key: key }).lean();
  }

  async cancelJob(id) {
    return JobModel.findOneAndDelete({ _id: id, status: 'PENDING' }).lean();
  }
}

module.exports = { JobRepository };
