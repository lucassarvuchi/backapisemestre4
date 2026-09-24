import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string };
}

export function protect(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Não autorizado.' });
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: 'JWT_SECRET não configurado.' });
    return;
  }
  try {
    const payload = jwt.verify(header.substring(7), secret) as jwt.JwtPayload & { id: string; email?: string; name?: string };
    req.user = { id: payload.id, email: payload.email ?? '', name: payload.name ?? '' };
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}
