import mongoose from 'mongoose';

export interface IDocumentItem {
  name: string;
  type: 'photo' | 'document';
  mimeType: string;
  size: number;
  fileId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IFactoryLocation {
  name: string;
  status: 'pendente' | 'concluido';
  answers: Map<string, string>;
  documents: IDocumentItem[];
}

const documentSchema = new mongoose.Schema<IDocumentItem>({
  name: { type: String, required: true },
  type: { type: String, enum: ['photo', 'document'], required: true },
  mimeType: { type: String, default: 'application/octet-stream' },
  size: { type: Number, default: 0 },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const locationSchema = new mongoose.Schema<IFactoryLocation>({
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pendente', 'concluido'], default: 'pendente' },
  answers: { type: Map, of: String, default: {} },
  documents: { type: [documentSchema], default: [] },
});

const visitSchema = new mongoose.Schema({
  visitId: { type: Number, unique: true, index: true },
  factoryName: { type: String, required: true, trim: true },
  factoryAddress: { type: String, default: '' },
  factoryContact: { type: String, default: '' },
  status: { type: String, enum: ['agendada', 'em_andamento', 'concluida'], default: 'agendada', index: true },
  engineerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  locations: { type: [locationSchema], default: [] },
}, { timestamps: true });

export const Visit = mongoose.model('Visit', visitSchema);
