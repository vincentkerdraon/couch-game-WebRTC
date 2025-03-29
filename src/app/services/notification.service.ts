import { Injectable } from '@angular/core';

export type NotificationLevel = "info" | "warning" | "danger";

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public visible = false
  public message = ""
  public level: NotificationLevel = "info";


  public showMessage(level: NotificationLevel, message: string): void {
    this.visible = true;
    this.level = level;
    this.message = message;

    // console.log(`Notification(${level}):  ${message}`);
    setTimeout(() => {
      this.visible = false;
    }, 10000);
  }
}