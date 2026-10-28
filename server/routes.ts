import express from 'express';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.ts';
import { authMiddleware, requireAdmin, generateToken } from './auth.ts';
import type { AuthenticatedRequest } from './auth.ts';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Setup Multer for secure file uploads
const uploadsDir = path.resolve(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `bbg-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Helper to format ISO timestamp in Recife time string
function getNowIso(): string {
  return new Date().toISOString();
}

// Helper to ensure competency exists idempotently
function ensureCompetency(groupId: string, year: number, month: number) {
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const competencyKey = `${year}-${monthStr}`;
  const existing = db.prepare(`
    SELECT * FROM monthly_competencies
    WHERE group_id = ? AND competency_key = ?
  `).get(groupId, competencyKey) as any;

  if (existing) {
    return existing;
  }

  const id = `comp-${groupId}-${competencyKey}`;
  db.prepare(`
    INSERT INTO monthly_competencies (id, group_id, competency_key, year, month, quota_contracted, credits_used)
    VALUES (?, ?, ?, ?, ?, 30, 0)
  `).run(id, groupId, competencyKey, year, month);

  return db.prepare('SELECT * FROM monthly_competencies WHERE id = ?').get(id) as any;
}

// ---------------------------------------------------------------------------
// AUTH ROUTES
// ---------------------------------------------------------------------------

// POST /api/auth/login
router.post('/auth/login', (req, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  let user = db.prepare(`
    SELECT u.*, gm.group_id, g.name as group_name, gm.can_reorder_queue
    FROM users u
    LEFT JOIN group_members gm ON u.id = gm.user_id
    LEFT JOIN groups g ON gm.group_id = g.id
    WHERE LOWER(u.email) = ?
  `).get(cleanEmail) as any;

  if (!user) {
    // Helpful alias matching for common domain variations (bbg.com, bbg.com.br, bbgcreative.com)
    if (cleanEmail === 'elias@bbg.com' || cleanEmail === 'elias@bbgcreative.com' || cleanEmail === 'admin@bbg.com') {
      user = db.prepare(`
        SELECT u.*, gm.group_id, g.name as group_name, gm.can_reorder_queue
        FROM users u
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN groups g ON gm.group_id = g.id
        WHERE u.id = 'user-elias-admin'
      `).get() as any;
    } else if (cleanEmail.startsWith('marketing@bbg')) {
      user = db.prepare(`
        SELECT u.*, gm.group_id, g.name as group_name, gm.can_reorder_queue
        FROM users u
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN groups g ON gm.group_id = g.id
        WHERE u.id = 'user-bbg-marketing'
      `).get() as any;
    } else if (cleanEmail.startsWith('comercial@bbg')) {
      user = db.prepare(`
        SELECT u.*, gm.group_id, g.name as group_name, gm.can_reorder_queue
        FROM users u
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN groups g ON gm.group_id = g.id
        WHERE u.id = 'user-bbg-comercial'
      `).get() as any;
    } else if (cleanEmail.startsWith('diretoria@bbg')) {
      user = db.prepare(`
        SELECT u.*, gm.group_id, g.name as group_name, gm.can_reorder_queue
        FROM users u
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN groups g ON gm.group_id = g.id
        WHERE u.id = 'user-bbg-diretoria'
      `).get() as any;
    }
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Credenciais inválidas. Verifique o e-mail e a senha.' });
    return;
  }

  const authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    groupId: user.group_id || 'group-bbg-main',
    groupName: user.group_name || 'BBG Brasil',
    canReorderQueue: Boolean(user.can_reorder_queue),
  };

  const token = generateToken(authUser);
  res.json({ token, user: authUser });
});

// POST /api/auth/switch-user (Fast switcher for demonstration & testing)
router.post('/auth/switch-user', (req, res: Response) => {
  const { userId } = req.body;
  const user = db.prepare(`
    SELECT u.*, gm.group_id, g.name as group_name, gm.can_reorder_queue
    FROM users u
    LEFT JOIN group_members gm ON u.id = gm.user_id
    LEFT JOIN groups g ON gm.group_id = g.id
    WHERE u.id = ?
  `).get(userId) as any;

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    groupId: user.group_id || 'group-bbg-main',
    groupName: user.group_name || 'BBG Brasil',
    canReorderQueue: Boolean(user.can_reorder_queue),
  };

  const token = generateToken(authUser);
  res.json({ token, user: authUser });
});

// GET /api/auth/me
router.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/users
router.get('/users', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const users = db.prepare(`
    SELECT id, name, email, role, department, avatar_url, created_at
    FROM users
    ORDER BY role ASC, name ASC
  `).all();
  res.json(users);
});

// POST /api/users (Admin only)
router.post('/users', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Nome, e-mail, senha e perfil são obrigatórios.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existing) {
    res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
    return;
  }

  const id = `user-${Date.now()}`;
  const passwordHash = bcrypt.hashSync(password, 10);

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, department)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, email, passwordHash, role, department || null);

    db.prepare(`
      INSERT INTO group_members (id, group_id, user_id, can_reorder_queue)
      VALUES (?, ?, ?, 1)
    `).run(`mem-${Date.now()}`, req.user!.groupId, id);
  })();

  res.status(201).json({ id, name, email, role, department });
});

// ---------------------------------------------------------------------------
// COMPETENCIES & CREDITS
// ---------------------------------------------------------------------------

// GET /api/competencies
router.get('/competencies', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const groupId = req.user!.groupId;
  const list = db.prepare(`
    SELECT mc.*,
           (mc.quota_contracted - mc.credits_used) as credits_remaining,
           (SELECT COUNT(*) FROM demands d WHERE d.competency_id = mc.id) as total_demands,
           (SELECT COUNT(*) FROM demands d WHERE d.competency_id = mc.id AND d.is_extra = 1) as extra_demands
    FROM monthly_competencies mc
    WHERE mc.group_id = ?
    ORDER BY mc.competency_key DESC
  `).all(groupId);
  res.json(list);
});

// POST /api/competencies/ensure (Ensure month exists without altering previous)
router.post('/competencies/ensure', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { year, month } = req.body;
  if (!year || !month) {
    res.status(400).json({ error: 'Ano e mês são obrigatórios.' });
    return;
  }
  const comp = ensureCompetency(req.user!.groupId, parseInt(year), parseInt(month));
  res.json(comp);
});

// POST /api/competencies/:id/adjust (Admin adjustment of credits)
router.post('/competencies/:id/adjust', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { quotaContracted, adjustmentAmount, justification } = req.body;

  if (!justification) {
    res.status(400).json({ error: 'A justificativa do ajuste é obrigatória.' });
    return;
  }

  const comp = db.prepare('SELECT * FROM monthly_competencies WHERE id = ?').get(id) as any;
  if (!comp) {
    res.status(404).json({ error: 'Competência não encontrada.' });
    return;
  }

  db.transaction(() => {
    let newQuota = comp.quota_contracted;
    let newUsed = comp.credits_used;

    if (quotaContracted !== undefined && Number.isInteger(Number(quotaContracted))) {
      newQuota = Number(quotaContracted);
    }

    if (adjustmentAmount !== undefined && Number.isInteger(Number(adjustmentAmount))) {
      const adj = Number(adjustmentAmount);
      newUsed -= adj; // e.g. adding 2 bonus credits lowers credits_used by 2, or records transaction
      db.prepare(`
        INSERT INTO credit_transactions (id, group_id, competency_id, amount, type, description, user_id)
        VALUES (?, ?, ?, ?, 'adjustment', ?, ?)
      `).run(`tx-${Date.now()}`, comp.group_id, id, adj, justification, req.user!.id);
    }

    db.prepare(`
      UPDATE monthly_competencies
      SET quota_contracted = ?, credits_used = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newQuota, newUsed, id);
  })();

  const updated = db.prepare(`
    SELECT mc.*, (mc.quota_contracted - mc.credits_used) as credits_remaining
    FROM monthly_competencies mc
    WHERE mc.id = ?
  `).get(id);

  res.json(updated);
});

// GET /api/competencies/:id/transactions
router.get('/competencies/:id/transactions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const txs = db.prepare(`
    SELECT ct.*, u.name as user_name, d.code as demand_code, d.title as demand_title
    FROM credit_transactions ct
    JOIN users u ON ct.user_id = u.id
    LEFT JOIN demands d ON ct.demand_id = d.id
    WHERE ct.competency_id = ?
    ORDER BY ct.created_at DESC
  `).all(id);
  res.json(txs);
});

// ---------------------------------------------------------------------------
// DASHBOARD STATS
// ---------------------------------------------------------------------------

// GET /api/stats
router.get('/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const groupId = req.user!.groupId;
  const competencyKey = (req.query.competencyKey as string) || '2026-10';

  let competency = db.prepare(`
    SELECT * FROM monthly_competencies
    WHERE group_id = ? AND competency_key = ?
  `).get(groupId, competencyKey) as any;

  if (!competency) {
    const [y, m] = competencyKey.split('-');
    competency = ensureCompetency(groupId, parseInt(y), parseInt(m));
  }

  const creditsContracted = competency.quota_contracted;
  const creditsUsed = competency.credits_used;
  const creditsRemaining = Math.max(0, creditsContracted - creditsUsed);

  // Demands counts
  const inQueueCount = db.prepare(`
    SELECT COUNT(*) as count FROM demands
    WHERE group_id = ? AND status = 'na_fila'
  `).get(groupId) as { count: number };

  const inProductionCount = db.prepare(`
    SELECT COUNT(*) as count FROM demands
    WHERE group_id = ? AND status = 'em_producao'
  `).get(groupId) as { count: number };

  const awaitingApprovalCount = db.prepare(`
    SELECT COUNT(*) as count FROM demands
    WHERE group_id = ? AND status = 'em_aprovacao'
  `).get(groupId) as { count: number };

  const adjustmentsCount = db.prepare(`
    SELECT COUNT(*) as count FROM demands
    WHERE group_id = ? AND status = 'ajustes_solicitados'
  `).get(groupId) as { count: number };

  const extraPendingCount = db.prepare(`
    SELECT COUNT(*) as count FROM demands
    WHERE group_id = ? AND status = 'pendente_autorizacao_extra'
  `).get(groupId) as { count: number };

  const approvedCount = db.prepare(`
    SELECT COUNT(*) as count FROM demands
    WHERE group_id = ? AND competency_id = ? AND status = 'aprovada'
  `).get(groupId, competency.id) as { count: number };

  // Priority queue items (top 5 for dashboard)
  const priorityItems = db.prepare(`
    SELECT d.id, d.code, d.title, d.department, d.material_type, d.status,
           d.queue_position, d.is_extra, d.desired_deadline, d.agreed_deadline,
           d.created_at, u.name as requester_name
    FROM demands d
    JOIN users u ON d.created_by = u.id
    WHERE d.group_id = ?
      AND d.status IN ('na_fila', 'em_producao', 'em_aprovacao', 'ajustes_solicitados')
      AND d.status != 'pendente_autorizacao_extra'
    ORDER BY d.queue_position ASC
    LIMIT 6
  `).all(groupId);

  res.json({
    competency: {
      id: competency.id,
      key: competency.competency_key,
      year: competency.year,
      month: competency.month,
      contracted: creditsContracted,
      used: creditsUsed,
      remaining: creditsRemaining,
    },
    counts: {
      inQueue: inQueueCount.count,
      inProduction: inProductionCount.count,
      awaitingApproval: awaitingApprovalCount.count,
      adjustments: adjustmentsCount.count,
      extraPending: extraPendingCount.count,
      approved: approvedCount.count,
    },
    priorityItems,
  });
});

// ---------------------------------------------------------------------------
// DEMANDS CRUD & FLOWS
// ---------------------------------------------------------------------------

const EXTRA_TAG_EXACT = 'ARTE SOLICITADA FORA DA COTA MENSAL, PODERÁ TER CUSTOS EXTRAS, PENDENTE DE AUTORIZAÇÃO/ACEITE';

// GET /api/demands
router.get('/demands', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const groupId = req.user!.groupId;
  const status = req.query.status as string;
  const competencyId = req.query.competencyId as string;
  const search = req.query.search as string;

  let query = `
    SELECT d.*,
           u.name as requester_name,
           u.email as requester_email,
           mc.competency_key,
           (SELECT COUNT(*) FROM demand_deliveries dd WHERE dd.demand_id = d.id) as delivery_count,
           (SELECT MAX(version) FROM demand_deliveries dd WHERE dd.demand_id = d.id) as latest_version,
           (SELECT COUNT(*) FROM demand_files df WHERE df.demand_id = d.id) as file_count,
           (SELECT COUNT(*) FROM demand_comments dc WHERE dc.demand_id = d.id) as comment_count
    FROM demands d
    JOIN users u ON d.created_by = u.id
    JOIN monthly_competencies mc ON d.competency_id = mc.id
    WHERE d.group_id = ?
  `;
  const params: any[] = [groupId];

  if (status) {
    query += ` AND d.status = ?`;
    params.push(status);
  }

  if (competencyId) {
    query += ` AND d.competency_id = ?`;
    params.push(competencyId);
  }

  if (search) {
    query += ` AND (d.title LIKE ? OR d.code LIKE ? OR d.briefing LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const createdBy = req.query.createdBy as string;
  const myDemands = req.query.myDemands === 'true';

  if (createdBy) {
    query += ` AND d.created_by = ?`;
    params.push(createdBy);
  } else if (myDemands) {
    query += ` AND d.created_by = ?`;
    params.push(req.user!.id);
  }

  query += ` ORDER BY d.created_at DESC`;

  const demands = db.prepare(query).all(...params);
  res.json(demands);
});

// GET /api/demands/priority-queue
router.get('/demands/priority-queue', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const groupId = req.user!.groupId;
  const items = db.prepare(`
    SELECT d.*,
           u.name as requester_name,
           u.email as requester_email,
           mc.competency_key,
           (SELECT MAX(version) FROM demand_deliveries dd WHERE dd.demand_id = d.id) as latest_version
    FROM demands d
    JOIN users u ON d.created_by = u.id
    JOIN monthly_competencies mc ON d.competency_id = mc.id
    WHERE d.group_id = ?
      AND d.status IN ('na_fila', 'em_producao', 'em_aprovacao', 'ajustes_solicitados')
      AND d.status != 'pendente_autorizacao_extra'
    ORDER BY d.queue_position ASC, d.created_at ASC
  `).all(groupId);
  res.json(items);
});

// GET /api/demands/:id
router.get('/demands/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const demand = db.prepare(`
    SELECT d.*,
           u.name as requester_name,
           u.email as requester_email,
           u.department as requester_dept,
           mc.competency_key,
           adm.name as deadline_admin_name,
           eval_u.name as extra_evaluator_name,
           auth_u.name as extra_authorizer_name,
           appr_u.name as approver_name
    FROM demands d
    JOIN users u ON d.created_by = u.id
    JOIN monthly_competencies mc ON d.competency_id = mc.id
    LEFT JOIN users adm ON d.agreed_deadline_updated_by = adm.id
    LEFT JOIN users eval_u ON d.extra_evaluated_by = eval_u.id
    LEFT JOIN users auth_u ON d.extra_authorized_by = auth_u.id
    LEFT JOIN users appr_u ON d.approved_by = appr_u.id
    WHERE d.id = ?
  `).get(id) as any;

  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  // Deliveries
  const deliveries = db.prepare(`
    SELECT dd.*, u.name as delivered_by_name
    FROM demand_deliveries dd
    JOIN users u ON dd.delivered_by = u.id
    WHERE dd.demand_id = ?
    ORDER BY dd.version DESC
  `).all(id);

  // Files
  const files = db.prepare(`
    SELECT df.*, u.name as uploaded_by_name
    FROM demand_files df
    JOIN users u ON df.uploaded_by = u.id
    WHERE df.demand_id = ?
    ORDER BY df.created_at ASC
  `).all(id);

  // Comments
  const comments = db.prepare(`
    SELECT dc.*, u.name as user_name, u.role as user_role, u.avatar_url
    FROM demand_comments dc
    JOIN users u ON dc.user_id = u.id
    WHERE dc.demand_id = ?
    ORDER BY dc.created_at ASC
  `).all(id);

  // Timeline
  const timeline = db.prepare(`
    SELECT dt.*, u.name as user_name, u.role as user_role
    FROM demand_timeline dt
    JOIN users u ON dt.user_id = u.id
    WHERE dt.demand_id = ?
    ORDER BY dt.created_at ASC
  `).all(id);

  res.json({
    ...demand,
    deliveries,
    files,
    comments,
    timeline,
  });
});

// POST /api/demands - Create new demand
router.post('/demands', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    department,
    material_type,
    dimensions,
    briefing,
    required_texts,
    visual_references,
    reference_links,
    desired_deadline,
    observations,
    // Admin specific options
    created_for_user_id,
    is_retroactive,
    real_request_date,
    force_extra,
    force_extra_reason,
  } = req.body;

  if (!title || !department || !material_type || !briefing) {
    res.status(400).json({ error: 'Título, departamento, tipo de material e briefing são obrigatórios.' });
    return;
  }

  const groupId = req.user!.groupId;
  let creatorId = req.user!.id;
  let retroactiveAdminId: string | null = null;

  if (req.user!.role === 'admin' && created_for_user_id) {
    creatorId = created_for_user_id;
    if (is_retroactive) {
      retroactiveAdminId = req.user!.id;
    }
  }

  // Determine competency month from request date (or current date)
  let requestDateObj = new Date();
  if (is_retroactive && real_request_date) {
    const parsed = new Date(real_request_date);
    if (!isNaN(parsed.getTime())) {
      requestDateObj = parsed;
    }
  }

  const year = requestDateObj.getFullYear();
  const month = requestDateObj.getMonth() + 1;
  const competency = ensureCompetency(groupId, year, month);

  const demandId = `dem-${Date.now()}`;
  // Generate sequence code BBG-YYYY-XXX
  const seqCount = db.prepare('SELECT COUNT(*) as count FROM demands WHERE competency_id = ?').get(competency.id) as { count: number };
  const seqNumber = String(seqCount.count + 1).padStart(3, '0');
  const code = `BBG-${year}-${seqNumber}`;

  let isExtra = false;
  let extraTagApplied = false;
  let status = 'na_fila';
  let queuePosition = 0;

  // Transaction for atomic credit verification and demand creation
  const createdDemand = db.transaction(() => {
    // Re-check current remaining credits inside transaction to prevent race conditions
    const compFresh = db.prepare('SELECT * FROM monthly_competencies WHERE id = ?').get(competency.id) as any;
    const remainingCredits = compFresh.quota_contracted - compFresh.credits_used;

    if (force_extra && req.user!.role === 'admin') {
      isExtra = true;
      extraTagApplied = true;
      status = 'pendente_autorizacao_extra';
      queuePosition = 0;
    } else if (remainingCredits <= 0) {
      // Out of monthly quota! Automatically classified as Extra Demand
      isExtra = true;
      extraTagApplied = true;
      status = 'pendente_autorizacao_extra';
      queuePosition = 0;
    } else {
      // Regular demand: consumes 1 credit safely
      isExtra = false;
      extraTagApplied = false;
      status = 'na_fila';

      // Increment credits used
      db.prepare(`
        UPDATE monthly_competencies
        SET credits_used = credits_used + 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(competency.id);

      // Record transaction
      db.prepare(`
        INSERT INTO credit_transactions (id, group_id, competency_id, demand_id, amount, type, description, user_id)
        VALUES (?, ?, ?, ?, -1, 'consumption', ?, ?)
      `).run(`tx-${Date.now()}`, groupId, competency.id, demandId, 'Consumo regular de cota mensal (1 crédito)', req.user!.id);

      // Calculate next queue position
      const maxPos = db.prepare(`
        SELECT COALESCE(MAX(queue_position), 0) as max_pos
        FROM demands
        WHERE group_id = ? AND status IN ('na_fila', 'em_producao', 'em_aprovacao', 'ajustes_solicitados')
      `).get(groupId) as { max_pos: number };
      queuePosition = maxPos.max_pos + 1;
    }

    // Insert demand
    db.prepare(`
      INSERT INTO demands (
        id, code, group_id, competency_id, title, department, material_type, dimensions,
        briefing, required_texts, visual_references, reference_links, desired_deadline,
        status, queue_position, is_extra, extra_tag_applied, extra_tag_text, extra_cost_terms,
        created_by, real_request_date, is_retroactive, retroactive_registered_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      demandId,
      code,
      groupId,
      competency.id,
      title,
      department,
      material_type,
      dimensions || null,
      briefing,
      required_texts || null,
      visual_references || null,
      reference_links || null,
      desired_deadline || null,
      status,
      queuePosition,
      isExtra ? 1 : 0,
      extraTagApplied ? 1 : 0,
      extraTagApplied ? EXTRA_TAG_EXACT : null,
      force_extra_reason || null,
      creatorId,
      is_retroactive ? real_request_date : null,
      is_retroactive ? 1 : 0,
      retroactiveAdminId
    );

    // Initial timeline record
    let timelineDesc = isExtra
      ? `Solicitação extra cadastrada fora da cota mensal. Tag aplicada: "${EXTRA_TAG_EXACT}". Aguardando avaliação de custos pelo Designer Elias Alves.`
      : `Solicitação criada com sucesso. 1 crédito mensal consumido da competência ${competency.competency_key}.`;

    if (is_retroactive) {
      timelineDesc += ` (Cadastrada retroativamente pelo administrador com data original em ${real_request_date}).`;
    }

    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`tl-${Date.now()}`, demandId, 'created', isExtra ? 'Solicitação Extra Criada' : 'Solicitação Regular Criada', timelineDesc, req.user!.id);

    // If extra, notify admin
    if (isExtra) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, group_id, demand_id, title, message, type)
        VALUES (?, NULL, ?, ?, ?, ?, 'extra_request_created')
      `).run(
        `notif-${Date.now()}`,
        groupId,
        demandId,
        `Nova Solicitação Extra: ${code}`,
        `A solicitação "${title}" foi criada fora da cota mensal e necessita de avaliação de custos.`
      );
    }

    return db.prepare('SELECT * FROM demands WHERE id = ?').get(demandId);
  })();

  res.status(201).json(createdDemand);
});

// POST /api/demands/:id/reorder (Priority queue reordering)
router.post('/demands/:id/reorder', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newPosition } = req.body;

  if (newPosition === undefined || newPosition < 1) {
    res.status(400).json({ error: 'Posição inválida.' });
    return;
  }

  // Verify permission
  if (!req.user!.canReorderQueue && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Você não tem permissão para alterar a prioridade da fila.' });
    return;
  }

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  if (demand.status === 'pendente_autorizacao_extra') {
    res.status(400).json({ error: 'Demandas extras pendentes de aceite não podem ser adicionadas ou reordenadas na fila ativa.' });
    return;
  }

  const oldPosition = demand.queue_position;
  if (oldPosition === newPosition) {
    res.json({ success: true, message: 'Posição mantida.' });
    return;
  }

  db.transaction(() => {
    // Shift other items in queue
    if (newPosition < oldPosition) {
      db.prepare(`
        UPDATE demands
        SET queue_position = queue_position + 1
        WHERE group_id = ?
          AND queue_position >= ? AND queue_position < ?
          AND status IN ('na_fila', 'em_producao', 'em_aprovacao', 'ajustes_solicitados')
          AND status != 'pendente_autorizacao_extra'
      `).run(demand.group_id, newPosition, oldPosition);
    } else {
      db.prepare(`
        UPDATE demands
        SET queue_position = queue_position - 1
        WHERE group_id = ?
          AND queue_position <= ? AND queue_position > ?
          AND status IN ('na_fila', 'em_producao', 'em_aprovacao', 'ajustes_solicitados')
          AND status != 'pendente_autorizacao_extra'
      `).run(demand.group_id, newPosition, oldPosition);
    }

    // Set new position
    db.prepare('UPDATE demands SET queue_position = ? WHERE id = ?').run(newPosition, id);

    // Record priority history
    db.prepare(`
      INSERT INTO demand_priority_history (id, demand_id, old_position, new_position, changed_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(`ph-${Date.now()}`, id, oldPosition, newPosition, req.user!.id);

    // Record timeline
    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'priority_changed', 'Prioridade alterada na fila', ?, ?)
    `).run(
      `tl-${Date.now()}`,
      id,
      `${req.user!.name} moveu a demanda da posição #${oldPosition} para a posição #${newPosition}.`,
      req.user!.id
    );
  })();

  res.json({ success: true, oldPosition, newPosition });
});

// POST /api/demands/:id/status (Admin updates production status)
router.post('/api/demands/:id/status', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  // Handled below
});

router.post('/demands/:id/status', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['na_fila', 'em_producao', 'em_aprovacao', 'ajustes_solicitados', 'aprovada', 'cancelada'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Status de produção inválido.' });
    return;
  }

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  // Regra de negócio: Se tentar cancelar e já tiver entrega de arte, NÃO PODE CANCELAR!
  if (status === 'cancelada') {
    const deliveryCount = (db.prepare('SELECT COUNT(*) as count FROM demand_deliveries WHERE demand_id = ?').get(id) as { count: number }).count;
    if (deliveryCount >= 1) {
      res.status(400).json({ error: 'Não é possível cancelar: esta demanda já possui versão(ões) de arte entregue(s) pelo designer.' });
      return;
    }
  }

  const oldStatus = demand.status;

  db.transaction(() => {
    let updateSql = 'UPDATE demands SET status = ?';
    const params: any[] = [status];

    // Se cancelar demanda regular sem entregas, estorna 1 crédito
    if (status === 'cancelada' && oldStatus !== 'cancelada' && !demand.is_extra) {
      db.prepare(`
        UPDATE monthly_competencies
        SET credits_used = MAX(0, credits_used - 1), updated_at = datetime('now')
        WHERE id = ?
      `).run(demand.competency_id);

      db.prepare(`
        INSERT INTO credit_transactions (id, group_id, competency_id, demand_id, amount, type, description, user_id)
        VALUES (?, ?, ?, ?, 1, 'refund', 'Estorno de 1 crédito por cancelamento de solicitação sem entregas', ?)
      `).run(`tx-${Date.now()}`, demand.group_id, demand.competency_id, id, req.user!.id);
    }

    // Se cancelar, remove da fila e reordena
    if (status === 'cancelada' && demand.queue_position > 0) {
      updateSql += ', queue_position = NULL';
      db.prepare(`
        UPDATE demands
        SET queue_position = queue_position - 1
        WHERE group_id = ? AND queue_position > ?
      `).run(demand.group_id, demand.queue_position);
    }

    // If changing to 'em_producao' for the first time
    if (status === 'em_producao' && !demand.production_started_at) {
      updateSql += ', production_started_at = datetime(\'now\')';
    }

    updateSql += ' WHERE id = ?';
    params.push(id);
    db.prepare(updateSql).run(...params);

    // Record status history
    db.prepare(`
      INSERT INTO demand_status_history (id, demand_id, old_status, new_status, notes, changed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`sh-${Date.now()}`, id, oldStatus, status, notes || null, req.user!.id);

    // Record timeline
    const statusLabels: Record<string, string> = {
      na_fila: 'Na fila',
      em_producao: 'Em produção',
      em_aprovacao: 'Em aprovação',
      ajustes_solicitados: 'Ajustes solicitados',
      aprovada: 'Aprovada',
      cancelada: 'Cancelada',
    };

    let desc = `${req.user!.name} alterou o status de "${statusLabels[oldStatus] || oldStatus}" para "${statusLabels[status]}". ${notes ? 'Observações: ' + notes : ''}`;
    if (status === 'cancelada' && !demand.is_extra) {
      desc += ' Como nenhuma versão havia sido entregue, 1 crédito foi estornado para a cota mensal.';
    }

    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'status_changed', ?, ?, ?)
    `).run(
      `tl-${Date.now()}`,
      id,
      `Status alterado para "${statusLabels[status]}"`,
      desc,
      req.user!.id
    );
  })();

  res.json({ success: true, oldStatus, newStatus: status });
});

// POST /api/demands/:id/cancel (Cancel demand if 0 versions delivered)
router.post('/demands/:id/cancel', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  // Security: Admin or Requester can cancel
  if (req.user!.role !== 'admin' && demand.created_by !== req.user!.id) {
    res.status(403).json({ error: 'Você só pode cancelar solicitações criadas por você.' });
    return;
  }

  if (demand.status === 'cancelada') {
    res.status(400).json({ error: 'Esta demanda já está cancelada.' });
    return;
  }

  if (demand.status === 'aprovada') {
    res.status(400).json({ error: 'Esta demanda já foi aprovada e finalizada.' });
    return;
  }

  // Regra crítica de negócio:
  // Se tiver entregue pelo menos 1 versão, NÃO PODE CANCELAR!
  // Se NÃO tiver enviado nenhuma versão, dá direito a estorno de 1 crédito!
  const deliveryCount = (db.prepare('SELECT COUNT(*) as count FROM demand_deliveries WHERE demand_id = ?').get(id) as { count: number }).count;
  if (deliveryCount >= 1) {
    res.status(400).json({ error: 'Não é possível cancelar: esta demanda já possui versão(ões) de arte entregue(s) pelo designer.' });
    return;
  }

  db.transaction(() => {
    let creditRefunded = false;
    // Refund 1 credit if it was a regular demand
    if (!demand.is_extra) {
      db.prepare(`
        UPDATE monthly_competencies
        SET credits_used = MAX(0, credits_used - 1), updated_at = datetime('now')
        WHERE id = ?
      `).run(demand.competency_id);

      db.prepare(`
        INSERT INTO credit_transactions (id, group_id, competency_id, demand_id, amount, type, description, user_id)
        VALUES (?, ?, ?, ?, 1, 'refund', 'Estorno de 1 crédito por cancelamento de solicitação sem entregas', ?)
      `).run(`tx-${Date.now()}`, demand.group_id, demand.competency_id, id, req.user!.id);
      creditRefunded = true;
    }

    // Re-compact queue if it was in queue
    if (demand.queue_position > 0) {
      db.prepare(`
        UPDATE demands
        SET queue_position = queue_position - 1
        WHERE group_id = ? AND queue_position > ?
      `).run(demand.group_id, demand.queue_position);
    }

    db.prepare(`
      UPDATE demands
      SET status = 'cancelada', queue_position = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    // Record status history
    db.prepare(`
      INSERT INTO demand_status_history (id, demand_id, old_status, new_status, notes, changed_by)
      VALUES (?, ?, ?, 'cancelada', ?, ?)
    `).run(`sh-${Date.now()}`, id, demand.status, reason || 'Demanda cancelada', req.user!.id);

    // Record timeline
    const refundMsg = creditRefunded ? ' Como nenhuma versão havia sido entregue, 1 crédito foi estornado para a cota mensal.' : '';
    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'demand_cancelled', 'Solicitação Cancelada', ?, ?)
    `).run(
      `tl-${Date.now()}`,
      id,
      `${req.user!.name} cancelou a solicitação.${refundMsg}${reason ? ' Motivo: ' + reason : ''}`,
      req.user!.id
    );

    // Notify other party
    db.prepare(`
      INSERT INTO notifications (id, user_id, group_id, demand_id, title, message, type)
      VALUES (?, NULL, ?, ?, ?, ?, 'demand_cancelled')
    `).run(
      `notif-${Date.now()}`,
      demand.group_id,
      id,
      `Demanda Cancelada: ${demand.code}`,
      `${req.user!.name} cancelou "${demand.title}".${refundMsg}`
    );
  })();

  res.json({ success: true, message: 'Demanda cancelada com sucesso.' });
});

// DELETE /api/demands/:id (Permanent deletion of demand)
router.delete('/demands/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  // Security: only Admin Elias or the creator (if no deliveries) can delete permanently
  const deliveryCount = (db.prepare('SELECT COUNT(*) as count FROM demand_deliveries WHERE demand_id = ?').get(id) as { count: number }).count;
  if (req.user!.role !== 'admin' && demand.created_by !== req.user!.id) {
    res.status(403).json({ error: 'Permissão negada. Apenas o administrador ou o solicitante podem apagar a demanda.' });
    return;
  }

  if (req.user!.role !== 'admin' && deliveryCount > 0) {
    res.status(403).json({ error: 'Não é possível apagar uma demanda que já possui versões entregues.' });
    return;
  }

  db.transaction(() => {
    // If active regular demand that was not cancelled, refund the credit
    if (!demand.is_extra && demand.status !== 'cancelada') {
      db.prepare(`
        UPDATE monthly_competencies
        SET credits_used = MAX(0, credits_used - 1), updated_at = datetime('now')
        WHERE id = ?
      `).run(demand.competency_id);

      db.prepare(`
        INSERT INTO credit_transactions (id, group_id, competency_id, demand_id, amount, type, description, user_id)
        VALUES (?, ?, ?, NULL, 1, 'refund', 'Estorno de 1 crédito por exclusão definitiva da demanda ${demand.code}', ?)
      `).run(`tx-${Date.now()}`, demand.group_id, demand.competency_id, req.user!.id);
    }

    // Re-compact queue if in queue
    if (demand.queue_position > 0) {
      db.prepare(`
        UPDATE demands
        SET queue_position = queue_position - 1
        WHERE group_id = ? AND queue_position > ?
      `).run(demand.group_id, demand.queue_position);
    }

    // Delete child rows
    db.prepare('DELETE FROM demand_deliveries WHERE demand_id = ?').run(id);
    db.prepare('DELETE FROM demand_files WHERE demand_id = ?').run(id);
    db.prepare('DELETE FROM demand_comments WHERE demand_id = ?').run(id);
    db.prepare('DELETE FROM demand_timeline WHERE demand_id = ?').run(id);
    db.prepare('DELETE FROM demand_status_history WHERE demand_id = ?').run(id);
    db.prepare('DELETE FROM notifications WHERE demand_id = ?').run(id);
    db.prepare('DELETE FROM demands WHERE id = ?').run(id);
  })();

  res.json({ success: true, message: 'Demanda excluída definitivamente com sucesso.' });
});

// POST /api/demands/:id/prazo (Admin sets or changes agreed deadline)
router.post('/demands/:id/prazo', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { agreedDeadline, notes } = req.body;

  if (!agreedDeadline) {
    res.status(400).json({ error: 'Prazo acordado é obrigatório (formato YYYY-MM-DD).' });
    return;
  }

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  const oldDeadline = demand.agreed_deadline;

  db.transaction(() => {
    db.prepare(`
      UPDATE demands
      SET agreed_deadline = ?,
          agreed_deadline_updated_by = ?,
          agreed_deadline_updated_at = datetime('now')
      WHERE id = ?
    `).run(agreedDeadline, req.user!.id, id);

    const desc = oldDeadline
      ? `${req.user!.name} atualizou o prazo acordado de ${oldDeadline} para ${agreedDeadline}. ${notes ? 'Motivo: ' + notes : ''}`
      : `${req.user!.name} confirmou o prazo acordado para ${agreedDeadline}. ${notes ? 'Observações: ' + notes : ''}`;

    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'deadline_agreed', 'Prazo acordado definido', ?, ?)
    `).run(`tl-${Date.now()}`, id, desc, req.user!.id);
  })();

  res.json({ success: true, agreedDeadline });
});

// POST /api/demands/:id/extra-evaluate (Admin evaluates extra demand and proposes cost)
router.post('/demands/:id/extra-evaluate', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, extraCost, extraCostTerms, rejectionReason } = req.body;

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  if (action === 'reject') {
    if (!rejectionReason) {
      res.status(400).json({ error: 'Informe o motivo da recusa.' });
      return;
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE demands
        SET status = 'recusada_admin',
            extra_evaluated_by = ?,
            extra_evaluated_at = datetime('now'),
            extra_rejection_reason = ?
        WHERE id = ?
      `).run(req.user!.id, rejectionReason, id);

      db.prepare(`
        INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
        VALUES (?, ?, 'extra_rejected_admin', 'Demanda extra recusada pelo Designer', ?, ?)
      `).run(
        `tl-${Date.now()}`,
        id,
        `${req.user!.name} recusou a demanda extra. Motivo: ${rejectionReason}`,
        req.user!.id
      );
    })();

    res.json({ success: true, status: 'recusada_admin' });
    return;
  }

  if (extraCost === undefined || isNaN(Number(extraCost))) {
    res.status(400).json({ error: 'Informe o valor do custo adicional (ex: 0.00 para sem custo ou 80.00).' });
    return;
  }

  const cost = Number(extraCost);

  db.transaction(() => {
    db.prepare(`
      UPDATE demands
      SET extra_cost = ?,
          extra_cost_terms = ?,
          extra_evaluated_by = ?,
          extra_evaluated_at = datetime('now')
      WHERE id = ?
    `).run(cost, extraCostTerms || 'Valor referente à criação da arte fora do pacote mensal.', req.user!.id, id);

    const costStr = cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'extra_cost_proposed', 'Proposta de custo adicional informada', ?, ?)
    `).run(
      `tl-${Date.now()}`,
      id,
      `${req.user!.name} avaliou a solicitação extra e informou o valor de ${costStr}. Aguardando aceite explícito da BBG.`,
      req.user!.id
    );

    // Notify BBG
    db.prepare(`
      INSERT INTO notifications (id, group_id, demand_id, title, message, type)
      VALUES (?, ?, ?, ?, ?, 'extra_cost_available')
    `).run(
      `notif-${Date.now()}`,
      demand.group_id,
      id,
      `Orçamento de Demanda Extra: ${demand.code}`,
      `O Designer informou o valor de ${costStr} para a demanda "${demand.title}". Necessário aceite explícito.`,
    );
  })();

  res.json({ success: true, extraCost: cost });
});

// POST /api/demands/:id/extra-respond (BBG user accepts or rejects proposed extra cost)
router.post('/demands/:id/extra-respond', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, notes } = req.body; // 'accept' or 'reject'

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  if (demand.status !== 'pendente_autorizacao_extra') {
    res.status(400).json({ error: 'Esta demanda não está aguardando autorização de custo extra.' });
    return;
  }

  if (action === 'accept') {
    db.transaction(() => {
      // Calculate next queue position to enter active queue
      const maxPos = db.prepare(`
        SELECT COALESCE(MAX(queue_position), 0) as max_pos
        FROM demands
        WHERE group_id = ? AND status IN ('na_fila', 'em_producao', 'em_aprovacao', 'ajustes_solicitados')
      `).get(demand.group_id) as { max_pos: number };
      const newQueuePosition = maxPos.max_pos + 1;

      db.prepare(`
        UPDATE demands
        SET status = 'na_fila',
            queue_position = ?,
            extra_authorized_by = ?,
            extra_authorized_at = datetime('now')
        WHERE id = ?
      `).run(newQueuePosition, req.user!.id, id);

      const costStr = Number(demand.extra_cost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      db.prepare(`
        INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
        VALUES (?, ?, 'extra_authorized', 'Custo adicional aceito pela BBG', ?, ?)
      `).run(
        `tl-${Date.now()}`,
        id,
        `${req.user!.name} autorizou e aceitou explicitamente o custo de ${costStr} para a demanda extra. A demanda entrou na posição #${newQueuePosition} da fila ativa. A identificação de demanda extra permanece ativa.`,
        req.user!.id
      );

      // Notify Designer
      db.prepare(`
        INSERT INTO notifications (id, user_id, group_id, demand_id, title, message, type)
        VALUES (?, NULL, ?, ?, ?, ?, 'extra_authorized_designer')
      `).run(
        `notif-${Date.now()}`,
        demand.group_id,
        id,
        `Demanda Extra Autorizada: ${demand.code}`,
        `${req.user!.name} aprovou as condições de ${costStr}. A demanda entrou na fila!`
      );
    })();

    res.json({ success: true, status: 'na_fila' });
    return;
  } else if (action === 'reject') {
    db.transaction(() => {
      db.prepare(`
        UPDATE demands
        SET status = 'recusada_bbg',
            extra_rejection_reason = ?
        WHERE id = ?
      `).run(notes || 'Custo extra recusado pela BBG', id);

      db.prepare(`
        INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
        VALUES (?, ?, 'extra_rejected_bbg', 'Demanda extra recusada pela BBG', ?, ?)
      `).run(
        `tl-${Date.now()}`,
        id,
        `${req.user!.name} recusou a condição de custo extra proposta. Demanda finalizada sem custos. ${notes ? 'Motivo: ' + notes : ''}`,
        req.user!.id
      );
    })();

    res.json({ success: true, status: 'recusada_bbg' });
    return;
  }

  res.status(400).json({ error: 'Ação inválida. Use accept ou reject.' });
});

// POST /api/demands/:id/deliveries (Admin submits delivered artwork)
// POST /api/demands/:id/deliveries (Admin submits delivered artwork)
router.post('/demands/:id/deliveries', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, releaseNotes, externalLinks, attachedFiles, imageBase64, imageUrl } = req.body;

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  // Get current version count
  const versionRow = db.prepare('SELECT COALESCE(MAX(version), 0) as max_v FROM demand_deliveries WHERE demand_id = ?').get(id) as { max_v: number };
  const newVersion = versionRow.max_v + 1;
  const deliveryId = `del-${Date.now()}`;

  let savedImageUrl: string | null = imageUrl || null;

  // Process pasted / dropped image base64
  if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image')) {
    try {
      const match = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        let ext = match[1].toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        if (ext.includes('svg')) ext = 'svg';
        const buffer = Buffer.from(match[2], 'base64');
        const filename = `art-v${newVersion}-${Date.now()}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, buffer);
        savedImageUrl = `/uploads/${filename}`;

        // Insert into demand_files
        db.prepare(`
          INSERT INTO demand_files (
            id, demand_id, delivery_id, original_name, stored_name, file_path, file_size, mime_type, file_category, uploaded_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'delivery', ?)
        `).run(
          `file-${Date.now()}`,
          id,
          deliveryId,
          `Arte_V${newVersion}.${ext}`,
          filename,
          savedImageUrl,
          buffer.length,
          `image/${ext}`,
          req.user!.id
        );
      }
    } catch (err) {
      console.error('Failed to save base64 image delivery:', err);
    }
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO demand_deliveries (id, demand_id, version, title, release_notes, external_links, image_url, delivered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      deliveryId,
      id,
      newVersion,
      title || `Versão ${newVersion}`,
      releaseNotes || null,
      externalLinks || null,
      savedImageUrl,
      req.user!.id
    );

    // If file ids provided, associate them to this delivery
    if (attachedFiles && Array.isArray(attachedFiles)) {
      for (const fileId of attachedFiles) {
        db.prepare('UPDATE demand_files SET delivery_id = ?, file_category = "delivery" WHERE id = ?').run(deliveryId, fileId);
      }
    }

    // Update demand timestamps & set status to 'em_aprovacao'
    const nowStr = getNowIso();
    let updateDemandSql = `
      UPDATE demands
      SET status = 'em_aprovacao',
          last_delivery_at = ?
    `;
    const params = [nowStr];

    if (!demand.first_delivery_at) {
      updateDemandSql += `, first_delivery_at = ?`;
      params.push(nowStr);
    }
    updateDemandSql += ` WHERE id = ?`;
    params.push(id);

    db.prepare(updateDemandSql).run(...params);

    // Record timeline
    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'delivery', ?, ?, ?)
    `).run(
      `tl-${Date.now()}`,
      id,
      `Nova entrega realizada (Versão ${newVersion})`,
      `${req.user!.name} enviou a Versão ${newVersion} para avaliação e aprovação da BBG. ${releaseNotes ? 'Notas: ' + releaseNotes : ''}`,
      req.user!.id
    );

    // Notify BBG users
    db.prepare(`
      INSERT INTO notifications (id, group_id, demand_id, title, message, type)
      VALUES (?, ?, ?, ?, ?, 'new_delivery')
    `).run(
      `notif-${Date.now()}`,
      demand.group_id,
      id,
      `Nova Entrega para Avaliação: ${demand.code}`,
      `A Versão ${newVersion} de "${demand.title}" foi entregue por Elias Alves e aguarda sua aprovação.`
    );
  })();

  res.status(201).json({ success: true, version: newVersion, deliveryId });
});

// POST /api/demands/:id/approve (BBG user approves delivered artwork)
router.post('/demands/:id/approve', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { version, comment } = req.body;

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  const latestDelivery = db.prepare('SELECT MAX(version) as max_v FROM demand_deliveries WHERE demand_id = ?').get(id) as { max_v: number };
  const approvedVersion = version || latestDelivery.max_v || 1;

  db.transaction(() => {
    db.prepare(`
      UPDATE demands
      SET status = 'aprovada',
          approved_at = datetime('now'),
          approved_by = ?,
          approved_version = ?
      WHERE id = ?
    `).run(req.user!.id, approvedVersion, id);

    if (comment) {
      db.prepare(`
        INSERT INTO demand_comments (id, demand_id, type, comment, user_id)
        VALUES (?, ?, 'approval_note', ?, ?)
      `).run(`dc-${Date.now()}`, id, comment, req.user!.id);
    }

    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'approved', 'Arte Aprovada com Sucesso!', ?, ?)
    `).run(
      `tl-${Date.now()}`,
      id,
      `${req.user!.name} aprovou a Versão ${approvedVersion} da demanda. ${comment ? 'Comentário: ' + comment : ''}`,
      req.user!.id
    );

    // Notify Designer
    db.prepare(`
      INSERT INTO notifications (id, user_id, group_id, demand_id, title, message, type)
      VALUES (?, NULL, ?, ?, ?, ?, 'artwork_approved')
    `).run(
      `notif-${Date.now()}`,
      demand.group_id,
      id,
      `Arte Aprovada! ${demand.code}`,
      `${req.user!.name} aprovou a Versão ${approvedVersion} de "${demand.title}".`
    );
  })();

  res.json({ success: true, approvedVersion });
});

// POST /api/demands/:id/request-adjustments (BBG user requests adjustments)
router.post('/demands/:id/request-adjustments', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { description } = req.body;

  if (!description || description.trim().length === 0) {
    res.status(400).json({ error: 'A descrição detalhada dos ajustes necessários é obrigatória.' });
    return;
  }

  const demand = db.prepare('SELECT * FROM demands WHERE id = ?').get(id) as any;
  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE demands
      SET status = 'ajustes_solicitados'
      WHERE id = ?
    `).run(id);

    db.prepare(`
      INSERT INTO demand_comments (id, demand_id, type, comment, user_id)
      VALUES (?, ?, 'adjustment_request', ?, ?)
    `).run(`dc-${Date.now()}`, id, description, req.user!.id);

    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'adjustments_requested', 'Ajustes solicitados pela BBG', ?, ?)
    `).run(
      `tl-${Date.now()}`,
      id,
      `${req.user!.name} solicitou ajustes: "${description}". Demanda retornou para a fila de produção do designer.`,
      req.user!.id
    );

    // Notify Designer
    db.prepare(`
      INSERT INTO notifications (id, user_id, group_id, demand_id, title, message, type)
      VALUES (?, NULL, ?, ?, ?, ?, 'adjustments_requested')
    `).run(
      `notif-${Date.now()}`,
      demand.group_id,
      id,
      `Ajustes Solicitados: ${demand.code}`,
      `${req.user!.name} solicitou ajustes na arte "${demand.title}".`
    );
  })();

  res.json({ success: true, status: 'ajustes_solicitados' });
});

// POST /api/demands/:id/comments
router.post('/demands/:id/comments', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { comment, type } = req.body;

  if (!comment || comment.trim().length === 0) {
    res.status(400).json({ error: 'Comentário não pode estar vazio.' });
    return;
  }

  const commentId = `dc-${Date.now()}`;
  db.transaction(() => {
    db.prepare(`
      INSERT INTO demand_comments (id, demand_id, type, comment, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(commentId, id, type || 'comment', comment, req.user!.id);

    db.prepare(`
      INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id)
      VALUES (?, ?, 'comment', 'Novo comentário registrado', ?, ?)
    `).run(
      `tl-${Date.now()}`,
      id,
      `${req.user!.name}: ${comment}`,
      req.user!.id
    );
  })();

  const newComment = db.prepare(`
    SELECT dc.*, u.name as user_name, u.role as user_role, u.avatar_url
    FROM demand_comments dc
    JOIN users u ON dc.user_id = u.id
    WHERE dc.id = ?
  `).get(commentId);

  res.status(201).json(newComment);
});

// POST /api/upload - File upload handler
router.post('/upload', authMiddleware, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    return;
  }

  const { demandId, fileCategory } = req.body;
  const fileId = `file-${Date.now()}`;
  const relativePath = `/uploads/${req.file.filename}`;

  if (demandId) {
    db.prepare(`
      INSERT INTO demand_files (
        id, demand_id, original_name, stored_name, file_path, file_size, mime_type, file_category, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fileId,
      demandId,
      req.file.originalname,
      req.file.filename,
      relativePath,
      req.file.size,
      req.file.mimetype,
      fileCategory || 'briefing',
      req.user!.id
    );
  }

  res.json({
    id: fileId,
    originalName: req.file.originalname,
    filePath: relativePath,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  });
});

// GET /api/notifications
router.get('/notifications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const notifs = db.prepare(`
    SELECT n.*, d.code as demand_code
    FROM notifications n
    LEFT JOIN demands d ON n.demand_id = d.id
    WHERE n.group_id = ?
      AND (n.user_id IS NULL OR n.user_id = ?)
    ORDER BY n.created_at DESC
    LIMIT 20
  `).all(req.user!.groupId, req.user!.id);
  res.json(notifs);
});

// POST /api/notifications/:id/read
router.post('/notifications/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
