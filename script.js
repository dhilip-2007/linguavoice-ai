
const sourceLang = document.getElementById("sourceLang");
const targetLang = document.getElementById("targetLang");
const sourceText = document.getElementById("sourceText");
const resultText = document.getElementById("resultText");
const translateBtn = document.getElementById("translateBtn");
const micBtn = document.getElementById("micBtn");
const listenBtn = document.getElementById("listenBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const swapBtn = document.getElementById("swapBtn");
const charCount = document.getElementById("charCount");
const message = document.getElementById("message");

const languageNames = {
  en: "English",
  ta: "Tamil",
  hi: "Hindi",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  fr: "French",
  es: "Spanish",
  de: "German",
  ja: "Japanese",
  "zh-CN": "Chinese",
  ar: "Arabic"
};

let translatedText = "";
let recognition = null;
let isListening = false;

function setMessage(text) {
  message.textContent = text;
}

sourceText.addEventListener("input", () => {
  charCount.textContent = `${sourceText.value.length} / 2000`;
});

function showResult(text) {
  translatedText = text;
  resultText.textContent = text;
  listenBtn.disabled = !text;
  copyBtn.disabled = !text;
}

swapBtn.addEventListener("click", () => {
  const oldSource = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = oldSource;

  const oldText = sourceText.value;
  sourceText.value = translatedText;
  charCount.textContent = `${sourceText.value.length} / 2000`;

  showResult(oldText);
  setMessage("Languages swapped.");
});

clearBtn.addEventListener("click", () => {
  sourceText.value = "";
  charCount.textContent = "0 / 2000";
  showResult("");
  setMessage("Ready for your next translation.");
});

translateBtn.addEventListener("click", async () => {
  const text = sourceText.value.trim();

  if (!text) {
    setMessage("Please enter text or use the microphone first.");
    sourceText.focus();
    return;
  }

  if (sourceLang.value === targetLang.value) {
    showResult(text);
    setMessage("Both languages are the same.");
    return;
  }

  translateBtn.disabled = true;
  translateBtn.textContent = "Translating...";
  setMessage("Connecting to translation service...");

  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set(
      "langpair",
      `${sourceLang.value}|${targetLang.value}`
    );

    const response = await fetch(url);
    if (!response.ok) throw new Error("Translation service unavailable.");

    const data = await response.json();

    if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
      throw new Error("No translation returned. Please try again.");
    }

    const result = data.responseData.translatedText;

    // Avoid displaying raw HTML if a service returns encoded markup.
    const safeText = new DOMParser().parseFromString(
      result,
      "text/html"
    ).documentElement.textContent;

    showResult(safeText);
    setMessage(
      `${languageNames[sourceLang.value]} → ${languageNames[targetLang.value]} · Translation complete`
    );
  } catch (error) {
    console.error(error);
    setMessage(
      "Translation failed. Check your internet connection and try again."
    );
  } finally {
    translateBtn.disabled = false;
    translateBtn.innerHTML = '✦ Translate now <span>→</span>';
  }
});

function getSpeechLocale(code) {
  const locales = {
    en: "en-US",
    ta: "ta-IN",
    hi: "hi-IN",
    te: "te-IN",
    ml: "ml-IN",
    kn: "kn-IN",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE",
    ja: "ja-JP",
    "zh-CN": "zh-CN",
    ar: "ar-SA"
  };

  return locales[code] || "en-US";
}

micBtn.addEventListener("click", () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setMessage("Speech input is not supported in this browser. Try desktop Chrome.");
    return;
  }

  if (isListening && recognition) {
    recognition.stop();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = getSpeechLocale(sourceLang.value);
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    micBtn.innerHTML = "⏹ <span>Stop</span>";
    setMessage("Listening... Speak now.");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    sourceText.value = transcript.slice(0, 2000);
    charCount.textContent = `${sourceText.value.length} / 2000`;
    setMessage("Speech captured. Press Translate now.");
  };

  recognition.onerror = (event) => {
    setMessage(
      event.error === "not-allowed"
        ? "Please allow microphone access in your browser."
        : `Speech recognition error: ${event.error}`
    );
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.innerHTML = "🎙 <span>Speak</span>";
  };

  recognition.start();
});

listenBtn.addEventListener("click", () => {
  if (!translatedText || !("speechSynthesis" in window)) {
    setMessage("Voice playback is unavailable in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(translatedText);
  utterance.lang = getSpeechLocale(targetLang.value);

  utterance.onstart = () => setMessage("Playing translated voice...");
  utterance.onend = () => setMessage("Voice playback finished.");
  utterance.onerror = () => setMessage("Could not play this voice.");

  window.speechSynthesis.speak(utterance);
});

copyBtn.addEventListener("click", async () => {
  if (!translatedText) return;

  try {
    await navigator.clipboard.writeText(translatedText);
    setMessage("Translation copied to clipboard.");
  } catch {
    setMessage("Clipboard access failed. Please copy the text manually.");
  }
});

