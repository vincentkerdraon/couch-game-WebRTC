import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-display',
  imports: [CommonModule],
  templateUrl: './notification-display.component.html',
  styles: ``
})
export class NotificationDisplayComponent {
  constructor(public notificationService: NotificationService) { }
}