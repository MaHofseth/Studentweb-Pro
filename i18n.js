// Texts in the language chosen in the popup's settings. "auto" (the default)
// uses the browser's language through the i18n API; "en" or "nb" read that
// language's _locales/<lang>/messages.json directly, since browsers don't let
// an extension override its language.
// Used by the popup (options.js) and the results page (results.js).
const LANGUAGES = ["auto", "en", "nb"];

async function loadTranslator() {
  const ext = globalThis.browser ?? globalThis.chrome;
  const browserText = (key, subs) => ext.i18n.getMessage(key, subs);
  const { language = "auto" } = await ext.storage.local.get("language");
  if (language === "auto" || !LANGUAGES.includes(language)) return browserText;

  let messages;
  try {
    const res = await fetch(ext.runtime.getURL(`_locales/${language}/messages.json`));
    messages = await res.json();
  } catch {
    return browserText;
  }

  // Same placeholder rules as the i18n API: $NAME$ in the message refers to
  // placeholders.name, whose content "$1", "$2" … is the substitution.
  return (key, subs) => {
    const entry = messages[key];
    if (!entry) return browserText(key, subs);
    const values = [].concat(subs ?? []).map(String);
    const sub = (text) => text.replace(/\$(\d)/g, (_, n) => values[n - 1] ?? "");
    return entry.message.replace(/\$([A-Za-z0-9_@]+)\$/g, (match, name) => {
      const placeholder = entry.placeholders?.[name.toLowerCase()];
      return placeholder ? sub(placeholder.content) : match;
    });
  };
}
