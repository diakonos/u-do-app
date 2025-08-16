import { useQuery, useMutation } from 'convex/react';
import { Id } from '../../backend/convex/_generated/dataModel';
import { api } from '../../backend/convex/_generated/api';
import { Doc } from '../../backend/convex/_generated/dataModel';

export type Task = Doc<'tasks'>;

// Hook for fetching today's tasks
export function useTodayTasks(userId?: Id<'users'> | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tasks = useQuery(
    api.tasks.getTodayTasks,
    userId ? { userId, today: today.getTime() } : 'skip',
  );
  return { tasks: tasks ?? [], isLoading: tasks === undefined };
}

// Hook for fetching scheduled tasks
export function useScheduledTasks(userId?: Id<'users'> | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tasks = useQuery(
    api.tasks.getScheduledTasks,
    userId ? { userId, today: today.getTime() } : 'skip',
  );
  return { tasks: tasks ?? [], isLoading: tasks === undefined };
}

// Hook for fetching archived tasks
export function useArchivedTasks(userId: Id<'users'> | null, page: number, pageSize: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tasks = useQuery(
    api.tasks.getArchivedTasks,
    userId ? { userId, page, pageSize, beforeTime: today.getTime() } : 'skip',
  );
  return { tasks: tasks ?? [], isLoading: tasks === undefined };
}

// Hook for fetching archived tasks count
export function useArchivedTasksCount(userId?: Id<'users'> | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = useQuery(
    api.tasks.getArchivedTasksCount,
    userId ? { userId, beforeTime: today.getTime() } : 'skip',
  );
  return { count: count ?? 0, isLoading: count === undefined };
}

// Hook for creating a task
export function useCreateTask() {
  return useMutation(api.tasks.createTask);
}

// Hook for updating task name
export function useUpdateTaskName() {
  return useMutation(api.tasks.updateTaskName);
}

// Hook for toggling task done status
export function useToggleTaskDone() {
  return useMutation(api.tasks.toggleTaskDone);
}

// Hook for updating task privacy
export function useUpdateTaskIsPrivate() {
  return useMutation(api.tasks.updateTaskIsPrivate);
}

// Hook for deleting a task
export function useDeleteTask() {
  return useMutation(api.tasks.deleteTask);
}

// Hook for updating task due date
export function useUpdateTaskDueDate() {
  return useMutation(api.tasks.updateTaskDueDate);
}

// Hook for clearing archived tasks
export function useClearArchivedTasks() {
  return useMutation(api.tasks.clearArchivedTasks);
}

// Legacy function interfaces for backward compatibility
export async function fetchTodayTasks(_userId: string): Promise<Task[]> {
  throw new Error('Use useTodayTasks hook instead');
}

export async function fetchScheduledTasks(_userId: string): Promise<Task[]> {
  throw new Error('Use useScheduledTasks hook instead');
}

export async function createTask(
  _userId: string,
  _taskName: string,
  _dueDate?: Date | null,
  _isPrivate: boolean = false,
  _assignedBy?: string,
): Promise<Task> {
  throw new Error('Use useCreateTask hook instead');
}

export async function updateTaskName(_taskId: number, _taskName: string): Promise<Task> {
  throw new Error('Use useUpdateTaskName hook instead');
}

export async function toggleTaskDone(_taskId: number, _isDone: boolean): Promise<Task> {
  throw new Error('Use useToggleTaskDone hook instead');
}

export async function updateTaskIsPrivate(_taskId: number, _isPrivate: boolean): Promise<Task> {
  throw new Error('Use useUpdateTaskIsPrivate hook instead');
}

export async function deleteTask(_taskId: number): Promise<void> {
  throw new Error('Use useDeleteTask hook instead');
}

export async function updateTaskDueDate(_taskId: number, _dueDate: Date): Promise<Task> {
  throw new Error('Use useUpdateTaskDueDate hook instead');
}

export async function fetchArchivedTasks(
  _userId: string,
  _page: number,
  _pageSize: number,
): Promise<Task[]> {
  throw new Error('Use useArchivedTasks hook instead');
}

export async function fetchArchivedTasksCount(_userId: string): Promise<number> {
  throw new Error('Use useArchivedTasksCount hook instead');
}

export async function clearArchivedTasks(_userId: string): Promise<void> {
  throw new Error('Use useClearArchivedTasks hook instead');
}
