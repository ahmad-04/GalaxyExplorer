const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, '..', 'public', 'assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const size = '64x64';

function runCommand(command, successMessage) {
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error executing command: ${command}`);
      console.error(stderr);
      throw err;
    }
    console.log(successMessage);
  });
}

// 1. Shield Power-up: Blue Hexagon
const shieldCommand = `magick -size ${size} xc:none -fill "#3498db" -stroke "#ffffff" -strokewidth 4 -draw "polygon 32,5 62,21 62,53 32,69 2,53 2,21" "${path.join(outputDir, 'powerup-shield.png')}"`;
runCommand(shieldCommand, 'Shield power-up created.');

// 2. Rapid-Fire Power-up: Yellow Double-Chevron
const weaponCommand = `magick -size ${size} xc:none -fill "#f1c40f" -stroke "#ffffff" -strokewidth 4 -draw "polyline 12,40 32,20 52,40" -draw "polyline 12,60 32,40 52,60" "${path.join(outputDir, 'powerup-weapon.png')}"`;
runCommand(weaponCommand, 'Weapon power-up created.');

// 3. Score Multiplier: Green Star
const scoreCommand = `magick -size ${size} xc:none -fill "#2ecc71" -stroke "#ffffff" -strokewidth 4 -draw "polygon 32,5 42,25 62,25 48,42 55,62 32,50 9,62 16,42 2,25 22,25" "${path.join(outputDir, 'powerup-score.png')}"`;
runCommand(scoreCommand, 'Score power-up created.');
