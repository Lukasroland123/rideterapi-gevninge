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
