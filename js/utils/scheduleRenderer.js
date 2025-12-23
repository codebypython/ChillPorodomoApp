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
        if (!container || !schedule) {
            console.error('Cannot render schedule: missing container or schedule');
            return;
        }

        console.log('=== RENDERING WEEKLY SCHEDULE ===');
        console.log('Schedule name:', schedule.name);
        console.log('Has courses:', !!schedule.courses, schedule.courses?.length);

        // SOLUTION: Always render directly from courses, don't use weeklySchedule
        // This avoids any serialization/deserialization issues
        if (!schedule.courses || !Array.isArray(schedule.courses) || schedule.courses.length === 0) {
            console.error('No courses available to render');
            return;
        }

        const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        
        console.log(`Rendering from ${schedule.courses.length} courses`);
        
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

        // ALTERNATIVE APPROACH: Render directly from courses instead of weeklySchedule
        // This is more reliable and easier to debug
        const courses = schedule.courses || [];
        console.log('=== RENDERING FROM COURSES DIRECTLY ===');
        console.log('Total courses:', courses.length);
        
        // Create a map: period -> day -> courses
        const scheduleMap = {};
        for (let p = 1; p <= 10; p++) {
            scheduleMap[p] = {};
            for (let d = 2; d <= 7; d++) {
                scheduleMap[p][d] = [];
            }
        }
        
        // Populate map from courses
        console.log('=== POPULATING SCHEDULE MAP ===');
        let mappedCount = 0;
        let skippedCount = 0;
        
        courses.forEach((course, idx) => {
            console.log(`Course ${idx + 1}: "${course.name}"`);
            console.log(`  - scheduleInfo:`, course.scheduleInfo);
            console.log(`  - day:`, course.scheduleInfo?.day);
            console.log(`  - periods:`, course.scheduleInfo?.periods);
            
            if (!course.scheduleInfo) {
                console.warn(`  ❌ Skipped: No scheduleInfo`);
                skippedCount++;
                return;
            }
            
            if (!course.scheduleInfo.day) {
                console.warn(`  ❌ Skipped: No day in scheduleInfo`);
                skippedCount++;
                return;
            }
            
            const day = course.scheduleInfo.day; // 2-7
            const periods = course.scheduleInfo.periods || [];
            
            if (periods.length === 0) {
                console.warn(`  ❌ Skipped: No periods`);
                skippedCount++;
                return;
            }
            
            console.log(`  ✓ Processing: Day ${day}, Periods [${periods.join(',')}]`);
            
            periods.forEach(period => {
                if (period >= 1 && period <= 10 && day >= 2 && day <= 7) {
                    if (!scheduleMap[period][day]) {
                        scheduleMap[period][day] = [];
                    }
                    scheduleMap[period][day].push(course);
                    mappedCount++;
                    console.log(`  ✓ Mapped: Period ${period}, Day ${day}`);
                } else {
                    console.warn(`  ❌ Invalid: Period ${period}, Day ${day}`);
                }
            });
        });
        
        console.log(`=== MAPPING SUMMARY ===`);
        console.log(`- Mapped: ${mappedCount} course-period entries`);
        console.log(`- Skipped: ${skippedCount} courses`);
        
        // Log final map structure
        console.log('=== FINAL MAP STRUCTURE ===');
        for (let p = 1; p <= 10; p++) {
            for (let d = 2; d <= 7; d++) {
                const count = scheduleMap[p][d]?.length || 0;
                if (count > 0) {
                    console.log(`Period ${p}, Thứ ${d}: ${count} course(s) - ${scheduleMap[p][d].map(c => c.name).join(', ')}`);
                }
            }
        }
        
        // CRITICAL: Verify scheduleMap before rendering
        console.log('=== VERIFYING SCHEDULE MAP BEFORE RENDER ===');
        const dayTotals = [0, 0, 0, 0, 0, 0]; // Thứ 2-7
        for (let p = 1; p <= 10; p++) {
            for (let d = 2; d <= 7; d++) {
                const count = scheduleMap[p][d]?.length || 0;
                if (count > 0) {
                    dayTotals[d - 2] += count;
                    console.log(`✓ Period ${p}, Thứ ${d}: ${count} course(s)`);
                }
            }
        }
        console.log('Total courses per day:', dayTotals.map((c, i) => `Thứ ${i+2}: ${c}`).join(', '));
        
        // Render each period
        for (let period = 1; period <= 10; period++) {
            const timeSlot = this.scheduleManager.getTimeSlot(period);
            
            html += '<tr>';
            
            // Period number
            html += `<td class="period-cell">${period}</td>`;
            
            // Time slot
            html += `<td class="time-cell">${timeSlot.start}<br>${timeSlot.end}</td>`;
            
            // Days (Thứ 2-7) - CRITICAL: Loop through days 2-7
            for (let day = 2; day <= 7; day++) {
                // Get courses for this specific period and day
                const coursesForCell = scheduleMap[period] && scheduleMap[period][day] ? scheduleMap[period][day] : [];
                
                // Debug: Log EVERY cell, not just non-empty ones
                if (coursesForCell.length > 0) {
                    console.log(`[RENDER HTML] Period ${period}, Thứ ${day}: ${coursesForCell.length} course(s) - ${coursesForCell.map(c => c.name).join(', ')}`);
                } else {
                    // Log empty cells for first period to verify structure
                    if (period === 1) {
                        console.log(`[RENDER HTML] Period ${period}, Thứ ${day}: EMPTY (scheduleMap[${period}][${day}] = ${scheduleMap[period]?.[day]})`);
                    }
                }
                
                // CRITICAL: Create cell with proper data attributes
                html += `<td class="schedule-cell" data-period="${period}" data-day="${day}" data-day-name="Thứ ${day}">`;
                
                if (coursesForCell && coursesForCell.length > 0) {
                    coursesForCell.forEach((course, courseIdx) => {
                        console.log(`  -> Rendering course ${courseIdx + 1}: "${course.name}" in Period ${period}, Thứ ${day}`);
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

        // CRITICAL: Verify rendered HTML structure
        console.log('=== VERIFYING RENDERED HTML ===');
        const table = container.querySelector('.schedule-table');
        if (table) {
            const rows = table.querySelectorAll('tbody tr:not(.break-row)');
            console.log(`Total rows rendered: ${rows.length}`);
            
            // Check first row structure
            if (rows.length > 0) {
                const firstRow = rows[0];
                const cells = firstRow.querySelectorAll('td');
                console.log(`First row has ${cells.length} cells (expected 8: period + time + 6 days)`);
                cells.forEach((cell, idx) => {
                    const day = cell.getAttribute('data-day');
                    const period = cell.getAttribute('data-period');
                    const dayName = cell.getAttribute('data-day-name');
                    const content = cell.textContent.trim().substring(0, 50);
                    console.log(`  Cell ${idx}: data-day="${day}", data-period="${period}", data-day-name="${dayName}", content="${content}"`);
                });
            }
            
            // Count courses in each day column
            const dayColumns = [2, 3, 4, 5, 6, 7];
            dayColumns.forEach(day => {
                const cells = table.querySelectorAll(`td[data-day="${day}"]`);
                let courseCount = 0;
                cells.forEach(cell => {
                    const courses = cell.querySelectorAll('.course-cell');
                    courseCount += courses.length;
                });
                console.log(`Thứ ${day} column: ${courseCount} courses in ${cells.length} cells`);
            });
        } else {
            console.error('ERROR: Table not found in rendered HTML!');
        }

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

