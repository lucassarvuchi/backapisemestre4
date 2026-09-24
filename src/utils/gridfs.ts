import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import type { Response } from 'express';

function getBucket(): GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB ainda não está conectado.');
  return new GridFSBucket(db, { bucketName: 'documents' });
}

export async function saveFile(buffer: Buffer, filename: string, mimeType: string, metadata: Record<string, unknown>): Promise<ObjectId> {
  const bucket = getBucket();
  return await new Promise((resolve, reject) => {
    const upload = bucket.openUploadStream(filename, { contentType: mimeType, metadata });
    upload.on('error', reject);
    upload.on('finish', () => resolve(upload.id as ObjectId));
    upload.end(buffer);
  });
}

export async function streamOwnedFile(fileId: string, engineerId: string, res: Response): Promise<boolean> {
  const bucket = getBucket();
  if (!ObjectId.isValid(fileId)) return false;
  const id = new ObjectId(fileId);
  const files = await bucket.find({ _id: id }).toArray();
  if (!files.length) return false;
  const file = files[0];
  if (file.metadata?.engineerId !== engineerId) return false;
  res.setHeader('Content-Type', file.contentType ?? 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
  res.setHeader('Content-Length', String(file.length));
  await new Promise<void>((resolve, reject) => {
    const download = bucket.openDownloadStream(id);
    download.on('error', reject);
    download.on('end', () => resolve());
    download.pipe(res);
  });
  return true;
}

export async function deleteFile(fileId: mongoose.Types.ObjectId): Promise<void> {
  const bucket = getBucket();
  await bucket.delete(fileId);
}
