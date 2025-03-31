import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { NetworkService } from '../../services/network.service';
import { WebRTCService } from '../../services/web-rtc.service';

const updateIntervalMs: number = 5;

@Component({
  selector: 'app-square',
  templateUrl: './square.component.html',
  styleUrls: ['./square.component.scss'],
  imports: [CommonModule],
  standalone: true
})
export class SquareComponent {
  @Input() clientName: string = 'Client Name';
  lastMessage: string = '';
  color: string = '#3498db';
  positionCurrent: { x: number; y: number } = { x: 600, y: 200 };
  positionTarget: { x: number; y: number } = this.positionCurrent;
  positionDelta: { x: number; y: number } = { x: 0, y: 0 };
  visible: boolean = false;

  private animationFrameId: number | null = null;

  constructor(
    private webrtcService: WebRTCService,
    private networkService: NetworkService,
    private cdr: ChangeDetectorRef
  ) {
    let lastProcessedTime = 0;

    this.webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return;
      }
      if (trafficData.content.includes(".;")) {
        const currentTime = Date.now();
        if (currentTime - lastProcessedTime < updateIntervalMs) {
          return; // Drop messages
        }
        lastProcessedTime = currentTime;
        this.decode(trafficData.content);
      }
      if (!trafficData.content.startsWith(".") && !trafficData.content.includes("/.;")) {
        if (trafficData.content.startsWith(this.clientName + "/")) {
          this.lastMessage = trafficData.content;
          this.lastMessage = this.lastMessage.substring(this.clientName.length + 1);
        }
      }
    });
  }
  decode(data: string) {
    // Example: `.;{clientId};#112233;10;10;1`
    const parts = data.split(';');
    if (parts.length === 6) {
      if (this.networkService.role === 'Host' && this.clientName !== parts[1]) {
        return;
      }

      this.color = parts[2];

      // Constrain the position to keep the square visible on the screen
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const squareWidth = 100; // Adjust based on the square's width
      const squareHeight = 100; // Adjust based on the square's height

      const newX = this.positionCurrent.x + parseInt(parts[3], 10);
      this.positionTarget.x = Math.min(
        Math.max(newX, 0),
        screenWidth - squareWidth - 15
      );
      const newY = this.positionCurrent.y + parseInt(parts[4], 10);
      this.positionTarget.y = Math.min(
        Math.max(newY, 0),
        screenHeight - squareHeight
      );

      // Smoothly update the position using requestAnimationFrame
      this.animatePosition();

      // Update visibility
      this.visible = parts[5] === '1';

      // Trigger change detection to update the UI
      this.cdr.detectChanges(); //FIXME not needed with requestAnimationFrame
    }
  }

  private animatePosition(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const step = () => {
      const smoothness = 0.2;
      this.positionDelta.x = (this.positionTarget.x - this.positionCurrent.x) * smoothness;
      this.positionDelta.y = (this.positionTarget.y - this.positionCurrent.y) * smoothness;

      this.positionCurrent.x += this.positionDelta.x;
      this.positionCurrent.y += this.positionDelta.y;

      // console.log(`Animating square from to delta position:\n`, this.positionCurrent, this.positionTarget, this.positionDelta);

      // If the square is close enough to the target, stop animating
      if (Math.abs(this.positionDelta.x) < 1 && Math.abs(this.positionDelta.y) < 1) {
        this.positionCurrent.x = this.positionTarget.x;
        this.positionCurrent.y = this.positionTarget.y;
        return;
      }

      // Request the next animation frame
      this.animationFrameId = requestAnimationFrame(step);
    };

    step();
  }
}