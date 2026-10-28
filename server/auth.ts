import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'bbg-creative-desk-secret-key-2026';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'bbg_user';
  department: string | null;
  groupId: string;
  groupName: string;
  canReorderQueue: boolean;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autenticação necessária. Token ausente.' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    // Verify user still exists in DB
    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.department, gm.group_id, g.name as group_name, gm.can_reorder_queue
      FROM users u
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN groups g ON gm.group_id = g.id
      WHERE u.id = ?
    `).get(decoded.id) as any;

    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado ou inativo.' });
      return;
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      groupId: user.group_id || 'group-bbg-main',
      groupName: user.group_name || 'BBG Brasil',
      canReorderQueue: Boolean(user.can_reorder_queue),
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado. Ação restrita ao Administrador (Elias Alves).' });
    return;
  }
  next();
}
