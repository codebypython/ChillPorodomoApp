export class NotificationService {
    show(message, type = 'info', duration = 3000) {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');

        if (!notification || !text) {
            return;
        }

        text.textContent = message;
        notification.className = `notification ${type} show`;

        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        this.hideTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
}

export const notificationService = new NotificationService();
