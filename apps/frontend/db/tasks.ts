import { supabase } from '@/lib/supabase';
import { formatDateForDBTimestamp, formatDateYMD } from '@/lib/date';
import { generateTimestamp } from '@/db/lib';

export interface Task {
  id: number;
  task_name: string;
  due_date?: string | null;
  is_done: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Fetch tasks due today or not done but updated today
export async function fetchTodayTasks(userId: string) {
  const updatedAtMin = new Date();
  updatedAtMin.setHours(0, 0, 0, 0);
  const updatedAtMinTimeestamp = formatDateForDBTimestamp(updatedAtMin);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowStr = formatDateYMD(tomorrow);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .or(
      `and(is_done.eq.false,due_date.is.null),and(is_done.eq.false,due_date.lt.${tomorrowStr}),and(is_done.eq.true,updated_at.gte.${updatedAtMinTimeestamp})`,
    )
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Task[];
}

// Fetch scheduled (future, not done) tasks for a user
export async function fetchScheduledTasks(userId: string) {
  const today = formatDateYMD(new Date());
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_done', false)
    .gt('due_date', today)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data as Task[];
}

export async function createTask(userId: string, taskName: string, dueDate?: Date | null) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        user_id: userId,
        task_name: taskName,
        due_date: dueDate ? formatDateYMD(dueDate) : null,
        updated_at: generateTimestamp(),
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTaskName(taskId: number, taskName: string) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ task_name: taskName, updated_at: generateTimestamp() })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function toggleTaskDone(taskId: number, isDone: boolean) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ is_done: isDone, updated_at: generateTimestamp() })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(taskId: number) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function updateTaskDueDate(taskId: number, dueDate: Date) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      due_date: formatDateYMD(dueDate),
      updated_at: generateTimestamp(),
    })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

// Fetch archived (done, updated before today) tasks for a user, paginated
export async function fetchArchivedTasks(userId: string, page: number, pageSize: number) {
  const today = formatDateYMD(new Date());
  const offset = (page - 1) * pageSize;
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_done', true)
    .lt('updated_at', today)
    .order('updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;
  return data as Task[];
}

// Fetch total count of archived tasks for a user
export async function fetchArchivedTasksCount(userId: string) {
  const today = formatDateYMD(new Date());
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_done', true)
    .lt('updated_at', today);
  if (error) throw error;
  return count ?? 0;
}
