import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { timeNowTimestampSecond } from '../../definitions/network';
import { WebRTCService } from '../../services/web-rtc.service';




@Component({
  selector: 'app-traffic-receive',
  imports: [CommonModule],
  templateUrl: './traffic-receive.component.html',
  styleUrl: './traffic-receive.component.scss'
})
export class TrafficReceiveComponent {
  dataReceivedLast10s: Map<string, number> = new Map();
  dataReceivedLast1min: Map<string, number> = new Map();

  trafficDataMap: Map<string, Map<number, number>> = new Map();


  constructor(private webrtcService: WebRTCService) {
    webrtcService.messages$.subscribe((trafficData) => {
      if (!trafficData) {
        return
      }
      const now = timeNowTimestampSecond();
      let mapFrom = this.trafficDataMap.get(trafficData?.from);
      if (!mapFrom) {
        mapFrom = new Map();
      }
      let mapFromNow = mapFrom.get(now)
      if (mapFromNow) {
        mapFrom.set(now, mapFromNow + trafficData.content.length);
      } else {
        mapFrom.set(now, trafficData.content.length);
      }
      this.trafficDataMap.set(trafficData?.from, mapFrom);
    });

    setInterval(() => {
      //read trafficDataMap and update dataReceivedLast10s and dataReceivedLast1min
      const now = timeNowTimestampSecond();
      this.dataReceivedLast10s = new Map();
      this.dataReceivedLast1min = new Map();
      this.trafficDataMap.forEach((map, from) => {
        let totalBytesLast10s = 0;
        let totalBytesLast1min = 0;
        map.forEach((bytes, timestamp) => {
          if (now - timestamp <= 10) {
            totalBytesLast10s += bytes;
          }
          if (now - timestamp <= 60) {
            totalBytesLast1min += bytes;
          } else {
            map.delete(timestamp);
          }
        });
        this.dataReceivedLast10s.set(from, totalBytesLast10s)
        this.dataReceivedLast1min.set(from, totalBytesLast1min)
      });
    }, 500);
  }


  formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' Gb';
    } else if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' Mb';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' kb';
    } else {
      return bytes + ' b';
    }
  }



}
