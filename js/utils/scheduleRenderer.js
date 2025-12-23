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
            
            if (!course.scheduleInfo) {
                console.warn(`  ❌ Skipped: No scheduleInfo`);
                skippedCount++;
                return;
            }
            
            // CRITICAL: scheduleInfo is now an array
            if (!Array.isArray(course.scheduleInfo)) {
                console.warn(`  ❌ Skipped: scheduleInfo is not an array!`, course.scheduleInfo);
                skippedCount++;
                return;
            }
            
            if (course.scheduleInfo.length === 0) {
                console.warn(`  ❌ Skipped: scheduleInfo array is empty`);
                skippedCount++;
                return;
            }
            
            // CRITICAL: Iterate through all schedule entries
            course.scheduleInfo.forEach((scheduleEntry, entryIdx) => {
                const day = Number(scheduleEntry.day); // Convert to number
                const periods = Array.isArray(scheduleEntry.periods) ? scheduleEntry.periods : [];
                
                if (!day || isNaN(day) || day < 2 || day > 7) {
                    console.warn(`  ❌ Skipped entry ${entryIdx + 1}: Invalid day ${scheduleEntry.day}`);
                    return;
                }
                
                if (periods.length === 0) {
                    console.warn(`  ❌ Skipped entry ${entryIdx + 1}: No periods`);
                    return;
                }
                
                console.log(`  ✓ Processing entry ${entryIdx + 1}: Day ${day}, Periods [${periods.join(',')}], Room ${scheduleEntry.room}`);
                
                periods.forEach(period => {
                    const periodNum = Number(period);
                    const dayNum = Number(day);
                    
                    if (isNaN(periodNum) || isNaN(dayNum)) {
                        console.error(`[ERROR] Invalid period or day: period=${period} (${typeof period}), day=${day} (${typeof day})`);
                        return;
                    }
                    
                    if (periodNum >= 1 && periodNum <= 10 && dayNum >= 2 && dayNum <= 7) {
                        // CRITICAL: Ensure scheduleMap structure exists
                        if (!scheduleMap[periodNum]) {
                            console.error(`[ERROR] scheduleMap[${periodNum}] does not exist!`);
                            scheduleMap[periodNum] = {};
                        }
                        if (!Array.isArray(scheduleMap[periodNum][dayNum])) {
                            if (!scheduleMap[periodNum][dayNum]) {
                                scheduleMap[periodNum][dayNum] = [];
                            } else {
                                console.error(`[ERROR] scheduleMap[${periodNum}][${dayNum}] is not an array!`, scheduleMap[periodNum][dayNum]);
                                scheduleMap[periodNum][dayNum] = [];
                            }
                        }
                        
                        // CRITICAL: Verify before push
                        const beforeCount = scheduleMap[periodNum][dayNum].length;
                        scheduleMap[periodNum][dayNum].push(course);
                        const afterCount = scheduleMap[periodNum][dayNum].length;
                        
                        if (afterCount !== beforeCount + 1) {
                            console.error(`[ERROR] Failed to push course "${course.name}" to scheduleMap[${periodNum}][${dayNum}]`);
                        }
                        
                        mappedCount++;
                        console.log(`    ✓ Mapped: Period ${periodNum}, Day ${dayNum}`);
                    } else {
                        console.warn(`  ❌ Invalid: Period ${periodNum}, Day ${dayNum}`);
                    }
                });
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
                    const courseNames = scheduleMap[p][d].map(c => c.name).join(', ');
                    console.log(`✓ Period ${p}, Thứ ${d}: ${count} course(s) - ${courseNames}`);
                }
            }
        }
        console.log('Total courses per day:', dayTotals.map((c, i) => `Thứ ${i+2}: ${c}`).join(', '));
        
        // CRITICAL: Verify no courses are in wrong positions
        console.log('=== VERIFICATION: Checking for misplaced courses ===');
        let misplacedCount = 0;
        for (let p = 1; p <= 10; p++) {
            for (let d = 2; d <= 7; d++) {
                const courses = scheduleMap[p][d] || [];
                courses.forEach(course => {
                    // Check if course should be in this position
                    if (course.scheduleInfo && Array.isArray(course.scheduleInfo)) {
                        const shouldBeHere = course.scheduleInfo.some(entry => {
                            const entryDay = Number(entry.day);
                            const entryPeriods = Array.isArray(entry.periods) ? entry.periods : [];
                            return entryDay === d && entryPeriods.includes(p);
                        });
                        
                        if (!shouldBeHere) {
                            misplacedCount++;
                            console.error(`[CRITICAL ERROR] Course "${course.name}" is in scheduleMap[${p}][${d}] but should NOT be there!`);
                            console.error(`  Course scheduleInfo:`, course.scheduleInfo);
                        }
                    }
                });
            }
        }
        if (misplacedCount === 0) {
            console.log('✅ All courses are in correct positions');
        } else {
            console.error(`❌ Found ${misplacedCount} misplaced courses!`);
        }
        
        // Render each period
        // CRITICAL: Ensure we render exactly 10 rows (periods 1-10)
        for (let period = 1; period <= 10; period++) {
            const timeSlot = this.scheduleManager.getTimeSlot(period);
            const periodNum = Number(period);
            
            html += '<tr>';
            
            // Period number - CRITICAL: Always render
            html += `<td class="period-cell">${period}</td>`;
            
            // Time slot - CRITICAL: Always render
            html += `<td class="time-cell">${timeSlot.start}<br>${timeSlot.end}</td>`;
            
            // Days (Thứ 2-7) - CRITICAL: Loop through days 2-7, ALWAYS render all 6 cells
            for (let day = 2; day <= 7; day++) {
                const dayNum = Number(day);
                
                // CRITICAL: Verify scheduleMap structure before access
                let coursesForCell = [];
                
                if (!scheduleMap[periodNum]) {
                    console.error(`[RENDER ERROR] scheduleMap[${periodNum}] does not exist!`);
                } else if (!scheduleMap[periodNum][dayNum]) {
                    // This is OK - empty cell
                    coursesForCell = [];
                } else if (!Array.isArray(scheduleMap[periodNum][dayNum])) {
                    console.error(`[RENDER ERROR] scheduleMap[${periodNum}][${dayNum}] is not an array!`, scheduleMap[periodNum][dayNum]);
                    coursesForCell = [];
                } else {
                    coursesForCell = scheduleMap[periodNum][dayNum];
                }
                
                // Debug: Log EVERY cell, not just non-empty ones
                if (coursesForCell.length > 0) {
                    console.log(`[RENDER HTML] Period ${periodNum}, Thứ ${dayNum}: ${coursesForCell.length} course(s) - ${coursesForCell.map(c => c.name).join(', ')}`);
                } else {
                    // Log empty cells for first period to verify structure
                    if (period === 1) {
                        console.log(`[RENDER HTML] Period ${periodNum}, Thứ ${dayNum}: EMPTY`);
                    }
                }
                
                // CRITICAL: Always create cell, even if empty
                // This ensures all 6 day columns are always rendered
                html += `<td class="schedule-cell" data-period="${periodNum}" data-day="${dayNum}" data-day-name="Thứ ${dayNum}">`;
                
                // CRITICAL: Only render courses if they exist
                if (coursesForCell && Array.isArray(coursesForCell) && coursesForCell.length > 0) {
                    coursesForCell.forEach((course, courseIdx) => {
                        console.log(`  -> Rendering course ${courseIdx + 1}: "${course.name}" in Period ${periodNum}, Thứ ${dayNum}`);
                        html += this.renderCourseCell(course, periodNum);
                    });
                }
                
                // CRITICAL: Always close cell
                html += '</td>';
            }
            
            // CRITICAL: Always close row
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
        // CRITICAL: scheduleInfo is now an array, find entry that matches this period
        let room = '';
        if (course.scheduleInfo && Array.isArray(course.scheduleInfo)) {
            // Find entry that contains this period
            const matchingEntry = course.scheduleInfo.find(entry => 
                entry.periods && Array.isArray(entry.periods) && entry.periods.includes(period)
            );
            if (matchingEntry) {
                room = matchingEntry.room || '';
            } else if (course.scheduleInfo.length > 0) {
                // Fallback to first entry's room
                room = course.scheduleInfo[0].room || '';
            }
        }
        
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

