const fs = require("fs");
const path = require("path");

// Finder EXIF-orienteringen i en JPEG. Telefoner gemmer ofte et staaende foto
// som en liggende fil plus et flag om, at det skal drejes en kvart omgang.
// Browseren adlyder flaget, og hvis vi ikke goer det samme, faar billedet en
// ramme paa hoejkant om et liggende motiv. Vaerdi 5-8 betyder drejet.
function exifOrientering(buf) {
  let i = 2;
  while (i < buf.length - 4) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const markoer = buf[i + 1];
    if (markoer === 0xda || markoer === 0xd9) break; // billeddata begynder
    const laengde = buf.readUInt16BE(i + 2);
    if (markoer === 0xe1 && buf.toString("ascii", i + 4, i + 8) === "Exif") {
      const tiff = i + 10;
      if (tiff + 8 > buf.length) break;
      const lilleEnde = buf.toString("ascii", tiff, tiff + 2) === "II";
      const u16 = (p) => (lilleEnde ? buf.readUInt16LE(p) : buf.readUInt16BE(p));
      const u32 = (p) => (lilleEnde ? buf.readUInt32LE(p) : buf.readUInt32BE(p));
      const ifd = tiff + u32(tiff + 4);
      if (ifd + 2 > buf.length) break;
      const antal = u16(ifd);
      for (let f = 0; f < antal; f++) {
        const felt = ifd + 2 + f * 12;
        if (felt + 12 > buf.length) break;
        if (u16(felt) === 0x0112) return u16(felt + 8);
      }
      break;
    }
    i += 2 + laengde;
  }
  return 1;
}

// Laeser bredde og hoejde ud af billedfilens egen header. Det klares uden et
// ekstra npm-modul: PNG har maalene paa faste pladser, og JPEG skal skannes
// for sin SOF-markoer. Returnerer null hvis filen ikke kan laeses.
function billedMaal(urlSti) {
  if (!urlSti) return null;
  const fil = path.join(__dirname, "src", urlSti.replace(/^\//, ""));
  let buf;
  try {
    buf = fs.readFileSync(fil);
  } catch (e) {
    return null;
  }

  // PNG: signatur, derefter IHDR med bredde paa byte 16 og hoejde paa byte 20.
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { bredde: buf.readUInt32BE(16), hoejde: buf.readUInt32BE(20) };
  }

  // JPEG: loeb markoererne igennem indtil en SOF-blok. Den rummer maalene.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const markoer = buf[i + 1];
      // SOF0-SOF15, men ikke DHT (c4), DNL (c8) og DAC (cc).
      if (
        markoer >= 0xc0 &&
        markoer <= 0xcf &&
        markoer !== 0xc4 &&
        markoer !== 0xc8 &&
        markoer !== 0xcc
      ) {
        const bredde = buf.readUInt16BE(i + 7);
        const hoejde = buf.readUInt16BE(i + 5);
        // Er fotoet drejet, byttes maalene, saa rammen passer til det,
        // browseren rent faktisk viser.
        const drejet = exifOrientering(buf) >= 5;
        return drejet
          ? { bredde: hoejde, hoejde: bredde }
          : { bredde, hoejde };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }

  return null;
}

module.exports = function (eleventyConfig) {
  // Filer der kopieres direkte over uden behandling
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/billeder");
  eleventyConfig.addPassthroughCopy("src/admin");

  // Genindlæs browseren når CSS ændres
  eleventyConfig.addWatchTarget("src/assets/");

  // Gør linjeskift i tekstfelter til afsnit, så Lotte kan skrive
  // flere afsnit i ét felt uden at kunne ødelægge formateringen.
  eleventyConfig.addFilter("afsnit", function (tekst) {
    if (!tekst) return "";
    return String(tekst)
      .split(/\n\s*\n/)
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => `<p>${a.replace(/\n/g, "<br>")}</p>`)
      .join("\n");
  });

  // Tal til dansk kronebeloeb: 4162.4 -> "4.162 kr."
  // Alle priser regnes ud fra ét tal pr. ydelse, saa en prisaendring kun
  // skal skrives ét sted og maanedspriserne foelger med af sig selv.
  eleventyConfig.addFilter("kroner", function (tal) {
    const n = Math.round(Number(tal));
    if (!isFinite(n)) return "";
    return n.toLocaleString("da-DK") + " kr.";
  });

  // Giver rammen praecis samme form som fotoet, saa der aldrig skaeres i
  // motivet. Uden den tvinges Lottes staaende telefonfotos ind i en liggende
  // ramme, og saa ryger hoveder, ben og hjul udenfor. Bruges som
  //   <div class="split__media" style="aspect-ratio: {{ sti | billedforhold }}">
  // og falder tilbage til stylesheetets standardformat, hvis filen mangler.
  eleventyConfig.addFilter("billedforhold", function (sti) {
    const maal = billedMaal(sti);
    // Tom vaerdi giver en ugyldig CSS-regel, som browseren kasserer. Dermed
    // gaelder stylesheetets eget format, og intet gaar i stykker.
    if (!maal || !maal.bredde || !maal.hoejde) return "";
    return `${maal.bredde} / ${maal.hoejde}`;
  });

  // Dato som ren YYYY-MM-DD til <lastmod> i sitemap'et. Soegemaskiner og
  // AI-crawlere bruger friskhed som signal, naar de vaelger hvad de skal
  // hente igen - og hvilken kilde de stoler mest paa.
  eleventyConfig.addFilter("isodato", function (d) {
    return new Date(d).toISOString().slice(0, 10);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
