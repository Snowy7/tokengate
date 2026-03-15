// Client-side: only VITE_* vars are available via import.meta.env
const vars: Record<string, string> = {
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME ?? "(not set)",
  VITE_API_URL: import.meta.env.VITE_API_URL ?? "(not set)",
  VITE_DEBUG: import.meta.env.VITE_DEBUG ?? "(not set)",
};

const tbody = document.getElementById("vars")!;
for (const [key, value] of Object.entries(vars)) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td class="key">${key}</td><td class="val">${value}</td>`;
  tbody.appendChild(tr);
}

console.log("[tokengate] Client env vars:", vars);
console.log("[tokengate] Server-only vars (DATABASE_URL, API_KEY) are NOT available in the browser — by design.");
