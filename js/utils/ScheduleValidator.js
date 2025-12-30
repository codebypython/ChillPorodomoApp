/**
 * ScheduleValidator - Validate daily schedule data and inputs
 */

export class ScheduleValidator {
    constructor() {
        this.minDuration = 15; // Minimum activity duration in minutes
        this.maxDuration = 480; // Maximum activity duration (8 hours)
        this.maxNotesLength = 1000; // Maximum notes length
        this.maxTopicLength = 200; // Maximum topic length
        this.maxContentLength = 2000; // Maximum content length
    }

    /**
     * Validate activity object
     */
    validateActivity(activity) {
        const errors = [];

        // Required fields
        if (!activity.id) {
            errors.push('Activity must have an ID');
        }

        if (!activity.type) {
            errors.push('Activity must have a type');
        }

        // Validate duration
        if (activity.estimatedDuration === undefined || activity.estimatedDuration === null) {
            errors.push('Activity must have estimated duration');
        } else {
            const duration = parseInt(activity.estimatedDuration);
            if (isNaN(duration)) {
                errors.push('Duration must be a valid number');
            } else if (duration < this.minDuration) {
                errors.push(`Duration must be at least ${this.minDuration} minutes`);
            } else if (duration > this.maxDuration) {
                errors.push(`Duration must not exceed ${this.maxDuration} minutes`);
            }
        }

        // Validate priority
        if (activity.priority && !['high', 'medium', 'low'].includes(activity.priority)) {
            errors.push('Priority must be high, medium, or low');
        }

        // Validate time slot
        if (activity.timeSlot && !['morning', 'afternoon', 'auto', null].includes(activity.timeSlot)) {
            errors.push('Time slot must be morning, afternoon, auto, or null');
        }

        // Validate topic length
        if (activity.topic && activity.topic.length > this.maxTopicLength) {
            errors.push(`Topic must not exceed ${this.maxTopicLength} characters`);
        }

        // Validate content length
        if (activity.content && activity.content.length > this.maxContentLength) {
            errors.push(`Content must not exceed ${this.maxContentLength} characters`);
        }

        // Validate course name
        if (activity.type === 'study' && !activity.courseName) {
            errors.push('Study activity must have a course name');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate activities array
     */
    validateActivities(activities) {
        if (!Array.isArray(activities)) {
            return {
                isValid: false,
                errors: ['Activities must be an array']
            };
        }

        if (activities.length === 0) {
            return {
                isValid: false,
                errors: ['At least one activity is required']
            };
        }

        const allErrors = [];
        const duplicateIds = new Set();
        const seenIds = new Set();

        activities.forEach((activity, index) => {
            const validation = this.validateActivity(activity);
            if (!validation.isValid) {
                allErrors.push(`Activity ${index + 1}: ${validation.errors.join(', ')}`);
            }

            // Check for duplicate IDs
            if (activity.id) {
                if (seenIds.has(activity.id)) {
                    duplicateIds.add(activity.id);
                } else {
                    seenIds.add(activity.id);
                }
            }
        });

        if (duplicateIds.size > 0) {
            allErrors.push(`Duplicate activity IDs: ${Array.from(duplicateIds).join(', ')}`);
        }

        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }

    /**
     * Validate date
     */
    validateDate(date) {
        if (!(date instanceof Date)) {
            return {
                isValid: false,
                errors: ['Date must be a Date object']
            };
        }

        if (isNaN(date.getTime())) {
            return {
                isValid: false,
                errors: ['Date is invalid']
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxFutureDate = new Date();
        maxFutureDate.setDate(maxFutureDate.getDate() + 365); // 1 year in future

        if (date < today) {
            return {
                isValid: false,
                errors: ['Date cannot be in the past']
            };
        }

        if (date > maxFutureDate) {
            return {
                isValid: false,
                errors: ['Date cannot be more than 1 year in the future']
            };
        }

        return {
            isValid: true,
            errors: []
        };
    }

    /**
     * Validate notes
     */
    validateNotes(notes) {
        if (notes === null || notes === undefined) {
            return {
                isValid: true,
                errors: []
            };
        }

        if (typeof notes !== 'string') {
            return {
                isValid: false,
                errors: ['Notes must be a string']
            };
        }

        if (notes.length > this.maxNotesLength) {
            return {
                isValid: false,
                errors: [`Notes must not exceed ${this.maxNotesLength} characters`]
            };
        }

        return {
            isValid: true,
            errors: []
        };
    }

    /**
     * Validate time slot capacity
     */
    validateTimeSlotCapacity(activities, timeSlot) {
        if (!timeSlot || !timeSlot.startTime || !timeSlot.endTime) {
            return {
                isValid: false,
                errors: ['Time slot must have startTime and endTime'],
                canFit: false
            };
        }

        const totalDuration = activities.reduce((sum, a) => {
            const duration = parseInt(a.estimatedDuration) || 0;
            return sum + duration;
        }, 0);

        const startMinutes = this.timeToMinutes(timeSlot.startTime);
        const endMinutes = this.timeToMinutes(timeSlot.endTime);
        const availableTime = endMinutes - startMinutes;

        if (availableTime <= 0) {
            return {
                isValid: false,
                errors: ['Time slot end time must be after start time'],
                canFit: false
            };
        }

        // Calculate break time (10 minutes between activities)
        const breakTime = Math.max(0, (activities.length - 1) * 10);
        const requiredTime = totalDuration + breakTime;

        const canFit = requiredTime <= availableTime;

        return {
            isValid: true,
            canFit,
            totalDuration,
            availableTime,
            breakTime,
            requiredTime,
            remainingTime: availableTime - requiredTime,
            overflow: canFit ? 0 : requiredTime - availableTime,
            errors: canFit ? [] : [
                `Time slot cannot accommodate all activities. Required: ${requiredTime} minutes, Available: ${availableTime} minutes, Overflow: ${requiredTime - availableTime} minutes`
            ]
        };
    }

    /**
     * Sanitize string input
     */
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        
        // Remove potentially dangerous characters
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/[<>]/g, '') // Remove angle brackets
            .trim();
    }

    /**
     * Sanitize activity data
     */
    sanitizeActivity(activity) {
        const sanitized = { ...activity };

        if (sanitized.topic) {
            sanitized.topic = this.sanitizeString(sanitized.topic);
        }

        if (sanitized.content) {
            sanitized.content = this.sanitizeString(sanitized.content);
        }

        if (sanitized.courseName) {
            sanitized.courseName = this.sanitizeString(sanitized.courseName);
        }

        if (sanitized.name) {
            sanitized.name = this.sanitizeString(sanitized.name);
        }

        // Ensure duration is a valid number
        if (sanitized.estimatedDuration !== undefined) {
            sanitized.estimatedDuration = Math.max(
                this.minDuration,
                Math.min(this.maxDuration, parseInt(sanitized.estimatedDuration) || this.minDuration)
            );
        }

        return sanitized;
    }

    /**
     * Helper: Convert time string to minutes
     */
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
}

