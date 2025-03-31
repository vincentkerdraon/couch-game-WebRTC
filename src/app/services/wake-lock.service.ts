import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLockService {
  private wakeLock: any = null;

  async requestWakeLock(): Promise<void> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock is active.');

        // Listen for the wake lock being released (e.g., due to system constraints)
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake Lock was released.');
        });
      } catch (err) {
        console.error('Failed to acquire Wake Lock:', err);
      }
    } else {
      console.warn('Wake Lock API is not supported on this device.');
    }
  }

  releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log('Wake Lock released manually.');
    }
  }
}