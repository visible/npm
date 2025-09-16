export class Display {
  constructor() {
    this.results = [];
    this.maxVisible = 20;
    this.headerLines = 3;
    this.currentSpinner = null;
    this.packageCount = 0;
    this.completedCount = 0;
  }

  clear() {
    process.stdout.write('\x1B[2J\x1B[H');
  }

  moveTo(x, y) {
    process.stdout.write(`\x1B[${y};${x}H`);
  }

  clearLine() {
    process.stdout.write('\x1B[2K');
  }

  init(packageCount) {
    this.packageCount = packageCount;
    this.completedCount = 0;
    this.clear();
    this.drawHeader();
  }

  drawHeader() {
    this.moveTo(1, 1);
    process.stdout.write('NPM Package Checker');
    this.moveTo(1, 2);
    process.stdout.write(`Found ${this.packageCount} packages to check`);
    this.moveTo(1, 3);
    process.stdout.write('');
  }

  updateProgress(text) {
    this.moveTo(1, 2);
    this.clearLine();
    process.stdout.write(text);
  }

  addResult(text) {
    this.results.push(text);
    this.completedCount++;
    this.redrawResults();
  }

  redrawResults() {
    const startIdx = Math.max(0, this.results.length - this.maxVisible);
    const visibleResults = this.results.slice(startIdx);

    for (let i = 0; i < this.maxVisible; i++) {
      this.moveTo(1, this.headerLines + 1 + i);
      this.clearLine();
      if (i < visibleResults.length) {
        process.stdout.write(visibleResults[i]);
      }
    }

    this.moveTo(1, this.headerLines + this.maxVisible + 2);
  }

  showSpinner(text) {
    this.currentSpinner = text;
    this.moveTo(1, 2);
    this.clearLine();
    process.stdout.write(text);
  }

  showSummary(availableCount) {
    this.moveTo(1, this.headerLines + this.maxVisible + 2);
    this.clearLine();
    if (availableCount === 0) {
      process.stdout.write('• No available packages found');
    } else {
      process.stdout.write(`✓ Found ${availableCount} available packages saved to available.txt`);
    }
    process.stdout.write('\n');
  }

  finish() {
    process.stdout.write('\x1B[?25h');
    this.moveTo(1, this.headerLines + this.maxVisible + 3);
  }
}