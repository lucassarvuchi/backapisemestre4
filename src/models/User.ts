import mongoose, { HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 6, select: false },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function(password: string) {
  return bcrypt.compare(password, this.password);
};

export type UserDocument = HydratedDocument<IUser> & { matchPassword(password: string): Promise<boolean> };
export const User = mongoose.model<IUser>('User', userSchema);
