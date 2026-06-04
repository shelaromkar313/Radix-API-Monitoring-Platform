import mongoose, { Document, Schema } from 'mongoose';

export interface Project extends Document {
  user_id: mongoose.Types.ObjectId;
  repository_url: string;
  status: string;
  
  created_at: Date;
}

const ProjectSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  repository_url: { type: String, required: true },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const ProjectModel = mongoose.model<Project>('Project', ProjectSchema);

export const createProject = async (userId: string, repositoryUrl: string): Promise<Project> => {
  const project = new ProjectModel({ user_id: userId, repository_url: repositoryUrl });
  return await project.save();
};

export const getProjectsByUser = async (userId: string): Promise<Project[]> => {
  return await ProjectModel.find({ user_id: userId }).sort({ created_at: -1 });
};

export const getProjectById = async (id: string, userId: string): Promise<Project | null> => {
  return await ProjectModel.findOne({ _id: id, user_id: userId });
};

export const updateProjectStatus = async (id: string, status: string): Promise<void> => {
  await ProjectModel.updateOne({ _id: id }, { status });
};

export default ProjectModel;
