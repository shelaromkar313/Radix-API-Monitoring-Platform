import mongoose, { Document, Schema } from 'mongoose';

export interface User extends Document {
  name: string;
  email: string;
  password?: string;
  google_id?: string;
  created_at: Date;
}


const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  google_id: { type: String },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const UserModel = mongoose.model<User>('User', UserSchema);

export const createUser = async (name: string, email: string, password?: string, google_id?: string): Promise<User> => {
  const user = new UserModel({ name, email, password, google_id });
  return await user.save();
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  return await UserModel.findOne({ email });
};

export const getUserById = async (id: string): Promise<User | null> => {
  return await UserModel.findById(id);
};

export default UserModel;
