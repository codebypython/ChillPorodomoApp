/**
 * DailyActivityManager - Quản lý lịch sinh hoạt hàng ngày
 */

import { storageManager } from './StorageManager.js';

export class DailyActivityManager {
    constructor(scheduleManager) {
        this.storageManager = storageManager;
        this.scheduleManager = scheduleManager; // Để lấy class schedule
    }

    /**
     * Lấy lịch học của một ngày cụ thể
     */
    getClassScheduleForDate(date) {
        const dayOfWeek = date.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
        const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert: CN=7, T2=2, ..., T7=7
        
        // Tìm class schedule
        const classSchedules = this.scheduleManager.schedules.filter(s => s.type === 'class');
        if (classSchedules.length === 0) return [];
        
        // Lấy schedule mới nhất
        const latestSchedule = classSchedules.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        )[0];
        
        if (!latestSchedule || !latestSchedule.courses) return [];
        
        // Lọc courses có học vào ngày này
        const dayCourses = latestSchedule.courses.filter(course => {
            if (!course.scheduleInfo || !Array.isArray(course.scheduleInfo)) return false;
            return course.scheduleInfo.some(entry => entry.day === dayNumber);
        });
        
        return dayCourses.map(course => {
            // Lấy schedule entries cho ngày này
            const dayEntries = course.scheduleInfo.filter(entry => entry.day === dayNumber);
            const periods = dayEntries.flatMap(entry => entry.periods);
            const minPeriod = Math.min(...periods);
            const maxPeriod = Math.max(...periods);
            
            // Tính thời gian
            const startTime = this.getTimeFromPeriod(minPeriod);
            const endTime = this.getTimeFromPeriod(maxPeriod + 1); // +1 vì period kết thúc ở đầu period tiếp theo
            
            return {
                ...course,
                dayEntries,
                periods,
                startTime,
                endTime,
                duration: (maxPeriod - minPeriod + 1) * 50 // 50 phút mỗi period
            };
        });
    }

    /**
     * Chuyển đổi period thành thời gian
     */
    getTimeFromPeriod(period) {
        if (period <= 5) {
            // Period 1-5: 7:00 - 12:00
            const startHour = 7;
            const startMinute = 0;
            const totalMinutes = startHour * 60 + startMinute + (period - 1) * 60; // 50 phút period + 10 phút break
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
            // Period 6-10: 12:30 - 17:30
            const startHour = 12;
            const startMinute = 30;
            const totalMinutes = startHour * 60 + startMinute + (period - 6) * 60;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Tính toán time slots cho một ngày
     */
    calculateTimeSlots(date, classCourses = null) {
        if (!classCourses) {
            classCourses = this.getClassScheduleForDate(date);
        }
        
        const hasClassToday = classCourses.length > 0;
        
        // Thời gian ngủ: 23:00 - 05:00
        const wakeUpTime = '05:00';
        const sleepTime = '23:00';
        
        let morningStart = wakeUpTime;
        let morningEnd = null;
        let afternoonStart = null;
        let afternoonEnd = sleepTime;
        
        if (hasClassToday) {
            // Tìm thời gian đi học sớm nhất
            const earliestClass = classCourses.reduce((earliest, course) => {
                if (!earliest || this.timeToMinutes(course.startTime) < this.timeToMinutes(earliest.startTime)) {
                    return course;
                }
                return earliest;
            });
            
            // Trừ 30 phút để chuẩn bị và di chuyển
            morningEnd = this.subtractMinutes(earliestClass.startTime, 30);
            
            // Tìm thời gian về muộn nhất
            const latestClass = classCourses.reduce((latest, course) => {
                if (!latest || this.timeToMinutes(course.endTime) > this.timeToMinutes(latest.endTime)) {
                    return course;
                }
                return latest;
            });
            
            // Cộng 30 phút để về nhà
            afternoonStart = this.addMinutes(latestClass.endTime, 30);
        } else {
            // Không có lớp, có thể học cả ngày
            morningEnd = '12:00';
            afternoonStart = '12:00';
        }
        
        return {
            hasClassToday,
            morningSlot: {
                startTime: morningStart,
                endTime: morningEnd || '12:00',
                duration: this.calculateDuration(morningStart, morningEnd || '12:00')
            },
            afternoonSlot: {
                startTime: afternoonStart || '12:00',
                endTime: afternoonEnd,
                duration: this.calculateDuration(afternoonStart || '12:00', afternoonEnd)
            },
            classCourses
        };
    }

    /**
     * Chuyển đổi thời gian thành phút
     */
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Cộng phút vào thời gian
     */
    addMinutes(timeStr, minutes) {
        const totalMinutes = this.timeToMinutes(timeStr) + minutes;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * Trừ phút từ thời gian
     */
    subtractMinutes(timeStr, minutes) {
        return this.addMinutes(timeStr, -minutes);
    }

    /**
     * Tính duration giữa 2 thời điểm (phút)
     */
    calculateDuration(startTime, endTime) {
        return this.timeToMinutes(endTime) - this.timeToMinutes(startTime);
    }

    /**
     * Tạo daily activity schedule
     */
    async createDailyActivitySchedule(date, activities, notes = '') {
        const dateStr = this.formatDate(date);
        const dayOfWeek = date.getDay();
        const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        const timeSlots = this.calculateTimeSlots(date);
        
        // Phân loại activities vào morning và afternoon
        const morningActivities = [];
        const afternoonActivities = [];
        
        activities.forEach(activity => {
            if (activity.timeSlot === 'morning') {
                morningActivities.push(activity);
            } else if (activity.timeSlot === 'afternoon') {
                afternoonActivities.push(activity);
            } else {
                // Auto-assign based on type
                if (activity.type === 'exercise' || activity.type === 'meal') {
                    morningActivities.push(activity);
                } else {
                    afternoonActivities.push(activity);
                }
            }
        });
        
        const schedule = {
            type: 'daily-activity',
            date: dateStr,
            dayOfWeek: dayNumber,
            hasClassToday: timeSlots.hasClassToday,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            morningSchedule: {
                startTime: timeSlots.morningSlot.startTime,
                endTime: timeSlots.morningSlot.endTime,
                activities: morningActivities
            },
            afternoonSchedule: {
                startTime: timeSlots.afternoonSlot.startTime,
                endTime: timeSlots.afternoonSlot.endTime,
                activities: afternoonActivities
            },
            notes,
            totalStudyTime: activities
                .filter(a => a.type === 'study')
                .reduce((sum, a) => sum + (a.estimatedDuration || 0), 0),
            completedActivities: 0,
            totalActivities: activities.length
        };
        
        // Save to IndexedDB
        const id = await this.storageManager.addItem('schedules', schedule);
        schedule.id = id;
        
        return schedule;
    }

    /**
     * Lấy daily activity schedule cho một ngày
     */
    async getDailyActivitySchedule(date) {
        const dateStr = this.formatDate(date);
        const schedules = await this.storageManager.getAllItems('schedules');
        return schedules.find(s => s.type === 'daily-activity' && s.date === dateStr);
    }

    /**
     * Lấy tất cả daily activity schedules
     */
    async getAllDailyActivitySchedules() {
        const schedules = await this.storageManager.getAllItems('schedules');
        return schedules.filter(s => s.type === 'daily-activity')
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Cập nhật activity status
     */
    async updateActivityStatus(scheduleId, activityId, status) {
        const schedule = await this.storageManager.getItem('schedules', scheduleId);
        if (!schedule || schedule.type !== 'daily-activity') {
            throw new Error('Schedule not found');
        }
        
        // Tìm và cập nhật activity
        const updateActivity = (activities) => {
            const activity = activities.find(a => a.id === activityId);
            if (activity) {
                activity.status = status;
                return true;
            }
            return false;
        };
        
        let updated = updateActivity(schedule.morningSchedule.activities);
        if (!updated) {
            updateActivity(schedule.afternoonSchedule.activities);
        }
        
        // Cập nhật completed count
        const allActivities = [
            ...schedule.morningSchedule.activities,
            ...schedule.afternoonSchedule.activities
        ];
        schedule.completedActivities = allActivities.filter(a => a.status === 'completed').length;
        schedule.updatedAt = new Date().toISOString();
        
        await this.storageManager.updateItem('schedules', schedule);
        return schedule;
    }

    /**
     * Format date to YYYY-MM-DD
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Parse date from YYYY-MM-DD
     */
    parseDate(dateStr) {
        return new Date(dateStr + 'T00:00:00');
    }

    /**
     * Xóa daily activity schedule
     */
    async deleteDailyActivitySchedule(id) {
        await this.storageManager.deleteItem('schedules', id);
    }
}

