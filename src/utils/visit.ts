import { Request } from 'express';
import { Visit } from '../models/Visit.js';

export function publicVisit(req: Request, visit: any) {
  const json = visit.toObject ? visit.toObject() : visit;
  const base = `${req.protocol}://${req.get('host')}`;
  json.locations = (json.locations ?? []).map((location: any) => ({
    ...location,
    answers: location.answers instanceof Map ? Object.fromEntries(location.answers) : (location.answers ?? {}),
    documents: (location.documents ?? []).map((doc: any) => ({
      ...doc,
      url: `${base}/api/files/${doc.fileId}`,
    })),
  }));
  return json;
}

export function calculateVisitStatus(locations: any[]): 'agendada' | 'em_andamento' | 'concluida' {
  if (!locations?.length) return 'agendada';
  return locations.every((l) => l.status === 'concluido') ? 'concluida' : 'em_andamento';
}

export async function nextVisitId(): Promise<number> {
  const Counter = (await import('../models/Counter.js')).Counter;
  const counter = await Counter.findOneAndUpdate({ _id: 'visitId' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return counter!.seq;
}
