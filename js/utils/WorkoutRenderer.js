export class WorkoutRenderer {
    renderBuilder(container, { templates, recommendations }) {
        if (!container) return;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Muscle-Focused No-Equipment Planner</h3>
                <p class="planner-task-meta">Thiết kế theo hướng hypertrophy thực dụng: 2-4 lần/tuần mỗi nhóm cơ, rep range rộng 6-20, tập gần thất bại kỹ thuật và progression theo biến thể/reps/set.</p>
                <div class="setting-item">
                    <label for="workoutProgramName">Tên lịch tập</label>
                    <input id="workoutProgramName" type="text" placeholder="Ví dụ: Lean Muscle March">
                </div>
                <div class="setting-item">
                    <label for="workoutTemplateSelect">Template mặc định</label>
                    <select id="workoutTemplateSelect">
                        ${templates.map(template => `<option value="${template.id}">${template.name} - ${template.summary}</option>`).join('')}
                    </select>
                </div>
                <div class="setting-item">
                    <label for="workoutStartDate">Ngày bắt đầu</label>
                    <input id="workoutStartDate" type="date">
                </div>
                <div class="settings-actions">
                    <button id="createWorkoutProgramBtn" class="btn-action primary">Tạo lịch tập</button>
                    <button id="viewTodayWorkoutBtn" class="btn-action secondary">Xem buổi tập hôm nay</button>
                </div>
            </div>
            <div class="settings-section">
                <h3>Gợi ý xếp lịch theo thời gian rảnh</h3>
                <div id="workoutRecommendationsPanel" class="library-grid">
                    ${this.renderRecommendationCards(recommendations)}
                </div>
            </div>
        `;
    }

    renderRecommendationCards(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return '<div class="text-muted">Chọn template để xem gợi ý ngày tập dựa trên lịch hiện tại.</div>';
        }

        return recommendations.map(item => `
            <div class="planner-task-card pending">
                <div class="planner-task-header">
                    <div>
                        <div class="planner-task-title">${item.label}</div>
                        <div class="planner-task-meta">${item.date} • ${item.duration} phút • còn khoảng ${item.freeMinutes} phút trống</div>
                    </div>
                </div>
                <div class="planner-task-notes">${item.reason}</div>
            </div>
        `).join('');
    }

    renderPrograms(container, programs) {
        if (!container) return;

        if (!programs || programs.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Chưa có lịch tập nào. Hãy tạo từ một template hypertrophy no-equipment.</p></div>';
            return;
        }

        container.innerHTML = programs.map(program => `
            <div class="schedule-card" data-program-id="${program.id}">
                <div class="schedule-card-header">
                    <h3 class="schedule-card-title">${program.name}</h3>
                    <span class="schedule-card-type">${program.templateName}</span>
                </div>
                <div class="schedule-card-body">
                    <div class="schedule-card-info">
                        <span class="schedule-info-item"><span class="info-icon">📆</span>${program.daysPerWeek} buổi/tuần</span>
                        <span class="schedule-info-item"><span class="info-icon">💪</span>${program.splitType}</span>
                    </div>
                </div>
                <div class="schedule-card-actions">
                    <button class="schedule-card-btn view" data-action="view-workout-program" data-id="${program.id}">👁️ Xem</button>
                </div>
            </div>
        `).join('');
    }

    renderSessions(container, sessions) {
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Chưa có buổi tập nào được lên lịch.</p></div>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="schedule-card daily-schedule-card" data-session-id="${session.id}">
                <div class="schedule-card-header">
                    <h3 class="schedule-card-title">${session.label}</h3>
                    <span class="schedule-card-type">${this.getStatusLabel(session.status)}</span>
                </div>
                <div class="schedule-card-body">
                    <div class="schedule-card-info">
                        <span class="schedule-info-item"><span class="info-icon">📅</span>${session.scheduledDate}</span>
                        <span class="schedule-info-item"><span class="info-icon">⏱️</span>${session.estimatedDuration} phút</span>
                        <span class="schedule-info-item"><span class="info-icon">🎯</span>${session.dayFocus}</span>
                    </div>
                </div>
                <div class="schedule-card-actions">
                    <button class="schedule-card-btn view" data-action="view-workout-session" data-id="${session.id}">👁️ Chi tiết</button>
                </div>
            </div>
        `).join('');
    }

    renderSessionDetail(container, session) {
        if (!container || !session) return;

        container.innerHTML = `
            <div class="daily-schedule-view">
                <div class="daily-schedule-header">
                    <h2>${session.label}</h2>
                    <div class="date-info">
                        <span class="date-label">${session.scheduledDate}</span>
                        <div class="schedule-stats">
                            <span class="stat-item">⏱️ ${session.estimatedDuration} phút</span>
                            <span class="stat-item">🎯 ${session.dayFocus}</span>
                        </div>
                    </div>
                </div>
                <div class="daily-schedule-content">
                    ${session.exercises.map((exercise, index) => `
                        <div class="activity-item planned">
                            <div class="activity-header">
                                <span class="activity-status">💪</span>
                                <span class="activity-time">${exercise.prescribedSets} set • ${exercise.repMin}-${exercise.repMax} reps</span>
                                <span class="activity-priority priority-medium">${exercise.primaryFocus || ''}</span>
                            </div>
                            <div class="activity-content">
                                <div class="activity-title">${exercise.exerciseName}</div>
                                <div class="activity-meta">
                                    <span>Tempo ${exercise.tempo}</span>
                                    <span>Nghỉ ${exercise.restSeconds}s</span>
                                </div>
                                <div class="activity-topic">${exercise.safetyNotes}</div>
                                <div class="input-row" style="margin-top: 1rem;">
                                    <div class="input-group">
                                        <label>Set hoàn thành</label>
                                        <input class="workout-actual-sets" data-index="${index}" type="number" min="0" max="12" value="${exercise.actualCompletedSets || 0}">
                                    </div>
                                    <div class="input-group">
                                        <label>Rep cao nhất</label>
                                        <input class="workout-actual-reps" data-index="${index}" type="number" min="0" max="100" value="${exercise.actualMaxReps || 0}">
                                    </div>
                                    <div class="input-group">
                                        <label>RPE</label>
                                        <input class="workout-actual-rpe" data-index="${index}" type="number" min="0" max="10" value="${exercise.actualRpe || 0}">
                                    </div>
                                </div>
                                <div class="activity-topic">Progression: ${exercise.progression}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${session.recommendationContext ? `
                    <div class="schedule-notes">
                        <h4>Gợi ý xếp lịch</h4>
                        <p>${session.recommendationContext.reason}</p>
                    </div>
                ` : ''}
                <div class="schedule-actions">
                    <button id="completeWorkoutSessionBtn" class="btn-action primary" data-session-id="${session.id}">Đánh dấu hoàn thành</button>
                    <button id="skipWorkoutSessionBtn" class="btn-action danger" data-session-id="${session.id}">Bỏ buổi tập</button>
                </div>
            </div>
        `;
    }

    renderWorkoutAnalytics(container, analytics) {
        if (!container) return;

        container.innerHTML = analytics.topMuscles.length === 0
            ? '<div class="text-muted">Chưa có dữ liệu workout. Hoàn thành ít nhất một buổi tập để xem phân tích tăng cơ.</div>'
            : analytics.topMuscles.map(item => `
                <div class="planner-due-item">
                    <strong>${this.formatMuscle(item.muscle)}</strong>
                    <span>${item.sets} effective sets</span>
                </div>
            `).join('');
    }

    getStatusLabel(status) {
        const labels = {
            planned: 'Đã lên lịch',
            completed: 'Đã hoàn thành',
            skipped: 'Đã bỏ'
        };
        return labels[status] || 'Đã lên lịch';
    }

    formatMuscle(muscle) {
        return muscle
            .split('_')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
}
