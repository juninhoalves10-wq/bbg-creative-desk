import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bbg_desk.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Tabela de grupos / empresas
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      monthly_quota INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Tabela de usuários
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'bbg_user')),
      department TEXT,
      phone TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Associação de usuários aos grupos
    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      can_reorder_queue INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, user_id)
    );

    -- Competências mensais (Cota compartilhada por competência)
    CREATE TABLE IF NOT EXISTS monthly_competencies (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      competency_key TEXT NOT NULL, -- ex: '2026-10'
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      quota_contracted INTEGER NOT NULL DEFAULT 30,
      credits_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, competency_key)
    );

    -- Movimentações de créditos
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      competency_id TEXT NOT NULL REFERENCES monthly_competencies(id) ON DELETE CASCADE,
      demand_id TEXT,
      amount INTEGER NOT NULL, -- -1 para consumo regular, +1 para estorno, etc.
      type TEXT NOT NULL CHECK(type IN ('consumption', 'refund', 'adjustment')),
      description TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Solicitações de design
    CREATE TABLE IF NOT EXISTS demands (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE, -- ex: 'BBG-2026-001'
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      competency_id TEXT NOT NULL REFERENCES monthly_competencies(id),
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      material_type TEXT NOT NULL,
      dimensions TEXT,
      briefing TEXT NOT NULL,
      required_texts TEXT,
      visual_references TEXT,
      reference_links TEXT,
      desired_deadline TEXT, -- Data desejada (YYYY-MM-DD)
      agreed_deadline TEXT, -- Prazo acordado definido pelo Admin (YYYY-MM-DD)
      agreed_deadline_updated_by TEXT REFERENCES users(id),
      agreed_deadline_updated_at TEXT,
      status TEXT NOT NULL CHECK(status IN (
        'na_fila',
        'em_producao',
        'em_aprovacao',
        'ajustes_solicitados',
        'aprovada',
        'cancelada',
        'pendente_autorizacao_extra',
        'recusada_bbg',
        'recusada_admin'
      )),
      queue_position INTEGER NOT NULL DEFAULT 0,
      is_extra INTEGER NOT NULL DEFAULT 0,
      extra_tag_applied INTEGER NOT NULL DEFAULT 0,
      extra_tag_text TEXT,
      extra_cost REAL, -- Custo extra proposto
      extra_cost_terms TEXT,
      extra_evaluated_by TEXT REFERENCES users(id),
      extra_evaluated_at TEXT,
      extra_authorized_by TEXT REFERENCES users(id),
      extra_authorized_at TEXT,
      extra_rejection_reason TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      real_request_date TEXT, -- Para solicitações retroativas
      is_retroactive INTEGER NOT NULL DEFAULT 0,
      retroactive_registered_by TEXT REFERENCES users(id),
      production_started_at TEXT,
      first_delivery_at TEXT,
      last_delivery_at TEXT,
      approved_at TEXT,
      approved_by TEXT REFERENCES users(id),
      approved_version INTEGER
    );

    -- Histórico de alterações de prioridade
    CREATE TABLE IF NOT EXISTS demand_priority_history (
      id TEXT PRIMARY KEY,
      demand_id TEXT NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
      old_position INTEGER NOT NULL,
      new_position INTEGER NOT NULL,
      changed_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Histórico de alterações de status
    CREATE TABLE IF NOT EXISTS demand_status_history (
      id TEXT PRIMARY KEY,
      demand_id TEXT NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
      old_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      notes TEXT,
      changed_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Entregas e versões de artes
    CREATE TABLE IF NOT EXISTS demand_deliveries (
      id TEXT PRIMARY KEY,
      demand_id TEXT NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      release_notes TEXT,
      external_links TEXT,
      image_url TEXT,
      delivered_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Arquivos anexados (briefing ou entregas)
    CREATE TABLE IF NOT EXISTS demand_files (
      id TEXT PRIMARY KEY,
      demand_id TEXT NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
      delivery_id TEXT REFERENCES demand_deliveries(id) ON DELETE SET NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_category TEXT NOT NULL CHECK(file_category IN ('briefing', 'delivery')),
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Comentários e solicitações de ajustes
    CREATE TABLE IF NOT EXISTS demand_comments (
      id TEXT PRIMARY KEY,
      demand_id TEXT NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
      delivery_id TEXT REFERENCES demand_deliveries(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('comment', 'adjustment_request', 'approval_note', 'admin_note')),
      comment TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Linha do tempo auditável de eventos
    CREATE TABLE IF NOT EXISTS demand_timeline (
      id TEXT PRIMARY KEY,
      demand_id TEXT NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      metadata_json TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Notificações do sistema
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      demand_id TEXT REFERENCES demands(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_demands_group_status ON demands(group_id, status);
    CREATE INDEX IF NOT EXISTS idx_demands_queue_pos ON demands(queue_position);
    CREATE INDEX IF NOT EXISTS idx_demands_competency ON demands(competency_id);
    CREATE INDEX IF NOT EXISTS idx_timeline_demand ON demand_timeline(demand_id);
  `);

  try {
    db.exec('ALTER TABLE demand_deliveries ADD COLUMN image_url TEXT');
  } catch (e) {
    // column already exists
  }

  seedInitialData();
}

function seedInitialData() {
  const groupCount = db.prepare('SELECT COUNT(*) as count FROM groups').get() as { count: number };
  if (groupCount.count > 0) {
    return;
  }

  const groupId = 'group-bbg-main';
  const insertGroup = db.prepare(`
    INSERT INTO groups (id, name, slug, monthly_quota)
    VALUES (?, ?, ?, ?)
  `);
  insertGroup.run(groupId, 'BBG Brasil', 'bbg', 30);

  // Hash de senha padrão 'bbg123'
  const passwordHash = bcrypt.hashSync('bbg123', 10);

  // Inserir Administrador: Elias Alves - Designer
  const adminId = 'user-elias-admin';
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, department, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(
    adminId,
    'Elias Alves',
    'elias@bbgcreative.com',
    passwordHash,
    'admin',
    'Design & Criação',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );

  // Inserir Usuários BBG
  const bbgUser1Id = 'user-bbg-marketing';
  insertUser.run(
    bbgUser1Id,
    'Mariana Silva (Marketing)',
    'marketing@bbg.com.br',
    passwordHash,
    'bbg_user',
    'Marketing',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  );

  const bbgUser2Id = 'user-bbg-comercial';
  insertUser.run(
    bbgUser2Id,
    'Carlos Eduardo (Comercial)',
    'comercial@bbg.com.br',
    passwordHash,
    'bbg_user',
    'Comercial',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  );

  const bbgUser3Id = 'user-bbg-diretoria';
  insertUser.run(
    bbgUser3Id,
    'Renata Vasconcelos (Diretoria)',
    'diretoria@bbg.com.br',
    passwordHash,
    'bbg_user',
    'Diretoria',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  );

  // Associar ao grupo
  const insertMember = db.prepare(`
    INSERT INTO group_members (id, group_id, user_id, can_reorder_queue)
    VALUES (?, ?, ?, 1)
  `);
  insertMember.run('mem-1', groupId, adminId);
  insertMember.run('mem-2', groupId, bbgUser1Id);
  insertMember.run('mem-3', groupId, bbgUser2Id);
  insertMember.run('mem-4', groupId, bbgUser3Id);

  // Inicializar competência corrente (Outubro de 2026 como no briefing)
  const currentKey = '2026-10';
  const compId = `comp-${groupId}-${currentKey}`;
  const insertComp = db.prepare(`
    INSERT INTO monthly_competencies (id, group_id, competency_key, year, month, quota_contracted, credits_used)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertComp.run(compId, groupId, currentKey, 2026, 10, 30, 0);

  // Seed de algumas demandas representativas para demonstrar fila, kanban e fluxos
  const insertDemand = db.prepare(`
    INSERT INTO demands (
      id, code, group_id, competency_id, title, department, material_type, dimensions,
      briefing, required_texts, desired_deadline, agreed_deadline, agreed_deadline_updated_by,
      agreed_deadline_updated_at, status, queue_position, is_extra, extra_tag_applied,
      created_by, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  const insertTimeline = db.prepare(`
    INSERT INTO demand_timeline (id, demand_id, event_type, title, description, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTransaction = db.prepare(`
    INSERT INTO credit_transactions (id, group_id, competency_id, demand_id, amount, type, description, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Demanda 1: Post de Campanha Black Friday
  const d1Id = 'dem-001';
  insertDemand.run(
    d1Id,
    'BBG-2026-001',
    groupId,
    compId,
    'Campanha Black Friday - Anúncio Principal',
    'Marketing',
    'Post para Instagram',
    '1080x1350px (4:5)',
    'Arte principal para abertura da campanha Black Friday BBG com foco em produtos industriais e vantagens exclusivas.',
    'Black Friday BBG: Condições que transformam seu negócio. Até 40% OFF em itens selecionados.',
    '2026-10-30',
    '2026-10-29',
    adminId,
    '2026-10-20 10:00:00',
    'em_producao',
    1,
    0,
    0,
    bbgUser1Id,
    '2026-10-18 09:30:00'
  );
  insertTransaction.run('tx-001', groupId, compId, d1Id, -1, 'consumption', 'Consumo regular de cota mensal (1 crédito)', bbgUser1Id, '2026-10-18 09:30:00');
  insertTimeline.run('tl-001', d1Id, 'created', 'Solicitação criada', 'Demanda cadastrada por Mariana Silva e 1 crédito consumido da competência Outubro/2026.', bbgUser1Id, '2026-10-18 09:30:00');
  insertTimeline.run('tl-002', d1Id, 'deadline_agreed', 'Prazo acordado definido', 'Elias Alves definiu o prazo acordado para 29/10/2026.', adminId, '2026-10-20 10:00:00');
  insertTimeline.run('tl-003', d1Id, 'production_started', 'Produção iniciada', 'Elias Alves iniciou a produção visual.', adminId, '2026-10-21 14:00:00');

  // Demanda 2: Carrossel Institucional
  const d2Id = 'dem-002';
  insertDemand.run(
    d2Id,
    'BBG-2026-002',
    groupId,
    compId,
    'Carrossel Institucional - Nossos Pilares de ESG',
    'Diretoria',
    'Carrossel',
    '1080x1350px (5 lâminas)',
    'Carrossel explicativo com 5 lâminas destacando sustentabilidade, governança e responsabilidade social da BBG.',
    'Sustentabilidade que gera valor. Conheça as iniciativas ESG da BBG.',
    '2026-11-02',
    '2026-11-03',
    adminId,
    '2026-10-22 11:30:00',
    'na_fila',
    2,
    0,
    0,
    bbgUser3Id,
    '2026-10-21 16:15:00'
  );
  insertTransaction.run('tx-002', groupId, compId, d2Id, -1, 'consumption', 'Consumo regular de cota mensal (1 crédito)', bbgUser3Id, '2026-10-21 16:15:00');
  insertTimeline.run('tl-004', d2Id, 'created', 'Solicitação criada', 'Demanda cadastrada por Renata Vasconcelos e 1 crédito consumido da competência Outubro/2026.', bbgUser3Id, '2026-10-21 16:15:00');

  // Demanda 3: Banner Comercial com Entrega V1 aguardando aprovação
  const d3Id = 'dem-003';
  insertDemand.run(
    d3Id,
    'BBG-2026-003',
    groupId,
    compId,
    'Banner para Site e Feira de Negócios',
    'Comercial',
    'Banner digital',
    '1920x1080px',
    'Banner para destaque na home do portal corporativo e estande digital da Feira Nordeste.',
    'Soluções integradas com a solidez BBG. Fale com um consultor comercial.',
    '2026-10-28',
    '2026-10-27',
    adminId,
    '2026-10-23 09:00:00',
    'em_aprovacao',
    3,
    0,
    0,
    bbgUser2Id,
    '2026-10-22 08:45:00'
  );
  insertTransaction.run('tx-003', groupId, compId, d3Id, -1, 'consumption', 'Consumo regular de cota mensal (1 crédito)', bbgUser2Id, '2026-10-22 08:45:00');
  insertTimeline.run('tl-005', d3Id, 'created', 'Solicitação criada', 'Demanda cadastrada por Carlos Eduardo e 1 crédito consumido da competência Outubro/2026.', bbgUser2Id, '2026-10-22 08:45:00');

  // Adicionar entrega V1 para Demanda 3
  const deliveryId = 'del-001';
  db.prepare(`
    INSERT INTO demand_deliveries (id, demand_id, version, title, release_notes, external_links, delivered_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    deliveryId,
    d3Id,
    1,
    'Versão 1 - Banner Final em Alta Resolução',
    'Arte finalizada conforme identidade visual aprovada. Inclui opções em JPG e PNG com fundo transparente.',
    'https://drive.google.com/drive/folders/bbg-creative-mock',
    adminId,
    '2026-10-26 15:30:00'
  );

  db.prepare(`
    UPDATE demands
    SET first_delivery_at = '2026-10-26 15:30:00', last_delivery_at = '2026-10-26 15:30:00'
    WHERE id = ?
  `).run(d3Id);

  insertTimeline.run('tl-006', d3Id, 'delivery', 'Primeira entrega realizada (V1)', 'Elias Alves entregou a Versão 1 para avaliação e aprovação.', adminId, '2026-10-26 15:30:00');

  // Atualizar contagem de créditos usados na competência (3 demandas regulares criadas = 3 créditos usados)
  db.prepare(`
    UPDATE monthly_competencies
    SET credits_used = 3, updated_at = datetime('now')
    WHERE id = ?
  `).run(compId);
}
