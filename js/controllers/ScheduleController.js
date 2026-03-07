export class ScheduleController {
    constructor({
        scheduleManager,
        scheduleRenderer,
        dailyActivityManager,
        dailyScheduleRenderer,
        notifier,
        onDailyScheduleOpened
    }) {
        this.scheduleManager = scheduleManager;
        this.scheduleRenderer = scheduleRenderer;
        this.dailyActivityManager = dailyActivityManager;
        this.dailyScheduleRenderer = dailyScheduleRenderer;
        this.notifier = notifier;
        this.onDailyScheduleOpened = onDailyScheduleOpened;
        this.currentDailySchedule = null;
        this.currentDailyList = [];
        this.boundDailyHandler = null;
    }

    async renderClassSchedules() {
        const scheduleList = document.getElementById('scheduleList');
        if (!scheduleList) return;

        await this.scheduleManager.loadSchedules();
        const schedules = this.scheduleManager.schedules.filter(schedule => schedule.type === 'class');

        this.scheduleRenderer.renderScheduleList(
            scheduleList,
            schedules,
            async (id) => {
                const schedule = await this.scheduleManager.getSchedule(id);
                if (schedule) {
                    const container = document.getElementById('scheduleTableContainer');
                    this.scheduleRenderer.renderWeeklySchedule(container, schedule);
                }
            },
            async (id) => {
                await this.scheduleManager.deleteSchedule(id);
                await this.renderClassSchedules();
                this.notifier('Đã xóa lịch học', 'success');

                const container = document.getElementById('scheduleTableContainer');
                if (container && this.scheduleManager.currentSchedule?.id === id) {
                    container.style.display = 'none';
                    this.scheduleManager.currentSchedule = null;
                }
            }
        );
    }

    async renderDailySchedules() {
        const dailyScheduleList = document.getElementById('dailyScheduleList');
        if (!dailyScheduleList) return;

        try {
            const schedules = await this.dailyActivityManager.getAllDailyActivitySchedules();
            this.currentDailyList = schedules;

            if (!schedules || schedules.length === 0) {
                this.dailyScheduleRenderer.showEmpty(dailyScheduleList, 'Chưa có lịch sinh hoạt nào');
                return;
            }

            dailyScheduleList.innerHTML = schedules.map(schedule => {
                const date = this.dailyActivityManager.parseDate(schedule.date);
                const dayOfWeek = this.dailyScheduleRenderer.getDayOfWeekName(date);
                const completionRate = schedule.totalActivities > 0
                    ? Math.round((schedule.completedActivities / schedule.totalActivities) * 100)
                    : 0;

                return `
                    <div class="schedule-card daily-schedule-card" data-id="${schedule.id}">
                        <div class="schedule-card-header">
                            <h3 class="schedule-card-title">${dayOfWeek}, ${this.dailyScheduleRenderer.formatDateDisplay(date)}</h3>
                            <span class="schedule-card-type">🏠 Lịch Sinh Hoạt</span>
                        </div>
                        <div class="schedule-card-body">
                            <div class="schedule-card-info">
                                <span class="schedule-info-item">
                                    <span class="info-icon">✅</span>
                                    ${schedule.completedActivities}/${schedule.totalActivities} hoàn thành (${completionRate}%)
                                </span>
                                <span class="schedule-info-item">
                                    <span class="info-icon">📚</span>
                                    ${schedule.totalStudyTime} phút học
                                </span>
                                ${schedule.hasClassToday
                                    ? '<span class="schedule-info-item"><span class="info-icon">📖</span>Có lớp học</span>'
                                    : '<span class="schedule-info-item"><span class="info-icon">✨</span>Không có lớp</span>'
                                }
                            </div>
                        </div>
                        <div class="schedule-card-actions">
                            <button class="schedule-card-btn view" data-id="${schedule.id}">
                                👁️ Xem
                            </button>
                            <button class="schedule-card-btn delete" data-id="${schedule.id}">
                                🗑️ Xóa
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            dailyScheduleList.querySelectorAll('.schedule-card-btn.view').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = parseInt(btn.dataset.id, 10);
                    const schedule = schedules.find(item => item.id === id);
                    if (schedule) {
                        if (this.onDailyScheduleOpened) {
                            this.onDailyScheduleOpened(schedule);
                        } else {
                            this.showDailySchedule(schedule);
                        }
                    }
                });
            });

            dailyScheduleList.querySelectorAll('.schedule-card-btn.delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Bạn có chắc muốn xóa lịch sinh hoạt này?')) {
                        return;
                    }

                    const id = parseInt(btn.dataset.id, 10);
                    await this.dailyActivityManager.deleteDailyActivitySchedule(id);
                    if (this.currentDailySchedule?.id === id) {
                        const container = document.getElementById('dailyScheduleContainer');
                        if (container) {
                            container.style.display = 'none';
                        }
                        this.currentDailySchedule = null;
                    }
                    await this.renderDailySchedules();
                    this.notifier('Đã xóa lịch sinh hoạt', 'success');
                });
            });
        } catch (error) {
            console.error('Error rendering daily schedules:', error);
            this.dailyScheduleRenderer.showEmpty(dailyScheduleList, 'Lỗi khi tải lịch sinh hoạt');
        }
    }

    showDailySchedule(schedule) {
        const container = document.getElementById('dailyScheduleContainer');
        if (!container) return;

        this.currentDailySchedule = schedule;
        this.dailyScheduleRenderer.renderDailySchedule(container, schedule);
        container.style.display = 'block';
    }

    bindDailyScheduleActions(callbacks) {
        const container = document.getElementById('dailyScheduleContainer');
        if (!container) return;

        if (this.boundDailyHandler) {
            container.removeEventListener('click', this.boundDailyHandler);
        }

        this.boundDailyHandler = async (event) => {
            const target = event.target.closest('button');
            if (!target || !this.currentDailySchedule) {
                return;
            }

            const activityId = target.dataset.activityId;
            if (target.classList.contains('complete')) {
                await callbacks.onActivityStatus(this.currentDailySchedule, activityId, 'completed');
            } else if (target.classList.contains('skip')) {
                await callbacks.onActivityStatus(this.currentDailySchedule, activityId, 'skipped');
            } else if (target.id === 'editScheduleBtn') {
                callbacks.onEdit?.(this.currentDailySchedule);
            } else if (target.id === 'deleteScheduleBtn') {
                await callbacks.onDelete?.(this.currentDailySchedule);
            }
        };

        container.addEventListener('click', this.boundDailyHandler);
    }

    async refreshVisibleDailySchedule() {
        if (!this.currentDailySchedule?.date) {
            return null;
        }

        const updated = await this.dailyActivityManager.getDailyActivitySchedule(
            this.dailyActivityManager.parseDate(this.currentDailySchedule.date)
        );

        if (updated) {
            this.showDailySchedule(updated);
        }

        return updated;
    }
}
