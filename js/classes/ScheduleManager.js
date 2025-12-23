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
            
            // SOLUTION: Don't store weeklySchedule in IndexedDB
            // Generate it on-demand to avoid serialization issues
            // Just store courses and generate weeklySchedule when needed
            
            console.log('=== CREATING SCHEDULE OBJECT ===');
            console.log(`Storing ${processedCourses.length} courses`);
            
            // Final verification of courses before saving
            console.log('=== FINAL COURSE VERIFICATION BEFORE SAVE ===');
            processedCourses.forEach((course, idx) => {
                const si = course.scheduleInfo;
                if (si && Array.isArray(si) && si.length > 0) {
                    const entries = si.map((entry, eIdx) => 
                        `Entry ${eIdx + 1}: Day ${entry.day}, Periods [${entry.periods.join(',')}], Room ${entry.room}`
                    ).join('; ');
                    console.log(`✓ Course ${idx + 1}: "${course.name}" -> ${si.length} schedule entry/entries (${entries})`);
                } else {
                    console.error(`❌ Course ${idx + 1}: "${course.name}" -> INVALID scheduleInfo:`, si);
                }
            });
            
            // Create schedule object WITHOUT weeklySchedule
            // We'll generate it on-demand when rendering
            const schedule = {
                name: scheduleName || `Lịch học ${new Date().toLocaleDateString('vi-VN')}`,
                type: 'class',
                courses: processedCourses,
                // DO NOT store weeklySchedule - generate on demand to avoid IndexedDB serialization issues
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save to IndexedDB
            const id = await this.storageManager.addItem('schedules', schedule);
            schedule.id = id;

            console.log('=== SCHEDULE SAVED TO INDEXEDDB ===');
            console.log('Schedule ID:', id);
            console.log('Courses saved:', schedule.courses.length);
            
            // Verify courses after save (before adding to local array)
            console.log('=== VERIFICATION AFTER SAVE ===');
            schedule.courses.forEach((c, idx) => {
                if (c.scheduleInfo && Array.isArray(c.scheduleInfo) && c.scheduleInfo.length > 0) {
                    const days = c.scheduleInfo.map(e => e.day).filter(d => d).join(', ');
                    console.log(`✓ Course ${idx + 1}: "${c.name}" -> ${c.scheduleInfo.length} schedule entry/entries, Days: ${days}`);
                } else {
                    console.error(`❌ Course ${idx + 1}: "${c.name}" -> MISSING or INVALID scheduleInfo!`);
                }
            });

            // Add to local array
            this.schedules.push(schedule);
            this.currentSchedule = schedule;

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
        console.log(`=== PROCESSING ${courses.length} COURSES ===`);
        
        const processed = courses.map((course, index) => {
            // CRITICAL: parseScheduleString now returns an array of schedule entries
            const scheduleInfoArray = this.parseScheduleString(course.schedule);
            const weekRanges = this.parseWeekRanges(course.weeks);
            const color = this.colorPalette[index % this.colorPalette.length];

            const processedCourse = {
                ...course,
                scheduleInfo: scheduleInfoArray, // Array of schedule entries
                weekRanges: weekRanges, // Ensure weekRanges is a plain array
                color: color,
                id: `course-${Date.now()}-${index}`
            };

            // CRITICAL: Log processing result with full details
            console.log(`Course ${index + 1}: "${course.name}"`);
            console.log(`  - Original schedule string: "${course.schedule}"`);
            console.log(`  - Parsed scheduleInfo entries: ${scheduleInfoArray.length}`);
            
            if (scheduleInfoArray.length === 0) {
                console.warn(`  ❌ WARNING: Course "${course.name}" has no valid schedule entries!`);
            } else {
                scheduleInfoArray.forEach((entry, idx) => {
                    console.log(`    Entry ${idx + 1}: Day ${entry.day}, Periods [${entry.periods.join(',')}], Room "${entry.room}"`);
                });
            }
            
            console.log(`  - Processed course scheduleInfo (array):`, JSON.stringify(processedCourse.scheduleInfo));

            return processedCourse;
        });

        console.log(`=== PROCESSED ${processed.length} COURSES ===`);
        
        // Final verification - check if courses have at least one valid schedule entry
        const coursesWithSchedule = processed.filter(c => 
            c.scheduleInfo && 
            Array.isArray(c.scheduleInfo) && 
            c.scheduleInfo.length > 0 &&
            c.scheduleInfo.some(entry => entry.day && entry.periods && entry.periods.length > 0)
        );
        const coursesWithoutSchedule = processed.filter(c => 
            !c.scheduleInfo || 
            !Array.isArray(c.scheduleInfo) || 
            c.scheduleInfo.length === 0 ||
            !c.scheduleInfo.some(entry => entry.day && entry.periods && entry.periods.length > 0)
        );
        
        console.log(`- Courses with valid schedule entries: ${coursesWithSchedule.length}`);
        console.log(`- Courses without valid schedule entries: ${coursesWithoutSchedule.length}`);
        
        if (coursesWithoutSchedule.length > 0) {
            console.warn('Courses without valid schedule entries:', coursesWithoutSchedule.map(c => c.name));
        }

        return processed;
    }

    /**
     * Parse thời khóa biểu string - HỖ TRỢ NHIỀU BUỔI HỌC
     * Ví dụ: 
     * - "Thứ 4,1-2,E2.403" -> [{day: 4, periods: [1,2], room: "E2.403"}]
     * - "Thứ 4,1-2,E2.403; Thứ 5,6-7,A141" -> [{day: 4, periods: [1,2], room: "E2.403"}, {day: 5, periods: [6,7], room: "A141"}]
     * - "Thứ 2,3-4,A101\nThứ 6,8-9,B202" -> [{day: 2, periods: [3,4], room: "A101"}, {day: 6, periods: [8,9], room: "B202"}]
     */
    parseScheduleString(scheduleStr) {
        if (!scheduleStr || scheduleStr.trim() === '') {
            return [];
        }

        const str = scheduleStr.trim();
        const results = [];

        // Split by ; or \n to handle multiple schedule entries
        const scheduleParts = str.split(/[;\n]/).map(s => s.trim()).filter(s => s.length > 0);

        if (scheduleParts.length === 0) {
            console.warn(`No schedule parts found in: "${str}"`);
            return [];
        }

        scheduleParts.forEach((part, index) => {
            const result = this.parseSingleScheduleEntry(part);
            if (result.day && result.periods.length > 0) {
                results.push(result);
                console.log(`Parsed schedule part ${index + 1}: "${part}" ->`, result);
            } else {
                console.warn(`Failed to parse schedule part ${index + 1}: "${part}"`);
            }
        });

        if (results.length === 0) {
            console.warn(`Failed to parse any schedule entries from: "${str}"`);
        } else {
            console.log(`Successfully parsed ${results.length} schedule entry/entries from: "${str}"`);
        }

        return results; // Return array instead of single object
    }

    /**
     * Parse a single schedule entry
     * Ví dụ: "Thứ 4,1-2,E2.403" -> {day: 4, periods: [1,2], room: "E2.403"}
     */
    parseSingleScheduleEntry(partStr) {
        const result = {
            day: null,
            periods: [],
            room: ''
        };

        const str = partStr.trim();

        // Step 1: Extract day (Thứ 2, Thứ 3, etc.) - phải match chính xác "Thứ" + số
        const dayMatch = str.match(/Thứ\s*(\d+)/i);
        if (dayMatch) {
            const dayNum = parseInt(dayMatch[1], 10); // Explicit radix
            // Validate day (2-7: Monday to Saturday)
            if (!isNaN(dayNum) && dayNum >= 2 && dayNum <= 7) {
                result.day = dayNum; // Ensure it's a number
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
            const start = parseInt(periodMatch[1], 10);
            const end = parseInt(periodMatch[2], 10);
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
        console.log(`=== SCHEDULE GENERATION COMPLETE ===`);
        console.log(`- Processed: ${processedCount} course-period entries`);
        console.log(`- Skipped: ${skippedCount} courses`);
        
        // CRITICAL TEST: Verify each course is in the correct position
        console.log('=== VERIFICATION TEST ===');
        let testPassed = true;
        for (const course of courses) {
            if (!course.scheduleInfo || !course.scheduleInfo.day) continue;
            
            const expectedDay = course.scheduleInfo.day;
            const expectedDayIndex = expectedDay - 2;
            const expectedPeriods = course.scheduleInfo.periods;
            
            for (const period of expectedPeriods) {
                const periodIndex = period - 1;
                const coursesAtPosition = schedule[periodIndex][expectedDayIndex];
                const found = coursesAtPosition.find(c => c.name === course.name);
                
                if (!found) {
                    console.error(`❌ TEST FAILED: Course "${course.name}" NOT FOUND at Period ${period} (idx ${periodIndex}), Day ${expectedDay} (idx ${expectedDayIndex})`);
                    testPassed = false;
                } else {
                    console.log(`✓ Course "${course.name}" FOUND at Period ${period} (idx ${periodIndex}), Day ${expectedDay} (idx ${expectedDayIndex})`);
                }
            }
        }
        
        if (testPassed) {
            console.log('✅ ALL TESTS PASSED: All courses are in correct positions');
        } else {
            console.error('❌ TESTS FAILED: Some courses are in wrong positions!');
        }
        
        // Detailed log for each period
        console.log('=== SCHEDULE STRUCTURE SUMMARY ===');
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

        return schedule;
    }

    /**
     * Get schedule by ID
     */
    async getSchedule(id) {
        try {
            console.log('=== LOADING SCHEDULE FROM INDEXEDDB ===');
            const schedule = await this.storageManager.getItem('schedules', id);
            
            if (!schedule) {
                console.error('Schedule not found');
                return null;
            }
            
            console.log('Loaded schedule:', {
                id: schedule.id,
                name: schedule.name,
                coursesCount: schedule.courses?.length || 0
            });
            
            // CRITICAL: Verify courses and scheduleInfo after loading from IndexedDB
            if (schedule.courses && Array.isArray(schedule.courses)) {
                console.log('=== VERIFYING COURSES AFTER LOAD ===');
                let validCount = 0;
                let invalidCount = 0;
                
                schedule.courses.forEach((course, idx) => {
                    console.log(`Course ${idx + 1}: "${course.name}"`);
                    console.log(`  - Has scheduleInfo:`, !!course.scheduleInfo);
                    console.log(`  - scheduleInfo type:`, Array.isArray(course.scheduleInfo) ? 'Array' : typeof course.scheduleInfo);
                    console.log(`  - scheduleInfo:`, course.scheduleInfo);
                    
                    if (course.scheduleInfo && Array.isArray(course.scheduleInfo) && course.scheduleInfo.length > 0) {
                        validCount++;
                        const entries = course.scheduleInfo.map((entry, eIdx) => 
                            `Entry ${eIdx + 1}: Day ${entry.day}, Periods [${entry.periods?.join(',') || ''}], Room ${entry.room || ''}`
                        ).join('; ');
                        console.log(`  ✓ Valid - ${course.scheduleInfo.length} schedule entry/entries (${entries})`);
                    } else {
                        invalidCount++;
                        console.error(`  ❌ INVALID - Missing scheduleInfo or not an array or empty!`);
                    }
                });
                
                console.log(`=== VERIFICATION SUMMARY ===`);
                console.log(`- Valid courses: ${validCount}`);
                console.log(`- Invalid courses: ${invalidCount}`);
                
                if (invalidCount > 0) {
                    console.error('WARNING: Some courses lost their scheduleInfo during IndexedDB storage!');
                }
            } else {
                console.error('ERROR: No courses found in schedule!');
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


