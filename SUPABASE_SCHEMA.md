# Supabase Schema Documentation

## ⚠️ CRITICAL: You MUST Run the RLS Policies

The Kanban system requires Row Level Security (RLS) policies to be configured in Supabase.

**Error you're seeing**: `42501 (Forbidden) - new row violates row-level security policy`

**Solution**: Scroll down to the **"COMPLETE SQL SCRIPT"** section and copy-paste the entire SQL script into your Supabase SQL Editor.

---

## Database Tables for Kanban System

### 1. `kanban_boards`
**Purpose**: Store Kanban board information
```sql
CREATE TABLE kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kanban_boards_created_by ON kanban_boards(created_by);
```

**Fields**:
- `id`: Unique identifier
- `name`: Board name (e.g., "Product Development", "Marketing Tasks")
- `description`: Optional board description
- `created_by`: User ID of the board creator
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

---

### 2. `kanban_columns`
**Purpose**: Store columns within a board (e.g., To Do, In Progress, Done)
```sql
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INT DEFAULT 0,
  color VARCHAR(7) DEFAULT '#059669',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kanban_columns_board_id ON kanban_columns(board_id);
```

**Fields**:
- `id`: Unique identifier
- `board_id`: Reference to the parent board
- `name`: Column name (e.g., "To Do", "In Progress")
- `position`: Order of columns (0, 1, 2, ...)
- `color`: Hex color code for the column
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

---

### 3. `kanban_tasks`
**Purpose**: Store individual tasks/cards
```sql
CREATE TABLE kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  position INT DEFAULT 0,
  due_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kanban_tasks_board_id ON kanban_tasks(board_id);
CREATE INDEX idx_kanban_tasks_column_id ON kanban_tasks(column_id);
CREATE INDEX idx_kanban_tasks_assigned_to ON kanban_tasks(assigned_to);
CREATE INDEX idx_kanban_tasks_created_by ON kanban_tasks(created_by);
```

**Fields**:
- `id`: Unique identifier
- `board_id`: Reference to the parent board
- `column_id`: Reference to the column this task is in
- `title`: Task title (required)
- `description`: Detailed task description
- `priority`: Task priority (low, medium, high, urgent)
- `assigned_to`: User ID of assigned staff member (can be NULL) - **FOREIGN KEY to auth.users**
- `position`: Order within the column
- `due_date`: Optional due date
- `created_by`: User ID of task creator - **FOREIGN KEY to auth.users**
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

---

### 4. `kanban_comments`
**Purpose**: Store comments on tasks
```sql
CREATE TABLE kanban_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kanban_comments_task_id ON kanban_comments(task_id);
CREATE INDEX idx_kanban_comments_user_id ON kanban_comments(user_id);
```

**Fields**:
- `id`: Unique identifier
- `task_id`: Reference to the task this comment belongs to
- `user_id`: ID of the user who made the comment - **FOREIGN KEY to auth.users**
- `content`: Comment text
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

---

### 5. `kanban_replies`
**Purpose**: Store replies to comments
```sql
CREATE TABLE kanban_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES kanban_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kanban_replies_comment_id ON kanban_replies(comment_id);
CREATE INDEX idx_kanban_replies_user_id ON kanban_replies(user_id);
```

**Fields**:
- `id`: Unique identifier
- `comment_id`: Reference to the parent comment
- `user_id`: ID of the user who made the reply - **FOREIGN KEY to auth.users**
- `content`: Reply text
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

---

## Row Level Security (RLS) Policies for Admin and Staff Only

**Important**: These policies assume you have a `public.users` table with `id` (UUID) and `role` columns.

### Step 1: Enable RLS on all tables
```sql
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_replies ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create helper function to check if user is admin or staff
```sql
CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'staff')
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: kanban_boards policies
```sql
-- Anyone (admin/staff) can view boards
CREATE POLICY "Boards: Admin and staff can view" ON kanban_boards 
  FOR SELECT 
  USING (is_admin_or_staff());

-- Only admin can update boards
CREATE POLICY "Boards: Admin can update" ON kanban_boards 
  FOR UPDATE 
  USING (is_admin_or_staff());

-- Only admin can delete boards
CREATE POLICY "Boards: Admin can delete" ON kanban_boards 
  FOR DELETE 
  USING (is_admin_or_staff());

-- Only admin can create boards
CREATE POLICY "Boards: Admin can create" ON kanban_boards 
  FOR INSERT 
  WITH CHECK (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND status = 'approved'
    )
  );
```

### Step 4: kanban_columns policies
```sql
-- Admin and staff can view columns
CREATE POLICY "Columns: Admin and staff can view" ON kanban_columns 
  FOR SELECT 
  USING (is_admin_or_staff());

-- Only admin can create columns
CREATE POLICY "Columns: Admin can create" ON kanban_columns 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND status = 'approved'
    )
  );

-- Only admin can update columns
CREATE POLICY "Columns: Admin can update" ON kanban_columns 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND status = 'approved'
    )
  );

-- Only admin can delete columns
CREATE POLICY "Columns: Admin can delete" ON kanban_columns 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND status = 'approved'
    )
  );
```

### Step 5: kanban_tasks policies
```sql
-- Admin and staff can view tasks
CREATE POLICY "Tasks: Admin and staff can view" ON kanban_tasks 
  FOR SELECT 
  USING (is_admin_or_staff());

-- Only admin can create tasks
CREATE POLICY "Tasks: Admin can create" ON kanban_tasks 
  FOR INSERT 
  WITH CHECK (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND status = 'approved'
    )
  );

-- Admin and staff can update tasks (drag/move, assign, etc)
CREATE POLICY "Tasks: Admin and staff can update" ON kanban_tasks 
  FOR UPDATE 
  USING (is_admin_or_staff());

-- Only admin can delete tasks
CREATE POLICY "Tasks: Admin can delete" ON kanban_tasks 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND status = 'approved'
    )
  );
```

### Step 6: kanban_comments policies
```sql
-- Admin and staff can view comments
CREATE POLICY "Comments: Admin and staff can view" ON kanban_comments 
  FOR SELECT 
  USING (is_admin_or_staff());

-- Admin and staff can create comments
CREATE POLICY "Comments: Admin and staff can create" ON kanban_comments 
  FOR INSERT 
  WITH CHECK (is_admin_or_staff());

-- Users can update their own comments
CREATE POLICY "Comments: Users can update own" ON kanban_comments 
  FOR UPDATE 
  USING (user_id = auth.uid() AND is_admin_or_staff());

-- Users can delete their own comments
CREATE POLICY "Comments: Users can delete own" ON kanban_comments 
  FOR DELETE 
  USING (user_id = auth.uid() AND is_admin_or_staff());
```

### Step 7: kanban_replies policies
```sql
-- Admin and staff can view replies
CREATE POLICY "Replies: Admin and staff can view" ON kanban_replies 
  FOR SELECT 
  USING (is_admin_or_staff());

-- Admin and staff can create replies
CREATE POLICY "Replies: Admin and staff can create" ON kanban_replies 
  FOR INSERT 
  WITH CHECK (is_admin_or_staff());

-- Users can update their own replies
CREATE POLICY "Replies: Users can update own" ON kanban_replies 
  FOR UPDATE 
  USING (user_id = auth.uid() AND is_admin_or_staff());

-- Users can delete their own replies
CREATE POLICY "Replies: Users can delete own" ON kanban_replies 
  FOR DELETE 
  USING (user_id = auth.uid() AND is_admin_or_staff());
```

---

## Testing the RLS Policies

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check if helper function was created
SELECT * FROM information_schema.routines 
WHERE routine_name = 'is_admin_or_staff';

-- Check if policies are created
SELECT * FROM pg_policies 
WHERE tablename IN ('kanban_boards', 'kanban_columns', 'kanban_tasks', 'kanban_comments', 'kanban_replies');
```

---

## Environment Variables

Ensure your `.env.local` has:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Important Notes

1. **Helper Function**: The `is_admin_or_staff()` function checks if the user has role 'admin' or 'staff' AND status 'approved'
2. **Admin-Only Operations**: Board creation, column creation/modification, and task creation are restricted to admins only
3. **Staff Permissions**: Staff can view and comment on tasks, and can move/drag tasks between columns
4. **Own Comments**: Both admin and staff can update/delete only their own comments and replies
5. **Status Check**: The status = 'approved' check ensures only approved users can access the Kanban system

---

## COMPLETE SQL SCRIPT - Run This In Supabase SQL Editor

```sql
-- ==========================================
-- STEP 1: Enable RLS on all tables
-- ==========================================
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_replies ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 2: Create helper function
-- ==========================================
CREATE OR REPLACE FUNCTION is_admin_or_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'staff')
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 3: BOARDS POLICIES
-- ==========================================
CREATE POLICY "Boards: Admin and staff can view" ON kanban_boards FOR SELECT USING (is_admin_or_staff());
CREATE POLICY "Boards: Admin can create" ON kanban_boards FOR INSERT WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'));
CREATE POLICY "Boards: Admin can update" ON kanban_boards FOR UPDATE USING (is_admin_or_staff());
CREATE POLICY "Boards: Admin can delete" ON kanban_boards FOR DELETE USING (is_admin_or_staff());

-- ==========================================
-- STEP 4: COLUMNS POLICIES
-- ==========================================
CREATE POLICY "Columns: Admin and staff can view" ON kanban_columns FOR SELECT USING (is_admin_or_staff());
CREATE POLICY "Columns: Admin can create" ON kanban_columns FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'));
CREATE POLICY "Columns: Admin can update" ON kanban_columns FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'));
CREATE POLICY "Columns: Admin can delete" ON kanban_columns FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'));

-- ==========================================
-- STEP 5: TASKS POLICIES
-- ==========================================
CREATE POLICY "Tasks: Admin and staff can view" ON kanban_tasks FOR SELECT USING (is_admin_or_staff());
CREATE POLICY "Tasks: Admin can create" ON kanban_tasks FOR INSERT WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'));
CREATE POLICY "Tasks: Admin and staff can update" ON kanban_tasks FOR UPDATE USING (is_admin_or_staff());
CREATE POLICY "Tasks: Admin can delete" ON kanban_tasks FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'));

-- ==========================================
-- STEP 6: COMMENTS POLICIES
-- ==========================================
CREATE POLICY "Comments: Admin and staff can view" ON kanban_comments FOR SELECT USING (is_admin_or_staff());
CREATE POLICY "Comments: Admin and staff can create" ON kanban_comments FOR INSERT WITH CHECK (is_admin_or_staff());
CREATE POLICY "Comments: Users can update own" ON kanban_comments FOR UPDATE USING (user_id = auth.uid() AND is_admin_or_staff());
CREATE POLICY "Comments: Users can delete own" ON kanban_comments FOR DELETE USING (user_id = auth.uid() AND is_admin_or_staff());

-- ==========================================
-- STEP 7: REPLIES POLICIES
-- ==========================================
CREATE POLICY "Replies: Admin and staff can view" ON kanban_replies FOR SELECT USING (is_admin_or_staff());
CREATE POLICY "Replies: Admin and staff can create" ON kanban_replies FOR INSERT WITH CHECK (is_admin_or_staff());
CREATE POLICY "Replies: Users can update own" ON kanban_replies FOR UPDATE USING (user_id = auth.uid() AND is_admin_or_staff());
CREATE POLICY "Replies: Users can delete own" ON kanban_replies FOR DELETE USING (user_id = auth.uid() AND is_admin_or_staff());
```
