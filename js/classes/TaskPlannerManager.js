import { storageManager } from './StorageManager.js';
import { clamp, formatDateKey, getHourFromTime } from '../utils/TimeUtils.js';

export class TaskPlannerManager {
    constructor() {
        this.storageManager = storageManager;
        this.goalStorageKey = 'chillpomodoro-study-goals';
    }

    getGoals() {
        const stored = localStorage.getItem(this.goalStorageKey);
        if (stored) {
            return JSON.parse(stored);
        }

        return {
            dailyPomodoros: 4,
            weeklyStudyMinutes: 600
        };
    }

    saveGoals(goals) {
        const normalized = {
            dailyPomodoros: clamp(parseInt(goals.dailyPomodoros || 4, 10), 1, 20),
            weeklyStudyMinutes: clamp(parseInt(goals.weeklyStudyMinutes || 600, 10), 60, 5000)
        };
        localStorage.setItem(this.goalStorageKey, JSON.stringify(normalized));
        return normalized;
    }

    normalizeTask(taskData) {
        const now = new Date().toISOString();
        return {
            title: (taskData.title || '').trim(),
            subject: (taskData.subject || 'Khác').trim(),
            priority: taskData.priority || 'medium',
            focusLevel: taskData.focusLevel || 'medium',
            estimatedDuration: clamp(parseInt(taskData.estimatedDuration || 45, 10), 15, 480),
            deadline: taskData.deadline || '',
            targetDate: taskData.targetDate || '',
            notes: (taskData.notes || '').trim(),
            plannedPomodoros: clamp(parseInt(taskData.plannedPomodoros || 1, 10), 1, 12),
            completedPomodoros: parseInt(taskData.completedPomodoros || 0, 10),
            actualFocusMinutes: parseInt(taskData.actualFocusMinutes || 0, 10),
            status: taskData.status || 'pending',
            createdAt: taskData.createdAt || now,
            updatedAt: now
        };
    }

    validateTask(task) {
        if (!task.title) {
            throw new Error('Vui lòng nhập tên task học tập');
        }
    }

    async createTask(taskData) {
        const task = this.normalizeTask(taskData);
        this.validateTask(task);
        const id = await this.storageManager.addItem('studyTasks', task);
        return { ...task, id };
    }

    async updateTask(taskData) {
        const task = this.normalizeTask(taskData);
        task.id = taskData.id;
        this.validateTask(task);
        await this.storageManager.updateItem('studyTasks', task);
        return task;
    }

    async deleteTask(id) {
        await this.storageManager.deleteItem('studyTasks', id);
    }

    async getTask(id) {
        return this.storageManager.getItem('studyTasks', id);
    }

    async getAllTasks() {
        const tasks = await this.storageManager.getAllItems('studyTasks');
        return tasks.sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'completed' ? 1 : -1;
            }
            if (a.deadline && b.deadline && a.deadline !== b.deadline) {
                return a.deadline.localeCompare(b.deadline);
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    async getPendingTasks() {
        const pending = await this.storageManager.getStudyTasksByStatus('pending');
        const inProgress = await this.storageManager.getStudyTasksByStatus('in_progress');
        return [...pending, ...inProgress].sort((a, b) => {
            if (a.deadline && b.deadline && a.deadline !== b.deadline) {
                return a.deadline.localeCompare(b.deadline);
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    }

    async getTasksForPlanning(targetDate) {
        const dateKey = formatDateKey(targetDate);
        const tasks = await this.getPendingTasks();
        return tasks.filter(task => {
            if (!task.targetDate && !task.deadline) {
                return true;
            }

            const plannedDate = task.targetDate || task.deadline;
            return plannedDate <= dateKey;
        });
    }

    async setTaskStatus(id, status) {
        const task = await this.getTask(id);
        if (!task) {
            throw new Error('Task không tồn tại');
        }

        task.status = status;
        task.updatedAt = new Date().toISOString();
        await this.storageManager.updateItem('studyTasks', task);
        return task;
    }

    async recordFocusSession(session) {
        return this.storageManager.addItem('focusSessions', {
            taskId: session.taskId || null,
            taskTitle: session.taskTitle || '',
            subject: session.subject || 'Khác',
            plannedMinutes: parseInt(session.plannedMinutes || 0, 10),
            actualMinutes: parseInt(session.actualMinutes || 0, 10),
            completed: Boolean(session.completed),
            date: session.date || formatDateKey(new Date()),
            startedAt: session.startedAt || new Date().toISOString(),
            endedAt: session.endedAt || new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
    }

    async completePomodoroForTask(taskId, minutes, sessionMeta = {}) {
        if (!taskId) {
            return null;
        }

        const task = await this.getTask(taskId);
        if (!task) {
            return null;
        }

        task.status = task.status === 'completed' ? 'completed' : 'in_progress';
        task.completedPomodoros = (task.completedPomodoros || 0) + 1;
        task.actualFocusMinutes = (task.actualFocusMinutes || 0) + minutes;
        task.updatedAt = new Date().toISOString();

        if (task.actualFocusMinutes >= task.estimatedDuration) {
            task.status = 'completed';
        }

        await this.storageManager.updateItem('studyTasks', task);
        await this.recordFocusSession({
            taskId: task.id,
            taskTitle: task.title,
            subject: task.subject,
            plannedMinutes: sessionMeta.plannedMinutes || minutes,
            actualMinutes: minutes,
            completed: sessionMeta.completed ?? true,
            date: sessionMeta.date || formatDateKey(new Date()),
            startedAt: sessionMeta.startedAt,
            endedAt: sessionMeta.endedAt
        });

        return task;
    }

    async getAnalytics() {
        const [tasks, focusSessions] = await Promise.all([
            this.getAllTasks(),
            this.storageManager.getAllItems('focusSessions')
        ]);

        const bySubject = new Map();
        const byHour = new Map();

        for (const session of focusSessions) {
            const subject = session.subject || 'Khác';
            bySubject.set(subject, (bySubject.get(subject) || 0) + (session.actualMinutes || 0));

            if (session.startedAt) {
                const hour = getHourFromTime(new Date(session.startedAt).toTimeString().slice(0, 5));
                byHour.set(hour, (byHour.get(hour) || 0) + (session.actualMinutes || 0));
            }
        }

        const plannedMinutes = tasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0);
        const actualMinutes = tasks.reduce((sum, task) => sum + (task.actualFocusMinutes || 0), 0);

        return {
            totalTasks: tasks.length,
            pendingTasks: tasks.filter(task => task.status !== 'completed').length,
            completedTasks: tasks.filter(task => task.status === 'completed').length,
            plannedMinutes,
            actualMinutes,
            bySubject: Array.from(bySubject.entries())
                .map(([subject, minutes]) => ({ subject, minutes }))
                .sort((a, b) => b.minutes - a.minutes),
            byHour: Array.from(byHour.entries())
                .map(([hour, minutes]) => ({ hour, minutes }))
                .sort((a, b) => a.hour - b.hour),
            dueSoon: tasks
                .filter(task => task.status !== 'completed' && task.deadline)
                .sort((a, b) => a.deadline.localeCompare(b.deadline))
                .slice(0, 5)
        };
    }
}
