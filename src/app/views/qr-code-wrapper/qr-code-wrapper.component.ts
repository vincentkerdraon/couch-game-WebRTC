import { AfterViewInit, Component, ElementRef, Input } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code-wrapper',
  standalone: true,
  template: `<canvas></canvas>`,
})
export class QRCodeWrapperComponent implements AfterViewInit {
  @Input() value: string = '';
  @Input() class: string = '';

  constructor(private elementRef: ElementRef) { }

  ngAfterViewInit(): void {
    const canvas = this.elementRef.nativeElement.querySelector('canvas');
    if (this.value) {
      QRCode.toCanvas(canvas, this.value, { width: 150 }, (error) => {
        if (error) {
          console.error('Error generating QR code:', error);
        }
      });
    }
  }
} 