// Tidsstempel for hver udgivelse. Sættes bag style.css og site.js
// (?v=...), så browsere henter den nye udgave med det samme i stedet for
// at bruge en gemt kopi i op til 4 timer.
module.exports = String(Date.now());
