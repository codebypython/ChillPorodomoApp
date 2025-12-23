/**
 * ActivityScheduler - Tự động sắp xếp activities vào time slots
 */

export class ActivityScheduler {
    constructor() {
        this.breakDuration = 10; // 10 phút nghỉ giữa các activities
    }

    /**
     * Sắp xếp activities vào time slot
     */
    scheduleActivities(activities, timeSlot) {
        if (!activities || activities.length === 0) return [];
        
        const startTime = this.timeToMinutes(timeSlot.startTime);
        const endTime = this.timeToMinutes(timeSlot.endTime);
        const availableTime = endTime - startTime;
        
        // Sắp xếp theo priority: high -> medium -> low
        const sortedActivities = [...activities].sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        });
        
        const scheduled = [];
        let currentTime = startTime;
        
        for (const activity of sortedActivities) {
            const duration = activity.estimatedDuration || 30;
            
            // Kiểm tra có đủ thời gian không
            if (currentTime + duration > endTime) {
                // Không đủ thời gian, có thể chia nhỏ hoặc bỏ qua
                if (duration <= 15) {
                    // Activity ngắn, vẫn có thể fit
                    activity.scheduledTime = this.minutesToTime(currentTime);
                    activity.scheduledEndTime = this.minutesToTime(Math.min(currentTime + duration, endTime));
                    scheduled.push(activity);
                    currentTime = endTime;
                }
                break;
            }
            
            // Schedule activity
            activity.scheduledTime = this.minutesToTime(currentTime);
            activity.scheduledEndTime = this.minutesToTime(currentTime + duration);
            scheduled.push(activity);
            
            // Cập nhật thời gian (thêm break)
            currentTime += duration + this.breakDuration;
        }
        
        return scheduled;
    }

    /**
     * Chuyển đổi thời gian thành phút
     */
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Chuyển đổi phút thành thời gian
     */
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * Validate time slot có đủ thời gian cho activities không
     */
    validateTimeSlot(activities, timeSlot) {
        const totalDuration = activities.reduce((sum, a) => sum + (a.estimatedDuration || 30), 0);
        const availableTime = this.timeToMinutes(timeSlot.endTime) - this.timeToMinutes(timeSlot.startTime);
        const breaksTime = (activities.length - 1) * this.breakDuration;
        
        return {
            isValid: totalDuration + breaksTime <= availableTime,
            totalDuration,
            availableTime,
            breaksTime,
            requiredTime: totalDuration + breaksTime,
            remainingTime: availableTime - totalDuration - breaksTime
        };
    }

    /**
     * Đề xuất phân bổ thời gian
     */
    suggestTimeAllocation(activities, timeSlot) {
        const validation = this.validateTimeSlot(activities, timeSlot);
        
        if (validation.isValid) {
            return {
                canFit: true,
                suggestion: 'Có thể sắp xếp tất cả activities',
                scheduled: this.scheduleActivities(activities, timeSlot)
            };
        } else {
            // Cần điều chỉnh
            const suggestions = [];
            
            // Gợi ý 1: Giảm thời gian của low priority activities
            const lowPriority = activities.filter(a => a.priority === 'low');
            if (lowPriority.length > 0) {
                const reducePerActivity = Math.ceil((validation.requiredTime - validation.availableTime) / lowPriority.length);
                suggestions.push({
                    type: 'reduce-low-priority',
                    message: `Giảm ${reducePerActivity} phút cho mỗi activity ưu tiên thấp`,
                    activities: lowPriority.map(a => ({
                        ...a,
                        suggestedDuration: Math.max(15, (a.estimatedDuration || 30) - reducePerActivity)
                    }))
                });
            }
            
            // Gợi ý 2: Di chuyển một số activities sang time slot khác
            if (activities.length > 1) {
                suggestions.push({
                    type: 'move-activities',
                    message: `Di chuyển ${Math.ceil((validation.requiredTime - validation.availableTime) / 60)} activities sang time slot khác`,
                    count: Math.ceil((validation.requiredTime - validation.availableTime) / 60)
                });
            }
            
            return {
                canFit: false,
                validation,
                suggestions
            };
        }
    }
}

