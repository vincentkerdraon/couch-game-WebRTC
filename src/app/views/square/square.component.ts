import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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

  constructor(private webrtcService: WebRTCService, private networkService: NetworkService) {
    this.webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return;
      }
      if (trafficData.content.includes(".;")) {
        this.decode(trafficData.content)
      }
      if (!trafficData.content.startsWith(".") && !trafficData.content.includes("/.;")) {
        this.lastMessage = trafficData.content;
        if (this.lastMessage.startsWith(this.clientName + "/")) {
          this.lastMessage = this.lastMessage.substring(this.clientName.length + 1);
        }
      }
    });
  }

  decode(data: string) {
    //example: `.;fimqmkrvj;#112233;10;10;1`
    const parts = data.split(';');
    if (parts.length == 6) {
      if (this.networkService.role == "Host" && this.clientName != parts[1]) {
        return;
      }
      this.color = parts[2];
      const screenWidth = window.innerWidth;
      this.position.x = Math.min(this.position.x + parseInt(parts[3]), screenWidth);
      const screenHeight = window.innerHeight;
      this.position.y = Math.min(this.position.y + parseInt(parts[4]), screenHeight);
      this.visible = parts[5] === '1';
    }
  }
}