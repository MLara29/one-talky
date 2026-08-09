import React from "react";
import { getCountryFlag } from "@/lib/constants";

// Converte o emoji de bandeira (par de "regional indicator symbols")
// de volta pro código ISO de 2 letras, sem precisar manter uma segunda
// tabela de países.
function flagEmojiToCode(emoji) {
  if (!emoji || emoji.length < 2) return null;
  const codePoints = [...emoji].map(c => c.codePointAt(0) - 0x1F1E6 + 65);
  if (codePoints.some(cp => cp < 65 || cp > 90)) return null;
  return String.fromCharCode(...codePoints).toLowerCase();
}

export default function CountryFlagImg({ country, className = "w-4 h-3 rounded-sm object-cover inline-block" }) {
  const emoji = getCountryFlag(country);
  const code = emoji !== "🌍" ? flagEmojiToCode(emoji) : null;

  if (!code) {
    return <span className="text-sm leading-none">🌍</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      alt={country || "flag"}
      className={className}
      onError={(e) => { e.target.style.display = "none"; }}
    />
  );
}