import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { NetworkService } from '../../services/network.service';
import { WebRTCService } from '../../services/web-rtc.service';

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
  position: { x: number; y: number } = { x: 600, y: 200 };
  visible: boolean = false;

  constrainedPosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    private webrtcService: WebRTCService,
    private networkService: NetworkService,
    private cdr: ChangeDetectorRef
  ) {
    this.webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return;
      }
      if (trafficData.content.includes(".;")) {
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
    // Example: `.;fimqmkrvj;#112233;10;10;1`
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

      // Update and constrain the x position
      const newX = this.position.x + parseInt(parts[3], 10);
      this.constrainedPosition.x = Math.min(
        Math.max(newX, 0),
        screenWidth - squareWidth - 20
      );

      // Update and constrain the y position
      const newY = this.position.y + parseInt(parts[4], 10);
      this.constrainedPosition.y = Math.min(
        Math.max(newY, 0),
        screenHeight - squareHeight
      );

      // Update the position to the constrained values
      this.position.x = this.constrainedPosition.x;
      this.position.y = this.constrainedPosition.y;

      // Update visibility
      this.visible = parts[5] === '1';

      // Trigger change detection to update the UI
      this.cdr.detectChanges();
    }
  }
}