import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NotificationDisplayComponent } from "./views/notification-display/notification-display.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [RouterModule, CommonModule, NotificationDisplayComponent]
})
export class AppComponent {
  isCollapsed = true;
}