import { create } from 'zustand';
import { Task } from '@/db/tasks';

interface State {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (taskId: number) => void;
}

export const useTaskStore = create<State>(set => ({
  tasks: [],
  setTasks: tasks => set({ tasks }),
  addTask: task => set(state => ({ tasks: [...state.tasks, task] })),
  updateTask: task =>
    set(state => ({ tasks: state.tasks.map(t => (t.id === task.id ? task : t)) })),
  removeTask: taskId => set(state => ({ tasks: state.tasks.filter(t => t.id !== taskId) })),
}));
