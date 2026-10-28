-- ==============================================================================
-- BBG CREATIVE DESK - ESQUEMA SUPABASE POSTGRESQL & POLÍTICAS RLS
-- Prestador: Elias Alves - Designer | Cliente: BBG Brasil
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Grupos / Organizações
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    monthly_quota INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Perfis de Usuários (sincronizados com auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'bbg_user')),
    department TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Associação de Usuários a Grupos
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    can_reorder_queue BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(group_id, user_id)
);

-- 5. Competências Mensais (Cota compartilhada por competência)
CREATE TABLE IF NOT EXISTS public.monthly_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    competency_key TEXT NOT NULL, -- ex: '2026-10'
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    quota_contracted INTEGER NOT NULL DEFAULT 30,
    credits_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(group_id, competency_key)
);

-- 6. Movimentações de Créditos (Ledger de auditoria)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES public.monthly_competencies(id) ON DELETE CASCADE,
    demand_id UUID,
    amount INTEGER NOT NULL, -- -1 para consumo regular, +1 para estorno, etc.
    type TEXT NOT NULL CHECK (type IN ('consumption', 'refund', 'adjustment')),
    description TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Solicitações de Design (Demandas)
CREATE TABLE IF NOT EXISTS public.demands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE, -- 'BBG-YYYY-XXX'
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES public.monthly_competencies(id),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    material_type TEXT NOT NULL,
    dimensions TEXT,
    briefing TEXT NOT NULL,
    required_texts TEXT,
    visual_references TEXT,
    reference_links TEXT,
    desired_deadline DATE,
    agreed_deadline DATE,
    agreed_deadline_updated_by UUID REFERENCES public.profiles(id),
    agreed_deadline_updated_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN (
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
    is_extra BOOLEAN NOT NULL DEFAULT false,
    extra_tag_applied BOOLEAN NOT NULL DEFAULT false,
    extra_tag_text TEXT,
    extra_cost NUMERIC(10, 2),
    extra_cost_terms TEXT,
    extra_evaluated_by UUID REFERENCES public.profiles(id),
    extra_evaluated_at TIMESTAMPTZ,
    extra_authorized_by UUID REFERENCES public.profiles(id),
    extra_authorized_at TIMESTAMPTZ,
    extra_rejection_reason TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    real_request_date TIMESTAMPTZ,
    is_retroactive BOOLEAN NOT NULL DEFAULT false,
    retroactive_registered_by UUID REFERENCES public.profiles(id),
    production_started_at TIMESTAMPTZ,
    first_delivery_at TIMESTAMPTZ,
    last_delivery_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    approved_version INTEGER
);

-- 8. Histórico de Posição na Fila
CREATE TABLE IF NOT EXISTS public.demand_priority_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    old_position INTEGER NOT NULL,
    new_position INTEGER NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Histórico de Mudanças de Status
CREATE TABLE IF NOT EXISTS public.demand_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    notes TEXT,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Entregas e Versões
CREATE TABLE IF NOT EXISTS public.demand_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    release_notes TEXT,
    external_links TEXT,
    delivered_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Arquivos Anexados
CREATE TABLE IF NOT EXISTS public.demand_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    delivery_id UUID REFERENCES public.demand_deliveries(id) ON DELETE SET NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_category TEXT NOT NULL CHECK (file_category IN ('briefing', 'delivery')),
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Comentários e Ajustes
CREATE TABLE IF NOT EXISTS public.demand_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    delivery_id UUID REFERENCES public.demand_deliveries(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('comment', 'adjustment_request', 'approval_note', 'admin_note')),
    comment TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Linha do Tempo Auditável
CREATE TABLE IF NOT EXISTS public.demand_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata_json JSONB,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    demand_id UUID REFERENCES public.demands(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ==============================================================================

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_priority_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exemplo de política: Usuários BBG e Admin podem ler dados de seu grupo
CREATE POLICY "Visualizar demandas do grupo" ON public.demands
    FOR SELECT USING (
        public.is_admin() OR
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

-- Somente admin ou membros podem criar demandas
CREATE POLICY "Criar demandas" ON public.demands
    FOR INSERT WITH CHECK (
        public.is_admin() OR
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

-- Somente admin pode alterar status internos de produção
CREATE POLICY "Admin gerencia status" ON public.demands
    FOR UPDATE USING (
        public.is_admin() OR
        (auth.uid() = created_by AND status IN ('pendente_autorizacao_extra', 'em_aprovacao'))
    );

-- ==============================================================================
-- FUNÇÃO ATÔMICA PARA CONSUMO DE CRÉDITO E CRIAÇÃO DA DEMANDA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_regular_demand(
    p_group_id UUID,
    p_competency_id UUID,
    p_title TEXT,
    p_department TEXT,
    p_material_type TEXT,
    p_dimensions TEXT,
    p_briefing TEXT,
    p_required_texts TEXT,
    p_desired_deadline DATE
) RETURNS JSONB AS $$
DECLARE
    v_comp RECORD;
    v_new_demand_id UUID;
    v_queue_pos INT;
    v_code TEXT;
BEGIN
    -- Bloquear registro de competência com FOR UPDATE para evitar concorrência
    SELECT * INTO v_comp
    FROM public.monthly_competencies
    WHERE id = p_competency_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Competência não encontrada.';
    END IF;

    IF (v_comp.quota_contracted - v_comp.credits_used) <= 0 THEN
        RAISE EXCEPTION 'Saldo de créditos insuficiente. Cadastre como solicitação extra.';
    END IF;

    -- Consumir 1 crédito
    UPDATE public.monthly_competencies
    SET credits_used = credits_used + 1, updated_at = now()
    WHERE id = p_competency_id;

    -- Próxima posição na fila
    SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_queue_pos
    FROM public.demands
    WHERE group_id = p_group_id AND status IN ('na_fila', 'em_producao', 'em_aprovacao', 'ajustes_solicitados');

    -- Gerar código
    v_code := 'BBG-' || v_comp.year || '-' || LPAD((v_comp.credits_used)::TEXT, 3, '0');

    -- Inserir demanda
    INSERT INTO public.demands (
        code, group_id, competency_id, title, department, material_type, dimensions,
        briefing, required_texts, desired_deadline, status, queue_position,
        is_extra, extra_tag_applied, created_by
    ) VALUES (
        v_code, p_group_id, p_competency_id, p_title, p_department, p_material_type, p_dimensions,
        p_briefing, p_required_texts, p_desired_deadline, 'na_fila', v_queue_pos,
        false, false, auth.uid()
    ) RETURNING id INTO v_new_demand_id;

    -- Registrar transação
    INSERT INTO public.credit_transactions (
        group_id, competency_id, demand_id, amount, type, description, user_id
    ) VALUES (
        p_group_id, p_competency_id, v_new_demand_id, -1, 'consumption',
        'Consumo regular de cota mensal (1 crédito)', auth.uid()
    );

    RETURN jsonb_build_object(
        'success', true,
        'demand_id', v_new_demand_id,
        'code', v_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
