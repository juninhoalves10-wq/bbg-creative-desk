# BBG Creative Desk - Guia de Conexão com o Supabase

O **BBG Creative Desk** foi construído com arquitetura pronta para PostgreSQL + Supabase. Atualmente, a aplicação executa um backend Node/Express com banco relacional SQLite nativo (WAL mode e transações atômicas ACID), permitindo uso imediato com persistência total em disco.

Para migrar ou conectar diretamente ao Supabase gerenciado na nuvem:

---

### 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto (ex: `bbg-creative-desk`).
2. Defina uma senha forte para o banco de dados.
3. Escolha a região mais próxima (ex: `sa-east-1` São Paulo).

---

### 2. Executar o Script SQL
1. No painel do seu projeto Supabase, acesse **SQL Editor**.
2. Clique em **New query**.
3. Copie todo o conteúdo do arquivo `supabase/schema.sql` deste repositório e cole no editor.
4. Clique em **Run**. Todas as tabelas, índices, políticas de segurança RLS e a função atômica `create_regular_demand` serão provisionadas.

---

### 3. Configurar Storage de Arquivos
1. No painel do Supabase, vá em **Storage** > **New bucket**.
2. Crie dois buckets:
   - `briefing-files` (Privado)
   - `artwork-deliveries` (Privado)
3. Configure as políticas de acesso para usuários autenticados da BBG e Administrador.

---

### 4. Configurar Variáveis de Ambiente
Adicione ao seu `.env`:
```env
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_ANON_KEY="sua-anon-key-publica"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-somente-no-servidor"
```

---

### 5. Primeiro Administrador
Para criar o usuário de **Elias Alves - Designer** no Supabase Auth:
1. Vá em **Authentication** > **Users** > **Add User**.
2. E-mail: `elias@bbgcreative.com`
3. Na tabela `public.profiles`, insira o registro correspondente com `role = 'admin'`.
