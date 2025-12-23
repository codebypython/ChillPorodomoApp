/**
 * ScheduleManager - Quản lý các loại lịch trình
 */

import { storageManager } from './StorageManager.js';
import { XLSXParser } from './XLSXParser.js';

export class ScheduleManager {
    constructor() {
        this.storageManager = storageManager;
        this.xlsxParser = new XLSXParser();
        this.schedules = [];
        this.currentSchedule = null;
        this.colorPalette = [
            '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
            '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#330867',
            '#a8edea', '#fed6e3', '#ffecd2', '#fcb69f', '#ff9a9e'
        ];
    }

    /**
     * Load tất cả schedules từ IndexedDB
     */
    async loadSchedules() {
        try {
            this.schedules = await this.storageManager.getAllItems('schedules');
            return this.schedules;
        } catch (error) {
            console.error('Error loading schedules:', error);
            return [];
        }
    }

    /**
     * Tạo lịch học từ file XLSX
     */
    async createClassScheduleFromXLSX(file, scheduleName) {
        try {
            console.log('=== STARTING SCHEDULE CREATION ===');
            
            // Parse file
            const courses = await this.xlsxParser.parseClassScheduleFile(file);
            
            if (!courses || courses.length === 0) {
                throw new Error('Không tìm thấy dữ liệu khóa học trong file.');
            }

            console.log(`=== PARSED ${courses.length} COURSES FROM EXCEL ===`);
            courses.forEach((c, idx) => {
                console.log(`Course ${idx + 1}: "${c.name}" - Schedule: "${c.schedule}"`);
            });

            // Process courses
            const processedCourses = this.processCourses(courses);
            
            // Generate weekly schedule
            const weeklySchedule = this.generateWeeklySchedule(processedCourses);
            
            // CRITICAL: Verify schedule structure BEFORE creating object
            console.log('=== VERIFYING WEEKLY SCHEDULE STRUCTURE ===');
            console.log('Schedule type:', Array.isArray(weeklySchedule) ? 'Array' : typeof weeklySchedule);
            console.log('Schedule length:', weeklySchedule.length);
            
            if (!Array.isArray(weeklySchedule) || weeklySchedule.length !== 10) {
                console.error('ERROR: Invalid schedule structure!', weeklySchedule);
                throw new Error('Có lỗi khi tạo cấu trúc lịch học.');
            }
            
            // Verify each period
            for (let p = 0; p < 10; p++) {
                const period = weeklySchedule[p];
                if (!Array.isArray(period) || period.length !== 6) {
                    console.error(`ERROR: Period ${p+1} invalid!`, period);
                    throw new Error(`Có lỗi ở Period ${p+1}.`);
                }
            }
            
            // Log distribution of courses across days
            console.log('=== COURSE DISTRIBUTION BY DAY ===');
            const dayCounts = [0, 0, 0, 0, 0, 0]; // Thứ 2-7
            for (let p = 0; p < 10; p++) {
                for (let d = 0; d < 6; d++) {
                    const count = weeklySchedule[p][d].length;
                    if (count > 0) {
                        dayCounts[d] += count;
                        console.log(`Period ${p+1}, Thứ ${d+2}: ${count} course(s) - ${weeklySchedule[p][d].map(c => c.name).join(', ')}`);
                    }
                }
            }
            console.log('Total courses per day:', dayCounts.map((count, idx) => `Thứ ${idx+2}: ${count}`).join(', '));
            
            // Create schedule object
            const schedule = {
                name: scheduleName || `Lịch học ${new Date().toLocaleDateString('vi-VN')}`,
                type: 'class',
                courses: processedCourses,
                weeklySchedule: weeklySchedule,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Verify schedule object structure
            console.log('=== SCHEDULE OBJECT STRUCTURE ===');
            console.log('weeklySchedule in object:', {
                isArray: Array.isArray(schedule.weeklySchedule),
                length: schedule.weeklySchedule.length,
                firstPeriodIsArray: Array.isArray(schedule.weeklySchedule[0]),
                firstPeriodLength: schedule.weeklySchedule[0]?.length
            });

            // Save to IndexedDB
            const id = await this.storageManager.addItem('schedules', schedule);
            schedule.id = id;

            console.log('=== SCHEDULE SAVED TO INDEXEDDB ===');
            console.log('Schedule ID:', id);

            // Add to local array
            this.schedules.push(schedule);
            this.currentSchedule = schedule;

            // Final verification
            console.log('=== FINAL VERIFICATION ===');
            console.log('Current schedule weeklySchedule:', {
                isArray: Array.isArray(this.currentSchedule.weeklySchedule),
                length: this.currentSchedule.weeklySchedule.length
            });

            return schedule;
        } catch (error) {
            console.error('Error creating class schedule:', error);
            throw error;
        }
    }

    /**
     * Process courses - parse schedule strings and week ranges
     */
    processCourses(courses) {
        console.log(`Processing ${courses.length} courses...`);
        
        const processed = courses.map((course, index) => {
            const scheduleInfo = this.parseScheduleString(course.schedule);
            const weekRanges = this.parseWeekRanges(course.weeks);
            const color = this.colorPalette[index % this.colorPalette.length];

            const processedCourse = {
                ...course,
                scheduleInfo,
                weekRanges,
                color,
                id: `course-${Date.now()}-${index}`
            };

            // Log processing result
            if (scheduleInfo.day) {
                console.log(`Course "${course.name}": Day ${scheduleInfo.day}, Periods [${scheduleInfo.periods.join(',')}], Room ${scheduleInfo.room}`);
            } else {
                console.warn(`Course "${course.name}": Failed to parse schedule from "${course.schedule}"`);
            }

            return processedCourse;
        });

        console.log(`Processed ${processed.length} courses`);
        return processed;
    }

    /**
     * Parse thời khóa biểu string
     * Ví dụ: "Thứ 4,1-2,E2.403" -> {day: 4, periods: [1,2], room: "E2.403"}
     * Hoặc: "Thứ 2,3-4,A141" -> {day: 2, periods: [3,4], room: "A141"}
     */
    parseScheduleString(scheduleStr) {
        if (!scheduleStr || scheduleStr.trim() === '') {
            return { day: null, periods: [], room: '' };
        }

        const result = {
            day: null,
            periods: [],
            room: ''
        };

        const str = scheduleStr.trim();

        // Step 1: Extract day (Thứ 2, Thứ 3, etc.) - phải match chính xác "Thứ" + số
        const dayMatch = str.match(/Thứ\s*(\d+)/i);
        if (dayMatch) {
            const dayNum = parseInt(dayMatch[1]);
            // Validate day (2-7: Monday to Saturday)
            if (dayNum >= 2 && dayNum <= 7) {
                result.day = dayNum;
            } else {
                console.warn(`Invalid day number: ${dayNum} in schedule string: ${str}`);
            }
        }

        // Step 2: Extract periods - tìm pattern số-số sau dấu phẩy đầu tiên
        // Tránh match nhầm với số ngày bằng cách tìm sau "Thứ X," hoặc dấu phẩy
        let periodStr = str;
        const commaIndex = str.indexOf(',');
        if (commaIndex !== -1) {
            // Lấy phần sau dấu phẩy đầu tiên
            periodStr = str.substring(commaIndex + 1);
        }

        // Tìm pattern số-số (tiết học, không phải số ngày)
        const periodMatch = periodStr.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (periodMatch) {
            const start = parseInt(periodMatch[1]);
            const end = parseInt(periodMatch[2]);
            // Validate periods (1-10)
            if (start >= 1 && start <= 10 && end >= 1 && end <= 10 && start <= end) {
                for (let i = start; i <= end; i++) {
                    result.periods.push(i);
                }
            } else {
                console.warn(`Invalid period range: ${start}-${end} in schedule string: ${str}`);
            }
        }

        // Step 3: Extract room - tìm pattern chữ-số hoặc chữ-số.số ở cuối chuỗi
        // Pattern: [A-Z] + số + (có thể có .số)
        const roomMatch = str.match(/([A-Z]\d+\.?\d*|[A-Z]\d+)(?:\s|$)/);
        if (roomMatch) {
            result.room = roomMatch[1].trim();
        }

        // Debug log
        if (result.day || result.periods.length > 0) {
            console.log(`Parsed schedule: "${str}" ->`, result);
        } else {
            console.warn(`Failed to parse schedule string: "${str}"`);
        }

        return result;
    }

    /**
     * Parse tuần học string
     * Ví dụ: "22-27;31-40" -> [[22,27], [31,40]]
     * Hoặc: "22-27" -> [[22,27]]
     */
    parseWeekRanges(weekStr) {
        if (!weekStr || weekStr.trim() === '') {
            return [];
        }

        const ranges = [];
        const parts = weekStr.split(/[;,]/).map(s => s.trim());

        for (const part of parts) {
            const match = part.match(/(\d+)\s*[-–]\s*(\d+)/);
            if (match) {
                ranges.push([parseInt(match[1]), parseInt(match[2])]);
            } else {
                // Single week number
                const singleWeek = parseInt(part);
                if (!isNaN(singleWeek)) {
                    ranges.push([singleWeek, singleWeek]);
                }
            }
        }

        return ranges;
    }

    /**
     * Generate weekly schedule from courses
     * Returns a 2D array: [period][day] = array of courses
     * Structure: 10 periods (1-10) x 6 days (Thứ 2-7, index 0-5)
     */
    generateWeeklySchedule(courses) {
        // Initialize schedule: 10 periods (1-10) x 6 days (Thứ 2-7, index 0-5)
        // schedule[periodIndex][dayIndex] = array of courses
        // Use explicit loop to avoid reference issues
        const schedule = [];
        for (let p = 0; p < 10; p++) {
            const period = [];
            for (let d = 0; d < 6; d++) {
                period.push([]);
            }
            schedule.push(period);
        }
        
        console.log('Initialized schedule array:', {
            periods: schedule.length,
            daysPerPeriod: schedule[0]?.length,
            structure: 'schedule[period][day] = []'
        });

        let processedCount = 0;
        let skippedCount = 0;

        for (const course of courses) {
            if (!course.scheduleInfo) {
                console.warn(`Course "${course.name}" missing scheduleInfo`);
                skippedCount++;
                continue;
            }

            const day = course.scheduleInfo.day; // 2-7 (Monday-Saturday)
            const periods = course.scheduleInfo.periods;

            // Validate day
            if (!day || day < 2 || day > 7) {
                console.warn(`Course "${course.name}" has invalid day: ${day}`);
                skippedCount++;
                continue;
            }

            // Validate periods
            if (!periods || periods.length === 0) {
                console.warn(`Course "${course.name}" has no periods`);
                skippedCount++;
                continue;
            }

            // Adjust day index (day 2 = index 0, day 3 = index 1, ..., day 7 = index 5)
            const dayIndex = day - 2;
            if (dayIndex < 0 || dayIndex >= 6) {
                console.warn(`Course "${course.name}" has invalid dayIndex: ${dayIndex} (day: ${day})`);
                skippedCount++;
                continue;
            }

            // Add course to each period
            for (const period of periods) {
                // Periods are 1-10, array index is 0-9
                const periodIndex = period - 1;
                if (periodIndex >= 0 && periodIndex < 10) {
                    // Debug: Log before adding
                    console.log(`Adding course "${course.name}" to Period ${period} (index ${periodIndex}), Day ${day} (index ${dayIndex})`);
                    
                    // CRITICAL: Verify array structure before push
                    if (!Array.isArray(schedule[periodIndex])) {
                        console.error(`ERROR: Period ${periodIndex} is not an array!`, schedule[periodIndex]);
                        continue;
                    }
                    if (!Array.isArray(schedule[periodIndex][dayIndex])) {
                        console.error(`ERROR: Period ${periodIndex}, Day ${dayIndex} is not an array!`, schedule[periodIndex][dayIndex]);
                        continue;
                    }
                    
                    // Push course - create a copy to avoid reference issues
                    const courseCopy = { ...course };
                    schedule[periodIndex][dayIndex].push(courseCopy);
                    processedCount++;
                    
                    // Debug: Verify after adding
                    const verifyCount = schedule[periodIndex][dayIndex].length;
                    const verifyNames = schedule[periodIndex][dayIndex].map(c => c.name).join(', ');
                    console.log(`  -> Verified: Period ${periodIndex}, Day ${dayIndex} now has ${verifyCount} course(s): ${verifyNames}`);
                    
                    // Double check: verify the course is actually in the array
                    const found = schedule[periodIndex][dayIndex].find(c => c.name === course.name);
                    if (!found) {
                        console.error(`ERROR: Course "${course.name}" was not found after push!`);
                    }
                } else {
                    console.warn(`Course "${course.name}" has invalid period: ${period}`);
                }
            }
        }

        // Debug log - Detailed structure
        console.log(`Schedule generation complete:`);
        console.log(`- Processed: ${processedCount} course-period entries`);
        console.log(`- Skipped: ${skippedCount} courses`);
        console.log(`- Schedule structure:`);
        
        // Detailed log for each period
        schedule.forEach((period, periodIdx) => {
            const periodNum = periodIdx + 1;
            const dayCounts = period.map((day, dayIdx) => {
                const count = day.length;
                if (count > 0) {
                    return `Thứ ${dayIdx + 2}: ${count} course(s)`;
                }
                return null;
            }).filter(x => x !== null);
            
            if (dayCounts.length > 0) {
                console.log(`  Period ${periodNum}: ${dayCounts.join(', ')}`);
            }
        });
        
        // Log full structure for debugging
        console.log('Full schedule array:', schedule);

        return schedule;
    }

    /**
     * Get schedule by ID
     */
    async getSchedule(id) {
        try {
            console.log('=== LOADING SCHEDULE FROM INDEXEDDB ===');
            const schedule = await this.storageManager.getItem('schedules', id);
            
            // Debug: Check schedule structure after loading from IndexedDB
            if (schedule && schedule.weeklySchedule) {
                console.log('Loaded schedule from IndexedDB:', {
                    id: schedule.id,
                    name: schedule.name,
                    weeklyScheduleType: Array.isArray(schedule.weeklySchedule) ? 'Array' : typeof schedule.weeklySchedule,
                    weeklyScheduleLength: schedule.weeklySchedule.length
                });
                
                // Verify structure and reconstruct if needed
                let needsReconstruct = false;
                if (!Array.isArray(schedule.weeklySchedule)) {
                    console.error('ERROR: weeklySchedule is not an array!', schedule.weeklySchedule);
                    needsReconstruct = true;
                } else if (schedule.weeklySchedule.length !== 10) {
                    console.error(`ERROR: weeklySchedule has ${schedule.weeklySchedule.length} periods, expected 10!`);
                    needsReconstruct = true;
                } else {
                    schedule.weeklySchedule.forEach((period, pIdx) => {
                        if (!Array.isArray(period)) {
                            console.error(`ERROR: Period ${pIdx + 1} is not an array!`, period);
                            needsReconstruct = true;
                        } else if (period.length !== 6) {
                            console.error(`ERROR: Period ${pIdx + 1} has ${period.length} days, expected 6!`);
                            needsReconstruct = true;
                        }
                    });
                }
                
                // Reconstruct if needed
                if (needsReconstruct && schedule.courses && Array.isArray(schedule.courses)) {
                    console.log('Reconstructing weeklySchedule from courses due to structure errors...');
                    schedule.weeklySchedule = this.generateWeeklySchedule(schedule.courses);
                    // Save the fixed schedule back
                    await this.updateSchedule(schedule);
                }
                
                // Log distribution after load/reconstruct
                console.log('=== COURSE DISTRIBUTION AFTER LOAD ===');
                const dayCounts = [0, 0, 0, 0, 0, 0];
                for (let p = 0; p < 10; p++) {
                    for (let d = 0; d < 6; d++) {
                        const count = schedule.weeklySchedule[p]?.[d]?.length || 0;
                        if (count > 0) {
                            dayCounts[d] += count;
                            console.log(`Period ${p+1}, Thứ ${d+2}: ${count} course(s) - ${schedule.weeklySchedule[p][d].map(c => c.name).join(', ')}`);
                        }
                    }
                }
                console.log('Total courses per day:', dayCounts.map((count, idx) => `Thứ ${idx+2}: ${count}`).join(', '));
            }
            
            this.currentSchedule = schedule;
            return schedule;
        } catch (error) {
            console.error('Error getting schedule:', error);
            return null;
        }
    }

    /**
     * Update schedule
     */
    async updateSchedule(schedule) {
        try {
            schedule.updatedAt = new Date().toISOString();
            await this.storageManager.updateItem('schedules', schedule);
            
            // Update local array
            const index = this.schedules.findIndex(s => s.id === schedule.id);
            if (index !== -1) {
                this.schedules[index] = schedule;
            }
            
            if (this.currentSchedule && this.currentSchedule.id === schedule.id) {
                this.currentSchedule = schedule;
            }
            
            return schedule;
        } catch (error) {
            console.error('Error updating schedule:', error);
            throw error;
        }
    }

    /**
     * Delete schedule
     */
    async deleteSchedule(id) {
        try {
            await this.storageManager.deleteItem('schedules', id);
            
            // Remove from local array
            this.schedules = this.schedules.filter(s => s.id !== id);
            
            if (this.currentSchedule && this.currentSchedule.id === id) {
                this.currentSchedule = null;
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting schedule:', error);
            throw error;
        }
    }

    /**
     * Get time slot info for a period
     */
    getTimeSlot(period) {
        const timeSlots = {
            1: { start: '7:00', end: '7:50' },
            2: { start: '8:00', end: '8:50' },
            3: { start: '9:00', end: '9:50' },
            4: { start: '10:00', end: '10:50' },
            5: { start: '11:00', end: '11:50' },
            6: { start: '12:30', end: '13:20' },
            7: { start: '13:30', end: '14:20' },
            8: { start: '14:30', end: '15:20' },
            9: { start: '15:30', end: '16:20' },
            10: { start: '16:30', end: '17:20' }
        };
        
        return timeSlots[period] || { start: '', end: '' };
    }

    /**
     * Get day name in Vietnamese
     */
    getDayName(dayNumber) {
        const days = {
            2: 'Thứ 2',
            3: 'Thứ 3',
            4: 'Thứ 4',
            5: 'Thứ 5',
            6: 'Thứ 6',
            7: 'Thứ 7'
        };
        return days[dayNumber] || '';
    }
}

