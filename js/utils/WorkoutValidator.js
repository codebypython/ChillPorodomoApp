import { clamp } from './TimeUtils.js';

export class WorkoutValidator {
    validateProgramRequest(request) {
        const errors = [];

        if (!request.templateId) {
            errors.push('Vui lòng chọn một template lịch tập');
        }

        if (!request.name || !request.name.trim()) {
            errors.push('Vui lòng nhập tên lịch tập');
        }

        if (!request.startDate) {
            errors.push('Vui lòng chọn ngày bắt đầu');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    sanitizeSessionExercise(exercise) {
        return {
            ...exercise,
            prescribedSets: clamp(parseInt(exercise.prescribedSets || 3, 10), 1, 8),
            repMin: clamp(parseInt(exercise.repMin || 8, 10), 1, 50),
            repMax: clamp(parseInt(exercise.repMax || 15, 10), 1, 60),
            restSeconds: clamp(parseInt(exercise.restSeconds || 60, 10), 15, 240),
            actualCompletedSets: clamp(parseInt(exercise.actualCompletedSets || 0, 10), 0, 12),
            actualMaxReps: clamp(parseInt(exercise.actualMaxReps || 0, 10), 0, 100),
            actualRpe: clamp(parseInt(exercise.actualRpe || 0, 10), 0, 10)
        };
    }

    sanitizeSessionCompletion(exercises = []) {
        return exercises.map(exercise => this.sanitizeSessionExercise(exercise));
    }

    validateSessionCompletion(exercises = []) {
        const errors = [];

        exercises.forEach((exercise, index) => {
            if (exercise.actualCompletedSets > exercise.prescribedSets + 2) {
                errors.push(`Bài ${index + 1}: số set hoàn thành vượt quá mức hợp lý`);
            }
            if (exercise.actualMaxReps > 0 && exercise.actualCompletedSets === 0) {
                errors.push(`Bài ${index + 1}: cần nhập số set nếu đã nhập rep thực tế`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
