export class WorkoutController {
    constructor({ workoutManager, workoutRenderer, notifier, onWorkoutUpdated }) {
        this.workoutManager = workoutManager;
        this.workoutRenderer = workoutRenderer;
        this.notifier = notifier;
        this.onWorkoutUpdated = onWorkoutUpdated;
        this.currentProgram = null;
        this.currentSession = null;
    }

    async renderExerciseWorkspace() {
        const builderContainer = document.getElementById('exerciseProgramBuilder');
        const programList = document.getElementById('exerciseProgramList');
        const sessionList = document.getElementById('exerciseSessionList');

        if (!builderContainer || !programList || !sessionList) {
            return;
        }

        await this.workoutManager.ensureSeedData();
        const templates = this.workoutManager.getProgramTemplates();
        const today = new Date();
        const startDate = document.getElementById('workoutStartDate')?.value || today.toISOString().split('T')[0];
        const selectedTemplateId = document.getElementById('workoutTemplateSelect')?.value || templates[0]?.id;
        const selectedTemplate = templates.find(template => template.id === selectedTemplateId) || templates[0];
        const recommendations = selectedTemplate
            ? await this.workoutManager.recommendScheduleForTemplate(selectedTemplate, startDate)
            : [];

        this.workoutRenderer.renderBuilder(builderContainer, { templates, recommendations });
        this.bindBuilderActions();

        const [programs, sessions] = await Promise.all([
            this.workoutManager.getPrograms(),
            this.workoutManager.getUpcomingSessions()
        ]);
        this.workoutRenderer.renderPrograms(programList, programs);
        this.workoutRenderer.renderSessions(sessionList, sessions);
        this.bindListActions();

        if (programs.length > 0 && !this.currentProgram) {
            await this.showProgram(programs[0].id);
        } else if (programs.length === 0) {
            const detailContainer = document.getElementById('exerciseScheduleContainer');
            if (detailContainer) {
                detailContainer.innerHTML = '<div class="empty-state"><p>Chọn hoặc tạo một lịch tập để xem chi tiết từng buổi.</p></div>';
            }
        }
    }

    bindBuilderActions() {
        document.getElementById('createWorkoutProgramBtn')?.addEventListener('click', async () => {
            try {
                const program = await this.workoutManager.createProgramFromTemplate({
                    name: document.getElementById('workoutProgramName')?.value || 'Muscle Focus Program',
                    templateId: document.getElementById('workoutTemplateSelect')?.value,
                    startDate: document.getElementById('workoutStartDate')?.value
                });

                this.notifier(`Đã tạo lịch tập "${program.name}"`, 'success');
                await this.renderExerciseWorkspace();
                await this.showProgram(program.id);
                await this.onWorkoutUpdated?.();
            } catch (error) {
                console.error('Failed to create workout program:', error);
                this.notifier(error.message || 'Không thể tạo lịch tập', 'danger');
            }
        });

        document.getElementById('viewTodayWorkoutBtn')?.addEventListener('click', async () => {
            const todaySession = await this.workoutManager.getRecommendedWorkoutForDate(new Date());
            if (!todaySession) {
                this.notifier('Hôm nay chưa có buổi tập nào được lên lịch', 'info');
                return;
            }
            await this.showSession(todaySession.id);
        });

        document.getElementById('workoutTemplateSelect')?.addEventListener('change', () => {
            this.renderExerciseWorkspace();
        });

        const startDateInput = document.getElementById('workoutStartDate');
        if (startDateInput && !startDateInput.value) {
            startDateInput.value = new Date().toISOString().split('T')[0];
        }
        startDateInput?.addEventListener('change', () => {
            this.renderExerciseWorkspace();
        });
    }

    bindListActions() {
        document.querySelectorAll('[data-action="view-workout-program"]').forEach(button => {
            button.addEventListener('click', async () => {
                await this.showProgram(parseInt(button.dataset.id, 10));
            });
        });

        document.querySelectorAll('[data-action="view-workout-session"]').forEach(button => {
            button.addEventListener('click', async () => {
                await this.showSession(parseInt(button.dataset.id, 10));
            });
        });
    }

    async showProgram(programId) {
        const container = document.getElementById('exerciseScheduleContainer');
        if (!container) return;

        const program = await this.workoutManager.getProgram(programId);
        if (!program) return;

        const sessions = await this.workoutManager.getSessionsForProgram(programId);
        this.currentProgram = program;
        container.innerHTML = `
            <div class="daily-schedule-view">
                <div class="daily-schedule-header">
                    <h2>${program.name}</h2>
                    <div class="date-info">
                        <span class="date-label">${program.templateName}</span>
                        <div class="schedule-stats">
                            <span class="stat-item">${program.daysPerWeek} buổi/tuần</span>
                            <span class="stat-item">${program.summary}</span>
                        </div>
                    </div>
                </div>
                <div class="daily-schedule-content">
                    ${sessions.map(session => `
                        <div class="activity-item planned">
                            <div class="activity-header">
                                <span class="activity-status">💪</span>
                                <span class="activity-time">${session.scheduledDate}</span>
                                <span class="activity-priority priority-medium">${session.dayFocus}</span>
                            </div>
                            <div class="activity-content">
                                <div class="activity-title">${session.label}</div>
                                <div class="activity-meta">
                                    <span>${session.estimatedDuration} phút</span>
                                    <span>${session.status}</span>
                                </div>
                                ${session.recommendationContext ? `<div class="activity-topic">${session.recommendationContext.reason}</div>` : ''}
                            </div>
                            <div class="activity-actions">
                                <button class="activity-btn complete" data-action="open-session" data-session-id="${session.id}">Mở buổi tập</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.style.display = 'block';

        container.querySelectorAll('[data-action="open-session"]').forEach(button => {
            button.addEventListener('click', async () => {
                await this.showSession(parseInt(button.dataset.sessionId, 10));
            });
        });
    }

    async showSession(sessionId) {
        const container = document.getElementById('exerciseScheduleContainer');
        if (!container) return;

        const session = await this.workoutManager.getWorkoutSession(sessionId);
        if (!session) return;

        this.currentSession = session;
        this.workoutRenderer.renderSessionDetail(container, session);
        container.style.display = 'block';
        this.bindSessionActions();
    }

    bindSessionActions() {
        document.getElementById('completeWorkoutSessionBtn')?.addEventListener('click', async () => {
            if (!this.currentSession) return;

            const exerciseUpdates = this.currentSession.exercises.map((exercise, index) => ({
                actualCompletedSets: document.querySelector(`.workout-actual-sets[data-index="${index}"]`)?.value,
                actualMaxReps: document.querySelector(`.workout-actual-reps[data-index="${index}"]`)?.value,
                actualRpe: document.querySelector(`.workout-actual-rpe[data-index="${index}"]`)?.value
            }));

            try {
                const updatedSession = await this.workoutManager.completeSession(this.currentSession.id, exerciseUpdates);
                this.notifier('Đã lưu kết quả buổi tập', 'success');
                await this.renderExerciseWorkspace();
                await this.showSession(updatedSession.id);
                await this.onWorkoutUpdated?.();
            } catch (error) {
                console.error('Failed to complete workout session:', error);
                this.notifier(error.message || 'Không thể lưu buổi tập', 'danger');
            }
        });

        document.getElementById('skipWorkoutSessionBtn')?.addEventListener('click', async () => {
            if (!this.currentSession) return;

            await this.workoutManager.syncSessionStatus(this.currentSession.id, 'skipped');
            this.notifier('Đã bỏ buổi tập hiện tại', 'info');
            await this.renderExerciseWorkspace();
            await this.onWorkoutUpdated?.();
        });
    }
}
