import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NetworkService } from '../../services/network.service';
import { WebRTCControllerService } from '../../services/web-rtc-controller.service';
import { WebRTCHostService } from '../../services/web-rtc-host.service';
import { WebRTCService } from '../../services/web-rtc.service';

const updateIntervalMs: number = 10;

@Component({
  selector: 'app-square-control',
  templateUrl: './square-control.component.html',
  styleUrls: ['./square-control.component.scss'],
  imports: [CommonModule, FormsModule],
  standalone: true
})
export class SquareControlComponent implements OnDestroy {
  @Input() peerIdSelf: string = 'Client Name';
  @Input() peerIdTo: string = 'Client Name';
  color: string = '#c864c8';
  visible: boolean = false;
  data: string = '';

  joystickActive = false;
  joystickCenter = { x: 50, y: 50 }; // Center of the joystick (relative to its container)
  joystickHandleStyle = { left: '50%', top: '50%' }; // Initial position of the joystick handle

  private lastDx = 0;
  private lastDy = 0;
  private intervalId: any = null;

  constructor(
    private webrtcService: WebRTCService,
    private webRTCControllerService: WebRTCControllerService,
    private webRTCHostService: WebRTCHostService,
    private networkService: NetworkService,
    private cdr: ChangeDetectorRef
  ) { }

  startJoystick(event: MouseEvent | TouchEvent): void {
    this.joystickActive = true;
    event.preventDefault();

    // Start sending repeated input every 10ms
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        if (this.joystickActive) {
          this.update(this.lastDx, this.lastDy);
        }
      }, updateIntervalMs);
    }
  }

  stopJoystick(): void {
    this.joystickActive = false;
    this.joystickHandleStyle = { left: '50%', top: '50%' }; // Reset handle to center
    this.update(0, 0); // Stop movement

    // Stop the interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  moveJoystick(event: MouseEvent | TouchEvent): void {
    if (!this.joystickActive) {
      return;
    }

    const container = (event.target as HTMLElement).closest('.joystick') as HTMLElement;

    let rect: DOMRect;
    try {
      rect = container.getBoundingClientRect();
    } catch (error) {
      //ignore this error
      return;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX: number, clientY: number;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      return;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Limit the joystick handle movement to the joystick's radius
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), rect.width / 2);
    const angle = Math.atan2(dy, dx);

    const limitedX = Math.cos(angle) * distance;
    const limitedY = Math.sin(angle) * distance;

    this.joystickHandleStyle = {
      left: `${50 + (limitedX / rect.width) * 100}%`,
      top: `${50 + (limitedY / rect.height) * 100}%`
    };

    // Update the last movement values
    this.lastDx = Math.round(limitedX / 10);
    this.lastDy = Math.round(limitedY / 10);


    // Emit movement data
    this.update(this.lastDx, this.lastDy);
  }

  private updateTimeout: any = null;

  update(dx: number, dy: number): void {
    if (this.updateTimeout) {
      return;
    }
    this.updateTimeout = setTimeout(() => {
      this.cdr.detectChanges();
      this.data = `.;${this.peerIdSelf};${this.color};${dx};${dy};${this.visible ? '1' : '0'}`;

      if (this.networkService.role === 'Host') {
        this.webRTCHostService.sendMessage(this.peerIdTo, this.data);
      } else if (this.networkService.role === 'Controller') {
        this.webRTCControllerService.sendMessage(this.data);
      }

      this.updateTimeout = null;
    }, updateIntervalMs);
  }

  ngOnDestroy(): void {
    // Clean up the interval when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}