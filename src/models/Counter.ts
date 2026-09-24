import mongoose from 'mongoose';

interface ICounter { _id: string; seq: number; }
const schema = new mongoose.Schema<ICounter>({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.model<ICounter>('Counter', schema);
