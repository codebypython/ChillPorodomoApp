/**
 * ScheduleRenderer - Render schedule table UI
 */

export class ScheduleRenderer {
    constructor(scheduleManager) {
        this.scheduleManager = scheduleManager;
    }

    /**
     * Render schedule list
     */
    renderScheduleList(container, schedules, onSelect, onDelete) {
        if (!container) return;

        if (!schedules || schedules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <div class="empty-text">Chưa có lịch nào được tạo</div>
                    <div class="empty-hint">Hãy nạp file Excel để tạo lịch học đầu tiên</div>
                </div>
            `;
            return;
        }

        container.innerHTML = schedules.map(schedule => `
            <div class="schedule-card" data-id="${schedule.id}">
                <div class="schedule-card-header">
                    <h3 class="schedule-card-title">${schedule.name}</h3>
                    <span class="schedule-card-type">${this.getTypeLabel(schedule.type)}</span>
                </div>
                <div class="schedule-card-body">
                    <div class="schedule-card-info">
                        <span class="schedule-info-item">
                            <span class="info-icon">📚</span>
                            ${schedule.courses?.length || 0} môn học
                        </span>
                        <span class="schedule-info-item">
                            <span class="info-icon">📅</span>
                            ${new Date(schedule.createdAt).toLocaleDateString('vi-VN')}
                        </span>
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
        `).join('');

        // Add event listeners
        container.querySelectorAll('.schedule-card-btn.view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                if (onSelect) onSelect(id);
            });
        });

        container.querySelectorAll('.schedule-card-btn.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Bạn có chắc chắn muốn xóa lịch này?')) {
                    const id = parseInt(btn.dataset.id);
                    if (onDelete) await onDelete(id);
                }
            });
        });
    }

    /**
     * Render weekly schedule table
     */
    renderWeeklySchedule(container, schedule) {
        if (!container || !schedule || !schedule.weeklySchedule) return;

        const weeklySchedule = schedule.weeklySchedule;
        const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        
        let html = `
            <div class="schedule-table-wrapper">
                <div class="schedule-table-header">
                    <h3>${schedule.name}</h3>
                    <button class="schedule-close-btn" id="closeScheduleBtn">✕</button>
                </div>
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th class="period-header">Tiết</th>
                            <th class="time-header">Thời gian</th>
                            ${days.map(day => `<th class="day-header">${day}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Render each period
        for (let period = 1; period <= 10; period++) {
            const timeSlot = this.scheduleManager.getTimeSlot(period);
            const periodIndex = period - 1;
            
            html += '<tr>';
            
            // Period number
            html += `<td class="period-cell">${period}</td>`;
            
            // Time slot
            html += `<td class="time-cell">${timeSlot.start}<br>${timeSlot.end}</td>`;
            
            // Days (Monday to Saturday, index 0-5)
            for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
                const courses = weeklySchedule[periodIndex]?.[dayIndex] || [];
                html += `<td class="schedule-cell" data-period="${period}" data-day="${dayIndex + 2}">`;
                
                if (courses.length > 0) {
                    courses.forEach(course => {
                        html += this.renderCourseCell(course, period);
                    });
                }
                
                html += '</td>';
            }
            
            html += '</tr>';
            
            // Add break row after period 5
            if (period === 5) {
                html += `
                    <tr class="break-row">
                        <td colspan="8" class="break-cell">
                            <span class="break-label">⏸️ Nghỉ 30 phút</span>
                        </td>
                    </tr>
                `;
            }
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
        container.style.display = 'block';

        // Add close button event listener
        const closeBtn = container.querySelector('#closeScheduleBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                container.style.display = 'none';
            });
        }
    }

    /**
     * Render course cell
     */
    renderCourseCell(course, period) {
        const scheduleInfo = course.scheduleInfo || {};
        const room = scheduleInfo.room || '';
        const instructor = course.instructor || '';
        const credits = course.credits || '';
        const weeks = course.weekRanges?.map(range => 
            range[0] === range[1] ? range[0] : `${range[0]}-${range[1]}`
        ).join(', ') || '';

        return `
            <div class="course-cell" 
                 style="background: ${course.color}; color: white;"
                 data-course-id="${course.id}"
                 title="${course.name}${room ? ' - ' + room : ''}${instructor ? ' - ' + instructor : ''}${weeks ? ' - Tuần: ' + weeks : ''}">
                <div class="course-name">${course.name}</div>
                ${room ? `<div class="course-room">📍 ${room}</div>` : ''}
                ${instructor ? `<div class="course-instructor">👤 ${instructor}</div>` : ''}
                ${credits ? `<div class="course-credits">📊 ${credits} TC</div>` : ''}
            </div>
        `;
    }

    /**
     * Get type label
     */
    getTypeLabel(type) {
        const labels = {
            'class': '📚 Lịch học',
            'life': '🏠 Sinh hoạt',
            'exercise': '💪 Tập luyện'
        };
        return labels[type] || type;
    }

    /**
     * Show upload modal
     */
    showUploadModal(onFileSelect) {
        const modal = document.getElementById('scheduleUploadModal');
        if (!modal) return;

        modal.classList.add('show');
        
        const fileInput = modal.querySelector('#scheduleFileInput');
        const fileName = modal.querySelector('#scheduleFileName');
        const scheduleNameInput = modal.querySelector('#scheduleNameInput');
        const uploadBtn = modal.querySelector('#confirmUploadBtn');
        const cancelBtn = modal.querySelector('#cancelUploadBtn');

        // Reset
        if (fileInput) fileInput.value = '';
        if (fileName) fileName.textContent = 'Chưa chọn file';
        if (scheduleNameInput) scheduleNameInput.value = '';

        // File input change
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (fileName) fileName.textContent = file.name;
                    if (scheduleNameInput && !scheduleNameInput.value) {
                        scheduleNameInput.value = file.name.replace(/\.[^/.]+$/, '');
                    }
                }
            };
        }

        // Upload button
        if (uploadBtn) {
            uploadBtn.onclick = () => {
                const file = fileInput?.files[0];
                const name = scheduleNameInput?.value?.trim();
                
                if (!file) {
                    alert('Vui lòng chọn file Excel');
                    return;
                }
                
                if (!name) {
                    alert('Vui lòng nhập tên lịch');
                    return;
                }

                if (onFileSelect) {
                    onFileSelect(file, name);
                }
                
                this.hideUploadModal();
            };
        }

        // Cancel button
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.hideUploadModal();
            };
        }
    }

    /**
     * Hide upload modal
     */
    hideUploadModal() {
        const modal = document.getElementById('scheduleUploadModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Show loading state
     */
    showLoading(container, message = 'Đang xử lý...') {
        if (!container) return;
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(container, message) {
        if (!container) return;
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <div class="error-text">${message}</div>
            </div>
        `;
    }
}

