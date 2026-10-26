import mongoose from 'mongoose';

const { Schema } = mongoose;

const PersonalWeeklyTaskSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    weeklyActivityId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyActivity',
      default: null,
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Task title is required'],
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Task note cannot exceed 500 characters'],
    },
    weekStart: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: Date,
    source: {
      type: String,
      enum: ['activity', 'custom'],
      default: 'custom',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PersonalWeeklyTaskSchema.index({ userId: 1, weekStart: 1, completed: 1 });
PersonalWeeklyTaskSchema.index(
  { userId: 1, weeklyActivityId: 1 },
  {
    unique: true,
    partialFilterExpression: { weeklyActivityId: { $type: 'objectId' } },
  }
);

PersonalWeeklyTaskSchema.pre('save', function (next) {
  if (this.completed && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (!this.completed && this.completedAt) {
    this.completedAt = undefined;
  }
  next();
});

const PersonalWeeklyTask = mongoose.model(
  'PersonalWeeklyTask',
  PersonalWeeklyTaskSchema
);

export default PersonalWeeklyTask;
