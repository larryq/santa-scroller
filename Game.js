export class Game {
  constructor(updateUI) {
    this.score = 0;
    this.updateUI = updateUI; // To be set by main.js
  }

  addScore(points, updateUI) {
    this.score += points;
    if (this.updateUI) {
      this.updateUI();
    }
  }
}
