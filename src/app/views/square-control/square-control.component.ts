import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NetworkService } from '../../services/network.service';
import { WebRTCControllerService } from '../../services/web-rtc-controller.service';
import { WebRTCHostService } from '../../services/web-rtc-host.service';
import { WebRTCService } from '../../services/web-rtc.service';

@Component({
  selector: 'app-square-control',
  templateUrl: './square-control.component.html',
  styleUrls: ['./square-control.component.scss'],
  imports: [CommonModule, FormsModule],
  standalone: true
})
export class SquareControlComponent {
  @Input() peerIdSelf: string = 'Client Name';
  @Input() peerIdTo: string = 'Client Name';
  color: string = '#3498db';
  visible: boolean = false;

  private joystickActive = false;
  private lastMousePosition: { x: number; y: number } | null = null;

  constructor(private webrtcService: WebRTCService, private webRTCControllerService: WebRTCControllerService, private webRTCHostService: WebRTCHostService, private networkService: NetworkService) { }

  startJoystick(event: MouseEvent): void {
    this.joystickActive = true;
    this.lastMousePosition = { x: event.clientX, y: event.clientY };
  }

  stopJoystick(): void {
    this.joystickActive = false;
    this.lastMousePosition = null;
  }

  moveJoystick(event: MouseEvent): void {
    if (!this.joystickActive || !this.lastMousePosition) {
      return;
    }

    const dx = event.clientX - this.lastMousePosition.x;
    const dy = event.clientY - this.lastMousePosition.y;
    this.update(dx, dy);
    this.lastMousePosition = { x: event.clientX, y: event.clientY };
  }

  update(dx: number, dy: number): void {
    const data = `.;${this.peerIdSelf};${this.color};${dx};${dy};${this.visible ? '1' : '0'}`;

    if (this.networkService.role === 'Host') {
      this.webRTCHostService.sendMessage(this.peerIdTo, data);
    } else {
      this.webRTCControllerService.sendMessage(data);
    }
  }

}