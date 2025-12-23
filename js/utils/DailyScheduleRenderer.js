/**
 * DailyScheduleRenderer - Render daily activity schedule UI
 */

export class DailyScheduleRenderer {
    constructor(dailyActivityManager, activityScheduler) {
        this.dailyActivityManager = dailyActivityManager;
        this.activityScheduler = activityScheduler;
    }

    /**
     * Render form tạo daily activity schedule
     */
    renderCreateForm(container, targetDate) {
        if (!container) return;
        
        const dateStr = this.formatDate(targetDate);
        const dayOfWeek = this.getDayOfWeekName(targetDate);
        const timeSlots = this.dailyActivityManager.calculateTimeSlots(targetDate);
        const classCourses = timeSlots.classCourses;
        
        container.innerHTML = `
            <div class="daily-schedule-form">
                <div class="daily-schedule-header">
                    <h2>📅 Tạo Lịch Sinh Hoạt</h2>
                    <div class="date-info">
                        <span class="date-label">${dayOfWeek}, ${this.formatDateDisplay(targetDate)}</span>
                        ${timeSlots.hasClassToday ? 
                            `<span class="class-badge">📚 Có ${classCourses.length} môn học</span>` : 
                            `<span class="no-class-badge">✨ Không có lớp</span>`
                        }
                    </div>
                </div>

                <div class="time-slots-info">
                    <div class="time-slot-card morning">
                        <div class="time-slot-header">
                            <span class="time-slot-icon">🌅</span>
                            <span class="time-slot-title">Buổi Sáng</span>
                        </div>
                        <div class="time-slot-time">
                            ${timeSlots.morningSlot.startTime} - ${timeSlots.morningSlot.endTime}
                            <span class="time-slot-duration">(${timeSlots.morningSlot.duration} phút)</span>
                        </div>
                    </div>
                    <div class="time-slot-card afternoon">
                        <div class="time-slot-header">
                            <span class="time-slot-icon">🌆</span>
                            <span class="time-slot-title">Buổi Chiều/Tối</span>
                        </div>
                        <div class="time-slot-time">
                            ${timeSlots.afternoonSlot.startTime} - ${timeSlots.afternoonSlot.endTime}
                            <span class="time-slot-duration">(${timeSlots.afternoonSlot.duration} phút)</span>
                        </div>
                    </div>
                </div>

                <div class="course-selection-section">
                    <h3>📚 Chọn Môn Học Cần Chuẩn Bị</h3>
                    <div id="courseSelectionList" class="course-selection-list">
                        ${this.renderCourseSelectionList(classCourses)}
                    </div>
                    <button id="addCustomCourseBtn" class="btn-action secondary">
                        ➕ Thêm Môn Học Tùy Chỉnh
                    </button>
                </div>

                <div class="other-activities-section">
                    <h3>🎯 Hoạt Động Khác</h3>
                    <div id="otherActivitiesList" class="other-activities-list">
                        ${this.renderOtherActivitiesList()}
                    </div>
                    <button id="addActivityBtn" class="btn-action secondary">
                        ➕ Thêm Hoạt Động
                    </button>
                </div>

                <div class="notes-section">
                    <label for="scheduleNotes">📝 Ghi Chú</label>
                    <textarea id="scheduleNotes" class="notes-input" placeholder="Ghi chú thêm về lịch trình..."></textarea>
                </div>

                <div class="form-actions">
                    <button id="cancelScheduleBtn" class="btn-action secondary">❌ Hủy</button>
                    <button id="saveDraftBtn" class="btn-action info">💾 Lưu Nháp</button>
                    <button id="createScheduleBtn" class="btn-action primary">✅ Tạo Lịch</button>
                </div>
            </div>
        `;
    }

    /**
     * Render danh sách courses để chọn
     */
    renderCourseSelectionList(courses) {
        if (!courses || courses.length === 0) {
            return `
                <div class="empty-courses">
                    <p>Không có môn học nào vào ngày này</p>
                    <p class="hint">Bạn có thể thêm môn học tùy chỉnh</p>
                </div>
            `;
        }

        return courses.map((course, index) => `
            <div class="course-selection-item" data-course-id="${course.id || index}">
                <div class="course-selection-header">
                    <label class="course-checkbox">
                        <input type="checkbox" class="course-select-checkbox" data-course-id="${course.id || index}">
                        <span class="course-name">${course.name}</span>
                    </label>
                    <button class="expand-btn" data-course-id="${course.id || index}">
                        <span class="expand-icon">▼</span>
                    </button>
                </div>
                <div class="course-details" data-course-id="${course.id || index}" style="display: none;">
                    <div class="course-info">
                        <span class="course-time">⏰ ${course.startTime} - ${course.endTime}</span>
                        <span class="course-room">📍 ${course.scheduleInfo?.[0]?.room || 'N/A'}</span>
                    </div>
                    <div class="course-inputs">
                        <div class="input-group">
                            <label>Chủ đề:</label>
                            <input type="text" class="course-topic-input" 
                                   placeholder="VD: Design Patterns, OOP, ..." 
                                   data-course-id="${course.id || index}">
                        </div>
                        <div class="input-group">
                            <label>Nội dung chính:</label>
                            <textarea class="course-content-input" 
                                      placeholder="Mỗi dòng là một nội dung cần làm&#10;VD:&#10;Ôn lại Singleton pattern&#10;Làm bài tập Assignment 3&#10;Đọc tài liệu Chapter 5" 
                                      data-course-id="${course.id || index}"></textarea>
                        </div>
                        <div class="input-row">
                            <div class="input-group">
                                <label>Ưu tiên:</label>
                                <select class="course-priority-select" data-course-id="${course.id || index}">
                                    <option value="high">🔴 Cao</option>
                                    <option value="medium" selected>🟡 Trung bình</option>
                                    <option value="low">🟢 Thấp</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Thời gian (phút):</label>
                                <input type="number" class="course-duration-input" 
                                       value="60" min="15" step="15" 
                                       data-course-id="${course.id || index}">
                            </div>
                            <div class="input-group">
                                <label>Khung giờ:</label>
                                <select class="course-timeslot-select" data-course-id="${course.id || index}">
                                    <option value="auto">Tự động</option>
                                    <option value="morning">Buổi sáng</option>
                                    <option value="afternoon">Buổi chiều/tối</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render danh sách hoạt động khác
     */
    renderOtherActivitiesList() {
        const defaultActivities = [
            { id: 'exercise', name: 'Tập thể dục', type: 'exercise', icon: '💪', defaultDuration: 30 },
            { id: 'review', name: 'Ôn lại kiến thức hôm nay', type: 'review', icon: '📖', defaultDuration: 30 },
            { id: 'reading', name: 'Đọc sách', type: 'reading', icon: '📚', defaultDuration: 45 },
            { id: 'meal', name: 'Ăn uống', type: 'meal', icon: '🍽️', defaultDuration: 30 }
        ];

        return defaultActivities.map(activity => `
            <div class="other-activity-item" data-activity-id="${activity.id}">
                <label class="activity-checkbox">
                    <input type="checkbox" class="activity-select-checkbox" data-activity-id="${activity.id}">
                    <span class="activity-icon">${activity.icon}</span>
                    <span class="activity-name">${activity.name}</span>
                </label>
                <div class="activity-details" data-activity-id="${activity.id}" style="display: none;">
                    <div class="input-row">
                        <div class="input-group">
                            <label>Thời gian (phút):</label>
                            <input type="number" class="activity-duration-input" 
                                   value="${activity.defaultDuration}" min="15" step="15" 
                                   data-activity-id="${activity.id}">
                        </div>
                        <div class="input-group">
                            <label>Khung giờ:</label>
                            <select class="activity-timeslot-select" data-activity-id="${activity.id}">
                                <option value="auto">Tự động</option>
                                <option value="morning">Buổi sáng</option>
                                <option value="afternoon">Buổi chiều/tối</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render daily schedule đã tạo
     */
    renderDailySchedule(container, schedule) {
        if (!container || !schedule) return;

        const date = this.dailyActivityManager.parseDate(schedule.date);
        const dayOfWeek = this.getDayOfWeekName(date);

        container.innerHTML = `
            <div class="daily-schedule-view">
                <div class="daily-schedule-header">
                    <h2>📅 Lịch Sinh Hoạt</h2>
                    <div class="date-info">
                        <span class="date-label">${dayOfWeek}, ${this.formatDateDisplay(date)}</span>
                        <div class="schedule-stats">
                            <span class="stat-item">✅ ${schedule.completedActivities}/${schedule.totalActivities}</span>
                            <span class="stat-item">⏱️ ${schedule.totalStudyTime} phút học</span>
                        </div>
                    </div>
                </div>

                <div class="daily-schedule-content">
                    <div class="time-slot-section morning">
                        <div class="time-slot-header">
                            <span class="time-slot-icon">🌅</span>
                            <span class="time-slot-title">Buổi Sáng</span>
                            <span class="time-slot-time">${schedule.morningSchedule.startTime} - ${schedule.morningSchedule.endTime}</span>
                        </div>
                        <div class="activities-list">
                            ${this.renderActivities(schedule.morningSchedule.activities)}
                        </div>
                    </div>

                    <div class="time-slot-section afternoon">
                        <div class="time-slot-header">
                            <span class="time-slot-icon">🌆</span>
                            <span class="time-slot-title">Buổi Chiều/Tối</span>
                            <span class="time-slot-time">${schedule.afternoonSchedule.startTime} - ${schedule.afternoonSchedule.endTime}</span>
                        </div>
                        <div class="activities-list">
                            ${this.renderActivities(schedule.afternoonSchedule.activities)}
                        </div>
                    </div>
                </div>

                ${schedule.notes ? `
                    <div class="schedule-notes">
                        <h4>📝 Ghi Chú</h4>
                        <p>${schedule.notes}</p>
                    </div>
                ` : ''}

                <div class="schedule-actions">
                    <button class="btn-action secondary" id="editScheduleBtn">✏️ Chỉnh Sửa</button>
                    <button class="btn-action danger" id="deleteScheduleBtn">🗑️ Xóa</button>
                </div>
            </div>
        `;
    }

    /**
     * Render activities list
     */
    renderActivities(activities) {
        if (!activities || activities.length === 0) {
            return '<div class="empty-activities">Chưa có hoạt động nào</div>';
        }

        return activities.map(activity => {
            const statusClass = activity.status || 'planned';
            const statusIcon = {
                'planned': '⏳',
                'in-progress': '🔄',
                'completed': '✅',
                'skipped': '⏭️'
            }[statusClass] || '⏳';

            return `
                <div class="activity-item ${statusClass}" data-activity-id="${activity.id}">
                    <div class="activity-header">
                        <span class="activity-status">${statusIcon}</span>
                        <span class="activity-time">${activity.scheduledTime || 'TBD'} - ${activity.scheduledEndTime || 'TBD'}</span>
                        <span class="activity-priority priority-${activity.priority || 'medium'}">
                            ${this.getPriorityLabel(activity.priority || 'medium')}
                        </span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">
                            ${activity.courseName ? `📚 ${activity.courseName}` : this.getActivityIcon(activity.type)} ${activity.name || activity.topic || 'Hoạt động'}
                        </div>
                        ${activity.topic ? `<div class="activity-topic">Chủ đề: ${activity.topic}</div>` : ''}
                        ${activity.content ? `
                            <div class="activity-content-text">
                                ${activity.content.split('\n').map(line => `<div>${line}</div>`).join('')}
                            </div>
                        ` : ''}
                        <div class="activity-meta">
                            <span>⏱️ ${activity.estimatedDuration || 30} phút</span>
                            ${activity.courseId ? `<span>📖 Môn học</span>` : ''}
                        </div>
                    </div>
                    <div class="activity-actions">
                        <button class="activity-btn complete" data-activity-id="${activity.id}">✅ Hoàn thành</button>
                        <button class="activity-btn skip" data-activity-id="${activity.id}">⏭️ Bỏ qua</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Get priority label
     */
    getPriorityLabel(priority) {
        const labels = {
            'high': '🔴 Cao',
            'medium': '🟡 Trung bình',
            'low': '🟢 Thấp'
        };
        return labels[priority] || '🟡 Trung bình';
    }

    /**
     * Get activity icon
     */
    getActivityIcon(type) {
        const icons = {
            'study': '📚',
            'exercise': '💪',
            'meal': '🍽️',
            'review': '📖',
            'reading': '📖',
            'personal': '👤'
        };
        return icons[type] || '📝';
    }

    /**
     * Format date for display
     */
    formatDateDisplay(date) {
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Format date to YYYY-MM-DD
     */
    formatDate(date) {
        return this.dailyActivityManager.formatDate(date);
    }

    /**
     * Get day of week name
     */
    getDayOfWeekName(date) {
        const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        return days[date.getDay()];
    }

    /**
     * Show loading state
     */
    showLoading(container, message = 'Đang tải...') {
        if (!container) return;
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
    }

    /**
     * Show empty state
     */
    showEmpty(container, message = 'Chưa có lịch sinh hoạt') {
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-text">${message}</div>
                <div class="empty-hint">Hãy tạo lịch sinh hoạt cho ngày mai</div>
            </div>
        `;
    }
}

