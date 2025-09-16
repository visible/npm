export class Spinner {
  constructor(text = '', display = null) {
    this.text = text;
    this.frames = ['/', '—', '\\', '|'];
    this.current = 0;
    this.interval = null;
    this.isSpinning = false;
    this.display = display;
  }

  start() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    process.stdout.write('\x1B[?25l');

    this.interval = setInterval(() => {
      if (this.display) {
        this.display.showSpinner(`${this.frames[this.current]} ${this.text}`);
      } else {
        process.stdout.write(`\r${this.frames[this.current]} ${this.text}`);
      }
      this.current = (this.current + 1) % this.frames.length;
    }, 100);
  }

  update(text) {
    this.text = text;
  }

  stop() {
    if (!this.isSpinning) return;
    this.isSpinning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (!this.display) {
      process.stdout.write('\r\x1B[K');
      process.stdout.write('\x1B[?25h');
    }
  }

  succeed(text) {
    this.stop();
    if (!this.display) {
      console.log(`✓ ${text}`);
    }
  }

  fail(text) {
    this.stop();
    if (!this.display) {
      console.log(`✗ ${text}`);
    }
  }

  info(text) {
    this.stop();
    if (!this.display) {
      console.log(`• ${text}`);
    }
  }
}