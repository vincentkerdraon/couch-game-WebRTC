import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { controllerConnectionID, timeNowTimestampSecond } from '../../definitions/network';
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
  private subscriptionMessages: Subscription;

  trafficDataMap: Map<string, Map<number, number>> = new Map();

  constructor(private webrtcService: WebRTCService, private cdr: ChangeDetectorRef) {
    this.subscriptionMessages = webrtcService.messages$.subscribe((trafficData) => {
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
      let from = trafficData?.from;
      if (from == controllerConnectionID) {
        from = "(host)"
      }
      this.trafficDataMap.set(from, mapFrom);
    });


    setInterval(() => {
      // Read trafficDataMap and update dataReceivedLast10s and dataReceivedLast1min
      const now = timeNowTimestampSecond();
      const newDataReceivedLast10s = new Map<string, number>();
      const newDataReceivedLast1min = new Map<string, number>();

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

        if (totalBytesLast1min > 0) {
          newDataReceivedLast10s.set(from, totalBytesLast10s);
          newDataReceivedLast1min.set(from, totalBytesLast1min);
        }
      });

      const hasChanged =
        !this.mapsAreEqual(this.dataReceivedLast10s, newDataReceivedLast10s) ||
        !this.mapsAreEqual(this.dataReceivedLast1min, newDataReceivedLast1min);

      if (hasChanged) {
        this.dataReceivedLast10s = newDataReceivedLast10s;
        this.dataReceivedLast1min = newDataReceivedLast1min;
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.subscriptionMessages.unsubscribe();
  }

  formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' Gb';
    } else if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' Mb';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' kb';
    } else {
      return bytes.toFixed(2) + ' b';
    }
  }

  private mapsAreEqual(map1: Map<string, number>, map2: Map<string, number>): boolean {
    if (map1.size !== map2.size) {
      return false;
    }
    for (const [key, value] of map1) {
      if (map2.get(key) !== value) {
        return false;
      }
    }
    return true;
  }

}
