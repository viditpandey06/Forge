const { Schema, model } = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const JobSchema = new Schema(
  {
    _id: { type: String, default: uuidv4 },
    type: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    priority: { type: String, enum: ['HIGH', 'DEFAULT'], default: 'DEFAULT' },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DLQ'],
      default: 'PENDING',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    max_attempts: { type: Number, default: 3 },
    run_at: { type: Date, default: Date.now },
    claimed_at: { type: Date },
    completed_at: { type: Date },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
    error_stack: { type: String },
    execution_ms: { type: Number },
    idempotency_key: { type: String, index: true, sparse: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// Indexes
JobSchema.index({ status: 1, claimed_at: 1 });
JobSchema.index({ created_at: -1 });
JobSchema.index({ type: 1, status: 1, created_at: -1 });

const JobModel = model('Job', JobSchema);
module.exports = { JobModel };
