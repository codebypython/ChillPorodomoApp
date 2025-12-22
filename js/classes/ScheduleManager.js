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
            // Parse file
            const courses = await this.xlsxParser.parseClassScheduleFile(file);
            
            if (!courses || courses.length === 0) {
                throw new Error('Không tìm thấy dữ liệu khóa học trong file.');
            }

            // Process courses
            const processedCourses = this.processCourses(courses);
            
            // Generate weekly schedule
            const weeklySchedule = this.generateWeeklySchedule(processedCourses);
            
            // Create schedule object
            const schedule = {
                name: scheduleName || `Lịch học ${new Date().toLocaleDateString('vi-VN')}`,
                type: 'class',
                courses: processedCourses,
                weeklySchedule: weeklySchedule,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save to IndexedDB
            const id = await this.storageManager.addItem('schedules', schedule);
            schedule.id = id;

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
        return courses.map((course, index) => {
            const scheduleInfo = this.parseScheduleString(course.schedule);
            const weekRanges = this.parseWeekRanges(course.weeks);
            const color = this.colorPalette[index % this.colorPalette.length];

            return {
                ...course,
                scheduleInfo,
                weekRanges,
                color,
                id: `course-${Date.now()}-${index}`
            };
        });
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

        // Extract day (Thứ 2, Thứ 3, etc.)
        const dayMatch = scheduleStr.match(/Thứ\s*(\d+)/i);
        if (dayMatch) {
            result.day = parseInt(dayMatch[1]);
        }

        // Extract periods (1-2, 3-4, 8-10, etc.)
        const periodMatch = scheduleStr.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (periodMatch) {
            const start = parseInt(periodMatch[1]);
            const end = parseInt(periodMatch[2]);
            for (let i = start; i <= end; i++) {
                result.periods.push(i);
            }
        }

        // Extract room (usually at the end, format: E2.403, A141, C303, etc.)
        const roomMatch = scheduleStr.match(/([A-Z]\d+\.?\d*|[A-Z]\d+)/);
        if (roomMatch) {
            result.room = roomMatch[1];
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
     */
    generateWeeklySchedule(courses) {
        // Initialize schedule: 10 periods (1-10) x 7 days (Mon-Sun, but we use 2-7)
        const schedule = Array(10).fill(null).map(() => Array(7).fill(null).map(() => []));

        for (const course of courses) {
            if (!course.scheduleInfo || !course.scheduleInfo.day) continue;

            const day = course.scheduleInfo.day; // 2-7 (Monday-Saturday)
            const periods = course.scheduleInfo.periods;

            // Adjust day index (day 2 = index 0, day 3 = index 1, etc.)
            const dayIndex = day - 2;
            if (dayIndex < 0 || dayIndex >= 7) continue;

            for (const period of periods) {
                // Periods are 1-10, array index is 0-9
                const periodIndex = period - 1;
                if (periodIndex >= 0 && periodIndex < 10) {
                    schedule[periodIndex][dayIndex].push(course);
                }
            }
        }

        return schedule;
    }

    /**
     * Get schedule by ID
     */
    async getSchedule(id) {
        try {
            const schedule = await this.storageManager.getItem('schedules', id);
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

